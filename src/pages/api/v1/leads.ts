import type { APIRoute } from 'astro';
import { z } from 'zod';
import { leadSchema } from '../../../core/lead';
import { leadsStorageConfigured, saveLead, sendMetaLead, type RequestContext } from '../../../lib/leads';

export const prerender = false;

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 6;
/** Mejor esfuerzo por instancia serverless; la protección real contra abuso es el honeypot + validación. */
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

function json(status: number, body: Record<string, unknown>, requestId: string): Response {
  return new Response(JSON.stringify({ ...body, requestId }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function sameOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get('origin');
  return !origin || new URL(origin).host === url.host;
}

export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  const requestId = crypto.randomUUID();
  if (!sameOrigin(request, url)) return json(403, { error: 'forbidden', message: 'Origen no permitido.' }, requestId);
  if (rateLimited(clientAddress)) {
    return json(429, { error: 'rate_limited', message: 'Demasiados intentos. Probá más tarde.' }, requestId);
  }

  const payload: unknown = await request.json().catch(() => null);
  const parsed = leadSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors;
    return json(400, { error: 'invalid_request', message: 'Revisá los datos.', fieldErrors }, requestId);
  }

  const lead = parsed.data;
  // Honeypot lleno ya fue rechazado por el schema; si llega vacío se procesa normal.
  if (!leadsStorageConfigured() && import.meta.env.PROD) {
    console.error(`[leads] ${requestId} LEADS_WEBHOOK_URL no configurado`);
    return json(503, { error: 'not_configured', message: 'Servicio no disponible.' }, requestId);
  }

  const ctx: RequestContext = {
    ip: clientAddress,
    userAgent: request.headers.get('user-agent') ?? '',
    sourceUrl: request.headers.get('referer') ?? url.origin,
  };

  try {
    await saveLead(lead, ctx);
  } catch (error) {
    console.error(`[leads] ${requestId} fallo al guardar`, error instanceof Error ? error.message : error);
    return json(502, { error: 'storage_failed', message: 'No pudimos guardar tu pedido.' }, requestId);
  }
  sendMetaLead(lead, ctx).catch((error: unknown) =>
    console.error(`[leads] ${requestId} CAPI`, error instanceof Error ? error.message : error),
  );

  return json(200, { ok: true, eventId: lead.eventId }, requestId);
};
