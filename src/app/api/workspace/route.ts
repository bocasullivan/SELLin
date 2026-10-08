import { getSession } from "@/lib/auth";
import { allowedOrigin } from "@/lib/auth-security";
import { getDatabase } from "@/lib/db";
import { loadWorkspace } from "@/lib/workspace-data";
import { customerData, invoiceData, text, WorkspaceError } from "@/lib/workspace-validation";
import { decodePrivateImage } from "@/lib/private-image";

export const runtime = "nodejs";
const json = (data: object, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  const session = await getSession();
  if (!session) return json({ error: "Silakan login kembali." }, 401);
  return json(await loadWorkspace(session.userId));
}

export async function POST(request: Request) {
  try {
    if (!allowedOrigin(request)) return json({ error: "Permintaan ditolak." }, 403);
    const session = await getSession();
    if (!session) return json({ error: "Silakan login kembali." }, 401);
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      throw new WorkspaceError("Format permintaan tidak valid.");
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 3_000_000)
      throw new WorkspaceError("Permintaan terlalu besar.");
    const input = JSON.parse(raw);
    if (!input || typeof input !== "object" || !input.data || typeof input.data !== "object")
      throw new WorkspaceError("Data tidak valid.");
    const { action, data } = input;
    const userId = session.userId;
    const db = getDatabase();
    // Serialize mutations per account: protects counters and item replacement.
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      if (action === "customer.save") {
        const values = customerData(data);
        if (data.existing) {
          const result = await tx.accountCustomer.updateMany({
            where: { userId, code: String(data.id), deletedAt: null },
            data: values,
          });
          if (!result.count) throw new WorkspaceError("Customer tidak ditemukan.", 404);
        } else {
          const counter = await tx.accountCounter.upsert({
            where: { userId },
            create: { userId, lastCode: 4101 },
            update: { lastCode: { increment: 1 } },
          });
          if (counter.lastCode > 4199)
            throw new WorkspaceError("ID customer 4101–4199 sudah habis.");
          await tx.accountCustomer.create({
            data: { userId, code: String(counter.lastCode), ...values },
          });
        }
      } else if (action === "customer.delete") {
        const result = await tx.accountCustomer.updateMany({
          where: { userId, code: String(data.id), deletedAt: null },
          data: { deletedAt: new Date() },
        });
        if (!result.count) throw new WorkspaceError("Customer tidak ditemukan.", 404);
      } else if (action === "invoice.save" || action === "invoice.delete") {
        const id = text(data, "id", 36, true);
        if (!/^[a-f0-9-]{36}$/i.test(id)) throw new WorkspaceError("ID invoice tidak valid.");
        const previous = await tx.accountInvoice.findFirst({
          where: { id, userId, deletedAt: null },
        });
        if (action === "invoice.delete") {
          if (!previous) throw new WorkspaceError("Invoice tidak ditemukan.", 404);
          await tx.accountInvoice.update({ where: { id }, data: { deletedAt: new Date() } });
        } else {
          if (data.existing && !previous) throw new WorkspaceError("Invoice tidak ditemukan.", 404);
          const values = invoiceData(data);
          const customer = await tx.accountCustomer.findFirst({
            where: { userId, code: values.customerCode, deletedAt: null },
          });
          // Editing an old invoice after customer deletion preserves its existing snapshot.
          if (!customer && (!previous || previous.customerCode !== values.customerCode))
            throw new WorkspaceError("Pilih customer yang aktif.");
          const customerId = customer?.id ?? previous!.customerId;
          let sequence = previous?.sequence ?? 0;
          if (!previous || previous.customerId !== customerId || previous.year !== values.year) {
            const counter = await tx.accountSequence.upsert({
              where: { userId_customerId_year: { userId, customerId, year: values.year } },
              create: { userId, customerId, year: values.year, lastNumber: 1 },
              update: { lastNumber: { increment: 1 } },
            });
            sequence = counter.lastNumber;
            if (sequence > 99999) throw new WorkspaceError("Nomor urut invoice sudah habis.");
          }
          const sameCustomer = previous?.customerId === customerId;
          const record = {
            userId,
            customerId,
            number: `INV${String(values.year).slice(-2)}${values.customerCode}${String(sequence).padStart(5, "0")}`,
            year: values.year,
            sequence,
            issuedAt: values.date,
            status: values.status,
            total: values.total,
            paidAt: values.status === "PAID" ? new Date() : null,
            customerCode: values.customerCode,
            customerName: sameCustomer ? previous!.customerName : customer!.name,
            customerAddress: sameCustomer
              ? previous!.customerAddress
              : [customer!.address, customer!.city].filter(Boolean).join(", "),
            customerContact: sameCustomer ? previous!.customerContact : customer!.contact,
          };
          if (previous) {
            await tx.accountItem.deleteMany({ where: { invoiceId: id } });
            await tx.accountInvoice.update({
              where: { id },
              data: { ...record, items: { create: values.items } },
            });
          } else {
            await tx.accountInvoice.create({
              data: { ...record, id, items: { create: values.items } },
            });
          }
        }
      } else if (action === "settings.image") {
        const kind = data.kind;
        if (kind !== "logo" && kind !== "signature")
          throw new WorkspaceError("Jenis gambar tidak valid.");
        const value = text(data, "value", 2_800_000);
        if (value) {
          try {
            decodePrivateImage(value);
          } catch (error) {
            throw new WorkspaceError(
              error instanceof Error ? error.message : "Gambar tidak valid.",
            );
          }
        }
        await tx.accountSettings.upsert({
          where: { userId },
          create: { userId, [kind]: value },
          update: { [kind]: value },
        });
      } else if (action === "settings.save") {
        const values = {
          name: text(data, "name", 100, true),
          email: text(data, "email", 150),
          address: text(data, "address", 500),
          phone: text(data, "phone", 40),
          bankName: text(data, "bankName", 80),
          accountName: text(data, "accountName", 150),
          accountNumber: text(data, "accountNumber", 60),
          invoiceAuthor: text(data, "invoiceAuthor", 150),
        };
        await tx.accountSettings.upsert({
          where: { userId },
          create: { userId, ...values },
          update: values,
        });
      } else throw new WorkspaceError("Operasi tidak tersedia.");
    });
    return json(await loadWorkspace(userId));
  } catch (error) {
    if (error instanceof WorkspaceError) return json({ error: error.message }, error.status);
    return json({ error: "Data gagal disimpan. Periksa koneksi dan coba lagi." }, 503);
  }
}
