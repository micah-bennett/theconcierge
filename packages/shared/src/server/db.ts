import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export type Sql = NeonQueryFunction<false, false>;

let cached: Sql | null = null;

/** The shared Neon database. One cached client per server instance. */
export function sql(): Sql {
  if (cached) return cached;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not configured");
  cached = neon(url);
  return cached;
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

/**
 * Reads a JSON body with a size cap. Returns {} for an empty or invalid body.
 * The cap is checked on the declared length and again on the bytes actually read (chunked bodies
 * have no content-length).
 */
export async function readJson(request: Request, maxBytes = 64_000): Promise<unknown> {
  const tooLarge = () => json({ error: "Request is too large" }, 413);
  const len = Number(request.headers.get("content-length") || "0");
  if (len > maxBytes) throw tooLarge();
  if (!request.body) return {};
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      throw tooLarge();
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return {};
  }
}

/** First zod issue as a readable message. */
export function zodMessage(err: { issues: { message: string; path: (string | number)[] }[] }): string {
  const i = err.issues[0];
  if (!i) return "Invalid request";
  return i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message;
}
