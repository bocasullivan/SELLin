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
// REVISI : Uji nomor tahunan gabungan dan penghapusan nomor akhir.
test("nomor invoice per tahun gabungan semua customer", () => {
  const invoices = [
    { customerId: "C00001", issued: "2026-01-01", number: "INV26000005" },
    { customerId: "OTHER", issued: "2026-01-01", number: "INV26000020" },
  ] as Invoice[];
  assert.equal(nextInvoiceNumber(invoices, "C00001", "2026-10-08"), "INV26000021");
  assert.equal(nextInvoiceNumber(invoices, "C00001", "2027-01-01"), "INV27000001");
  assert.equal(nextInvoiceNumber(invoices.slice(0, 1), "OTHER", "2026-01-01"), "INV26000006");
  assert.throws(() => nextInvoiceNumber(invoices, "", "2026-01-01"));
});
// REVISI END
test("hanya tagihan belum dibayar yang dapat terlambat", () => {
  const base = { due: "2026-10-01", status: "Belum dibayar" as const };
  assert.equal(isOverdue(base as Parameters<typeof isOverdue>[0], "2026-10-08"), true);
  assert.equal(
    isOverdue({ ...base, status: "Lunas" } as Parameters<typeof isOverdue>[0], "2026-10-08"),
    false,
  );
  assert.equal(isOverdue(base as Parameters<typeof isOverdue>[0], "2026-10-01"), false);
});
