export type TrackedEvent = 'ViewContent' | 'Lead' | 'Contact';

/** Mismo nombre de evento en Meta Pixel y GA4. Con eventId, Meta deduplica contra la API de conversiones. */
export function track(event: TrackedEvent, params: Record<string, string> = {}, eventId?: string): void {
  window.fbq?.('track', event, params, eventId ? { eventID: eventId } : undefined);
  window.gtag?.('event', event, params);
  if (event === 'Lead') window.gtag?.('event', 'generate_lead', params);
}

/** Contact: cualquier click en un enlace de WhatsApp, con la sección de origen. */
export function trackWhatsAppClicks(): void {
  document.addEventListener('click', (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-wa]');
    if (link) track('Contact', { origin: link.dataset.origin ?? 'unknown' });
  });
}

/** ViewContent: la primera vez que el formulario entra en pantalla. */
export function trackFormView(): void {
  const section = document.querySelector('[data-quote-section]');
  if (!section || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      track('ViewContent', { content_name: 'quote_form' });
      observer.disconnect();
    },
    { threshold: 0.3 },
  );
  observer.observe(section);
}
