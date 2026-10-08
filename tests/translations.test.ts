import { test } from "node:test";
import assert from "node:assert/strict";
import { translate } from "../src/lib/translations.ts";

test("English uses invoicing terminology", () => {
  assert.equal(translate("en", "Belum dibayar"), "Unpaid");
  assert.equal(translate("en", "Lunas"), "Paid");
  assert.equal(translate("en", "Total nominal invoice"), "Total invoiced");
});

test("Indonesian labels use consistent customer terminology", () => {
  assert.equal(translate("id", "New Customer"), "Pelanggan baru");
  assert.equal(translate("id", "Nama customer"), "Nama pelanggan");
  assert.equal(translate("id", "THANK YOU!"), "TERIMA KASIH!");
});
