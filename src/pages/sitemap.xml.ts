import type { APIRoute } from 'astro';
const paths = ['', '/tools/image-to-20kb/', '/tools/image-to-50kb/', '/tools/image-to-100kb/', '/tools/signature-10-to-20kb/', '/tools/pdf-under-100kb/', '/tools/pdf-under-200kb/', '/application-checker/', '/about/', '/privacy/', '/terms/', '/contact/'];
export const GET: APIRoute = ({ site }) => {
  const base = (site?.toString() || '').replace(/\/$/, '');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `  <url><loc>${base}${p}</loc></url>`).join('\n')}\n</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
