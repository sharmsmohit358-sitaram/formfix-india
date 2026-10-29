import type { APIRoute } from 'astro';
const paths: Array<[string, string]> = [
  ['', '1.0'], ['/tools/image-to-20kb/', '0.9'], ['/tools/image-to-50kb/', '0.9'], ['/tools/image-to-100kb/', '0.9'],
  ['/tools/signature-10-to-20kb/', '0.9'], ['/tools/pdf-under-100kb/', '0.9'], ['/tools/pdf-under-200kb/', '0.9'],
  ['/application-checker/', '0.9'],
  ['/guides/', '0.8'], ['/guides/photo-20kb/', '0.8'], ['/guides/signature-10-20kb/', '0.8'], ['/guides/pdf-under-100kb/', '0.8'],
  ['/about/', '0.5'], ['/privacy/', '0.5'], ['/terms/', '0.5'], ['/contact/', '0.5'],
];
export const GET: APIRoute = ({ site }) => {
  const base = (site?.toString() || '').replace(/\/$/, '');
  const today = new Date().toISOString().split('T')[0];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(([p, pr]) => `  <url><loc>${base}${p}</loc><lastmod>${today}</lastmod><priority>${pr}</priority></url>`).join('\n')}\n</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
