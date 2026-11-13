// Request form (spec section 9): validation on submit with own messages, Cloudflare Turnstile,
// sending with a 20 s timeout, and the success / failure states of the ContactStates artboard.
// The rules mirror server/src/Validator.php; keep both in sync.

type Field = 'name' | 'company' | 'email' | 'phone' | 'message';
type Code = 'required' | 'email' | 'too_short' | 'too_long' | 'phone';
interface Rule { required: boolean; min?: number; max: number; line: boolean; type?: 'email' | 'phone' }

const RULES: Record<Field, Rule> = {
  name: { required: true, min: 2, max: 100, line: true },
  company: { required: true, min: 2, max: 150, line: true },
  email: { required: true, max: 254, line: true, type: 'email' },
  phone: { required: false, max: 32, line: true, type: 'phone' },
  message: { required: true, min: 10, max: 5000, line: false },
};
const FIELDS = Object.keys(RULES) as Field[];
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const PHONE = /^(?=(?:\D*\d){5})[0-9+ ()-]+$/;
// Control and invisible formatting characters, removed as on the server.
const INVISIBLE = new RegExp(
  `[${[[0x00, 0x08], [0x0b, 0x1f], [0x7f, 0x9f], [0x200b, 0x200f], [0x2028, 0x2029], [0x202a, 0x202e], [0x2066, 0x2069], [0xfeff, 0xfeff]]
    .map(([a, b]) => `${String.fromCharCode(a)}-${String.fromCharCode(b)}`)
    .join('')}]`,
  'g',
);
const TIMEOUT = 20_000;
const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(id: string): void;
}
declare global {
  interface Window { turnstile?: TurnstileApi }
}

let turnstileScript: Promise<TurnstileApi> | null = null;
function loadTurnstile(): Promise<TurnstileApi> {
  turnstileScript ??= new Promise<TurnstileApi>((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement('script');
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')));
    script.onerror = () => {
      turnstileScript = null;
      script.remove();
      reject(new Error('turnstile'));
    };
    document.head.append(script);
  });
  return turnstileScript;
}

const normalize = (value: string, line: boolean): string => {
  let v = value.replace(/\r\n?/g, '\n');
  if (line) v = v.replace(/[\t\n\v\f ]+/g, ' ');
  return v.replace(INVISIBLE, '').trim();
};
// Length in characters (code points), as mb_strlen counts on the server.
const length = (value: string): number => [...value].length;

function check(field: Field, value: string): Code | null {
  const rule = RULES[field];
  if (value === '') return rule.required ? 'required' : null;
  const n = length(value);
  if (n > rule.max) return 'too_long';
  if (rule.min !== undefined && n < rule.min) return 'too_short';
  if (rule.type === 'email' && !EMAIL.test(value)) return 'email';
  if (rule.type === 'phone' && !PHONE.test(value)) return 'phone';
  return null;
}

function initForm(card: HTMLElement): void {
  const form = card.querySelector<HTMLFormElement>('form[data-form]');
  const done = card.querySelector<HTMLElement>('[data-form-done]');
  const fail = card.querySelector<HTMLElement>('[data-form-fail]');
  const button = card.querySelector<HTMLButtonElement>('button[type="submit"]');
  const status = card.querySelector<HTMLElement>('[data-form-status]');
  const box = card.querySelector<HTMLElement>('[data-turnstile]');
  if (!form || !done || !fail || !button || !status || !box) return;

  const messages = JSON.parse(form.dataset.messages ?? '{}') as Record<Code, string> & { sending: string };
  const controls = Object.fromEntries(
    FIELDS.map((f) => [f, form.elements.namedItem(f) as HTMLInputElement | HTMLTextAreaElement]),
  ) as Record<Field, HTMLInputElement | HTMLTextAreaElement>;
  form.noValidate = true;

  // ---- Turnstile: loaded only when the form comes near the screen or gets focus ----
  let widget: string | null = null;
  let starting = false;
  let token = '';
  let waiters: ((t: string) => void)[] = [];
  const settle = (t: string) => {
    const list = waiters;
    waiters = [];
    list.forEach((w) => w(t));
  };

  const startTurnstile = () => {
    if (widget !== null || starting) return;
    starting = true;
    loadTurnstile()
      .then((ts) => {
        widget = ts.render(box, {
          sitekey: box.dataset.sitekey,
          language: box.dataset.lang,
          action: 'request',
          appearance: 'interaction-only',
          size: window.innerWidth < 400 ? 'compact' : 'flexible',
          'response-field': false,
          'refresh-expired': 'auto',
          callback: (t: string) => { token = t; settle(t); },
          'expired-callback': () => { token = ''; },
          'error-callback': () => { token = ''; },
          'before-interactive-callback': () => box.classList.add('is-shown'),
          'after-interactive-callback': () => box.classList.remove('is-shown'),
        });
      })
      .catch(() => settle(''))
      .finally(() => { starting = false; });
  };

  const resetTurnstile = () => {
    token = '';
    if (widget !== null) window.turnstile?.reset(widget);
  };

  const waitForToken = (signal: AbortSignal) =>
    new Promise<string>((resolve, reject) => {
      if (token) return resolve(token);
      const onAbort = () => reject(new Error('timeout'));
      signal.addEventListener('abort', onAbort, { once: true });
      waiters.push((t) => {
        signal.removeEventListener('abort', onAbort);
        if (t) resolve(t);
        else reject(new Error('turnstile'));
      });
      startTurnstile();
    });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        startTurnstile();
      }
    }, { rootMargin: '400px 0px' });
    io.observe(form);
  } else {
    startTurnstile();
  }
  form.addEventListener('focusin', startTurnstile, { once: true });

  // ---- field errors ----
  const clearError = (field: Field) => {
    const control = controls[field];
    control.removeAttribute('aria-invalid');
    control.removeAttribute('aria-describedby');
    document.getElementById(`${control.id}-err`)?.remove();
  };

  const showError = (field: Field, code: Code) => {
    const control = controls[field];
    const rule = RULES[field];
    const text = (messages[code] ?? messages.required)
      .replace('{min}', String(rule.min ?? ''))
      .replace('{max}', String(rule.max));
    const error = document.createElement('p');
    error.className = 'ferr';
    error.id = `${control.id}-err`;
    error.setAttribute('role', 'alert');
    error.textContent = text;
    control.closest('.fw')?.append(error);
    control.setAttribute('aria-invalid', 'true');
    control.setAttribute('aria-describedby', error.id);
  };

  // An error goes away once the field is edited; the rules run again on the next submit.
  FIELDS.forEach((f) => controls[f].addEventListener('input', () => {
    if (controls[f].hasAttribute('aria-invalid')) clearError(f);
  }));

  // ---- sending ----
  let busy = false;
  const setBusy = (on: boolean) => {
    busy = on;
    button.setAttribute('aria-busy', String(on));
    if (on) button.setAttribute('aria-disabled', 'true');
    else button.removeAttribute('aria-disabled');
    status.textContent = on ? messages.sending : '';
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;

    fail.hidden = true;
    const values = {} as Record<Field, string>;
    const errors: [Field, Code][] = [];
    FIELDS.forEach((f) => {
      clearError(f);
      values[f] = normalize(controls[f].value, RULES[f].line);
      const code = check(f, values[f]);
      if (code) errors.push([f, code]);
    });
    if (errors.length) {
      errors.forEach(([f, code]) => showError(f, code));
      controls[errors[0][0]].focus();
      return;
    }

    setBusy(true);
    const abort = new AbortController();
    const timer = window.setTimeout(() => abort.abort(), TIMEOUT);
    const extra = new FormData(form);
    let sent = false;
    try {
      const turnstileToken = await waitForToken(abort.signal);
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          ...values,
          lang: extra.get('lang'),
          page: extra.get('page'),
          website: extra.get('website') ?? '',
          'cf-turnstile-response': turnstileToken,
        }),
        credentials: 'same-origin',
        signal: abort.signal,
      });
      const data = (await response.json().catch(() => null)) as
        { ok?: boolean; errors?: Partial<Record<string, string>> } | null;

      if (response.ok && data?.ok) {
        sent = true;
        form.hidden = true;
        done.hidden = false;
        done.focus();
        // conversion event for analytics (src/scripts/analytics.ts; nothing happens without consent)
        window.dispatchEvent(new CustomEvent('ital:lead'));
        return;
      }
      if (response.status === 422 && data?.errors) {
        const known = FIELDS.filter((f) => data.errors?.[f] && data.errors[f]! in messages);
        known.forEach((f) => showError(f, data.errors![f] as Code));
        if (known.length) {
          controls[known[0]].focus();
          return;
        }
      }
      fail.hidden = false;
    } catch {
      fail.hidden = false;
    } finally {
      window.clearTimeout(timer);
      if (!sent) {
        setBusy(false);
        resetTurnstile();
      }
    }
  });
}

export function initForms(): void {
  document.querySelectorAll<HTMLElement>('[data-form-card]').forEach(initForm);
}
