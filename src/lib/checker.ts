export type CheckStatus = 'PASS' | 'FAIL' | 'WARNING' | 'UNKNOWN';
export interface CheckResult { id: string; label: string; status: CheckStatus; detail: string; }
export interface RequirementProfile {
  id: string; organization: string; examName: string; cycle: string;
  documentType: string; formats: string[]; minBytes?: number; maxBytes?: number;
  dimensions?: string; dimensionsExact: boolean; special?: string[];
  officialUrl: string; noticeDate?: string; lastVerified: string;
  effectiveFrom?: string; effectiveTo?: string; status: 'current' | 'archived' | 'needs-verification';
  notes: string;
}
export function evaluateFile(profile: RequirementProfile, file: { size: number; kind: string; width?: number; height?: number }): CheckResult[] {
  const out: CheckResult[] = [];
  if (profile.status === 'archived') out.push({ id: 'cycle', label: 'Application cycle', status: 'UNKNOWN', detail: `This profile is archived: the ${profile.cycle} cycle ended ${profile.effectiveTo ?? 'before today'}. Do not treat it as the current rule. Check the official site for the new cycle.` });
  else if (profile.status === 'needs-verification') out.push({ id: 'cycle', label: 'Verification', status: 'UNKNOWN', detail: 'Official rules for this profile have not been re-verified for the current cycle.' });
  else out.push({ id: 'cycle', label: 'Application cycle', status: 'PASS', detail: `Profile marked current as verified on ${profile.lastVerified}.` });
  const fmtOk = profile.formats.some((f) => file.kind.toLowerCase().includes(f.toLowerCase()) || (f === 'jpg' && file.kind === 'jpeg'));
  out.push({ id: 'format', label: 'File format', status: fmtOk ? 'PASS' : 'FAIL', detail: fmtOk ? `Format ${file.kind} is in the accepted list (${profile.formats.join(', ')}).` : `Format ${file.kind} is not in the accepted list (${profile.formats.join(', ')}).` });
  if (profile.minBytes !== undefined) out.push({ id: 'min-size', label: 'Minimum size', status: file.size >= profile.minBytes ? 'PASS' : 'FAIL', detail: file.size >= profile.minBytes ? `File is ${file.size} bytes, at or above ${profile.minBytes} bytes.` : `File is ${file.size} bytes, below the minimum ${profile.minBytes} bytes.` });
  if (profile.maxBytes !== undefined) out.push({ id: 'max-size', label: 'Maximum size', status: file.size <= profile.maxBytes ? 'PASS' : 'FAIL', detail: file.size <= profile.maxBytes ? `File is ${file.size} bytes, at or below ${profile.maxBytes} bytes.` : `File is ${file.size} bytes, over the maximum ${profile.maxBytes} bytes.` });
  if (profile.dimensions) {
    out.push({ id: 'dimensions', label: 'Dimensions', status: profile.dimensionsExact ? 'WARNING' : 'WARNING', detail: profile.dimensionsExact ? `Official size is ${profile.dimensions}. Pixel size alone cannot prove printed size without resolution metadata; check the ratio and preview manually.` : `Official guidance is about ${profile.dimensions}. This is approximate in the source, so this tool does not mark it as a hard pass or fail.` });
  }
  if (profile.special?.includes('live-camera')) out.push({ id: 'live-camera', label: 'Live-camera capture', status: 'UNKNOWN', detail: 'This application requires a live camera capture. A file upload cannot prove how the photo was captured.' });
  out.push({ id: 'quality', label: 'Clarity / manual checks', status: 'WARNING', detail: 'Blur, cropping, background and identity checks cannot be decided by file size or format alone. Check the preview yourself.' });
  return out;
}
export function overallStatus(results: CheckResult[]): CheckStatus {
  if (results.some((r) => r.status === 'FAIL')) return 'FAIL';
  if (results.some((r) => r.status === 'UNKNOWN')) return 'UNKNOWN';
  if (results.some((r) => r.status === 'WARNING')) return 'WARNING';
  return 'PASS';
}
