import { describe, it, expect } from 'vitest';
import { formatBytes, kib, scaleToFit } from '../lib/format';
describe('format', () => {
  it('defines 20 KiB as 20480 bytes', () => { expect(kib(20)).toBe(20480); expect(kib(10)).toBe(10240); });
  it('formats bytes', () => { expect(formatBytes(20480)).toContain('20'); expect(formatBytes(500)).toBe('500 bytes'); });
  it('does not upscale', () => { expect(scaleToFit(800, 600)).toEqual({ width: 800, height: 600, scaled: false }); });
  it('scales over the pixel limit', () => { const r = scaleToFit(10000, 10000); expect(r.width * r.height).toBeLessThanOrEqual(25_000_000); expect(r.scaled).toBe(true); });
});
