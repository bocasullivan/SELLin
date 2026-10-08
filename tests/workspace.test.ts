import test from "node:test";
import assert from "node:assert/strict";
import { invoiceData, customerData } from "../src/lib/workspace-validation.ts";

const invoice = {
  customerId: "4101",
  issued: "2026-10-08",
  status: "Belum dibayar",
  items: [{ description: "Service", device: "Laptop", quantity: 2, price: 100000 }],
};
test("server computes totals and rejects invalid quantities, money and dates", () => {
  assert.equal(invoiceData({ ...invoice, total: 1 }).total, 200000);
  assert.throws(() => invoiceData({ ...invoice, issued: "2026-02-30" }));
  assert.throws(() =>
    invoiceData({ ...invoice, items: [{ description: "Service", quantity: 1, price: 1.5 }] }),
  );
  assert.throws(() => invoiceData({ ...invoice, items: [] }));
  assert.throws(() => customerData({ name: "" }));
});
