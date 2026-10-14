import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/uploads  body: { dataUrl, kind: "photo" | "signature", jobId }
 * With BLOB_READ_WRITE_TOKEN set, stores the image in Vercel Blob and returns its URL.
 * Without it (demo), returns the data URL unchanged.
 * TODO(IT): make proofs private (signed URLs) before real deliveries.
 */
export async function POST(req: Request) {
  const { dataUrl, kind, jobId } = (await req.json().catch(() => ({}))) as { dataUrl?: string; kind?: string; jobId?: string };
  if (!dataUrl || !/^data:image\/(png|jpeg|webp);base64,/.test(dataUrl) || dataUrl.length > 3_000_000) {
    return NextResponse.json({ error: "Send a PNG, JPEG, or WEBP image under 2 MB" }, { status: 400 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ url: dataUrl, demo: true });
  const { put } = await import("@vercel/blob");
  const [meta, b64] = dataUrl.split(",");
  const type = meta.slice(5, meta.indexOf(";"));
  const ext = type.split("/")[1];
  const blob = await put(`proofs/${jobId ?? "job"}/${kind ?? "photo"}-${Date.now()}.${ext}`, Buffer.from(b64, "base64"), {
    access: "public",
    contentType: type
  });
  return NextResponse.json({ url: blob.url });
}
