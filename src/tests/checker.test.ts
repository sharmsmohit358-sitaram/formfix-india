import { describe, it, expect } from 'vitest';
import { evaluateFile, overallStatus } from '../lib/checker';
import { PROFILES } from '../data/application-requirements';
const sig = PROFILES.find((p) => p.id === 'ssc-cht-2026-signature')!;
describe('checker', () => {
  it('never returns a full PASS for an archived profile', () => {
    const r = evaluateFile(sig, { size: 15000, kind: 'jpeg', width: 600, height: 200 });
    expect(overallStatus(r)).not.toBe('PASS');
    expect(r.find((x) => x.id === 'cycle')?.status).toBe('UNKNOWN');
  });
  it('fails oversized and undersized files', () => {
    expect(evaluateFile(sig, { size: 25000, kind: 'jpeg' }).find((x) => x.id === 'max-size')?.status).toBe('FAIL');
    expect(evaluateFile(sig, { size: 5000, kind: 'jpeg' }).find((x) => x.id === 'min-size')?.status).toBe('FAIL');
  });
  it('fails wrong format and warns on dimensions (conflicting source)', () => {
    expect(evaluateFile(sig, { size: 15000, kind: 'png' }).find((x) => x.id === 'format')?.status).toBe('FAIL');
    expect(evaluateFile(sig, { size: 15000, kind: 'jpeg' }).find((x) => x.id === 'dimensions')?.status).toBe('WARNING');
  });
  it('marks live-camera photograph as UNKNOWN, not PASS', () => {
    const photo = PROFILES.find((p) => p.id === 'ssc-cht-2026-photograph')!;
    const r = evaluateFile(photo, { size: 15000, kind: 'jpeg' });
    expect(r.find((x) => x.id === 'live-camera')?.status).toBe('UNKNOWN');
    expect(overallStatus(r)).toBe('UNKNOWN');
  });
  it('does not invent a size rule for the photograph profile', () => {
    const photo = PROFILES.find((p) => p.id === 'ssc-cht-2026-photograph')!;
    expect(photo.minBytes).toBeUndefined(); expect(photo.maxBytes).toBeUndefined();
  });
});
