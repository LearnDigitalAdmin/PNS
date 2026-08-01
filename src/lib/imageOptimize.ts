/**
 * imageOptimize.ts
 *
 * Client-side resize/re-encode run on any image before it's uploaded to
 * Firebase Storage. Admin story covers, gallery photos, and public "Apply
 * to Feature" submissions currently go straight from a phone camera (often
 * 4-10MB) into Storage untouched, and those Storage URLs are exactly what
 * ends up rendered as hero-slide images on the live site — so shrinking
 * them before they're ever written is the single biggest lever for image
 * load time.
 *
 * Fails safe: if the browser can't decode/encode the file for any reason
 * (canvas unsupported, corrupt file, etc.) the original File is returned
 * untouched rather than blocking the upload.
 */

const MAX_EDGE = 1920;
const JPEG_QUALITY = 0.82;
const WEBP_QUALITY = 0.82;

let webPSupport: Promise<boolean> | null = null;

function supportsWebP(): Promise<boolean> {
  if (!webPSupport) {
    webPSupport = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.width === 1);
      img.onerror = () => resolve(false);
      img.src =
        'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
    });
  }
  return webPSupport;
}

/**
 * Resize an image file to a max edge of 1920px and re-encode it as WebP
 * (falling back to JPEG where WebP encoding isn't supported). Returns the
 * original file if optimization isn't applicable or doesn't help.
 */
export async function optimizeImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  // Leave SVGs and GIFs (possibly animated) untouched — canvas re-encoding
  // would rasterize/flatten them, which is a correctness issue, not a
  // performance one.
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close?.();

    const useWebP = await supportsWebP();
    const mime = useWebP ? 'image/webp' : 'image/jpeg';
    const quality = useWebP ? WEBP_QUALITY : JPEG_QUALITY;
    const ext = useWebP ? 'webp' : 'jpg';

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, mime, quality)
    );
    if (!blob) return file;

    // Only swap in the optimized version if it's actually smaller —
    // protects against small/already-compressed images getting bloated.
    if (blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, '') + `.${ext}`;
    return new File([blob], newName, { type: mime, lastModified: Date.now() });
  } catch {
    return file;
  }
}
