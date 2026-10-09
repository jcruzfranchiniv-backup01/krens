import {
  KV_REST_API_TOKEN,
  KV_REST_API_URL,
  STORAGE_KV_REST_API_TOKEN,
  STORAGE_KV_REST_API_URL,
  UPSTASH_REDIS_REST_TOKEN,
  UPSTASH_REDIS_REST_URL,
} from 'astro:env/server';

const REST_URL = UPSTASH_REDIS_REST_URL ?? KV_REST_API_URL ?? STORAGE_KV_REST_API_URL;
const REST_TOKEN = UPSTASH_REDIS_REST_TOKEN ?? KV_REST_API_TOKEN ?? STORAGE_KV_REST_API_TOKEN;

/** Persistencia mínima que necesita el panel: sesiones, contadores, URLs de imágenes y auditoría. */
export interface Store {
  getJson<T>(key: string): Promise<T | null>;
  setJson(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  getCounter(key: string): Promise<number>;
  incr(key: string, ttlSeconds: number): Promise<number>;
  hashGetAll(key: string): Promise<Record<string, string>>;
  hashSet(key: string, field: string, value: string): Promise<void>;
  hashDel(key: string, field: string): Promise<void>;
  pushCapped(key: string, value: string, max: number): Promise<void>;
  listRange(key: string, count: number): Promise<string[]>;
}

export class StoreUnavailableError extends Error {}

const TIMEOUT_MS = 5000;

class UpstashStore implements Store {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private async run(command: (string | number)[]): Promise<unknown> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = (await response.json().catch(() => ({}))) as { result?: unknown; error?: string };
    if (!response.ok || body.error) throw new Error(`Upstash ${command[0]} falló (${response.status})`);
    return body.result;
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.run(['GET', key]);
    return typeof raw === 'string' ? (JSON.parse(raw) as T) : null;
  }
  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.run(['SET', key, JSON.stringify(value), 'EX', ttlSeconds]);
  }
  async del(key: string): Promise<void> {
    await this.run(['DEL', key]);
  }
  async getCounter(key: string): Promise<number> {
    return Number(await this.run(['GET', key])) || 0;
  }
  async incr(key: string, ttlSeconds: number): Promise<number> {
    const count = Number(await this.run(['INCR', key]));
    if (count === 1) await this.run(['EXPIRE', key, ttlSeconds]);
    return count;
  }
  async hashGetAll(key: string): Promise<Record<string, string>> {
    const flat = (await this.run(['HGETALL', key])) as string[] | null;
    const out: Record<string, string> = {};
    for (let i = 0; flat && i < flat.length; i += 2) out[flat[i] as string] = flat[i + 1] as string;
    return out;
  }
  async hashSet(key: string, field: string, value: string): Promise<void> {
    await this.run(['HSET', key, field, value]);
  }
  async hashDel(key: string, field: string): Promise<void> {
    await this.run(['HDEL', key, field]);
  }
  async pushCapped(key: string, value: string, max: number): Promise<void> {
    await this.run(['LPUSH', key, value]);
    await this.run(['LTRIM', key, 0, max - 1]);
  }
  async listRange(key: string, count: number): Promise<string[]> {
    return ((await this.run(['LRANGE', key, 0, count - 1])) as string[] | null) ?? [];
  }
}

/** Sólo desarrollo local: permite probar el panel sin Redis. Nunca se usa en producción. */
class MemoryStore implements Store {
  private data = new Map<string, { value: unknown; expires: number }>();

  private read<T>(key: string): T | undefined {
    const entry = this.data.get(key);
    if (!entry) return undefined;
    if (entry.expires < Date.now()) {
      this.data.delete(key);
      return undefined;
    }
    return entry.value as T;
  }
  private write(key: string, value: unknown, ttlSeconds = 31_536_000): void {
    this.data.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }

  async getJson<T>(key: string) { return this.read<T>(key) ?? null; }
  async setJson(key: string, value: unknown, ttl: number) { this.write(key, value, ttl); }
  async del(key: string) { this.data.delete(key); }
  async getCounter(key: string) { return this.read<number>(key) ?? 0; }
  async incr(key: string, ttl: number) {
    const next = (this.read<number>(key) ?? 0) + 1;
    this.write(key, next, ttl);
    return next;
  }
  async hashGetAll(key: string) { return { ...(this.read<Record<string, string>>(key) ?? {}) }; }
  async hashSet(key: string, field: string, value: string) {
    this.write(key, { ...(this.read<Record<string, string>>(key) ?? {}), [field]: value });
  }
  async hashDel(key: string, field: string) {
    const { [field]: _removed, ...rest } = this.read<Record<string, string>>(key) ?? {};
    this.write(key, rest);
  }
  async pushCapped(key: string, value: string, max: number) {
    this.write(key, [value, ...(this.read<string[]>(key) ?? [])].slice(0, max));
  }
  async listRange(key: string, count: number) { return (this.read<string[]>(key) ?? []).slice(0, count); }
}

const globalStore = globalThis as { __krensMemoryStore?: MemoryStore };

export function getStore(): Store {
  if (REST_URL && REST_TOKEN) return new UpstashStore(REST_URL, REST_TOKEN);
  if (import.meta.env.DEV) return (globalStore.__krensMemoryStore ??= new MemoryStore());
  throw new StoreUnavailableError('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN no configurados');
}
