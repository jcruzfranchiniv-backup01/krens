import { site } from '../content';

/** JSON-LD fiel a lo visible: sólo incluye datos que el cliente cargó. */
export function localBusinessJsonLd(siteUrl: string, image?: string) {
  const { contact, brand } = site;
  const phone = contact.whatsappNumber.replace(/\D/g, '');
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'FoodEstablishment'],
    name: brand.name,
    description: site.seo.description,
    url: siteUrl,
    ...(image ? { image } : {}),
    ...(phone ? { telephone: `+${phone}` } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Irigoin 531',
      addressLocality: 'San Miguel',
      addressRegion: 'Buenos Aires',
      addressCountry: 'AR',
    },
    sameAs: [contact.instagramUrl],
    ...(contact.hours.length ? { openingHours: contact.hours } : {}),
    ...(contact.deliveryZones.length ? { areaServed: contact.deliveryZones } : {}),
  };
}
