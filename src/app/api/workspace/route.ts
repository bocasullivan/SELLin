import { getSession } from "@/lib/auth";
import { allowedOrigin } from "@/lib/auth-security";
import { getDatabase } from "@/lib/db";
import { loadWorkspace } from "@/lib/workspace-data";
import { customerData, invoiceData, text, WorkspaceError } from "@/lib/workspace-validation";
import { decodePrivateImage } from "@/lib/private-image";
import { diffFields, invoiceAuditSnapshot, jsonSafe } from "@/lib/audit";
// REVISI : Cleanup invoice dalam transaksi mutasi akun.
import { finalizeInvoiceDeletes } from "@/lib/invoice-deletion";
// REVISI END

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
      // REVISI : Hard delete final sebelum mengalokasikan nomor atau menerima Undo.
      await finalizeInvoiceDeletes(tx, userId);
      if (action === "invoice.finalize") return;
      // REVISI END
      if (action === "customer.save") {
        const values = customerData(data);
        // REVISI : Kode manual unik per akun; gunakan kode lama untuk lookup saat edit.
        const code = text(data, "id", 10, true).toUpperCase();
        if (!/^[A-Z0-9_-]{1,10}$/.test(code))
          throw new WorkspaceError("Kode customer maksimal 10 karakter: huruf, angka, - atau _.");
        const lookupCode = data.existing ? text(data, "originalCode", 10, true) : code;
        const duplicate = await tx.accountCustomer.findFirst({ where: { userId, code } });
        if (duplicate && (!data.existing || duplicate.code !== lookupCode))
          throw new WorkspaceError("Kode customer sudah digunakan.", 409);
        const customerValues = { ...values, code };
        // REVISI END
        if (data.existing) {
          const previous = await tx.accountCustomer.findFirst({
            // REVISI : Lookup identitas sebelum kode diedit.
            where: { userId, code: lookupCode, deletedAt: null },
            // REVISI END
          });
          if (!previous) throw new WorkspaceError("Customer tidak ditemukan.", 404);
          // REVISI : Audit perubahan kode customer.
          const changes = diffFields(previous, customerValues, {
            code: "Kode customer",
            name: "Nama",
            address: "Alamat",
            city: "Kota",
            contact: "Kontak",
            notes: "Catatan",
          });
          // REVISI END
          if (changes.length) {
            const after = await tx.accountCustomer.update({
              where: { id: previous.id },
              data: {
                // REVISI : Simpan kode baru tanpa mengubah UUID atau snapshot invoice lama.
                ...customerValues,
                // REVISI END
                version: { increment: 1 },
                updatedByUserId: userId,
              },
            });
            await tx.auditTrail.create({
              data: {
                userId,
                actorUserId: userId,
                entityType: "CUSTOMER",
                entityId: after.id,
                version: after.version,
                action: "UPDATE",
                changes: jsonSafe(changes),
              },
            });
          }
        } else {
          // REVISI : Customer baru tidak lagi memakai counter 4101-4199.
          const created = await tx.accountCustomer.create({
            data: {
              userId,
              code,
              createdByUserId: userId,
              updatedByUserId: userId,
              ...values,
            },
          });
          // REVISI END
          await tx.auditTrail.create({
            data: {
              userId,
              actorUserId: userId,
              entityType: "CUSTOMER",
              entityId: created.id,
              version: created.version,
              action: "CREATE",
              changes: [{ field: "record", label: "Data customer", before: null, after: values }],
            },
          });
        }
      } else if (action === "customer.delete") {
        const previous = await tx.accountCustomer.findFirst({
          where: { userId, code: String(data.id), deletedAt: null },
        });
        if (!previous) throw new WorkspaceError("Customer tidak ditemukan.", 404);
        const deleted = await tx.accountCustomer.update({
          where: { id: previous.id },
          data: {
            deletedAt: new Date(),
            version: { increment: 1 },
            updatedByUserId: userId,
          },
        });
        await tx.auditTrail.create({
          data: {
            userId,
            actorUserId: userId,
            entityType: "CUSTOMER",
            entityId: deleted.id,
            version: deleted.version,
            action: "DELETE",
            changes: [
              { field: "deletedAt", label: "Customer", before: null, after: deleted.deletedAt },
            ],
          },
        });
        // REVISI : Pending delete dan Undo server, maksimal 5 detik.
      } else if (["invoice.save", "invoice.delete", "invoice.undo"].includes(action)) {
        const id = text(data, "id", 36, true);
        if (!/^[a-f0-9-]{36}$/i.test(id)) throw new WorkspaceError("ID invoice tidak valid.");
        const previous = await tx.accountInvoice.findFirst({
          where: { id, userId, deletedAt: null },
          include: { items: { orderBy: { position: "asc" } } },
        });
        if (action === "invoice.delete") {
          if (!previous) throw new WorkspaceError("Invoice tidak ditemukan.", 404);
          if (previous.deleteAfter)
            throw new WorkspaceError("Invoice sudah menunggu penghapusan.", 409);
          await tx.accountInvoice.update({
            where: { id },
            data: { deleteAfter: new Date(Date.now() + 5000), updatedAt: previous.updatedAt },
          });
        } else if (action === "invoice.undo") {
          if (!previous?.deleteAfter || previous.deleteAfter.getTime() <= Date.now())
            throw new WorkspaceError("Waktu Undo sudah habis.", 409);
          await tx.accountInvoice.update({
            where: { id },
            data: { deleteAfter: null, updatedAt: previous.updatedAt },
          });
        } else {
          if (previous?.deleteAfter) throw new WorkspaceError("Invoice menunggu penghapusan.", 409);
          // REVISI END
          if (data.existing && !previous) throw new WorkspaceError("Invoice tidak ditemukan.", 404);
          const values = invoiceData(data);
          const customer = await tx.accountCustomer.findFirst({
            where: { userId, code: values.customerCode, deletedAt: null },
          });
          // Editing an old invoice after customer deletion preserves its existing snapshot.
          if (!customer && (!previous || previous.customerCode !== values.customerCode))
            throw new WorkspaceError("Pilih customer yang aktif.");
          const customerId = customer?.id ?? previous!.customerId;
          // REVISI : Nomor terbesar tersisa per akun/tahun + 1; edit mempertahankan nomor.
          const largest = previous
            ? null
            : await tx.accountInvoice.aggregate({
                where: { userId, year: values.year },
                _max: { sequence: true },
              });
          const sequence = previous?.sequence ?? (largest?._max.sequence ?? 0) + 1;
          if (sequence > 999999) throw new WorkspaceError("Nomor urut invoice sudah habis.");
          // REVISI END
          const sameCustomer = previous?.customerId === customerId;
          const record = {
            userId,
            customerId,
            // REVISI : Identitas invoice tahunan stabil.
            number:
              previous?.number ??
              `INV${String(values.year).slice(-2)}${String(sequence).padStart(6, "0")}`,
            year: previous?.year ?? values.year,
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
            createdByUserId: previous?.createdByUserId ?? userId,
            updatedByUserId: userId,
            // REVISI END
          };
          if (previous) {
            const nextSnapshot = invoiceAuditSnapshot({ ...record, items: values.items });
            const previousSnapshot = invoiceAuditSnapshot(previous);
            const changes = diffFields(previousSnapshot, nextSnapshot, {
              issuedAt: "Tanggal invoice",
              status: "Status",
              customerCode: "ID customer",
              customerName: "Nama customer",
              customerAddress: "Alamat customer",
              customerContact: "Kontak customer",
              total: "Total",
              items: "Item invoice",
            });
            if (!changes.length) return;
            await tx.accountItem.deleteMany({ where: { invoiceId: id } });
            const updated = await tx.accountInvoice.update({
              where: { id },
              data: {
                ...record,
                version: { increment: 1 },
                updatedByUserId: userId,
                items: { create: values.items },
              },
            });
            await tx.auditTrail.create({
              data: {
                userId,
                actorUserId: userId,
                entityType: "INVOICE",
                entityId: updated.id,
                version: updated.version,
                action: "UPDATE",
                changes: jsonSafe(changes),
              },
            });
          } else {
            const created = await tx.accountInvoice.create({
              data: { ...record, id, items: { create: values.items } },
            });
            await tx.auditTrail.create({
              data: {
                userId,
                actorUserId: userId,
                entityType: "INVOICE",
                entityId: created.id,
                version: created.version,
                action: "CREATE",
                changes: jsonSafe([
                  {
                    field: "record",
                    label: "Data invoice",
                    before: null,
                    after: invoiceAuditSnapshot({ ...record, items: values.items }),
                  },
                ]),
              },
            });
          }
        }
      } else if (action === "settings.image") {
        const kind = data.kind as "logo" | "signature";
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
        const previous = await tx.accountSettings.findUnique({ where: { userId } });
        const updated = await tx.accountSettings.upsert({
          where: { userId },
          create: { userId, createdByUserId: userId, updatedByUserId: userId, [kind]: value },
          update: { [kind]: value, version: { increment: 1 }, updatedByUserId: userId },
        });
        if (previous && previous[kind] !== value) {
          await tx.auditTrail.create({
            data: {
              userId,
              actorUserId: userId,
              entityType: "SETTINGS",
              entityId: userId,
              version: updated.version,
              action: "UPDATE",
              changes: jsonSafe([
                {
                  field: kind,
                  label: kind === "logo" ? "Logo" : "Tanda tangan",
                  before: previous[kind],
                  after: value ? "updated" : "removed",
                },
              ]),
            },
          });
        }
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
        const previous = await tx.accountSettings.findUnique({ where: { userId } });
        const updated = await tx.accountSettings.upsert({
          where: { userId },
          create: { userId, createdByUserId: userId, updatedByUserId: userId, ...values },
          update: { ...values, version: { increment: 1 }, updatedByUserId: userId },
        });
        const changes = diffFields(previous, values, {
          name: "Nama bisnis",
          email: "Email bisnis",
          address: "Alamat bisnis",
          phone: "Telepon",
          bankName: "Nama bank",
          accountName: "Nama rekening",
          accountNumber: "Nomor rekening",
          invoiceAuthor: "Penanda tangan invoice",
        });
        if (changes.length) {
          await tx.auditTrail.create({
            data: {
              userId,
              actorUserId: userId,
              entityType: "SETTINGS",
              entityId: userId,
              version: updated.version,
              action: "UPDATE",
              changes: jsonSafe(changes),
            },
          });
        }
      } else throw new WorkspaceError("Operasi tidak tersedia.");
    });
    return json(await loadWorkspace(userId));
  } catch (error) {
    if (error instanceof WorkspaceError) return json({ error: error.message }, error.status);
    return json({ error: "Data gagal disimpan. Periksa koneksi dan coba lagi." }, 503);
  }
}
