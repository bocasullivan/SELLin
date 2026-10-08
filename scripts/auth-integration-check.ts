import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashToken } from "../src/lib/auth-utils";

// Explicit local-only smoke check. Creates one synthetic account, then removes
// only that account and its own sessions. Never operates on real user accounts.
const base = process.env.AUTH_TEST_ORIGIN ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) {
  throw new Error("Auth integration check is restricted to localhost.");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const database = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const email = `auth-test-${randomBytes(12).toString("hex")}@example.invalid`;
const password = randomBytes(24).toString("hex");
let userId: string | undefined;

async function post(action: string, body: object, cookie = "") {
  return fetch(`${base}/api/auth/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base, Cookie: cookie },
    body: JSON.stringify(body),
    redirect: "manual",
  });
}

try {
  assert.equal((await fetch(base, { redirect: "manual" })).status, 307);
  const registered = await post("register", { email, password, confirmation: password });
  assert.equal(registered.status, 201);
  const user = await database.user.findUniqueOrThrow({ where: { email } });
  userId = user.id;
  assert.notEqual(user.passwordHash, password);
  assert.equal(
    (await post("register", { email: email.toUpperCase(), password, confirmation: password }))
      .status,
    409,
  );
  assert.equal((await post("login", { email, password: "incorrect" })).status, 401);
  const login = await post("login", { email, password });
  assert.equal(login.status, 200);
  const setCookie = login.headers.get("set-cookie")!;
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=lax/i);
  assert.match(setCookie, /Max-Age=259200/i);
  const cookie = setCookie.split(";")[0];
  const tokenHash = hashToken(cookie.split("=")[1]);
  assert.equal(
    (await fetch(base, { headers: { Cookie: cookie }, redirect: "manual" })).status,
    200,
  );
  await database.session.update({
    where: { tokenHash },
    data: { expiresAt: new Date(Date.now() + 60_000) },
  });
  assert.equal((await post("activity", {}, cookie)).status, 200);
  const refreshed = await database.session.findUniqueOrThrow({ where: { tokenHash } });
  assert.ok(refreshed.expiresAt.getTime() - Date.now() > 259_000_000);
  assert.equal((await post("logout", {}, cookie)).status, 200);
  assert.equal(await database.session.count({ where: { tokenHash } }), 0);
  assert.equal(
    (await fetch(base, { headers: { Cookie: cookie }, redirect: "manual" })).status,
    307,
  );

  const second = await post("login", { email, password });
  const expiredCookie = second.headers.get("set-cookie")!.split(";")[0];
  await database.session.updateMany({
    where: { userId },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  assert.equal((await post("activity", {}, expiredCookie)).status, 401);
  assert.equal(
    (await fetch(base, { headers: { Cookie: expiredCookie }, redirect: "manual" })).status,
    307,
  );
  if (process.env.AUTH_TEST_SECURITY === "true") {
    const forbidden = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://other.example.invalid" },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(forbidden.status, 403);
    await database.authAttempt.deleteMany({ where: { key: hashToken(`auth:${email}`) } });
    for (let attempt = 0; attempt < 10; attempt++) {
      assert.equal((await post("login", { email, password: "incorrect" })).status, 401);
    }
    assert.equal((await post("login", { email, password })).status, 429);
    console.log("PASS: cross-origin request rejected and login rate limiting enforced.");
  }
  console.log(
    "PASS: protected dashboard, register, duplicate email, wrong password, login, cookie, sliding expiry, logout, expired session.",
  );
} finally {
  if (userId) await database.user.delete({ where: { id: userId } });
  await database.authAttempt.deleteMany({ where: { key: hashToken(`auth:${email}`) } });
  await database.$disconnect();
}
