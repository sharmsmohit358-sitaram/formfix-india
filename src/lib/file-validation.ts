export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_PDF_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 25_000_000;
export type DetectedKind = 'jpeg' | 'png' | 'webp' | 'gif' | 'pdf' | 'unknown';
export function detectKind(bytes: Uint8Array): DetectedKind {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'webp';
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'gif';
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) return 'pdf';
  return 'unknown';
}
export function isPdfHeader(bytes: Uint8Array): boolean { return detectKind(bytes) === 'pdf'; }
export function looksEncryptedPdfText(text: string): boolean { return /\/Encrypt\b/.test(text); }
export function validateImageFile(file: File, bytes: Uint8Array): string | null {
  if (file.size > MAX_IMAGE_BYTES) return `File is ${Math.round(file.size / 1024 / 1024)} MB. The limit is 15 MB.`;
  if (file.size === 0) return 'This file is empty.';
  const kind = detectKind(bytes);
  if (!['jpeg', 'png', 'webp', 'gif'].includes(kind)) return 'This does not look like a supported image. Supported inputs are JPEG, PNG, WebP and GIF, checked from the file itself, not just its name.';
  return null;
}
export function validatePdfFile(file: File, bytes: Uint8Array): string | null {
  if (file.size > MAX_PDF_BYTES) return 'PDF is over the 25 MB limit for this tool.';
  if (file.size === 0) return 'This file is empty.';
  if (!isPdfHeader(bytes)) return 'This does not look like a PDF. The file must start with the PDF header, not just end in .pdf.';
  return null;
}
