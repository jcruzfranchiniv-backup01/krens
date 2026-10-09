import { site } from '../content';

export interface Slot {
  /** Nombre de la imagen en site.json (clave en la base de datos). */
  id: string;
  group: string;
  label: string;
  /** Tamaño ideal a subir a Cloudinary. */
  size: string;
}

const SIZES = { hero: '2400 × 1350', slide: '1600 × 1000', card: '1200 × 900', square: '1200 × 1200', gallery0: '1600 × 1600', banner: '2000 × 1125', logo: 'SVG o PNG transparente, 800 px de ancho' };

/** Lista los lugares reemplazables del sitio. Una imagen usada en varias secciones es un único slot. */
export function listSlots(): Slot[] {
  const slots = new Map<string, Slot>();
  const add = (id: string, group: string, label: string, size: string) => {
    const existing = slots.get(id);
    if (existing) existing.label = `${existing.label} · ${label}`;
    else slots.set(id, { id, group, label, size });
  };

  add(site.brand.logo.image, 'Marca', 'Logo (header)', SIZES.logo);
  add(site.closing.image, 'Marca', 'Banner de cierre', SIZES.banner);
  add(site.hero.image, 'Portada', 'Portada principal (hero)', SIZES.hero);
  site.promos.items.forEach((p) => add(p.image, 'Promociones', p.title ?? p.image, SIZES.square));
  site.inspire.slides.forEach((s) => add(s.image, 'Catálogo', `${s.title} (carrusel)`, SIZES.slide));
  site.products.items.forEach((p) => add(p.image, 'Catálogo', `${p.label} (productos)`, SIZES.slide));
  site.events.items.forEach((e) => add(e.image, 'Eventos', e.label, SIZES.card));
  site.gallery.items.forEach((g, i) => add(g.image, 'Galería', `Galería ${i + 1}`, i === 0 ? SIZES.gallery0 : SIZES.square));
  return [...slots.values()];
}

export const slotIds = (): Set<string> => new Set(listSlots().map((s) => s.id));
