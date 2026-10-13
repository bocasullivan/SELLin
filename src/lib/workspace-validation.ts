export class WorkspaceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function text(input: Record<string, unknown>, key: string, max: number, required = false) {
  const value = input[key];
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) {
    throw new WorkspaceError(`Data ${key} tidak valid.`);
  }
  return value.trim();
}

export function customerData(input: Record<string, unknown>) {
  return {
    name: text(input, "name", 100, true),
    address: text(input, "address", 500),
    city: text(input, "city", 100),
    contact: text(input, "contact", 150),
    notes: text(input, "notes", 1000),
  };
}

export function invoiceData(input: Record<string, unknown>) {
  // REVISI : Terima kode customer manual hingga 10 karakter.
  const customerCode = text(input, "customerId", 10, true);
  // REVISI END
  const issued = text(input, "issued", 10, true);
  const date = new Date(`${issued}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(issued) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== issued ||
    date.getUTCFullYear() < 2000 ||
    date.getUTCFullYear() > 2099
  )
    throw new WorkspaceError("Tanggal invoice tidak valid.");
  if (!["Belum dibayar", "Lunas"].includes(String(input.status)))
    throw new WorkspaceError("Status invoice tidak valid.");
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 100)
    throw new WorkspaceError("Invoice harus memiliki 1–100 item.");
  const items = input.items.map((item: Record<string, unknown>, position: number) => {
    if (!item || typeof item !== "object") throw new WorkspaceError("Item tidak valid.");
    const quantity = item.quantity;
    const price = item.price;
    if (
      !Number.isSafeInteger(quantity) ||
      Number(quantity) < 1 ||
      Number(quantity) > 100000 ||
      !Number.isSafeInteger(price) ||
      Number(price) < 0 ||
      Number(price) > 100000000000
    )
      throw new WorkspaceError("Qty atau harga item tidak valid. Harga harus berupa Rupiah bulat.");
    const lineTotal = Number(quantity) * Number(price);
    if (!Number.isSafeInteger(lineTotal)) throw new WorkspaceError("Nilai item terlalu besar.");
    return {
      position,
      device: text({ ...item, device: item.device ?? "" }, "device", 150),
      description: text(item, "description", 200, true),
      quantity: Number(quantity),
      unitPrice: Number(price),
      lineTotal,
    };
  });
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
  if (!Number.isSafeInteger(total)) throw new WorkspaceError("Total invoice terlalu besar.");
  return {
    customerCode,
    date,
    year: date.getUTCFullYear(),
    status: input.status === "Lunas" ? ("PAID" as const) : ("UNPAID" as const),
    items,
    total,
  };
}
