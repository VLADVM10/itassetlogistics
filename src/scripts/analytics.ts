/*
 * Google Tag Manager behind a consent banner (src/components/CookieConsent.astro). Google
 * Analytics 4 is a tag inside the GTM container, configured in the GTM interface.
 * - Nothing is loaded and no cookie is set until the visitor clicks "Accept".
 * - The choice is stored in localStorage; "Cookie settings" in the footer shows the banner again.
 * - Declining after accepting removes the Google Analytics cookies and reloads the page without GTM.
 * - A successful request form dispatches `ital:lead`; it reaches GTM as the dataLayer event
 *   `generate_lead` (trigger: Custom Event "generate_lead" → GA4 event tag).
 */
const KEY = 'ital-analytics-consent';
type Choice = 'granted' | 'denied';

declare global {
  interface Window {
    dataLayer?: unknown[];
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

let loaded = false;

function loadGtm(id: string) {
  if (loaded) return;
  loaded = true;
  const dl = (window.dataLayer = window.dataLayer || []);
  // gtag-style command: Google tags read the `arguments` object itself from dataLayer
  function gtag(..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    dl.push(arguments);
  }
  // Consent Mode v2: the visitor accepted analytics only, not advertising
  gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  dl.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  document.head.append(s);
}

function removeGaCookies() {
  const host = location.hostname;
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0]!.trim();
    if (name === '_ga' || name.startsWith('_ga_') || name === '_gid' || name.startsWith('_gcl')) {
      for (const domain of [host, `.${host}`, `.${host.replace(/^www\./, '')}`]) {
        document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
      }
      document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  }
}

export function initAnalytics() {
  const banner = document.querySelector<HTMLElement>('[data-consent]');
  const id = banner?.dataset.gtmId;
  if (!banner || !id) return;

  const choice = read();
  if (choice === 'granted') loadGtm(id);
  else if (choice === null) banner.hidden = false;

  banner.querySelector('[data-consent-accept]')?.addEventListener('click', () => {
    write('granted');
    banner.hidden = true;
    loadGtm(id);
  });
  banner.querySelector('[data-consent-decline]')?.addEventListener('click', () => {
    const wasLoaded = loaded;
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
    if (!loaded) return;
    window.dataLayer!.push({
      event: 'generate_lead',
      form_name: 'request',
      page_language: document.documentElement.lang,
    });
  });
}
