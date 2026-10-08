import "server-only";
import { getDatabase } from "@/lib/db";
import { hashToken } from "@/lib/auth-utils";

export function securityEnabled(feature: "CSRF" | "RATE_LIMIT") {
  return (
    process.env.NODE_ENV !== "development" || process.env[`AUTH_${feature}_ENABLED`] === "true"
  );
}

// Origin validation plus JSON-only mutations. Never trust forwarded host headers.
export function allowedOrigin(request: Request) {
  if (!securityEnabled("CSRF")) return true;
  const expected = process.env.APP_ORIGIN;
  if (!expected && process.env.NODE_ENV === "production") return false;
  const origin = request.headers.get("origin");
  return origin === (expected ?? new URL(request.url).origin);
}

export async function allowAuthAttempt(email: string) {
  if (!securityEnabled("RATE_LIMIT")) return true;
  const key = hashToken(`auth:${email}`);
  // Atomic fixed-window counter shared by all server processes.
  const rows = await getDatabase().$queryRaw<{ count: number }[]>`
    INSERT INTO "AuthAttempt" ("key", "count", "windowStart")
    VALUES (${key}, 1, CURRENT_TIMESTAMP)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "AuthAttempt"."windowStart" < CURRENT_TIMESTAMP - INTERVAL '15 minutes'
        THEN 1 ELSE "AuthAttempt"."count" + 1 END,
      "windowStart" = CASE WHEN "AuthAttempt"."windowStart" < CURRENT_TIMESTAMP - INTERVAL '15 minutes'
        THEN CURRENT_TIMESTAMP ELSE "AuthAttempt"."windowStart" END
    RETURNING "count"
  `;
  return rows[0].count <= 10;
}
