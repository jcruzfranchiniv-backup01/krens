const STORAGE_KEY = 'krens_attr';
const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'] as const;

type Stored = Record<string, string>;

function read(): Stored {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Stored;
  } catch {
    return {};
  }
}

function cookie(name: string): string | undefined {
  return document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))?.split('=')[1];
}

/** Guarda UTMs/click ids de la visita. Una visita con parámetros nuevos reemplaza a la anterior (último click pago). */
export function captureAttribution(): void {
  const query = new URLSearchParams(location.search);
  const fresh: Stored = {};
  for (const key of PARAMS) {
    const value = query.get(key);
    if (value) fresh[key] = value.slice(0, 300);
  }
  const hasFresh = Object.keys(fresh).length > 0;
  const stored = read();
  if (!hasFresh && stored.landing) return;
  const next = hasFresh ? fresh : stored;
  next.landing = location.origin + location.pathname;
  if (document.referrer) next.referrer = document.referrer.slice(0, 300);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* almacenamiento bloqueado: se sigue sin atribución persistida */
  }
}

/** Atribución lista para el lead, incluidas cookies de Meta para la API de conversiones. */
export function getAttribution(): Stored {
  const data = read();
  const fbp = cookie('_fbp');
  const fbclid = data.fbclid;
  const fbc = cookie('_fbc') ?? (fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined);
  if (fbp) data.fbp = fbp;
  if (fbc) data.fbc = fbc;
  return data;
}
