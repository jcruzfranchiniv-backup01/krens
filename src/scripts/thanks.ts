import { buildWhatsAppUrl, renderTemplate } from '../core/whatsapp';

function labels(id: string): Record<string, string> {
  try {
    return JSON.parse(document.getElementById(id)?.textContent ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

/** Arma el mensaje de WhatsApp con el tipo y la cantidad elegidos (sólo datos no personales viajan en la URL). */
export function initThanks(): void {
  const link = document.querySelector<HTMLAnchorElement>('[data-thanks-wa]');
  if (!link) return;
  const query = new URLSearchParams(location.search);
  const evento = labels('event-labels')[query.get('tipo') ?? ''];
  const personas = labels('guest-labels')[query.get('personas') ?? ''];
  const message = renderTemplate(link.dataset.template ?? '', {
    evento: evento?.toLowerCase(),
    personas: personas?.replace(/ personas$/, ''),
  });
  link.href = buildWhatsAppUrl(link.dataset.number ?? '', message);
}
