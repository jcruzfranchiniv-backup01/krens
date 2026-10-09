import raw from './site.json';

export interface PromoItem {
  image: string;
  alt: string;
  title?: string;
  text?: string;
  cta?: string;
}
export interface GalleryItem {
  type: 'image' | 'video';
  image: string;
  alt: string;
  /** Sólo videos: ruta bajo /public, por ejemplo /videos/evento-1.mp4 */
  src?: string;
}
export interface TrustLogo {
  image: string;
  alt: string;
}

type Raw = typeof raw;

export type Site = Omit<Raw, 'contact' | 'trust' | 'promos' | 'gallery'> & {
  contact: Omit<Raw['contact'], 'hours' | 'deliveryZones'> & { hours: string[]; deliveryZones: string[] };
  trust: { title: string; stats: { value: string; label: string }[]; logos: TrustLogo[] };
  promos: { eyebrow: string; title: string; intro: string; items: PromoItem[] };
  gallery: { eyebrow: string; title: string; items: GalleryItem[] };
};

/** El JSON se infiere con arrays vacíos como never[]; el cast fija la forma real. */
export const site = raw as unknown as Site;
