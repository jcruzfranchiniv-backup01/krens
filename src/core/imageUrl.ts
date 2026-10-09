export type UrlCheck = { ok: true; url: string } | { ok: false; message: string };

export const DEFAULT_IMAGE_HOSTS = ['res.cloudinary.com'];
const MAX_URL_LENGTH = 500;

export function parseAllowedHosts(raw: string | undefined): string[] {
  const hosts = (raw ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return hosts.length > 0 ? hosts : DEFAULT_IMAGE_HOSTS;
}

/** Acepta sólo https, sin credenciales ni puerto, de un host permitido. No se descarga nada: sólo se guarda y se muestra. */
export function validateImageUrl(raw: string, allowedHosts: string[]): UrlCheck {
  const text = raw.trim();
  if (!text) return { ok: false, message: 'Pegá una URL.' };
  if (text.length > MAX_URL_LENGTH || /\s/.test(text)) return { ok: false, message: 'La URL no es válida.' };
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { ok: false, message: 'La URL no es válida.' };
  }
  if (url.protocol !== 'https:') return { ok: false, message: 'La URL debe empezar con https://' };
  if (url.username || url.password || url.port) return { ok: false, message: 'La URL no puede incluir usuario ni puerto.' };
  if (!allowedHosts.includes(url.hostname.toLowerCase())) {
    return { ok: false, message: `Sólo se aceptan imágenes de: ${allowedHosts.join(', ')}.` };
  }
  url.hash = '';
  return { ok: true, url: url.href };
}

/** "16 / 10" -> 1.6 (para width/height y para pedir el recorte a Cloudinary). */
export function parseRatio(ratio: string): { w: number; h: number } {
  const [w, h] = ratio.split('/').map((n) => Number(n.trim()));
  return w && h ? { w, h } : { w: 4, h: 3 };
}

export interface Transform {
  width?: number;
  height?: number;
  /** Proporción CSS, por ejemplo "4 / 3": recorta con foco inteligente. */
  ratio?: string;
}

const CLOUDINARY = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

/** Cloudinary entrega WebP/AVIF y el ancho pedido (f_auto,q_auto). Otros hosts se devuelven tal cual. */
export function optimizeImageUrl(url: string, { width, height, ratio }: Transform = {}): string {
  const match = CLOUDINARY.exec(url);
  if (!match) return url;
  const parts = ['f_auto', 'q_auto'];
  if (ratio) {
    const { w, h } = parseRatio(ratio);
    parts.push('c_fill', `ar_${w}:${h}`, 'g_auto');
  } else {
    parts.push('c_limit');
  }
  if (width) parts.push(`w_${width}`);
  if (height) parts.push(`h_${height}`);
  return `${match[1]}${parts.join(',')}/${match[2]}`;
}
