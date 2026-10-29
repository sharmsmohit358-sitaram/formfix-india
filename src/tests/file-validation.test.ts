import { describe, it, expect } from 'vitest';
import { detectKind, isPdfHeader, looksEncryptedPdfText } from '../lib/file-validation';
describe('file signatures', () => {
  it('detects JPEG/PNG/WebP/PDF from magic bytes, not names', () => {
    expect(detectKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
    expect(detectKind(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('png');
    expect(detectKind(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe('webp');
    expect(detectKind(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe('pdf');
    expect(detectKind(new Uint8Array([1, 2, 3]))).toBe('unknown');
  });
  it('detects PDF header and Encrypt marker', () => {
    expect(isPdfHeader(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(true);
    expect(looksEncryptedPdfText('<< /Encrypt 12 0 R >>')).toBe(true);
    expect(looksEncryptedPdfText('plain')).toBe(false);
  });
});
