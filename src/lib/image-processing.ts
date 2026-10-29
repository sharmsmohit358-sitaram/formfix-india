import { processCore, type CoreOptions, type CanvasHandle } from './image-core';

export type { CoreOptions as ProcessOptions } from './image-core';
import type { CoreOptions } from './image-core';
export interface ProcessResult {
  blob: Blob; url: string; bytes: number; width: number; height: number;
  format: 'image/jpeg'; quality: number; scale: number;
  success: boolean; inRange: boolean; note: string;
}
async function loadImage(file: File): Promise<{ img: HTMLImageElement; url: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve(); img.onerror = () => reject(new Error('This image could not be decoded. It may be corrupted or unsupported.'));
      img.src = url;
    });
    return { img, url };
  } catch (e) { URL.revokeObjectURL(url); throw e; }
}
function makeDomCanvas(w: number, h: number): CanvasHandle {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
  return {
    width: w, height: h,
    drawImage: (s, sx, sy, sw, sh, dx, dy, dw, dh) => ctx.drawImage(s, sx, sy, sw, sh, dx, dy, dw, dh),
    getImageData: () => ctx.getImageData(0, 0, w, h),
    putImageData: (d, x, y) => ctx.putImageData(d as ImageData, x, y),
    encode: (q) => new Promise((res, rej) => canvas.toBlob((b) => b ? res(b) : rej(new Error('JPEG encoding failed in this browser.')), 'image/jpeg', q)),
  };
}
/** Main-thread path (also the fallback if the Worker is unavailable). */
export async function processImage(file: File, opts: CoreOptions): Promise<ProcessResult> {
  const { img, url: srcUrl } = await loadImage(file);
  try {
    const r = await processCore(img, img.naturalWidth, img.naturalHeight, opts, makeDomCanvas);
    return { ...r, url: URL.createObjectURL(r.blob), format: 'image/jpeg' as const };
  } finally { URL.revokeObjectURL(srcUrl); }
}
/** Heuristic readability warning: very small dimensions or very low JPEG quality after processing. Never claims handwriting verification. */
export function readabilityWarning(width: number, height: number, bytes: number): string | null {
  if (width < 300 || height < 100) return 'Warning: the image is very small, so a signature or text may look blurry when printed or checked. Use a clearer, larger scan if you can.';
  if (bytes < 5000) return 'Warning: this file is very heavily compressed and may look blurry. Check the preview closely before submitting.';
  return null;
}
