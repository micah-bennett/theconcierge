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

/** The mockup's "Sample" proof photo: a drawn doorstep with a HOP verified stamp. */
export function samplePhoto(): string {
  const c = document.createElement("canvas");
  c.width = 480;
  c.height = 320;
  const x = c.getContext("2d")!;
  x.fillStyle = "#e9e3d6";
  x.fillRect(0, 0, 480, 320);
  x.fillStyle = "#8a6a4a";
  x.fillRect(150, 40, 180, 280);
  x.fillStyle = "#6d5238";
  x.fillRect(165, 55, 150, 250);
  x.fillStyle = "#d9b26a";
  x.beginPath();
  x.arc(290, 190, 7, 0, 7);
  x.fill();
  x.fillStyle = "#c79a5b";
  x.fillRect(190, 240, 100, 70);
  x.fillStyle = "#a87b44";
  x.fillRect(190, 240, 100, 12);
  x.fillStyle = "#04a6a8";
  x.fillRect(225, 262, 30, 30);
  x.fillStyle = "rgba(1,47,108,.85)";
  x.fillRect(0, 282, 480, 38);
  x.fillStyle = "#fff";
  x.font = "bold 16px sans-serif";
  x.fillText("HOP verified · " + new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }), 14, 307);
  return c.toDataURL("image/jpeg", 0.8);
}
