/*
 * Google Analytics 4 behind a consent banner (src/components/CookieConsent.astro).
 * - Nothing is loaded and no cookie is set until the visitor clicks "Accept".
 * - The choice is stored in localStorage; "Cookie settings" in the footer shows the banner again.
 * - Declining after accepting removes the GA cookies and reloads the page without GA.
 * - A successful request form dispatches `ital:lead`; it is sent to GA as `generate_lead`.
 */
const KEY = 'ital-analytics-consent';
type Choice = 'granted' | 'denied';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const read = (): Choice | null => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
};
const write = (v: Choice) => {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
};

function loadGa(id: string) {
  if (window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  // gtag expects the `arguments` object itself in dataLayer
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', id);
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.append(s);
}

function removeGaCookies() {
  const host = location.hostname;
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0]!.trim();
    if (name === '_ga' || name.startsWith('_ga_') || name === '_gid') {
      for (const domain of [host, `.${host}`, `.${host.replace(/^www\./, '')}`]) {
        document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
      }
      document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  }
}

export function initAnalytics() {
  const banner = document.querySelector<HTMLElement>('[data-consent]');
  const id = banner?.dataset.gaId;
  if (!banner || !id) return;

  const choice = read();
  if (choice === 'granted') loadGa(id);
  else if (choice === null) banner.hidden = false;

  banner.querySelector('[data-consent-accept]')?.addEventListener('click', () => {
    write('granted');
    banner.hidden = true;
    loadGa(id);
  });
  banner.querySelector('[data-consent-decline]')?.addEventListener('click', () => {
    const wasLoaded = Boolean(window.gtag);
    write('denied');
    banner.hidden = true;
    removeGaCookies();
    if (wasLoaded) location.reload();
  });
  document.querySelectorAll('[data-consent-open]').forEach((el) =>
    el.addEventListener('click', () => {
      banner.hidden = false;
      banner.querySelector<HTMLElement>('[data-consent-accept]')?.focus();
    }),
  );

  window.addEventListener('ital:lead', () => {
    window.gtag?.('event', 'generate_lead', { form_name: 'request', page_language: document.documentElement.lang });
  });
}
