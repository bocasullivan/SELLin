import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { getSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { allowedOrigin, allowAuthAttempt } from "@/lib/auth-security";
import {
  hashPassword,
  hashToken,
  sessionExpiry,
  validateCredentials,
  verifyPassword,
} from "@/lib/auth-utils";

export const runtime = "nodejs";

function reply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (!["login", "register", "logout", "activity"].includes(action))
    return reply({ error: "notFound" }, 404);
  if (!allowedOrigin(request)) return reply({ error: "forbidden" }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return reply({ error: "invalid" }, 415);

  try {
    const database = getDatabase();
    const cookieStore = await cookies();
    if (action === "logout") {
      const token = cookieStore.get(SESSION_COOKIE)?.value;
      if (token) await database.session.deleteMany({ where: { tokenHash: hashToken(token) } });
      cookieStore.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
      return reply({ ok: true });
    }
    if (action === "activity") {
      const session = await getSession();
      if (!session) {
        cookieStore.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
        return reply({ error: "expired" }, 401);
      }
      const expiresAt = sessionExpiry();
      const updated = await database.session.updateMany({
        where: { id: session.id, expiresAt: { gt: new Date() } },
        data: { lastActiveAt: new Date(), expiresAt },
      });
      if (!updated.count) return reply({ error: "expired" }, 401);
      cookieStore.set(SESSION_COOKIE, cookieStore.get(SESSION_COOKIE)!.value, {
        ...sessionCookieOptions,
        expires: expiresAt,
      });
      return reply({ ok: true });
    }

    // Bound the request before parsing or hashing untrusted passwords.
    const text = await request.text();
    if (text.length > 4096) return reply({ error: "invalid" }, 413);
    let input: Record<string, unknown>;
    try {
      input = JSON.parse(text);
      if (!input || typeof input !== "object" || Array.isArray(input))
        return reply({ error: "invalid" }, 400);
    } catch {
      return reply({ error: "invalid" }, 400);
    }
    const { email, password, errors } = validateCredentials(input, action === "register");
    if (Object.keys(errors).length) return reply({ errors }, 400);
    if (!(await allowAuthAttempt(email))) return reply({ error: "limited" }, 429);

    let user;
    if (action === "register") {
      const passwordHash = await hashPassword(password);
      try {
        user = await database.user.create({ data: { email, passwordHash } });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002"
        ) {
          return reply({ errors: { email: "exists" } }, 409);
        }
        throw error;
      }
      // Registration saves the account; the user then signs in on the login page.
      return reply({ ok: true }, 201);
    }
    user = await database.user.findUnique({ where: { email } });
    // Do equivalent password work for unknown emails; do not expose account existence.
    const dummy = "scrypt:00000000000000000000000000000000:" + "0".repeat(128);
    const valid = await verifyPassword(password, user?.passwordHash ?? dummy);
    if (!user || !valid) return reply({ errors: { password: "credentials" } }, 401);

    const token = randomBytes(32).toString("hex");
    const expiresAt = sessionExpiry();
    await database.session.create({
      data: { tokenHash: hashToken(token), userId: user.id, expiresAt },
    });
    const previous = cookieStore.get(SESSION_COOKIE)?.value;
    if (previous) await database.session.deleteMany({ where: { tokenHash: hashToken(previous) } });
    cookieStore.set(SESSION_COOKIE, token, { ...sessionCookieOptions, expires: expiresAt });
    return reply({ ok: true });
  } catch {
    // Do not log database URLs, credentials, password hashes, or session tokens.
    return reply({ error: "unavailable" }, 503);
  }
}
