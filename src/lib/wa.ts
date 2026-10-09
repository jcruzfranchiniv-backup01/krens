import { buildWhatsAppUrl, renderTemplate, type TemplateVars } from '../core/whatsapp';
import { site } from '../content';

type MessageKey = keyof typeof site.whatsappMessages;

/** Link de WhatsApp con mensaje prellenado según la sección de origen. */
export function waLink(origin: MessageKey, vars: TemplateVars = {}): string {
  const message = renderTemplate(site.whatsappMessages[origin], vars);
  return buildWhatsAppUrl(site.contact.whatsappNumber, message);
}
