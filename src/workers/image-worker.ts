import { processCore, type CoreOptions, type CanvasHandle } from '../lib/image-core';

// Runs ONLY in a Worker. Uses createImageBitmap + OffscreenCanvas, never document.
// If this environment cannot do that, it posts a setup-error and the main thread
// falls back to the proven main-thread path — the tool must never fail just
// because the Worker is unavailable.
function makeWorkerCanvas(w: number, h: number): CanvasHandle {
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as any;
  if (!ctx) throw new Error('Canvas is not available in this worker.');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
  return {
    width: w, height: h,
    drawImage: (s, sx, sy, sw, sh, dx, dy, dw, dh) => ctx.drawImage(s, sx, sy, sw, sh, dx, dy, dw, dh),
    getImageData: () => ctx.getImageData(0, 0, w, h),
    putImageData: (d, x, y) => ctx.putImageData(d, x, y),
    encode: (q) => canvas.convertToBlob({ type: 'image/jpeg', quality: q }),
  };
}

self.onmessage = async (e: MessageEvent) => {
  const { file, opts } = e.data as { file: File; opts: Omit<CoreOptions, 'onProgress' | 'signal'> };
  try {
    if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
      throw Object.assign(new Error('Worker image processing is not supported in this browser.'), { setup: true });
    }
    const bitmap = await createImageBitmap(file);
    try {
      const r = await processCore(bitmap, bitmap.width, bitmap.height, {
        ...opts,
        onProgress: (pct, note) => (self as any).postMessage({ type: 'progress', pct, note }),
      }, makeWorkerCanvas);
      (self as any).postMessage({ type: 'result', blob: r.blob, bytes: r.bytes, width: r.width, height: r.height, quality: r.quality, scale: r.scale, success: r.success, inRange: r.inRange, note: r.note });
    } finally { bitmap.close(); }
  } catch (err: any) {
    (self as any).postMessage({ type: 'error', setup: Boolean(err?.setup), message: err?.message || String(err) });
  }
};
