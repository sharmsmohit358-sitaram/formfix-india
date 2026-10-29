import { describe, it, expect } from 'vitest';
import { parsePdfHeaderInfo } from '../lib/pdf-processing';
describe('pdf header info', () => {
  it('flags forms and signatures conservatively', () => {
    const enc = new TextEncoder();
    expect(parsePdfHeaderInfo(enc.encode('<< /AcroForm 1 0 R /Sig 2 0 R >>')).hasForms).toBe(true);
    expect(parsePdfHeaderInfo(enc.encode('plain pdf text')).maybeSigned).toBe(false);
  });
});
