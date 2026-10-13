import type { RecordInfo } from "./record-info";

export type InvoiceStatus = "Draft" | "Belum dibayar" | "Lunas";
export type InvoiceItem = {
  id: string;
  device?: string;
  description: string;
  quantity: number;
  price: number;
};
export type Invoice = {
  info?: RecordInfo;
  id: string;
  number: string;
  customerId?: string;
  client: string;
  email: string;
  address: string;
  issued: string;
  due: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  discount: number;
  tax: number;
  notes: string;
};

export function calculateTotals(items: InvoiceItem[], discount: number, tax: number) {
  const subtotal = items.reduce((sum, item) => sum + Math.round(item.quantity * item.price), 0);
  const discountAmount = Math.round((subtotal * discount) / 100);
  const taxAmount = Math.round(((subtotal - discountAmount) * tax) / 100);
  return { subtotal, discountAmount, taxAmount, total: subtotal - discountAmount + taxAmount };
}
export function currency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
export function dateLabel(value: string, language: "id" | "en" = "id") {
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
export function isOverdue(invoice: Invoice, today: string) {
  return invoice.status === "Belum dibayar" && invoice.due < today;
}
export function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function nextCustomerId(ids: string[]) {
  const last = Math.max(4100, ...ids.filter((id) => /^41\d{2}$/.test(id)).map(Number));
  if (last >= 4199) throw new Error("ID customer 4101–4199 sudah habis.");
  return String(last + 1);
}
export function nextInvoiceNumber(invoices: Invoice[], customerId: string, issued: string) {
  // REVISI : Perkiraan urutan terbesar per tahun tanpa tergantung customer.
  if (!customerId) throw new Error("Pilih customer yang valid.");
  const year = issued.slice(0, 4);
  const prefix = `INV${year.slice(-2)}`;
  const sequence =
    Math.max(
      0,
      ...invoices
        .filter((i) => i.number.startsWith(prefix) && /^INV\d{8}$/.test(i.number))
        .map((i) => Number(i.number.slice(prefix.length)) || 0),
    ) + 1;
  if (sequence > 999999) throw new Error("Nomor urut invoice tahun ini sudah habis.");
  return `${prefix}${String(sequence).padStart(6, "0")}`;
  // REVISI END
}
