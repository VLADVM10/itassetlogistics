/**
 * Preview build (SITE_PREVIEW=1): the site is online for review but closed to search engines —
 * every page gets `noindex, nofollow` and robots.txt disallows everything. Remove at launch (stage 8).
 */
export const PREVIEW = process.env.SITE_PREVIEW === '1';

/**
 * Cloudflare Turnstile site key (public): the client's widget for itassetlogistics.com.
 * Its secret pair lives only in config.php on the server (ops/set-turnstile-secret.sh).
 * Local tests can use Cloudflare's test key `1x00000000000000000000AA` with the test secret
 * `1x0000000000000000000000000000000AA` ("always passes").
 */
export const TURNSTILE_SITE_KEY = '0x4AAAAAAGAxJnq_ofonLjSx';

/**
 * Google Analytics 4 measurement ID ("G-XXXXXXXXXX", GA → Admin → Data streams → Web).
 * Empty: no analytics, no cookie banner, no Google hosts in the CSP. When set, GA loads only after
 * the visitor accepts analytics cookies in the banner (src/components/CookieConsent.astro).
 */
export const GA_MEASUREMENT_ID = '';
