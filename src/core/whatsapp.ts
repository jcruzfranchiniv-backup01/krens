export type TemplateVars = Record<string, string | undefined>;

/** Reemplaza {clave} por su valor; si falta, quita el fragmento sin dejar llaves. */
export function renderTemplate(template: string, vars: TemplateVars = {}): string {
  return template
    .replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '')
    .replace(/\s+([.,!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Sin número configurado devuelve el selector genérico de WhatsApp (no rompe el botón). */
export function buildWhatsAppUrl(number: string, message: string): string {
  const digits = number.replace(/\D/g, '');
  const text = encodeURIComponent(message);
  return digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
}
