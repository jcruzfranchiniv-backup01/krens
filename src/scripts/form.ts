import { getAttribution } from './attribution';
import { track } from './tracking';

const FIELDS = ['name', 'eventType', 'guests', 'eventDate', 'phone'] as const;
type FieldName = (typeof FIELDS)[number];
type Errors = Partial<Record<FieldName, string>>;

const MESSAGES: Record<FieldName, string> = {
  name: 'Contanos tu nombre y empresa.',
  eventType: 'Elegí un tipo de evento.',
  guests: 'Elegí una cantidad aproximada.',
  eventDate: 'Fecha inválida.',
  phone: 'Ingresá un WhatsApp válido, con código de área.',
};

function validate(values: Record<FieldName, string>): Errors {
  const errors: Errors = {};
  if (values.name.trim().length < 2) errors.name = MESSAGES.name;
  if (!values.eventType) errors.eventType = MESSAGES.eventType;
  if (!values.guests) errors.guests = MESSAGES.guests;
  const digits = values.phone.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) errors.phone = MESSAGES.phone;
  return errors;
}

function showErrors(form: HTMLFormElement, errors: Errors): void {
  for (const name of FIELDS) {
    const wrapper = form.querySelector<HTMLElement>(`[data-field="${name}"]`);
    const input = form.elements.namedItem(name) as HTMLInputElement | null;
    const message = errors[name];
    wrapper?.setAttribute('data-invalid', message ? 'true' : 'false');
    const error = wrapper?.querySelector('.field__error');
    if (error) error.textContent = message ?? '';
    input?.setAttribute('aria-invalid', message ? 'true' : 'false');
  }
}

function showAlert(form: HTMLFormElement, text: string): void {
  const alert = form.querySelector<HTMLElement>('[data-form-alert]');
  if (!alert) return;
  alert.textContent = text;
  alert.dataset.show = text ? 'true' : 'false';
  if (text) alert.focus();
}

function readValues(form: HTMLFormElement): Record<FieldName, string> {
  const data = new FormData(form);
  const get = (key: string) => String(data.get(key) ?? '');
  return { name: get('name'), eventType: get('eventType'), guests: get('guests'), eventDate: get('eventDate'), phone: get('phone') };
}

async function submit(form: HTMLFormElement, values: Record<FieldName, string>) {
  const eventId = crypto.randomUUID();
  const response = await fetch(form.action, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...values,
      website: String(new FormData(form).get('website') ?? ''),
      eventId,
      attribution: getAttribution(),
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { fieldErrors?: Partial<Record<FieldName, string[]>> };
  return { ok: response.ok, eventId, fieldErrors: body.fieldErrors };
}

async function onSubmit(event: SubmitEvent, form: HTMLFormElement): Promise<void> {
  event.preventDefault();
  const values = readValues(form);
  const errors = validate(values);
  showErrors(form, errors);
  const invalid = Object.keys(errors) as FieldName[];
  if (invalid.length > 0) {
    showAlert(form, 'Revisá los campos marcados.');
    (form.elements.namedItem(invalid[0] as FieldName) as HTMLElement | null)?.focus();
    return;
  }
  showAlert(form, '');
  const button = form.querySelector<HTMLButtonElement>('[data-submit]');
  if (button) {
    button.disabled = true;
    button.textContent = button.dataset.sending ?? '';
  }
  try {
    const result = await submit(form, values);
    if (!result.ok) throw Object.assign(new Error('rejected'), { fieldErrors: result.fieldErrors });
    track('Lead', { event_type: values.eventType, guests: values.guests }, result.eventId);
    const query = new URLSearchParams({ tipo: values.eventType, personas: values.guests });
    location.assign(`/gracias/?${query.toString()}`);
  } catch (error) {
    const fieldErrors = (error as { fieldErrors?: Partial<Record<FieldName, string[]>> }).fieldErrors;
    if (fieldErrors) {
      const mapped: Errors = {};
      for (const name of FIELDS) if (fieldErrors[name]?.[0]) mapped[name] = fieldErrors[name]?.[0];
      showErrors(form, mapped);
    }
    showAlert(form, form.closest('section')?.querySelector('[data-server-error]')?.textContent ?? 'No pudimos enviar tu pedido.');
    if (button) {
      button.disabled = false;
      button.textContent = button.dataset.label ?? '';
    }
  }
}

/** Fecha mínima = hoy, y preselección del tipo desde las tarjetas de eventos. */
export function initQuoteForm(): void {
  const form = document.querySelector<HTMLFormElement>('#quote-form');
  if (!form) return;
  const date = form.elements.namedItem('eventDate') as HTMLInputElement | null;
  if (date) date.min = new Date().toISOString().slice(0, 10);
  form.addEventListener('submit', (event) => void onSubmit(event, form));
  document.addEventListener('click', (event) => {
    const trigger = (event.target as Element).closest<HTMLElement>('[data-event]');
    const select = form.elements.namedItem('eventType') as HTMLSelectElement | null;
    if (trigger?.dataset.event && select) select.value = trigger.dataset.event;
  });
}
