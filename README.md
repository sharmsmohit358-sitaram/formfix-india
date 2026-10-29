# FormFix India
Free, browser-local tools to resize images to 20/50/100 KB, prepare signatures to 10–20 KB, compress PDFs under 100/200 KB, and check files against application requirements.
## Quick start
npm install
npm run dev
npm test
npm run build
## Architecture
See docs/ARCHITECTURE.md. No server, no database, no uploads: processing happens in the visitor's browser.
## Before public launch (owner actions)
1. Set PUBLIC_SITE_URL to the real domain in .env and rebuild — do not ship placeholder canonicals.
2. Add a real contact address on /contact/ and in the Privacy Policy.
3. Keep PUBLIC_ADS_ENABLED=false until AdSense approval with a real publisher ID.
4. Submit sitemap.xml in Google Search Console.
See docs/DEPLOYMENT.md, docs/SEO-CHECKLIST.md, docs/ADSENSE-CHECKLIST.md, docs/PRIVACY-CHECKLIST.md, docs/TOOL-LIMITATIONS.md.
## Versions (pinned in package-lock.json)
Astro 5, React 19, Tailwind CSS 4, pdf-lib 1.17, pdfjs-dist 4.10, Vitest 3, TypeScript 5.9.
