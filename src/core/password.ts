import { randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';

/**
 * Hash con scrypt (memoria-dura). Formato sin "$" para no chocar con la expansión de variables de .env:
 * scrypt.<N>.<r>.<p>.<salt base64url>.<hash base64url>
 * Este módulo no importa nada del proyecto: lo usa también scripts/hash-password.mjs.
 */
export const SCRYPT_PARAMS = { N: 1 << 15, r: 8, p: 1, keyLength: 64 } as const;

const MIN_LENGTH = 14;
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?';

function derive(password: string, salt: Buffer, N: number, r: number, p: number, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password.normalize('NFKC'), salt, keyLength, { N, r, p, maxmem: 128 * N * r * 2 }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const { N, r, p, keyLength } = SCRYPT_PARAMS;
  const salt = randomBytes(16);
  const hash = await derive(password, salt, N, r, p, keyLength);
  return ['scrypt', N, r, p, salt.toString('base64url'), hash.toString('base64url')].join('.');
}

const isPowerOfTwo = (n: number) => Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;

/** Nunca lanza: un hash mal formado simplemente no verifica. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [tag, n, r, p, saltText, hashText] = stored.split('.');
  if (tag !== 'scrypt' || !n || !r || !p || !saltText || !hashText) return false;
  const params = { N: Number(n), r: Number(r), p: Number(p) };
  const paramsOk =
    isPowerOfTwo(params.N) && params.N >= 1 << 14 && params.N <= 1 << 20 && params.r >= 1 && params.r <= 16 && params.p >= 1 && params.p <= 4;
  if (!paramsOk) return false;
  try {
    const expected = Buffer.from(hashText, 'base64url');
    const actual = await derive(password, Buffer.from(saltText, 'base64url'), params.N, params.r, params.p, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** Reglas de clave compleja. Devuelve los problemas encontrados (vacío = válida). */
export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < MIN_LENGTH) problems.push(`Debe tener al menos ${MIN_LENGTH} caracteres.`);
  if (!/[a-z]/.test(password)) problems.push('Falta una minúscula.');
  if (!/[A-Z]/.test(password)) problems.push('Falta una mayúscula.');
  if (!/\d/.test(password)) problems.push('Falta un número.');
  if (!/[^A-Za-z0-9]/.test(password)) problems.push('Falta un símbolo.');
  if (/(.)\1{3,}/.test(password)) problems.push('No repitas el mismo carácter más de 3 veces seguidas.');
  if (/krens|admin|password|contrase/i.test(password)) problems.push('No uses el nombre del sitio ni palabras obvias.');
  return problems;
}

/** Clave aleatoria de 20 caracteres que cumple todas las reglas. */
export function generatePassword(): string {
  const classes = ['abcdefghijkmnopqrstuvwxyz', 'ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789', SYMBOLS];
  const all = classes.join('');
  const chars = classes.map((set) => set[randomInt(set.length)] as string);
  while (chars.length < 20) chars.push(all[randomInt(all.length)] as string);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j] as string, chars[i] as string];
  }
  const password = chars.join('');
  return passwordProblems(password).length === 0 ? password : generatePassword();
}
