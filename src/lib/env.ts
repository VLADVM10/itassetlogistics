/**
 * Preview build (SITE_PREVIEW=1): the site is online for review but closed to search engines —
 * every page gets `noindex, nofollow` and robots.txt disallows everything. Remove at launch (stage 8).
 */
export const PREVIEW = process.env.SITE_PREVIEW === '1';
