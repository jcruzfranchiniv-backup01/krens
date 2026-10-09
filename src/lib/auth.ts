import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { APIContext, AstroCookies } from 'astro';
import { ADMIN_PASSWORD_HASH, ADMIN_USERNAME } from 'astro:env/server';
import { verifyPassword } from '../core/password';
import { getStore } from './store';

export const SESSION_COOKIE = 'krens_admin';
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const MAX_FAILURES = 5;
const FAILURE_WINDOW_SECONDS = 15 * 60;

export interface AdminSession {
  username: string;
  csrf: string;
  createdAt: string;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest();
const sessionKey = (token: string) => `krens:sess:${sha256(token).toString('hex')}`;
const failureKey = (ip: string) => `krens:login:fail:${ip}`;

export function authConfigured(): boolean {
  return Boolean(ADMIN_USERNAME && ADMIN_PASSWORD_HASH);
}

const cookieOptions = () => ({
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: 'strict' as const,
  path: '/',
});

/** Compara en tiempo constante (digest de igual largo), también para el usuario. */
function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

export async function isLoginBlocked(ip: string): Promise<boolean> {
  return (await getStore().getCounter(failureKey(ip))) >= MAX_FAILURES;
}

export async function registerLoginFailure(ip: string): Promise<void> {
  await getStore().incr(failureKey(ip), FAILURE_WINDOW_SECONDS);
}

/** Siempre ejecuta scrypt, aunque el usuario no coincida, para no filtrar cuál dato falló por tiempo. */
export async function checkCredentials(username: string, password: string): Promise<boolean> {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH) return false;
  const passwordOk = await verifyPassword(password, ADMIN_PASSWORD_HASH);
  return safeEqual(username, ADMIN_USERNAME) && passwordOk;
}

/** Cada login crea un token nuevo (rotación). El servidor guarda sólo su hash y puede revocarlo. */
export async function startSession(cookies: AstroCookies, username: string, ip: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const session: AdminSession = { username, csrf: randomBytes(24).toString('base64url'), createdAt: new Date().toISOString() };
  const store = getStore();
  await store.setJson(sessionKey(token), session, SESSION_TTL_SECONDS);
  await store.del(failureKey(ip));
  cookies.set(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: SESSION_TTL_SECONDS });
}

export async function readSession(cookies: AstroCookies): Promise<AdminSession | null> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await getStore().getJson<AdminSession>(sessionKey(token));
  } catch (error) {
    console.error('[admin] no se pudo leer la sesión', error instanceof Error ? error.message : error);
    return null;
  }
}

/** Revoca en servidor y vence la cookie con los mismos atributos con que se creó. */
export async function endSession(cookies: AstroCookies): Promise<void> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) await getStore().del(sessionKey(token)).catch(() => undefined);
  cookies.set(SESSION_COOKIE, '', { ...cookieOptions(), maxAge: 0 });
}

export function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export function sameOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get('origin');
  return Boolean(origin) && new URL(origin as string).host === url.host;
}

/** Autorización en servidor para cada operación: origen, sesión y, en mutaciones, token CSRF. */
export async function requireAdmin(context: APIContext): Promise<AdminSession | Response> {
  const { request, url, cookies } = context;
  const mutating = request.method !== 'GET';
  if (mutating && !sameOrigin(request, url)) return jsonResponse(403, { error: 'forbidden', message: 'Origen no permitido.' });
  const session = await readSession(cookies);
  if (!session) return jsonResponse(401, { error: 'unauthorized', message: 'Iniciá sesión.' });
  if (mutating) {
    const sent = request.headers.get('x-csrf-token') ?? '';
    if (!safeEqual(sent, session.csrf)) return jsonResponse(403, { error: 'csrf', message: 'Sesión inválida, recargá la página.' });
  }
  return session;
}
