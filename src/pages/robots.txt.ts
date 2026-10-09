import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const sitemap = site ? new URL('sitemap-index.xml', site).href : '';
  const body = ['User-agent: *', 'Allow: /', 'Disallow: /api/', 'Disallow: /admin','Disallow: /gracias', '', sitemap && `Sitemap: ${sitemap}`]
    .filter((line) => line !== undefined)
    .join('\n');
  return new Response(`${body}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
