import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateTotals,
  isOverdue,
  nextCustomerId,
  nextInvoiceNumber,
  type Invoice,
} from "../src/lib/invoice.ts";

test("menghitung subtotal, diskon, lalu pajak", () => {
  assert.deepEqual(
    calculateTotals([{ id: "1", description: "Jasa", quantity: 2, price: 100000 }], 10, 11),
    { subtotal: 200000, discountAmount: 20000, taxAmount: 19800, total: 199800 },
  );
});
test("invoice kosong bernilai nol", () => {
  assert.equal(calculateTotals([], 0, 0).total, 0);
});
test("ID customer otomatis dan batas 4199", () => {
  assert.equal(nextCustomerId([]), "4101");
  assert.equal(nextCustomerId(["4101", "4110"]), "4111");
  // Daftar ID terpakai tetap mencatat customer yang dihapus, termasuk ID terakhir.
  assert.equal(nextCustomerId(["4101", "4102", "4103", "4104"]), "4105");
  assert.throws(() => nextCustomerId(["4199"]));
});
test("nomor invoice berurutan per customer per tahun", () => {
  const invoices = [
    { customerId: "4102", issued: "2026-01-01", number: "INV26410200005" },
    { customerId: "4101", issued: "2026-01-01", number: "INV26410100020" },
  ] as Invoice[];
  assert.equal(nextInvoiceNumber(invoices, "4102", "2026-10-08"), "INV26410200006");
  assert.equal(nextInvoiceNumber(invoices, "4102", "2027-01-01"), "INV27410200001");
  assert.equal(nextInvoiceNumber(invoices, "4103", "2026-10-08"), "INV26410300001");
  assert.throws(() => nextInvoiceNumber(invoices, "4100", "2026-01-01"));
});
test("hanya tagihan belum dibayar yang dapat terlambat", () => {
  const base = { due: "2026-10-01", status: "Belum dibayar" as const };
  assert.equal(isOverdue(base as Parameters<typeof isOverdue>[0], "2026-10-08"), true);
  assert.equal(
    isOverdue({ ...base, status: "Lunas" } as Parameters<typeof isOverdue>[0], "2026-10-08"),
    false,
  );
  assert.equal(isOverdue(base as Parameters<typeof isOverdue>[0], "2026-10-01"), false);
});
