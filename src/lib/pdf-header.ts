/** Tiny, dependency-free PDF header sniffing. Kept separate from pdf-processing.ts
 * so the PDF tool page can show signature/form warnings without loading pdf-lib
 * (334 KB) on page load. pdf-lib is loaded dynamically only when the user runs
 * preserve or rasterize mode. */
export function parsePdfHeaderInfo(bytes: Uint8Array): { maybeSigned: boolean; hasForms: boolean; encrypted: boolean } {
  const head = new TextDecoder('latin1').decode(bytes.slice(0, Math.min(bytes.length, 200000)));
  return { maybeSigned: /\/Sig\b|ByteRange/.test(head), hasForms: /\/AcroForm\b/.test(head), encrypted: /\/Encrypt\b/.test(head) };
}
