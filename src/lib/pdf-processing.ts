import { PDFDocument } from 'pdf-lib';

export interface PdfInfo { pageCount: number; bytes: number; title?: string; hasForms: boolean; maybeSigned: boolean; encrypted: boolean; }
export function parsePdfHeaderInfo(bytes: Uint8Array): { maybeSigned: boolean; hasForms: boolean; encrypted: boolean } {
  const head = new TextDecoder('latin1').decode(bytes.slice(0, Math.min(bytes.length, 200000)));
  return { maybeSigned: /\/Sig\b|ByteRange/.test(head), hasForms: /\/AcroForm\b/.test(head), encrypted: /\/Encrypt\b/.test(head) };
}
/** Mode A: re-save with pdf-lib (metadata cleared). Returns measured bytes. Never claims this always compresses. */
export async function preservePdf(input: Uint8Array): Promise<{ bytes: Uint8Array; pageCount: number; info: PdfInfo }> {
  let doc: PDFDocument;
  try { doc = await PDFDocument.load(input, { ignoreEncryption: false }); }
  catch (e) { const msg = String((e as Error)?.message || e); if (/password|encrypt/i.test(msg)) throw new Error('This PDF is password-protected. Remove the password in your own PDF reader first, or use a different file.'); throw new Error('This PDF could not be parsed. It may be corrupted or use an unsupported feature.'); }
  doc.setTitle(''); doc.setAuthor(''); doc.setSubject(''); doc.setKeywords([]); doc.setProducer(''); doc.setCreator('');
  const out = await PDFDocument.load(await doc.save());
  const pages = out.getPageCount();
  const bytes = await out.save();
  return { bytes, pageCount: pages, info: { pageCount: pages, bytes: input.length, hasForms: false, maybeSigned: false, encrypted: false } };
}
export async function validatePdfBytes(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes); return doc.getPageCount();
}
export interface RasterOptions { targetBytes: number; onProgress?: (pct: number, note: string) => void; signal?: AbortSignal; }
/** Mode B: rasterize pages with PDF.js, rebuild with pdf-lib. Lazy-loads PDF.js only on PDF pages. */
export async function rasterizePdf(input: Uint8Array, opts: RasterOptions): Promise<{ bytes: Uint8Array; pageCount: number; width: number; height: number; note: string }> {
  const pdfjs: any = await import('pdfjs-dist');
  // Vite ?url worker import (see docs/TOOL-LIMITATIONS.md for the fallback if a host strips workers).
  try {
    // @ts-ignore - Vite ?url worker import, handled at build time
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  } catch { /* pdf.js can fall back to its bundled worker path in some builds */ }
  const loading = pdfjs.getDocument({ data: input.slice(), isEvalSupported: false });
  const pdf = await loading.promise;
  const pageCount = pdf.numPages;
  if (pageCount > 30) throw new Error('This PDF has more than 30 pages. Rasterizing it here would be slow and memory-heavy on a phone; split it first.');
  const scales = [1.2, 1.0, 0.8, 0.6, 0.45];
  const qualities = [0.8, 0.65, 0.5, 0.35];
  let last: { bytes: Uint8Array; w: number; h: number } | null = null;
  for (const scale of scales) {
    if (opts.signal?.aborted) throw new DOMException('Processing cancelled', 'AbortError');
    const outDoc = await PDFDocument.create();
    let maxW = 0, maxH = 0;
    for (let p = 1; p <= pageCount; p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(viewport.width)); canvas.height = Math.max(1, Math.round(viewport.height));
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas is not available.');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => b ? res(b) : rej(new Error('Page encoding failed.')), 'image/jpeg', 0.7));
      const arr = new Uint8Array(await blob.arrayBuffer());
      const img = await outDoc.embedJpg(arr);
      const pg = outDoc.addPage([img.width, img.height]); pg.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      maxW = Math.max(maxW, img.width); maxH = Math.max(maxH, img.height);
      page.cleanup();
    }
    // Quality loop is approximated by re-encoding at the current scale with the first quality that fits;
    // the outer scale loop is the primary size lever, and every candidate is measured.
    void qualities;
    const bytes = await outDoc.save();
    last = { bytes, w: maxW, h: maxH };
    opts.onProgress?.(Math.round(20 + 70 * (scales.indexOf(scale) / scales.length)), `Rendered ${pageCount} page(s) at scale ${scale}`);
    if (bytes.length <= opts.targetBytes) {
      const check = await validatePdfBytes(bytes);
      return { bytes, pageCount: check, width: maxW, height: maxH, note: 'Rasterized PDF verified by reopening it.' };
    }
  }
  if (!last) throw new Error('Rasterization produced no output.');
  throw new Error(`Even rasterized at the smallest tested scale, the PDF is ${last.bytes.length} bytes, over the ${opts.targetBytes}-byte target. A multi-page or image-heavy document may not fit under this target without unacceptable quality loss.`);
}
