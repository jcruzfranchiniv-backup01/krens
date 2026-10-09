import { getStore } from './store';

const IMAGES_KEY = 'krens:images';
const AUDIT_KEY = 'krens:audit';
const AUDIT_MAX = 200;
const CACHE_MS = 30_000;

export interface AuditEntry {
  at: string;
  actor: string;
  slot: string;
  action: 'set' | 'clear';
  before?: string;
  after?: string;
}

let cache: { at: number; data: Record<string, string> } | null = null;

/** Para páginas públicas: nunca lanza. Si Redis falla, el sitio sigue con las imágenes locales. */
export async function getImageOverrides(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  try {
    const data = await getStore().hashGetAll(IMAGES_KEY);
    cache = { at: Date.now(), data };
    return data;
  } catch (error) {
    console.error('[images] no se pudieron leer las URLs', error instanceof Error ? error.message : error);
    return cache?.data ?? {};
  }
}

async function audit(entry: AuditEntry): Promise<void> {
  await getStore().pushCapped(AUDIT_KEY, JSON.stringify(entry), AUDIT_MAX);
}

export async function setOverride(slot: string, url: string, actor: string): Promise<void> {
  const store = getStore();
  const before = (await store.hashGetAll(IMAGES_KEY))[slot];
  await store.hashSet(IMAGES_KEY, slot, url);
  cache = null;
  await audit({ at: new Date().toISOString(), actor, slot, action: 'set', ...(before ? { before } : {}), after: url });
}

export async function clearOverride(slot: string, actor: string): Promise<void> {
  const store = getStore();
  const before = (await store.hashGetAll(IMAGES_KEY))[slot];
  await store.hashDel(IMAGES_KEY, slot);
  cache = null;
  await audit({ at: new Date().toISOString(), actor, slot, action: 'clear', ...(before ? { before } : {}) });
}

export async function getAudit(count: number): Promise<AuditEntry[]> {
  const rows = await getStore().listRange(AUDIT_KEY, count);
  return rows.flatMap((row) => {
    try {
      return [JSON.parse(row) as AuditEntry];
    } catch {
      return [];
    }
  });
}
