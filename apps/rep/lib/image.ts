/*
 * Client-side image helpers for photo proof. Phone cameras produce 3 to 12 MB files; the upload
 * cap is 2 MB and, without Blob storage, the PATCH carries every photo inline under Vercel's
 * 4.5 MB request limit. So photos are shrunk to about 1600px JPEG before they leave the phone.
 */

const MAX_SIDE = 1600;
/** Target size of one photo as a data URL. Six of these still fit in one PATCH. */
const TARGET_CHARS = 650_000;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't a photo we can read."));
    };
    img.src = url; // Browsers apply the EXIF orientation when drawing an <img>.
  });
}

function encode(img: HTMLImageElement, side: number, quality: number): string {
  const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d")!;
  x.fillStyle = "#fff"; // PNGs with transparency would turn black as JPEG.
  x.fillRect(0, 0, w, h);
  x.drawImage(img, 0, 0, w, h);
  return c.toDataURL("image/jpeg", quality);
}

/** Downscales a camera photo to a JPEG data URL of roughly 1600px on the long side. */
export async function downscalePhoto(file: Blob): Promise<string> {
  const img = await loadImage(file);
  let out = "";
  for (const [side, q] of [
    [MAX_SIDE, 0.82],
    [MAX_SIDE, 0.7],
    [1280, 0.7],
    [1024, 0.65]
  ] as const) {
    out = encode(img, side, q);
    if (out.length <= TARGET_CHARS) break;
  }
  return out;
}
