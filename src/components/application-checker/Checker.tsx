import React, { useState } from 'react';
import { PROFILES } from '../../data/application-requirements';
import { evaluateFile, overallStatus } from '../../lib/checker';
import { detectKind } from '../../lib/file-validation';
import { formatBytes } from '../../lib/format';

export default function Checker() {
  const [profileId, setProfileId] = useState(PROFILES[0].id);
  const [results, setResults] = useState<ReturnType<typeof evaluateFile> | null>(null);
  const [fileInfo, setFileInfo] = useState(''); const [error, setError] = useState('');
  const profile = PROFILES.find((p) => p.id === profileId)!;
  async function onFile(f: File | undefined) {
    if (!f) return; setError(''); setResults(null);
    const head = new Uint8Array(await f.slice(0, 16).arrayBuffer());
    const kind = detectKind(head);
    if (kind === 'unknown') { setError('Could not recognise this file from its contents.'); return; }
    let width: number | undefined, height: number | undefined;
    if (kind !== 'pdf') {
      const url = URL.createObjectURL(f); const img = new Image();
      await new Promise<void>((res) => { img.onload = () => { width = img.naturalWidth; height = img.naturalHeight; res(); }; img.onerror = () => res(); img.src = url; });
      URL.revokeObjectURL(url);
    }
    setFileInfo(`${f.name} · ${formatBytes(f.size)} · ${kind}${width ? ` · ${width} × ${height} px` : ''}`);
    setResults(evaluateFile(profile, { size: f.size, kind, width, height }));
  }
  const overall = results ? overallStatus(results) : null;
  return (
    <div className="card p-5">
      <p className="rounded bg-amber-50 border border-amber-200 p-3 text-sm">Independent document-preparation tool. Not affiliated with SSC, UPSC or any government department. Always confirm the latest requirements on the official website.</p>
      <label className="block mt-4 font-semibold" htmlFor="profile">Select application / document</label>
      <select id="profile" className="w-full max-w-full rounded-2xl border border-violet-200 bg-white px-3 py-2.5 font-medium text-slate-800 mt-1" value={profileId} onChange={(e) => { setProfileId(e.target.value); setResults(null); }}>
        {PROFILES.map((p) => <option key={p.id} value={p.id}>{p.organization} — {p.examName} — {p.documentType} ({p.status})</option>)}
      </select>
      <div className="mt-4 text-sm">
        <p><strong>Formats:</strong> {profile.formats.join(', ')}</p>
        <p><strong>Size:</strong> {profile.minBytes ? `${formatBytes(profile.minBytes)} minimum` : 'not specified'} {profile.maxBytes ? `· ${formatBytes(profile.maxBytes)} maximum` : ''}</p>
        {profile.dimensions && <p><strong>Dimensions:</strong> {profile.dimensions} ({profile.dimensionsExact ? 'exact' : 'approximate'})</p>}
        {profile.special?.includes('live-camera') && <p><strong>Special:</strong> Live-camera capture required — a file upload cannot prove this.</p>}
        <p><strong>Official source:</strong> <a className="no-underline font-semibold text-violet-700 hover:text-violet-900" href={profile.officialUrl}>SSC notice PDF (official site)</a> · Notice date {profile.noticeDate} · Last verified {profile.lastVerified} · Effective {profile.effectiveFrom} to {profile.effectiveTo}</p>
        <p className="mt-2">{profile.notes}</p>
      </div>
      <label className="block mt-5 font-semibold" htmlFor="check-file">Upload a file for local inspection</label>
      <div className="mt-1 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/60 p-3">
        <input id="check-file" className="w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-violet-700" type="file" accept="image/*,application/pdf" onChange={(e) => onFile(e.target.files?.[0])} />
        <p className="text-xs text-slate-500 mt-2">📁 Tap the violet button to choose a file · Or drag a file onto the picker in a desktop browser.</p>
      </div>
      {fileInfo && <p className="text-sm mt-2">{fileInfo}</p>}
      {error && <p role="alert" className="mt-3 rounded bg-red-50 border border-red-200 p-3 text-red-800">{error}</p>}
      {results && <div className="mt-5">
        <p className="font-bold">Overall: {overall} — a PASS here would only mean the locally testable, verified checks passed. It is not a guarantee of acceptance.</p>
        <ul className="mt-3 space-y-2">{results.map((r) => <li key={r.id} className="border rounded p-3"><strong>{r.label}: {r.status}</strong> — {r.detail}</li>)}</ul>
        <p className="mt-4 text-sm">Fixable problems: <a className="no-underline font-semibold text-violet-700 hover:text-violet-900" href="/tools/signature-10-to-20kb/">Signature resize to 10–20 KB</a> · <a className="no-underline font-semibold text-violet-700 hover:text-violet-900" href="/tools/image-to-20kb/">Image to 20 KB</a> · <a className="no-underline font-semibold text-violet-700 hover:text-violet-900" href="/tools/pdf-under-100kb/">PDF under 100 KB</a>. After fixing, upload the new file here again to revalidate.</p>
      </div>}
    </div>
  );
}
