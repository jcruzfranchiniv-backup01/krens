import { defineMiddleware } from 'astro:middleware';
import { getImageOverrides } from './lib/imageOverrides';

const isAdminPath = (path: string) => path.startsWith('/admin') || path.startsWith('/api/v1/admin');

/** Seguridad: lo administrativo nunca se cachea ni se indexa. Público: carga las URLs de imágenes guardadas. */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (isAdminPath(pathname)) {
    context.locals.images = {};
    const response = await next();
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }

  context.locals.images = pathname.startsWith('/api/') ? {} : await getImageOverrides();
  const response = await next();
  const isHtml = response.headers.get('content-type')?.includes('text/html');
  if (import.meta.env.PROD && context.request.method === 'GET' && isHtml) {
    // Un cambio hecho en /admin llega al sitio en ~1 minuto (caché de borde).
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  }
  return response;
});
