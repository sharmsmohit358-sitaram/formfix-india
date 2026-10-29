import { processImage, type ProcessResult, type ProcessOptions } from './image-processing';

// Try the Worker first so heavy JPEG encoding runs off the main thread and the
// page buttons stay responsive. On ANY worker failure (unsupported browser,
// worker load failure, decode difference, etc. — except user cancel) fall back
// once to the proven main-thread processImage. That guarantees the Worker can
// only make things faster, never break a tool that worked before.
export async function processImageSmart(file: File, opts: ProcessOptions): Promise<ProcessResult> {
  const canWorker = typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
  if (!canWorker) return processImage(file, opts);
  try {
    return await runInWorker(file, opts);
  } catch (e: any) {
    if (opts.signal?.aborted || e?.name === 'AbortError') throw e;
    return processImage(file, opts);
  }
}
function runInWorker(file: File, opts: ProcessOptions): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('../workers/image-worker.ts', import.meta.url), { type: 'module' });
    } catch (e) { reject(e); return; }
    let settled = false;
    const done = (fn: () => void) => { if (!settled) { settled = true; worker.terminate(); fn(); } };
    const onAbort = () => done(() => reject(new DOMException('Processing cancelled', 'AbortError')));
    opts.signal?.addEventListener('abort', onAbort, { once: true });
    worker.onmessage = (e: MessageEvent) => {
      const d = e.data;
      if (d.type === 'progress') { opts.onProgress?.(d.pct, d.note); return; }
      if (d.type === 'result') {
        done(() => resolve({ blob: d.blob, url: URL.createObjectURL(d.blob), bytes: d.bytes, width: d.width, height: d.height, format: 'image/jpeg' as const, quality: d.quality, scale: d.scale, success: d.success, inRange: d.inRange, note: d.note }));
        return;
      }
      if (d.type === 'error') done(() => reject(new Error(d.message || 'Worker processing failed.')));
    };
    worker.onerror = (ev) => done(() => reject(new Error(ev.message || 'Worker failed to load.')));
    const { onProgress, signal, ...workerOpts } = opts as any;
    worker.postMessage({ file, opts: workerOpts });
  });
}
