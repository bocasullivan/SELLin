import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
export const SESSION_SECONDS = 3 * 24 * 60 * 60;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionExpiry(now = new Date()) {
  return new Date(now.getTime() + SESSION_SECONDS * 1000);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, digest] = encoded.split(":");
  if (algorithm !== "scrypt" || !salt || !/^[a-f0-9]{128}$/.test(digest ?? "")) return false;
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(key, Buffer.from(digest, "hex"));
}

export function validateCredentials(input: Record<string, unknown>, registering: boolean) {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const errors: Record<string, string> = {};
  if (!email) errors.email = "required";
  else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = "invalid";
  if (!password) errors.password = "required";
  else if (password.length > 128) errors.password = "long";
  else if (registering && password.length < 8) errors.password = "short";
  if (registering && input.confirmation !== password) errors.confirmation = "mismatch";
  return { email, password, errors };
}
