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

/** Reads a JSON body with a size cap. Returns {} for an empty or invalid body. */
export async function readJson(request: Request, maxBytes = 64_000): Promise<unknown> {
  const len = Number(request.headers.get("content-length") || "0");
  if (len > maxBytes) throw json({ error: "Request is too large" }, 413);
  return request.json().catch(() => ({}));
}

/** First zod issue as a readable message. */
export function zodMessage(err: { issues: { message: string; path: (string | number)[] }[] }): string {
  const i = err.issues[0];
  if (!i) return "Invalid request";
  return i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message;
}
