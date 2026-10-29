# Deployment
## Build
npm install
npm test
npm run build
Output: dist/
## Cloudflare Pages
Build command: npm run build. Output directory: dist. Environment: PUBLIC_SITE_URL=https://your-real-domain (no trailing slash), PUBLIC_ADS_ENABLED=false. Enable HTTPS (Cloudflare does this by default for a proxied domain). After deploy, submit https://your-real-domain/sitemap.xml in Search Console.
## Hostinger static hosting
Upload the contents of dist/ to public_html (not the dist folder itself). No Node, database or PHP is needed. Set the domain, force HTTPS in hPanel, and check that /sitemap.xml and /robots.txt load. If you use a subdomain, set PUBLIC_SITE_URL to that exact subdomain and rebuild before uploading.
## Rollback
Keep the previous dist/ upload. To roll back, re-upload the previous dist/ contents. No database migration exists, so rollback is a file replacement.
## ads.txt (only after AdSense approval)
Create public/ads.txt with the exact line Google gives you for your publisher ID, then rebuild and redeploy. Do not publish an invented line.
