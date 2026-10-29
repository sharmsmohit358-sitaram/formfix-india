export const KiB = 1024;
export function kib(n: number): number { return n * KiB; }
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unknown size';
  if (bytes < KiB) return `${bytes} bytes`;
  if (bytes < KiB * KiB) return `${(bytes / KiB).toFixed(bytes < 10 * KiB ? 1 : 0)} KB`;
  return `${(bytes / (KiB * KiB)).toFixed(2)} MB`;
}
export function formatKiBLabel(kibValue: number): string { return `${kibValue} KB (${kibValue * KiB} bytes)`; }
/** Scale dimensions to fit within maxPixels / maxSide without upscaling. Pure and unit-tested. */
export function scaleToFit(width: number, height: number, maxPixels = 25_000_000, maxSide = 8000): { width: number; height: number; scaled: boolean } {
  if (width <= 0 || height <= 0) return { width, height, scaled: false };
  let scale = 1;
  const pixels = width * height;
  if (pixels > maxPixels) scale = Math.min(scale, Math.sqrt(maxPixels / pixels));
  if (width > maxSide) scale = Math.min(scale, maxSide / width);
  if (height > maxSide) scale = Math.min(scale, maxSide / height);
  if (scale >= 1) return { width, height, scaled: false };
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)), scaled: true };
}
export function aspectRatio(width: number, height: number): number { return height ? width / height : 0; }
