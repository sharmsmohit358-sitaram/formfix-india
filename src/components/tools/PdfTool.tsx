import React, { useRef, useState } from 'react';
import { formatBytes, kib } from '../../lib/format';
import { validatePdfFile } from '../../lib/file-validation';
// Tiny header parser only — pdf-processing (pdf-lib) is NOT imported here,
// so it is not in the PDF page's initial bundle. It is loaded dynamically
// in runPreserve/runRaster, only after the user clicks a mode button.
import { parsePdfHeaderInfo } from '../../lib/pdf-header';

export default function PdfTool({ targetKiB }: { targetKiB: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<{ pages: number; maybeSigned: boolean; hasForms: boolean } | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; bytes: number; pages: number; mode: string } | null>(null);
  const [consent, setConsent] = useState(false);
  const abortRef = useRef<AbortController | null>(null); const inputRef = useRef<HTMLInputElement>(null);
  async function onFile(f: File | undefined) {
    if (!f) return; setError(''); setResult(null); setFile(f);
    const head = new Uint8Array(await f.slice(0, 16).arrayBuffer());
    const err = validatePdfFile(f, head); if (err) { setError(err); return; }
    const full = new Uint8Array(await f.arrayBuffer());
    const hdr = parsePdfHeaderInfo(full);
    try { const doc: any = await (await import('pdf-lib')).PDFDocument.load(full); setInfo({ pages: doc.getPageCount(), maybeSigned: hdr.maybeSigned, hasForms: hdr.hasForms }); }
    catch (e) { setError(/password|encrypt/i.test(String(e)) ? 'This PDF is password-protected. Remove the password in your own PDF reader first.' : 'This PDF could not be parsed. It may be corrupted.'); }
  }
  async function runPreserve() {
    if (!file) return; setBusy(true); setError('');
    try {
      const { preservePdf, validatePdfBytes } = await import('../../lib/pdf-processing');
      const full = new Uint8Array(await file.arrayBuffer());
      const r = await preservePdf(full);
      if (r.bytes.length <= kib(targetKiB)) {
        const pages = await validatePdfBytes(r.bytes);
        const blob = new Blob([r.bytes as any], { type: 'application/pdf' }); setResult({ url: URL.createObjectURL(blob), bytes: r.bytes.length, pages, mode: 'Preserve structure (re-saved)' });
      } else setError(`Preserve mode produced ${formatBytes(r.bytes.length)}, still over ${targetKiB} KB. Re-saving alone does not guarantee compression. You can try rasterize mode below, with its warnings, or use a smaller original.`);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function runRaster() {
    if (!file || !consent) return; setBusy(true); setError('');
    const ac = new AbortController(); abortRef.current = ac;
    try {
      const { rasterizePdf } = await import('../../lib/pdf-processing');
      const full = new Uint8Array(await file.arrayBuffer());
      const r = await rasterizePdf(full, { targetBytes: kib(targetKiB), onProgress: (p) => setProgress(p), signal: ac.signal });
      const blob = new Blob([r.bytes as any], { type: 'application/pdf' }); setResult({ url: URL.createObjectURL(blob), bytes: r.bytes.length, pages: r.pageCount, mode: 'Rasterized (text may no longer be selectable)' });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function reset() { setFile(null); setInfo(null); setResult(null); setError(''); setConsent(false); if (inputRef.current) inputRef.current.value = ''; }
  return (
    <div className="card p-5">
      <h2 className="text-xl font-bold">Upload and compress</h2>
      <p className="text-sm text-slate-600 mt-1">Your PDF never leaves this browser. A successful output is always a valid PDF at or below {targetKiB} KB, verified by reopening it. Compression is not guaranteed for every PDF.</p>
      <label className="block mt-4 font-semibold" htmlFor="pdf-file">Choose a PDF</label>
      <div className="mt-1 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/60 p-3">
        <input id="pdf-file" ref={inputRef} className="w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-violet-700" type="file" accept="application/pdf" onChange={(e) => onFile(e.target.files?.[0])} />
        <p className="text-xs text-slate-500 mt-2">📁 {file ? `Selected: ${file.name}` : 'No file chosen yet'} · Or drag a file onto the picker in a desktop browser.</p>
      </div>
      {info && <p className="text-sm mt-2">Pages: {info.pages} · Original: {file ? formatBytes(file.size) : ''}</p>}
      {(info?.maybeSigned || info?.hasForms) && <p role="alert" className="mt-3 rounded bg-amber-50 border border-amber-200 p-3 text-amber-900">Warning: this PDF may contain a signature or a form. Rasterizing it can break signatures, form fields and document integrity. Do not rasterize a legally significant or signed document without checking with the issuing authority.</p>}
      {error && <p role="alert" className="mt-4 rounded bg-red-50 border border-red-200 p-3 text-red-800">{error}</p>}
      {busy && <div className="mt-4" role="status" aria-live="polite"><p>Processing… {progress}%</p><progress className="w-full" value={progress} max={100} /></div>}
      <div className="mt-5">
        <h3 className="font-bold">Mode A — Preserve structure (try first)</h3>
        <p className="text-sm text-slate-600">Re-saves the PDF and clears metadata. Keeps text, pages and order. Often reduces size only slightly.</p>
        <button className="btn mt-2" disabled={!file || busy} onClick={runPreserve}>Try preserve mode</button>
      </div>
      <div className="mt-6 border-t pt-4">
        <h3 className="font-bold">Mode B — Rasterize pages (only with your agreement)</h3>
        <p className="text-sm text-slate-600">Pages become images inside a new PDF. Selectable text, hyperlinks, forms and accessibility may be lost. Page order and proportions are preserved. Multi-page or high-resolution documents may still not fit under {targetKiB} KB.</p>
        <label className="flex items-start gap-2 mt-3"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I understand rasterization may lose text, links, forms and signatures, and I still want to try it.</label>
        <div className="flex flex-wrap gap-3 mt-3">
          <button className="btn" disabled={!file || busy || !consent} onClick={runRaster}>Rasterize PDF</button>
          {busy && <button className="btn btn-secondary" onClick={() => abortRef.current?.abort()}>Cancel</button>}
          <button className="btn btn-secondary" onClick={reset}>Reset</button>
        </div>
      </div>
      {result && <div className="mt-5 rounded bg-emerald-50 border border-emerald-200 p-4"><p className="font-bold">Done — {formatBytes(result.bytes)}, {result.pages} page(s), {result.mode}. Verified by reopening the output.</p><a className="btn mt-3" href={result.url} download={`formfix-pdf-under-${targetKiB}kb.pdf`}>Download PDF</a></div>}
    </div>
  );
}
