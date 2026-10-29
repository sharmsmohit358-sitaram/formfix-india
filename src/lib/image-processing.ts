import { scaleToFit } from './format';
import { MAX_IMAGE_PIXELS } from './file-validation';

export interface ImageInfo { width: number; height: number; blob: Blob; url: string; }
export interface ProcessOptions {
  targetBytes: number;
  minBytes?: number; // for range tools, e.g. signature 10 KiB
  maxWidth?: number; maxHeight?: number;
  whiten?: boolean; contrast?: number; // contrast -100..100, 0 = none
  crop?: { x: number; y: number; w: number; h: number }; // fractions 0..1
  onProgress?: (pct: number, note: string) => void;
  signal?: AbortSignal;
}
export interface ProcessResult {
  blob: Blob; url: string; bytes: number; width: number; height: number;
  format: 'image/jpeg'; quality: number; scale: number;
  success: boolean; inRange: boolean; note: string;
}
function check(signal?: AbortSignal) { if (signal?.aborted) throw new DOMException('Processing cancelled', 'AbortError'); }
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
function draw(img: HTMLImageElement, width: number, height: number, opts: ProcessOptions): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: Boolean(opts.whiten || opts.contrast) });
  if (!ctx) throw new Error('Canvas is not available in this browser.');
  // JPEG has no transparency: fill white first so transparent PNGs do not turn black.
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
  const sx = opts.crop ? opts.crop.x * img.naturalWidth : 0;
  const sy = opts.crop ? opts.crop.y * img.naturalHeight : 0;
  const sw = opts.crop ? opts.crop.w * img.naturalWidth : img.naturalWidth;
  const sh = opts.crop ? opts.crop.h * img.naturalHeight : img.naturalHeight;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
  if (opts.whiten || (opts.contrast && opts.contrast !== 0)) {
    const data = ctx.getImageData(0, 0, width, height); const d = data.data;
    const contrast = opts.contrast ?? 0; const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];
      if (opts.whiten) {
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (lum > 200) { const t = Math.min(1, (lum - 200) / 55); r = r + (255 - r) * t; g = g + (255 - g) * t; b = b + (255 - b) * t; }
      }
      if (contrast !== 0) { r = factor * (r - 128) + 128; g = factor * (g - 128) + 128; b = factor * (b - 128) + 128; }
      d[i] = Math.max(0, Math.min(255, r)); d[i + 1] = Math.max(0, Math.min(255, g)); d[i + 2] = Math.max(0, Math.min(255, b));
    }
    ctx.putImageData(data, 0, 0);
  }
  return canvas;
}
function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error('JPEG encoding failed in this browser.')), 'image/jpeg', quality));
}
export async function processImage(file: File, opts: ProcessOptions): Promise<ProcessResult> {
  const { img, url: srcUrl } = await loadImage(file);
  try {
    if (img.naturalWidth * img.naturalHeight > MAX_IMAGE_PIXELS) throw new Error(`Image is ${img.naturalWidth} × ${img.naturalHeight} pixels, over the 25-megapixel safety limit.`);
    const baseW = opts.crop ? Math.round(img.naturalWidth * opts.crop.w) : img.naturalWidth;
    const baseH = opts.crop ? Math.round(img.naturalHeight * opts.crop.h) : img.naturalHeight;
    const fit = scaleToFit(baseW, baseH);
    let w = fit.width, h = fit.height;
    if (opts.maxWidth && w > opts.maxWidth) { const s = opts.maxWidth / w; w = Math.round(w * s); h = Math.round(h * s); }
    if (opts.maxHeight && h > opts.maxHeight) { const s = opts.maxHeight / h; w = Math.round(w * s); h = Math.round(h * s); }
    const target = opts.targetBytes; const minBytes = opts.minBytes ?? 0;
    // Bounded search: quality steps, then scale steps. Every candidate is measured by actual bytes.
    const qualities = [0.92, 0.85, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38, 0.3];
    // Extended down to 0.09 after Stage 1 testing: a detailed 3000x2000 photo still exceeded 20 KB at 0.3x.
    // Small outputs trigger the readability warning in the UI, so shrinking further is honest, not silent.
    const scales = [1, 0.85, 0.7, 0.55, 0.4, 0.3, 0.22, 0.16, 0.12, 0.09];
    type BestCandidate = { blob: Blob; quality: number; scale: number; w: number; h: number };
    let best: BestCandidate | null = null;
    let bestOver: BestCandidate | null = null;
    for (const scale of scales) {
      check(opts.signal);
      const cw = Math.max(80, Math.round(w * scale)); const ch = Math.max(80, Math.round(h * scale));
      const canvas = draw(img, cw, ch, opts);
      for (const q of qualities) {
        check(opts.signal);
        opts.onProgress?.(Math.round(10 + 80 * (scales.indexOf(scale) / scales.length + (qualities.indexOf(q) / qualities.length) / scales.length)), `Trying ${cw} × ${ch} at quality ${q}`);
        const blob = await toBlob(canvas, q);
        if (blob.size <= target && blob.size >= minBytes) {
          // First fit at this scale is the highest quality at this scale; prefer larger scale, so return immediately for max-tools.
          // For range tools the first fit in range is also the best (largest scale, highest quality tried first).
          return { blob, url: URL.createObjectURL(blob), bytes: blob.size, width: cw, height: ch, format: 'image/jpeg', quality: q, scale, success: true, inRange: true, note: 'Output meets the requested size.' };
        }
        if (blob.size <= target && (!best || blob.size > best.blob.size)) best = { blob, quality: q, scale, w: cw, h: ch };
        if (blob.size > target && (!bestOver || blob.size < bestOver.blob.size)) bestOver = { blob, quality: q, scale, w: cw, h: ch };
        // If even the lowest quality at the smallest scale is still too big, the loop continues to smaller scales.
      }
    }
    // No fit: report the closest under-target (too small for a range) or the smallest over-target, honestly.
    const chosen = best ?? bestOver;
    if (!chosen) throw new Error('No output could be produced from this image.');
    const underMin = minBytes > 0 && chosen.blob.size < minBytes;
    const overMax = chosen.blob.size > target;
    return {
      blob: chosen.blob, url: URL.createObjectURL(chosen.blob), bytes: chosen.blob.size, width: chosen.w, height: chosen.h,
      format: 'image/jpeg', quality: chosen.quality, scale: chosen.scale, success: false, inRange: false,
      note: underMin
        ? `Closest output is ${chosen.blob.size} bytes, below the ${minBytes}-byte minimum. A larger or more detailed scan is needed; no padding was added to fake the range.`
        : overMax
          ? `Even at the lowest tested quality and smallest size, the output is ${chosen.blob.size} bytes, over the ${target}-byte target. Try a simpler scan or a larger target.`
          : 'Output could not meet the requested size at acceptable quality.',
    };
  } finally { URL.revokeObjectURL(srcUrl); }
}
/** Heuristic readability warning: very small dimensions or very low JPEG quality after processing. Never claims handwriting verification. */
export function readabilityWarning(width: number, height: number, bytes: number): string | null {
  if (width < 300 || height < 100) return 'Warning: the image is very small, so a signature or text may look blurry when printed or checked. Use a clearer, larger scan if you can.';
  if (bytes < 5000) return 'Warning: this file is very heavily compressed and may look blurry. Check the preview closely before submitting.';
  return null;
}
