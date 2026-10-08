import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const base = process.env.AUTH_TEST_ORIGIN ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Localhost only.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required.");
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const users: string[] = [];
const customer = {
  name: "Synthetic test customer",
  address: "Test street",
  city: "Test city",
  contact: "test@example.invalid",
  notes: "",
};
const settings = {
  name: "Synthetic test business",
  email: "",
  address: "",
  phone: "",
  bankName: "Bank",
  accountName: "Test",
  accountNumber: "123",
  invoiceAuthor: "Test",
  logo: "",
  signature: "",
};
async function post(path: string, body: object, cookie = "") {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base, Cookie: cookie },
    body: JSON.stringify(body),
  });
}
async function createAccount() {
  const email = `workspace-test-${randomBytes(12).toString("hex")}@example.invalid`;
  const password = randomBytes(20).toString("hex");
  assert.equal(
    (await post("/api/auth/register", { email, password, confirmation: password })).status,
    201,
  );
  users.push((await db.user.findUniqueOrThrow({ where: { email } })).id);
  const response = await post("/api/auth/login", { email, password });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie")!.split(";")[0];
}
async function mutate(cookie: string, action: string, data: object) {
  const response = await post("/api/workspace", { action, data }, cookie);
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  return result;
}
async function read(cookie: string) {
  const response = await fetch(`${base}/api/workspace`, { headers: { Cookie: cookie } });
  assert.equal(response.status, 200);
  return response.json();
}
try {
  assert.equal((await fetch(`${base}/api/workspace`)).status, 401);
  const a = await createAccount();
  const b = await createAccount();
  assert.equal((await read(a)).invoices.length, 0);
  const concurrent = await Promise.all([
    mutate(a, "customer.save", customer),
    mutate(a, "customer.save", { ...customer, name: "Second" }),
  ]);
  assert.ok(concurrent.length);
  assert.deepEqual(
    (await read(a)).customers.map((c: { id: string }) => c.id),
    ["4101", "4102"],
  );
  await mutate(a, "customer.delete", { id: "4102" });
  const third = await mutate(a, "customer.save", { ...customer, name: "Third" });
  assert.equal(third.customers.at(-1).id, "4103");
  await mutate(b, "customer.save", { ...customer, name: "Private B" });
  assert.equal((await read(b)).customers[0].id, "4101");
  assert.equal(
    (await post("/api/workspace", { action: "customer.delete", data: { id: "4103" } }, b)).status,
    404,
  );
  const invoice = {
    id: randomUUID(),
    customerId: "4101",
    issued: "2026-10-08",
    status: "Belum dibayar",
    items: [{ description: "Service", device: "Laptop", quantity: 2, price: 125000 }],
  };
  const saved = await mutate(a, "invoice.save", invoice);
  assert.equal(saved.invoices[0].number, "INV26410100001");
  const row = await db.accountInvoice.findUniqueOrThrow({ where: { id: invoice.id } });
  assert.equal(Number(row.total), 250000);
  await mutate(a, "customer.save", {
    ...customer,
    id: "4101",
    existing: true,
    name: "Changed name",
  });
  assert.equal((await read(a)).invoices[0].client, customer.name);
  assert.equal(
    (await post("/api/workspace", { action: "invoice.delete", data: { id: invoice.id } }, b))
      .status,
    404,
  );
  assert.equal(
    (
      await post(
        "/api/workspace",
        { action: "invoice.save", data: { ...invoice, existing: true } },
        b,
      )
    ).status,
    404,
  );
  await mutate(a, "invoice.delete", { id: invoice.id });
  const secondInvoice = { ...invoice, id: randomUUID() };
  const next = await mutate(a, "invoice.save", secondInvoice);
  assert.equal(next.invoices[0].number, "INV26410100002");
  await mutate(a, "invoice.save", { ...secondInvoice, existing: true, status: "Lunas" });
  const corrected = await mutate(a, "invoice.save", { ...secondInvoice, existing: true });
  assert.equal(corrected.invoices[0].status, "Belum dibayar");
  assert.equal(corrected.invoices[0].number, "INV26410100002");
  await mutate(a, "invoice.save", { ...secondInvoice, existing: true, status: "Lunas" });
  const removable = { ...invoice, id: randomUUID(), status: "Lunas" };
  await mutate(a, "invoice.save", removable);
  await mutate(a, "invoice.delete", { id: removable.id });
  assert.equal(
    (await read(a)).invoices.some((record: { id: string }) => record.id === removable.id),
    false,
  );
  await mutate(a, "settings.save", settings);
  const png =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
  await mutate(a, "settings.image", { kind: "logo", value: png });
  const imageUrl = (await read(a)).business.logo;
  assert.ok(imageUrl.startsWith("/api/settings/image/logo?v="));
  assert.equal((await fetch(`${base}${imageUrl}`)).status, 401);
  assert.equal((await fetch(`${base}${imageUrl}`, { headers: { Cookie: b } })).status, 404);
  const privateImage = await fetch(`${base}${imageUrl}`, { headers: { Cookie: a } });
  assert.equal(privateImage.status, 200);
  assert.equal(privateImage.headers.get("content-type"), "image/png");
  assert.match(privateImage.headers.get("cache-control")!, /no-store/);
  assert.ok((await privateImage.arrayBuffer()).byteLength > 0);
  assert.equal((await read(a)).business.bankName, "Bank");
  assert.equal((await read(b)).business.bankName, "");
  await mutate(a, "customer.delete", { id: "4101" });
  assert.equal((await read(a)).invoices[0].client, "Changed name");
  assert.equal((await read(b)).invoices.length, 0);
  console.log(
    "PASS: persistent CRUD/settings, server totals, concurrency, non-reused numbering, snapshots, paid invoice corrections/deletion, authentication and tenant isolation.",
  );
} finally {
  // Only records belonging to the synthetic accounts created by this invocation.
  await db.accountInvoice.deleteMany({ where: { userId: { in: users } } });
  await db.accountSequence.deleteMany({ where: { userId: { in: users } } });
  await db.accountCustomer.deleteMany({ where: { userId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
}
