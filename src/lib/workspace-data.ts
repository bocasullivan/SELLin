import "server-only";
import { getDatabase } from "@/lib/db";
import type { Invoice } from "@/lib/invoice";
import { initialBusiness } from "@/lib/business";
import { privateImageUrl } from "@/lib/private-image";
import type { RecordInfo } from "@/lib/record-info";
// REVISI : Finalisasi penghapusan tertunda saat workspace dimuat.
import { cleanupInvoiceDeletes } from "@/lib/invoice-deletion";
// REVISI END

export async function loadWorkspace(userId: string) {
  // REVISI : Cleanup server bertahan meskipun browser ditutup.
  await cleanupInvoiceDeletes(userId);
  // REVISI END
  const db = getDatabase();
  // Only resolve the authenticated owner's identity; never expose other accounts.
  const owner = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  const recordInfo = (record: {
    version: number;
    createdByUserId: string;
    updatedByUserId: string;
    createdAt: Date;
    updatedAt: Date;
  }): RecordInfo => ({
    version: record.version,
    createdBy: record.createdByUserId === userId ? (owner?.email ?? "—") : "—",
    createdAt: record.createdAt.toISOString(),
    updatedBy: record.updatedByUserId === userId ? (owner?.email ?? "—") : "—",
    updatedAt: record.updatedAt.toISOString(),
  });
  const [customers, records, settings, counter] = await Promise.all([
    db.accountCustomer.findMany({ where: { userId, deletedAt: null }, orderBy: { code: "asc" } }),
    db.accountInvoice.findMany({
      where: { userId },
      // REVISI : Lookup customer terbaru melalui UUID setelah kode diganti.
      include: { customer: true, items: { orderBy: { position: "asc" } } },
      // REVISI END
      orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
    }),
    db.accountSettings.findUnique({ where: { userId } }),
    db.accountCounter.findUnique({ where: { userId } }),
  ]);
  const invoices: Invoice[] = records.map((record) => ({
    info: recordInfo(record),
    id: record.id,
    number: record.number,
    // REVISI : Gunakan kode aktif untuk pilihan form, snapshot cetak tetap dipertahankan.
    customerId: record.customer.deletedAt ? record.customerCode : record.customer.code,
    // REVISI END
    client: record.customerName,
    email: record.customerContact,
    address: record.customerAddress,
    issued: record.issuedAt.toISOString().slice(0, 10),
    due: record.issuedAt.toISOString().slice(0, 10),
    status: record.status === "PAID" ? "Lunas" : "Belum dibayar",
    items: record.items.map((item) => ({
      id: item.id,
      device: item.device,
      description: item.description,
      quantity: item.quantity,
      price: Number(item.unitPrice),
    })),
    discount: 0,
    tax: 0,
    notes: "",
  }));
  return {
    customers: customers.map((record) => ({
      id: record.code,
      name: record.name,
      address: record.address,
      city: record.city,
      contact: record.contact,
      notes: record.notes,
      info: recordInfo(record),
    })),
    // REVISI : Sembunyikan invoice pending; nomor tetap dicadangkan selama Undo.
    invoices: invoices.filter(
      (_, index) => !records[index].deletedAt && !records[index].deleteAfter,
    ),
    pendingDeletes: records
      .filter((record) => record.deleteAfter)
      .map((record) => ({
        id: record.id,
        number: record.number,
        deadline: record.deleteAfter!.toISOString(),
      })),
    // REVISI END
    numberingInvoices: invoices,
    business: settings
      ? {
          name: settings.name,
          email: settings.email,
          address: settings.address,
          phone: settings.phone,
          bankName: settings.bankName,
          accountName: settings.accountName,
          accountNumber: settings.accountNumber,
          invoiceAuthor: settings.invoiceAuthor,
          logo: settings.logo ? privateImageUrl("logo", settings.updatedAt.toISOString()) : "",
          signature: settings.signature
            ? privateImageUrl("signature", settings.updatedAt.toISOString())
            : "",
        }
      : { ...initialBusiness, name: "" },
    usedCustomerIds: Array.from({ length: (counter?.lastCode ?? 4100) - 4100 }, (_, index) =>
      String(4101 + index),
    ),
  };
}
