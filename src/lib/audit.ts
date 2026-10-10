import "server-only";

type AuditChange = {
  field: string;
  label: string;
  before: unknown;
  after: unknown;
};

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object" && "toString" in value && !Array.isArray(value)) {
    const text = String(value);
    if (/^-?\d+(\.\d+)?$/.test(text)) return text;
  }
  return value;
}

export function diffFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
  labels: Record<string, string>,
): AuditChange[] {
  return Object.keys(labels).flatMap((field) => {
    const oldValue = normalize(before?.[field]);
    const newValue = normalize(after[field]);
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return [];
    return [{ field, label: labels[field], before: oldValue ?? null, after: newValue ?? null }];
  });
}

export function jsonSafe(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as object;
}

export function invoiceAuditSnapshot(record: {
  number: string;
  issuedAt: Date;
  status: string;
  customerCode: string;
  customerName: string;
  customerAddress: string;
  customerContact: string;
  total: unknown;
  items: Array<Record<string, unknown>>;
}) {
  return {
    number: record.number,
    issuedAt: record.issuedAt,
    status: record.status,
    customerCode: record.customerCode,
    customerName: record.customerName,
    customerAddress: record.customerAddress,
    customerContact: record.customerContact,
    total: normalize(record.total),
    items: record.items.map((item) => ({
      position: item.position,
      device: item.device,
      description: item.description,
      quantity: item.quantity,
      unitPrice: normalize(item.unitPrice),
      lineTotal: normalize(item.lineTotal),
    })),
  };
}
