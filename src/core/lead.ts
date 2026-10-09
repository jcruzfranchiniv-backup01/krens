import { z } from 'zod';

/** Identificadores estables; las etiquetas visibles viven en src/content/site.json. */
export const EVENT_TYPE_IDS = ['corporativo', 'hotel', 'social', 'coffee', 'catering', 'otro'] as const;
export const GUEST_RANGE_IDS = ['hasta-20', '21-50', '51-100', '101-200', 'mas-200'] as const;

export type EventTypeId = (typeof EVENT_TYPE_IDS)[number];
export type GuestRangeId = (typeof GUEST_RANGE_IDS)[number];

const PHONE_MIN_DIGITS = 8;
const PHONE_MAX_DIGITS = 15;

export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

export function isValidPhone(raw: string): boolean {
  const digits = normalizePhone(raw).replace(/\D/g, '');
  return digits.length >= PHONE_MIN_DIGITS && digits.length <= PHONE_MAX_DIGITS;
}

const shortText = z.string().trim().max(300).optional();

export const attributionSchema = z.object({
  utm_source: shortText,
  utm_medium: shortText,
  utm_campaign: shortText,
  utm_content: shortText,
  utm_term: shortText,
  fbclid: shortText,
  gclid: shortText,
  fbp: shortText,
  fbc: shortText,
  landing: shortText,
  referrer: shortText,
});

export const leadSchema = z.object({
  name: z.string().trim().min(2, 'Contanos tu nombre y empresa.').max(120),
  eventType: z.enum(EVENT_TYPE_IDS, 'Elegí un tipo de evento.'),
  guests: z.enum(GUEST_RANGE_IDS, 'Elegí una cantidad aproximada.'),
  eventDate: z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida.')]).optional(),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine(isValidPhone, 'Ingresá un WhatsApp válido, con código de área.')
    .transform(normalizePhone),
  /** Honeypot: un humano no lo completa. */
  website: z.string().max(0).optional(),
  eventId: z.string().min(8).max(64),
  attribution: attributionSchema.default({}),
});

export type LeadInput = z.infer<typeof leadSchema>;
export type Attribution = z.infer<typeof attributionSchema>;
