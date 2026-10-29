# Tool limitations — read before promising results
- Images: JPEG output only in MVP. Transparency becomes white. No upscaling beyond the original (except the range tool may use the original size to try to reach 10 KB; it never pads bytes).
- A target may be impossible at acceptable quality. The tool reports the closest output honestly and does not label it a success.
- Signatures: whitening/contrast are simple pixel adjustments, not handwriting verification, not OCR, not authenticity checking.
- PDFs: pdf-lib re-saving is NOT guaranteed compression. Rasterization loses selectable text, links, forms, signatures and accessibility. Password-protected PDFs are rejected. PDFs over 30 pages are rejected for rasterization on memory grounds. PDF.js worker is loaded via Vite `?url`; if a host strips worker files, rasterization will fail visibly — it will not silently produce a broken PDF, because outputs are reopened with pdf-lib before download is offered.
- Checker: only archived SSC CHT 2026 profiles are published. Dimensions conflict inside the source notice (6×2 cm vs 4×2 cm), so dimensions are WARNING, never hard PASS. Live-camera photos cannot be verified from a file.
- Processing runs asynchronously on the main thread in this MVP. OffscreenCanvas/Web Worker portability on low-end Android was not proven, so no worker is claimed. Cancellation is supported via AbortSignal.
