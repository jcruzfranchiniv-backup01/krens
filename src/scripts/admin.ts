import { optimizeImageUrl } from '../core/imageUrl';

interface ApiResult {
  ok?: boolean;
  url?: string | null;
  message?: string;
}

async function call(path: string, init: RequestInit & { csrf?: string }): Promise<{ status: number; body: ApiResult }> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.csrf ? { 'X-CSRF-Token': init.csrf } : {}) },
  });
  return { status: response.status, body: (await response.json().catch(() => ({}))) as ApiResult };
}

function say(el: HTMLElement | null, text: string, error = false): void {
  if (!el) return;
  el.hidden = !text;
  el.textContent = text;
  el.dataset.error = String(error);
}

function initLogin(form: HTMLFormElement): void {
  const message = form.querySelector<HTMLElement>('#login-msg');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const submit = form.querySelector<HTMLButtonElement>('button[type=submit]');
    if (submit) submit.disabled = true;
    const { status, body } = await call('/api/v1/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username: String(data.get('username') ?? ''), password: String(data.get('password') ?? '') }),
    }).catch(() => ({ status: 0, body: { message: 'Sin conexión. Probá de nuevo.' } as ApiResult }));
    if (status === 200) return location.reload();
    say(message, body.message ?? 'No se pudo ingresar.', true);
    (form.elements.namedItem('password') as HTMLInputElement).value = '';
    if (submit) submit.disabled = false;
  });
}

function initPanel(panel: HTMLElement): void {
  const csrf = panel.dataset.csrf ?? '';

  document.querySelector('#logout')?.addEventListener('click', async () => {
    await call('/api/v1/admin/logout', { method: 'POST', csrf }).catch(() => undefined);
    location.reload();
  });

  panel.querySelectorAll<HTMLElement>('.slot').forEach((row) => {
    const slot = row.dataset.slot ?? '';
    const form = row.querySelector<HTMLFormElement>('form');
    const input = row.querySelector<HTMLInputElement>('input[name=url]');
    const message = row.querySelector<HTMLElement>('.msg');
    const reset = row.querySelector<HTMLButtonElement>('[data-reset]');
    const state = row.querySelector<HTMLElement>('[data-state]');
    const preview = row.querySelector<HTMLElement>('.slot__preview');
    if (!form || !input) return;

    const save = async (url: string | null) => {
      say(message, 'Guardando…');
      const { status, body } = await call('/api/v1/admin/images', { method: 'PUT', csrf, body: JSON.stringify({ slot, url }) }).catch(
        () => ({ status: 0, body: { message: 'Sin conexión. Probá de nuevo.' } as ApiResult }),
      );
      if (status === 401) return location.reload();
      if (status !== 200) return say(message, body.message ?? 'No se pudo guardar.', true);
      const saved = body.url ?? null;
      input.value = saved ?? '';
      if (reset) reset.disabled = !saved;
      if (state) state.textContent = saved ? 'Cloudinary' : 'Original del sitio';
      if (preview && saved) preview.innerHTML = `<img alt="" width="120" height="90" src="${optimizeImageUrl(saved, { width: 240 }).replace(/"/g, '&quot;')}">`;
      say(message, saved ? 'Guardado. Se verá en el sitio en ~1 minuto.' : 'Restablecido a la imagen original.');
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!input.value.trim()) return say(message, 'Pegá una URL o usá "Restablecer".', true);
      void save(input.value);
    });
    reset?.addEventListener('click', () => void save(null));
  });
}

const login = document.querySelector<HTMLFormElement>('#login-form');
if (login) initLogin(login);
const panel = document.querySelector<HTMLElement>('.panel');
if (panel) initPanel(panel);
