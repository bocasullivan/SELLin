import "server-only";
import { cookies } from "next/headers";
import { getDatabase } from "@/lib/db";
import { hashToken, SESSION_SECONDS } from "@/lib/auth-utils";

export const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-sellin-session" : "sellin-session";
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_SECONDS,
};

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await getDatabase().session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  return session;
}
