import React, { useRef, useState } from 'react';
import { formatBytes, kib } from '../../lib/format';
import { detectKind, validateImageFile, MAX_IMAGE_BYTES } from '../../lib/file-validation';
import { readabilityWarning } from '../../lib/image-processing';
import { processImageSmart } from '../../lib/image-worker-client';

export default function ImageTool({ targetKiB, minKiB, title }: { targetKiB: number; minKiB?: number; title: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [orig, setOrig] = useState<{ w: number; h: number; url: string } | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Awaited<ReturnType<typeof processImageSmart>> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  async function onFile(f: File | undefined) {
    if (!f) return; setError(''); setResult(null); setFile(f);
    const bytes = new Uint8Array(await f.slice(0, 64).arrayBuffer());
    const fullHead = new Uint8Array(await f.slice(0, 16).arrayBuffer());
    const err = validateImageFile(f, fullHead); void bytes;
    if (err) { setError(err); return; }
    const url = URL.createObjectURL(f); const img = new Image();
    img.onload = () => setOrig({ w: img.naturalWidth, h: img.naturalHeight, url }); img.onerror = () => setError('This image could not be decoded. It may be corrupted.'); img.src = url;
  }
  async function run() {
    if (!file) return; setBusy(true); setError(''); setProgress(0);
    const ac = new AbortController(); abortRef.current = ac;
    try {
      const r = await processImageSmart(file, { targetBytes: kib(targetKiB), minBytes: minKiB ? kib(minKiB) : undefined, onProgress: (p) => setProgress(p), signal: ac.signal });
      setResult(r); if (!r.success) setError(r.note);
    } catch (e) { setError((e as Error).message || 'Processing failed.'); } finally { setBusy(false); }
  }
  function reset() { setFile(null); setOrig(null); setResult(null); setError(''); if (inputRef.current) inputRef.current.value = ''; }
  const warn = result ? readabilityWarning(result.width, result.height, result.bytes) : null;
  return (
    <div className="card p-5">
      <h2 className="text-xl font-bold">Upload and resize</h2>
      <p className="text-sm text-slate-600 mt-1">Your file never leaves this browser. Supported inputs: JPEG, PNG, WebP, GIF (checked from file contents, not the name). Limit 15 MB, 25 megapixels. Output is JPEG — transparent PNG areas become white.</p>
      <label className="block mt-4 font-semibold" htmlFor="file-input">Choose an image</label>
      <div className="mt-1 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/60 p-3">
        <input id="file-input" ref={inputRef} className="w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-violet-700" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => onFile(e.target.files?.[0])} />
        <p className="text-xs text-slate-500 mt-2">📁 {file ? `Selected: ${file.name}` : 'No file chosen yet'} · Or drag a file onto the picker in a desktop browser.</p>
      </div>
      {orig && <div className="grid md:grid-cols-2 gap-4 mt-4">
        <figure><img src={orig.url} alt="Original upload preview" className="max-h-64 w-auto rounded border" /><figcaption className="text-sm">Original: {orig.w} × {orig.h} px · {file ? formatBytes(file.size) : ''}</figcaption></figure>
        {result && <figure><img src={result.url} alt="Processed output preview" className="max-h-64 w-auto rounded border" /><figcaption className="text-sm">Output: {result.width} × {result.height} px · {formatBytes(result.bytes)} · JPEG · quality {result.quality}</figcaption></figure>}
      </div>}
      {error && <p role="alert" className="mt-4 rounded bg-red-50 border border-red-200 p-3 text-red-800">{error}</p>}
      {warn && <p role="alert" className="mt-4 rounded bg-amber-50 border border-amber-200 p-3 text-amber-900">{warn}</p>}
      {busy && <div className="mt-4" role="status" aria-live="polite"><p>Processing… {progress}%</p><progress className="w-full" value={progress} max={100} /></div>}
      <div className="flex flex-wrap gap-3 mt-5">
        <button className="btn" disabled={!file || busy} onClick={run}>Resize now</button>
        {busy && <button className="btn btn-secondary" onClick={() => abortRef.current?.abort()}>Cancel</button>}
        <button className="btn btn-secondary" onClick={reset}>Reset / choose another</button>
      </div>
      {result && result.success && <div className="mt-5 rounded bg-emerald-50 border border-emerald-200 p-4">
        <p className="font-bold">Done — {formatBytes(result.bytes)} (target: {minKiB ? `${minKiB}–${targetKiB} KB` : `under ${targetKiB} KB`}). Verified from actual output bytes.</p>
        <a className="btn mt-3" href={result.url} download={`formfix-${targetKiB}kb.jpg`}>Download JPEG</a>
        <p className="text-sm mt-2">Check the preview before submitting. Resizing does not guarantee an application will accept the file — check format, dimensions and clarity rules too.</p>
      </div>}
      {result && !result.success && <div className="mt-5"><a className="btn btn-secondary" href={result.url} download={`formfix-${targetKiB}kb-best.jpg`}>Download closest output anyway</a><p className="text-sm mt-2">This download is the closest result, not a success. It is labelled as such so you are not misled.</p></div>}
    </div>
  );
}
