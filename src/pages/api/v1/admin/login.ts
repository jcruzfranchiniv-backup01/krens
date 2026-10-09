import type { APIRoute } from 'astro';
import { z } from 'zod';
import { authConfigured, checkCredentials, isLoginBlocked, jsonResponse, registerLoginFailure, sameOrigin, startSession } from '../../../../lib/auth';
import { StoreUnavailableError } from '../../../../lib/store';

export const prerender = false;

const bodySchema = z.object({ username: z.string().min(1).max(100), password: z.string().min(1).max(200) });

export const POST: APIRoute = async ({ request, url, cookies, clientAddress }) => {
  if (!sameOrigin(request, url)) return jsonResponse(403, { error: 'forbidden', message: 'Origen no permitido.' });
  if (!authConfigured()) return jsonResponse(503, { error: 'not_configured', message: 'El panel no está configurado.' });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonResponse(400, { error: 'invalid_request', message: 'Completá usuario y clave.' });

  try {
    if (await isLoginBlocked(clientAddress)) {
      return jsonResponse(429, { error: 'rate_limited', message: 'Demasiados intentos. Probá en 15 minutos.' });
    }
    const valid = await checkCredentials(parsed.data.username, parsed.data.password);
    if (!valid) {
      await registerLoginFailure(clientAddress);
      return jsonResponse(401, { error: 'invalid_credentials', message: 'Usuario o clave incorrectos.' });
    }
    await startSession(cookies, parsed.data.username, clientAddress);
    return jsonResponse(200, { ok: true });
  } catch (error) {
    if (error instanceof StoreUnavailableError) console.error('[admin] store no configurado');
    else console.error('[admin] fallo de login', error instanceof Error ? error.message : error);
    return jsonResponse(503, { error: 'unavailable', message: 'Servicio no disponible.' });
  }
};
