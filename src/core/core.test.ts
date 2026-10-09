import { describe, expect, it } from 'vitest';
import { leadSchema, normalizePhone } from './lead';
import { buildWhatsAppUrl, renderTemplate } from './whatsapp';

const valid = {
  name: 'Ana Pérez, Acme',
  eventType: 'corporativo',
  guests: '21-50',
  eventDate: '',
  phone: '11 5555-1234',
  eventId: 'abcd1234efgh',
};

describe('leadSchema', () => {
  it('acepta un lead válido y normaliza el teléfono', () => {
    const result = leadSchema.parse(valid);
    expect(result.phone).toBe('1155551234');
    expect(result.attribution).toEqual({});
  });

  it('rechaza teléfono corto, tipo desconocido y honeypot lleno', () => {
    expect(leadSchema.safeParse({ ...valid, phone: '123' }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, eventType: 'x' }).success).toBe(false);
    expect(leadSchema.safeParse({ ...valid, website: 'spam' }).success).toBe(false);
  });

  it('conserva el + inicial', () => {
    expect(normalizePhone('+54 9 11 5555-1234')).toBe('+5491155551234');
  });
});

describe('whatsapp', () => {
  it('renderiza variables y limpia las faltantes', () => {
    expect(renderTemplate('Hola! Evento {evento} para {personas} personas.', { evento: 'corporativo' })).toBe(
      'Hola! Evento corporativo para personas.',
    );
  });

  it('arma la URL con y sin número', () => {
    expect(buildWhatsAppUrl('+54 9 11 1234-5678', 'Hola Krens!')).toBe(
      'https://wa.me/5491112345678?text=Hola%20Krens!',
    );
    expect(buildWhatsAppUrl('', 'Hola')).toBe('https://wa.me/?text=Hola');
  });
});
