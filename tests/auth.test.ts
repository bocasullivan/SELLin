import assert from "node:assert/strict";
import test from "node:test";
import {
  hashPassword,
  hashToken,
  sessionExpiry,
  validateCredentials,
  verifyPassword,
} from "../src/lib/auth-utils.ts";

test("passwords are salted and verified without storing plaintext", async () => {
  const password = "test-only-passphrase";
  const hash = await hashPassword(password);
  assert.notEqual(hash, await hashPassword(password));
  assert.equal(hash.includes(password), false);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
  assert.equal(await verifyPassword(password, "invalid"), false);
});

test("session inactivity window is exactly three days", () => {
  const now = new Date("2026-10-08T00:00:00Z");
  assert.equal(sessionExpiry(now).toISOString(), "2026-10-11T00:00:00.000Z");
  assert.equal(hashToken("secret").length, 64);
});

test("registration accepts eight characters and rejects seven", () => {
  const credentials = { email: "user@example.com", password: "12345678", confirmation: "12345678" };
  assert.deepEqual(validateCredentials(credentials, true).errors, {});
  assert.equal(
    validateCredentials({ ...credentials, password: "1234567", confirmation: "1234567" }, true)
      .errors.password,
    "short",
  );
});

test("server validates and normalizes registration credentials", () => {
  const result = validateCredentials(
    { email: " User@Example.com ", password: "long-password", confirmation: "long-password" },
    true,
  );
  assert.equal(result.email, "user@example.com");
  assert.deepEqual(result.errors, {});
  const invalid = validateCredentials(
    { email: "wrong", password: "short", confirmation: "different" },
    true,
  );
  assert.deepEqual(invalid.errors, {
    email: "invalid",
    password: "short",
    confirmation: "mismatch",
  });
  assert.equal(
    validateCredentials({ email: "a@b.com", password: "a".repeat(129) }, false).errors.password,
    "long",
  );
});
