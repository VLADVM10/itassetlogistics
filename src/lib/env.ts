/**
 * Preview build (SITE_PREVIEW=1): the site is online for review but closed to search engines —
 * every page gets `noindex, nofollow` and robots.txt disallows everything. Remove at launch (stage 8).
 */
export const PREVIEW = process.env.SITE_PREVIEW === '1';

/**
 * Cloudflare Turnstile site key (public). Its secret pair lives only in config.php on the server.
 * Until the client's widget exists this is Cloudflare's test key "always passes", which works only
 * with the test secret `1x0000000000000000000000000000000AA`; replace both before launch.
 */
export const TURNSTILE_SITE_KEY = '1x00000000000000000000AA';

/**
 * Google Analytics 4 measurement ID ("G-XXXXXXXXXX", GA → Admin → Data streams → Web).
 * Empty: no analytics, no cookie banner, no Google hosts in the CSP. When set, GA loads only after
 * the visitor accepts analytics cookies in the banner (src/components/CookieConsent.astro).
 */
export const GA_MEASUREMENT_ID = '';
