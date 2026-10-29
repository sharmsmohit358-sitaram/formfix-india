# Architecture — FormFix India
Static Astro site. React hydrates only on tool and checker pages (`client:load`); informational pages ship no tool JavaScript.
Data flow: user picks a file → File API reads bytes in the browser → magic-byte validation → Canvas (images) or PDF.js + pdf-lib (PDFs) → output Blob → object URL for preview/download → URLs revoked on reset/unmount where practical.
There is NO server endpoint, NO database, NO account system, and NO upload. If a future feature needs a server, it must be a separate, explicit decision — do not silently add one.
Image engine: `src/lib/image-processing.ts` (quality steps, then scale steps, every candidate measured by actual bytes). PDF Mode A: pdf-lib re-save. Mode B: PDF.js render → JPEG → pdf-lib rebuild, only with explicit consent.
