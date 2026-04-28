// Browser-side image compression. Resizes to a long-edge cap and re-encodes
// as WebP at moderate quality so uploads stay <~200 KB even from a phone
// camera. Falls back to JPEG if WebP encoding isn't available.

const MAX_LONG_EDGE = 1280;
const WEBP_QUALITY = 0.72;

export type CompressedImage = Readonly<{
  blob: Blob;
  mime: "image/webp" | "image/jpeg";
  ext: "webp" | "jpg";
  width: number;
  height: number;
}>;

export async function compressImage(file: File): Promise<CompressedImage> {
  const bitmap = await loadBitmap(file);
  const { width, height } = scaleToFit(bitmap.width, bitmap.height, MAX_LONG_EDGE);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Canvas 2D context unavailable");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const webp = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
  if (webp) {
    return { blob: webp, mime: "image/webp", ext: "webp", width, height };
  }
  const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.78);
  if (!jpeg) throw new Error("Image encoding failed");
  return { blob: jpeg, mime: "image/jpeg", ext: "jpg", width, height };
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    // imageOrientation: "from-image" honors EXIF on iOS so portrait shots
    // don't land sideways.
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }
  // Fallback: <img> + ObjectURL. Slower but works in old browsers.
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image decode failed"));
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(img, 0, 0);
    return await createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function scaleToFit(w: number, h: number, longEdge: number): { width: number; height: number } {
  const longest = Math.max(w, h);
  if (longest <= longEdge) return { width: w, height: h };
  const ratio = longEdge / longest;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });
}
