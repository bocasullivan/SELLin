import { getSession } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { decodePrivateImage } from "@/lib/private-image";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ kind: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  const session = await getSession();
  if (!session) return new Response(null, { status: 401, headers });
  const { kind } = await context.params;
  if (kind !== "logo" && kind !== "signature") return new Response(null, { status: 404, headers });
  const settings = await getDatabase().accountSettings.findUnique({
    where: { userId: session.userId },
  });
  if (!settings?.[kind]) return new Response(null, { status: 404, headers });
  const { bytes, contentType } = decodePrivateImage(settings[kind]);
  return new Response(new Uint8Array(bytes), {
    headers: { ...headers, "Content-Type": contentType },
  });
}
