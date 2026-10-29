import { scaleToFit } from './format';
import { MAX_IMAGE_PIXELS } from './file-validation';

// Shared image-processing core, used by BOTH the main thread and the Worker.
// It never touches `document` or `window`, so the same scale/quality/whiten/
// contrast logic runs identically in both places — no duplicated logic to drift.
// The caller supplies how to make a canvas and how to encode it:
//  - main thread: document.createElement('canvas') + canvas.toBlob
//  - worker: new OffscreenCanvas() + canvas.convertToBlob
export interface CoreOptions {
  targetBytes: number;
  minBytes?: number;
  maxWidth?: number; maxHeight?: number;
  whiten?: boolean; contrast?: number;
  crop?: { x: number; y: number; w: number; h: number };
  onProgress?: (pct: number, note: string) => void;
  signal?: AbortSignal;
}
export interface CoreResult {
  blob: Blob; bytes: number; width: number; height: number;
  quality: number; scale: number; success: boolean; inRange: boolean; note: string;
}
export interface CanvasHandle {
  width: number; height: number;
  drawImage(source: any, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
  getImageData(): { data: Uint8ClampedArray };
  putImageData(data: { data: Uint8ClampedArray }, x: number, y: number): void;
  encode(quality: number): Promise<Blob>;
}
function check(signal?: AbortSignal) { if (signal?.aborted) throw new DOMException('Processing cancelled', 'AbortError'); }

export async function processCore(
  source: any, sourceW: number, sourceH: number,
  opts: CoreOptions,
  makeCanvas: (w: number, h: number) => CanvasHandle,
): Promise<CoreResult> {
  if (sourceW * sourceH > MAX_IMAGE_PIXELS) throw new Error(`Image is ${sourceW} × ${sourceH} pixels, over the 25-megapixel safety limit.`);
  const baseW = opts.crop ? Math.round(sourceW * opts.crop.w) : sourceW;
  const baseH = opts.crop ? Math.round(sourceH * opts.crop.h) : sourceH;
  const fit = scaleToFit(baseW, baseH);
  let w = fit.width, h = fit.height;
  if (opts.maxWidth && w > opts.maxWidth) { const s = opts.maxWidth / w; w = Math.round(w * s); h = Math.round(h * s); }
  if (opts.maxHeight && h > opts.maxHeight) { const s = opts.maxHeight / h; w = Math.round(w * s); h = Math.round(h * s); }
  const target = opts.targetBytes; const minBytes = opts.minBytes ?? 0;
  const qualities = [0.92, 0.85, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38, 0.3];
  const scales = [1, 0.85, 0.7, 0.55, 0.4, 0.3, 0.22, 0.16, 0.12, 0.09];
  type Best = { blob: Blob; quality: number; scale: number; w: number; h: number };
  let best: Best | null = null;
  let bestOver: Best | null = null;
  for (const scale of scales) {
    check(opts.signal);
    const cw = Math.max(80, Math.round(w * scale)); const ch = Math.max(80, Math.round(h * scale));
    const canvas = makeCanvas(cw, ch);
    // White background first: JPEG has no transparency.
    // draw() in the old code filled white via the 2d context; here the caller
    // must fill white before drawing — see makeCanvas implementations.
    const sx = opts.crop ? opts.crop.x * sourceW : 0;
    const sy = opts.crop ? opts.crop.y * sourceH : 0;
    const sw = opts.crop ? opts.crop.w * sourceW : sourceW;
    const sh = opts.crop ? opts.crop.h * sourceH : sourceH;
    canvas.drawImage(source, sx, sy, sw, sh, 0, 0, cw, ch);
    if (opts.whiten || (opts.contrast && opts.contrast !== 0)) {
      const data = canvas.getImageData(); const d = data.data;
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
      canvas.putImageData(data, 0, 0);
    }
    for (const q of qualities) {
      check(opts.signal);
      opts.onProgress?.(Math.round(10 + 80 * (scales.indexOf(scale) / scales.length + (qualities.indexOf(q) / qualities.length) / scales.length)), `Trying ${cw} × ${ch} at quality ${q}`);
      const blob = await canvas.encode(q);
      if (blob.size <= target && blob.size >= minBytes) {
        return { blob, bytes: blob.size, width: cw, height: ch, quality: q, scale, success: true, inRange: true, note: 'Output meets the requested size.' };
      }
      if (blob.size <= target && (!best || blob.size > best.blob.size)) best = { blob, quality: q, scale, w: cw, h: ch };
      if (blob.size > target && (!bestOver || blob.size < bestOver.blob.size)) bestOver = { blob, quality: q, scale, w: cw, h: ch };
    }
  }
  const chosen = best ?? bestOver;
  if (!chosen) throw new Error('No output could be produced from this image.');
  const underMin = minBytes > 0 && chosen.blob.size < minBytes;
  const overMax = chosen.blob.size > target;
  return {
    blob: chosen.blob, bytes: chosen.blob.size, width: chosen.w, height: chosen.h,
    quality: chosen.quality, scale: chosen.scale, success: false, inRange: false,
    note: underMin
      ? `Closest output is ${chosen.blob.size} bytes, below the ${minBytes}-byte minimum. A larger or more detailed scan is needed; no padding was added to fake the range.`
      : overMax
        ? `Even at the lowest tested quality and smallest size, the output is ${chosen.blob.size} bytes, over the ${target}-byte target. Try a simpler scan or a larger target.`
        : 'Output could not meet the requested size at acceptable quality.',
  };
}
