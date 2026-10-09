import type { APIRoute } from 'astro';
import { z } from 'zod';
import { ADMIN_IMAGE_HOSTS } from 'astro:env/server';
import { parseAllowedHosts, validateImageUrl } from '../../../../core/imageUrl';
import { jsonResponse, requireAdmin } from '../../../../lib/auth';
import { clearOverride, setOverride } from '../../../../lib/imageOverrides';
import { slotIds } from '../../../../lib/slots';

export const prerender = false;

const bodySchema = z.object({ slot: z.string().min(1).max(80), url: z.string().max(600).nullable() });

/** PUT { slot, url } guarda la URL; { slot, url: null } vuelve a la imagen original del sitio. */
export const PUT: APIRoute = async (context) => {
  const session = await requireAdmin(context);
  if (session instanceof Response) return session;

  const parsed = bodySchema.safeParse(await context.request.json().catch(() => null));
  if (!parsed.success) return jsonResponse(400, { error: 'invalid_request', message: 'Datos inválidos.' });
  const { slot, url } = parsed.data;
  if (!slotIds().has(slot)) return jsonResponse(400, { error: 'unknown_slot', message: 'Imagen desconocida.' });

  try {
    if (url === null) {
      await clearOverride(slot, session.username);
      return jsonResponse(200, { ok: true, url: null });
    }
    const check = validateImageUrl(url, parseAllowedHosts(ADMIN_IMAGE_HOSTS));
    if (!check.ok) return jsonResponse(400, { error: 'invalid_url', message: check.message });
    await setOverride(slot, check.url, session.username);
    return jsonResponse(200, { ok: true, url: check.url });
  } catch (error) {
    console.error('[admin] fallo al guardar imagen', error instanceof Error ? error.message : error);
    return jsonResponse(503, { error: 'unavailable', message: 'No se pudo guardar. Probá de nuevo.' });
  }
};
