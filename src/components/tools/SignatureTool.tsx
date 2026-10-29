import React, { useRef, useState } from 'react';
import { formatBytes, kib } from '../../lib/format';
import { validateImageFile } from '../../lib/file-validation';
import { readabilityWarning } from '../../lib/image-processing';
import { processImageSmart } from '../../lib/image-worker-client';

export default function SignatureTool() {
  const [file, setFile] = useState<File | null>(null);
  const [orig, setOrig] = useState<{ w: number; h: number; url: string } | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Awaited<ReturnType<typeof processImageSmart>> | null>(null);
  const [whiten, setWhiten] = useState(true); const [contrast, setContrast] = useState(20);
  const [cropW, setCropW] = useState(100); const [guide, setGuide] = useState<'none' | '3:1' | '2:1'>('3:1');
  const abortRef = useRef<AbortController | null>(null); const inputRef = useRef<HTMLInputElement>(null);
  async function onFile(f: File | undefined) {
    if (!f) return; setError(''); setResult(null); setFile(f);
    const head = new Uint8Array(await f.slice(0, 16).arrayBuffer());
    const err = validateImageFile(f, head); if (err) { setError(err); return; }
    const url = URL.createObjectURL(f); const img = new Image();
    img.onload = () => setOrig({ w: img.naturalWidth, h: img.naturalHeight, url }); img.onerror = () => setError('This image could not be decoded.'); img.src = url;
  }
  async function run() {
    if (!file) return; setBusy(true); setError('');
    const ac = new AbortController(); abortRef.current = ac;
    try {
      // Crop: keep the central horizontal band of width cropW%. This preserves proportions (no stretching).
      const wFrac = cropW / 100; const x = (1 - wFrac) / 2;
      const r = await processImageSmart(file, { targetBytes: kib(20), minBytes: kib(10), whiten, contrast, crop: { x, y: 0.05, w: wFrac, h: 0.9 }, onProgress: (p) => setProgress(p), signal: ac.signal });
      setResult(r); if (!r.success) setError(r.note);
    } catch (e) { setError((e as Error).message || 'Processing failed.'); } finally { setBusy(false); }
  }
  function reset() { setFile(null); setOrig(null); setResult(null); setError(''); if (inputRef.current) inputRef.current.value = ''; }
  const warn = result ? readabilityWarning(result.width, result.height, result.bytes) : null;
  const ratio = orig ? (orig.w / orig.h).toFixed(2) : '';
  return (
    <div className="card p-5">
      <h2 className="text-xl font-bold">Upload and resize</h2>
      <p className="text-sm text-slate-600 mt-1">Upload a scanned or photographed signature. Output is JPEG, checked to be between 10,240 and 20,480 bytes. No padding is added to reach the range. This tool does not verify handwriting authenticity.</p>
      <label className="block mt-4 font-semibold" htmlFor="sig-file">Choose a signature image</label>
      <div className="mt-1 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/60 p-3">
        <input id="sig-file" ref={inputRef} className="w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-violet-700" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => onFile(e.target.files?.[0])} />
        <p className="text-xs text-slate-500 mt-2">📁 {file ? `Selected: ${file.name}` : 'No file chosen yet'} · Or drag a file onto the picker in a desktop browser.</p>
      </div>
      {orig && <p className="text-sm mt-2">Original: {orig.w} × {orig.h} px · ratio {ratio}:1 {file ? `· ${formatBytes(file.size)}` : ''}</p>}
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div><label className="font-semibold" htmlFor="crop">Crop width: {cropW}% (centred, no stretching)</label><input id="crop" className="w-full" type="range" min={40} max={100} value={cropW} onChange={(e) => setCropW(Number(e.target.value))} /></div>
        <div><label className="font-semibold" htmlFor="contrast">Contrast: {contrast}</label><input id="contrast" className="w-full" type="range" min={0} max={60} value={contrast} onChange={(e) => setContrast(Number(e.target.value))} /></div>
      </div>
      <label className="flex items-center gap-2 mt-3"><input type="checkbox" checked={whiten} onChange={(e) => setWhiten(e.target.checked)} /> Whiten background (helps grey paper scans)</label>
      <label className="block mt-3 font-semibold" htmlFor="guide">Aspect-ratio guide</label>
      <select id="guide" className="w-full max-w-full rounded-2xl border border-violet-200 bg-white px-3 py-2.5 font-medium text-slate-800" value={guide} onChange={(e) => setGuide(e.target.value as any)}>
        <option value="3:1">3:1 — matches about 6 cm × 2 cm (SSC CHT 2026, section 8.7)</option>
        <option value="2:1">2:1 — matches about 4 cm × 2 cm (some annexures / other forms)</option>
        <option value="none">No guide</option>
      </select>
      <p className="text-xs text-slate-500 mt-1">A guide is only a pixel ratio. It cannot prove printed centimetres without resolution metadata or an explicit standard — always check the official notice for your own form.</p>
      {orig && <div className="grid md:grid-cols-2 gap-4 mt-4">
        <figure><img src={orig.url} alt="Original signature preview" className="max-h-48 w-auto rounded border bg-white" /><figcaption className="text-sm">Original preview</figcaption></figure>
        {result && <figure><img src={result.url} alt="Processed signature preview" className="max-h-48 w-auto rounded border bg-white" /><figcaption className="text-sm">Output: {result.width} × {result.height} px · {formatBytes(result.bytes)}</figcaption></figure>}
      </div>}
      {error && <p role="alert" className="mt-4 rounded bg-red-50 border border-red-200 p-3 text-red-800">{error}</p>}
      {warn && <p role="alert" className="mt-4 rounded bg-amber-50 border border-amber-200 p-3 text-amber-900">{warn} If it looks blurry, re-scan at higher resolution instead of enlarging this file.</p>}
      {busy && <div className="mt-4" role="status" aria-live="polite"><p>Processing… {progress}%</p><progress className="w-full" value={progress} max={100} /></div>}
      <div className="flex flex-wrap gap-3 mt-5">
        <button className="btn" disabled={!file || busy} onClick={run}>Resize signature</button>
        {busy && <button className="btn btn-secondary" onClick={() => abortRef.current?.abort()}>Cancel</button>}
        <button className="btn btn-secondary" onClick={reset}>Reset / choose another</button>
      </div>
      {result && result.success && <div className="mt-5 rounded bg-emerald-50 border border-emerald-200 p-4"><p className="font-bold">Done — {formatBytes(result.bytes)}, inside 10–20 KB. Verified from actual bytes.</p><a className="btn mt-3" href={result.url} download="formfix-signature-10-20kb.jpg">Download JPEG</a></div>}
      {result && !result.success && <div className="mt-5"><a className="btn btn-secondary" href={result.url} download="formfix-signature-closest.jpg">Download closest output anyway</a><p className="text-sm mt-2">Not a success — see the message above. Do not submit a closest output as if it met the range.</p></div>}
    </div>
  );
}
