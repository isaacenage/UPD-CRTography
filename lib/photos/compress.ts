// Browser-side image compression with a guaranteed size ceiling.
//
// High-end phones (esp. iPhone 14 Pro / 15 Pro at 48MP, or HDR HEIC →
// JPEG conversion in iOS Safari) routinely produce 4–8 MB source files.
// A single-pass encode at fixed quality occasionally lands above the
// bucket's per-file cap. To make uploads deterministic, this module
// runs a cascade of (long-edge, quality) settings and returns the first
// blob that fits TARGET_MAX_BYTES — falling through to a hard floor if
// every step overshoots.
//
// iOS Safari < 16.6 cannot encode WebP via canvas.toBlob, so each pass
// tries WebP first and falls back to JPEG.

const TARGET_MAX_BYTES = 1_500_000; // 1.5 MiB — well under the 8 MiB bucket
const SAFETY_FLOOR_BYTES = 4_500_000; // last-resort cap; if we can't beat
                                       // this, we error rather than upload

// (longEdge, webpQ, jpegQ). Each step is roughly a halving of byte budget.
const PASSES: ReadonlyArray<readonly [number, number, number]> = [
  [1600, 0.72, 0.78],
  [1280, 0.68, 0.74],
  [1024, 0.62, 0.68],
  [800,  0.55, 0.6],
  [640,  0.5,  0.55],
];

// Conservative cap on canvas pixel area. iOS Safari historically refused
// canvases larger than ~16 MP; modern devices go higher but the limit
// fluctuates. Staying under 12 MP keeps `drawImage` reliable.
const MAX_CANVAS_AREA = 12_000_000;

export type CompressedImage = Readonly<{
  blob: Blob;
  mime: "image/webp" | "image/jpeg";
  ext: "webp" | "jpg";
  width: number;
  height: number;
}>;

export async function compressImage(file: File): Promise<CompressedImage> {
  const bitmap = await loadBitmap(file);
  try {
    let best: CompressedImage | null = null;

    for (const [longEdge, webpQ, jpegQ] of PASSES) {
      const result = await encodeAtSize(bitmap, longEdge, webpQ, jpegQ);
      if (!result) continue;
      if (!best || result.blob.size < best.blob.size) best = result;
      if (result.blob.size <= TARGET_MAX_BYTES) return result;
    }

    if (best && best.blob.size <= SAFETY_FLOOR_BYTES) return best;
    throw new Error(
      "Could not compress this photo to a small enough size. Please try a different shot.",
    );
  } finally {
    bitmap.close?.();
  }
}

async function encodeAtSize(
  bitmap: ImageBitmap,
  longEdge: number,
  webpQ: number,
  jpegQ: number,
): Promise<CompressedImage | null> {
  const target = scaleToFit(bitmap.width, bitmap.height, longEdge);
  const safe = clampToCanvasArea(target.width, target.height);
  const canvas = makeCanvas(safe.width, safe.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, safe.width, safe.height);

  const webp = await canvasToBlob(canvas, "image/webp", webpQ);
  if (webp && webp.type === "image/webp") {
    return { blob: webp, mime: "image/webp", ext: "webp", width: safe.width, height: safe.height };
  }
  const jpeg = await canvasToBlob(canvas, "image/jpeg", jpegQ);
  if (jpeg) {
    return { blob: jpeg, mime: "image/jpeg", ext: "jpg", width: safe.width, height: safe.height };
  }
  return null;
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    try {
      // imageOrientation: "from-image" honors EXIF on iOS so portrait shots
      // don't land sideways.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Older Safari throws on the options arg — retry without.
      try {
        return await createImageBitmap(file);
      } catch {
        // Fall through to <img> path.
      }
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image decode failed"));
      el.src = url;
    });
    // Pre-scale on a working canvas so the resulting bitmap fits the safe
    // canvas area even when the source is 48 MP.
    const safe = clampToCanvasArea(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = safe.width;
    canvas.height = safe.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(img, 0, 0, safe.width, safe.height);
    return await createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function scaleToFit(w: number, h: number, longEdge: number): { width: number; height: number } {
  const longest = Math.max(w, h);
  if (longest <= longEdge) return { width: w, height: h };
  const ratio = longEdge / longest;
  return { width: Math.max(1, Math.round(w * ratio)), height: Math.max(1, Math.round(h * ratio)) };
}

function clampToCanvasArea(w: number, h: number): { width: number; height: number } {
  const area = w * h;
  if (area <= MAX_CANVAS_AREA) return { width: w, height: h };
  const ratio = Math.sqrt(MAX_CANVAS_AREA / area);
  return { width: Math.max(1, Math.floor(w * ratio)), height: Math.max(1, Math.floor(h * ratio)) };
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), type, quality);
    } catch {
      resolve(null);
    }
  });
}
