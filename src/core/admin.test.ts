import { describe, expect, it } from 'vitest';
import { generatePassword, hashPassword, passwordProblems, verifyPassword } from './password';
import { optimizeImageUrl, parseAllowedHosts, validateImageUrl } from './imageUrl';

describe('password', () => {
  it('hashea y verifica; rechaza otra clave y hashes mal formados', async () => {
    const hash = await hashPassword('Clave-Muy-Segura-2026!');
    expect(hash.startsWith('scrypt.')).toBe(true);
    expect(hash).not.toContain('$');
    expect(await verifyPassword('Clave-Muy-Segura-2026!', hash)).toBe(true);
    expect(await verifyPassword('otra', hash)).toBe(false);
    expect(await verifyPassword('x', 'basura')).toBe(false);
    expect(await verifyPassword('x', 'scrypt.3.8.1.aa.bb')).toBe(false);
  });

  it('usa sal distinta en cada hash', async () => {
    expect(await hashPassword('Misma-Clave-123!')).not.toBe(await hashPassword('Misma-Clave-123!'));
  });

  it('exige clave compleja y genera claves válidas', () => {
    expect(passwordProblems('corta1!').length).toBeGreaterThan(0);
    expect(passwordProblems('sinmayusculas123!!')).toContain('Falta una mayúscula.');
    expect(passwordProblems('Kx9#mPq2$vLw8@Zt')).toEqual([]);
    expect(passwordProblems(generatePassword())).toEqual([]);
  });
});

describe('imageUrl', () => {
  const hosts = parseAllowedHosts(undefined);

  it('acepta Cloudinary por https y rechaza el resto', () => {
    expect(validateImageUrl('https://res.cloudinary.com/demo/image/upload/v1/a.jpg', hosts).ok).toBe(true);
    expect(validateImageUrl('http://res.cloudinary.com/demo/a.jpg', hosts).ok).toBe(false);
    expect(validateImageUrl('https://evil.com/a.jpg', hosts).ok).toBe(false);
    expect(validateImageUrl('https://user:pw@res.cloudinary.com/a.jpg', hosts).ok).toBe(false);
    expect(validateImageUrl('javascript:alert(1)', hosts).ok).toBe(false);
    expect(validateImageUrl('https://res.cloudinary.com.evil.com/a.jpg', hosts).ok).toBe(false);
  });

  it('inserta transformaciones sólo en URLs de Cloudinary', () => {
    expect(optimizeImageUrl('https://res.cloudinary.com/demo/image/upload/v1/a.jpg', { width: 800, ratio: '4 / 3' })).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_fill,ar_4:3,g_auto,w_800/v1/a.jpg',
    );
    expect(optimizeImageUrl('https://otro.com/a.jpg', { width: 800 })).toBe('https://otro.com/a.jpg');
  });
});
