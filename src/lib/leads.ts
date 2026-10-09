import { createHash } from 'node:crypto';
import { LEADS_WEBHOOK_SECRET, LEADS_WEBHOOK_URL, META_CAPI_TOKEN, META_TEST_EVENT_CODE } from 'astro:env/server';
import { PUBLIC_META_PIXEL_ID } from 'astro:env/client';
import type { LeadInput } from '../core/lead';
import { site } from '../content';

export interface RequestContext {
  ip: string;
  userAgent: string;
  sourceUrl: string;
}

const GRAPH_VERSION = 'v21.0';
const TIMEOUT_MS = 8000;

export function leadsStorageConfigured(): boolean {
  return Boolean(LEADS_WEBHOOK_URL);
}

function label(options: { id: string; label: string }[], id: string): string {
  return options.find((o) => o.id === id)?.label ?? id;
}

/** Guarda el lead en la hoja de Google (Apps Script). Lanza si falla: no se debe perder un lead. */
export async function saveLead(lead: LeadInput, ctx: RequestContext): Promise<void> {
  if (!LEADS_WEBHOOK_URL) return;
  const response = await fetch(LEADS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: LEADS_WEBHOOK_SECRET ?? '',
      receivedAt: new Date().toISOString(),
      name: lead.name,
      eventType: label(site.form.eventOptions, lead.eventType),
      guests: label(site.form.guestOptions, lead.guests),
      eventDate: lead.eventDate ?? '',
      phone: lead.phone,
      eventId: lead.eventId,
      sourceUrl: ctx.sourceUrl,
      ...lead.attribution,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`Leads webhook respondió ${response.status}`);
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** Evento Lead server-side, deduplicado con el del navegador por event_id. Falla en silencio (se loguea). */
export async function sendMetaLead(lead: LeadInput, ctx: RequestContext): Promise<void> {
  if (!PUBLIC_META_PIXEL_ID || !META_CAPI_TOKEN) return;
  const { fbp, fbc } = lead.attribution;
  const body = {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_id: lead.eventId,
        event_source_url: ctx.sourceUrl,
        action_source: 'website',
        user_data: {
          ph: [sha256(lead.phone.replace(/\D/g, ''))],
          client_ip_address: ctx.ip,
          client_user_agent: ctx.userAgent,
          ...(fbp ? { fbp } : {}),
          ...(fbc ? { fbc } : {}),
        },
        custom_data: { event_type: lead.eventType, guests: lead.guests },
      },
    ],
    ...(META_TEST_EVENT_CODE ? { test_event_code: META_TEST_EVENT_CODE } : {}),
  };
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PUBLIC_META_PIXEL_ID}/events?access_token=${META_CAPI_TOKEN}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Meta CAPI respondió ${response.status}`);
}
