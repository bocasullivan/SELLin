import "server-only";
import { getDatabase } from "@/lib/db";
import type { Invoice } from "@/lib/invoice";
import { initialBusiness } from "@/lib/business";
import { privateImageUrl } from "@/lib/private-image";

export async function loadWorkspace(userId: string) {
  const db = getDatabase();
  const [customers, records, settings, counter] = await Promise.all([
    db.accountCustomer.findMany({ where: { userId, deletedAt: null }, orderBy: { code: "asc" } }),
    db.accountInvoice.findMany({
      where: { userId },
      include: { items: { orderBy: { position: "asc" } } },
      orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
    }),
    db.accountSettings.findUnique({ where: { userId } }),
    db.accountCounter.findUnique({ where: { userId } }),
  ]);
  const invoices: Invoice[] = records.map((record) => ({
    id: record.id,
    number: record.number,
    customerId: record.customerCode,
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
    customers: customers.map(({ code, name, address, city, contact, notes }) => ({
      id: code,
      name,
      address,
      city,
      contact,
      notes,
    })),
    invoices: invoices.filter((_, index) => !records[index].deletedAt),
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
