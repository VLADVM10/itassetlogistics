// Routes and language helpers. Both languages share English slugs; UA lives under /uk/ (spec section 4).

export const LANGS = ['en', 'uk'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

export const SITE_URL = 'https://itassetlogistics.com';

export const PAGES = {
  home: '',
  hub: 'equipment-hub',
  managed: 'managed-storage',
  media: 'media-storage',
  contact: 'contact',
  privacy: 'privacy-policy',
} as const;

export type PageKey = keyof typeof PAGES | '404';

/** Root-relative URL of a page, always with a trailing slash. */
export function pathFor(page: keyof typeof PAGES, lang: Lang): string {
  const slug = PAGES[page];
  const prefix = lang === DEFAULT_LANG ? '' : `/${lang}`;
  return slug ? `${prefix}/${slug}/` : `${prefix}/`;
}

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).href;
}

/** og:locale values. */
export const OG_LOCALE: Record<Lang, string> = { en: 'en_US', uk: 'uk_UA' };

/** Label shown in the language switch (spec: EN / UA, no flags). */
export const LANG_LABEL: Record<Lang, string> = { en: 'EN', uk: 'UA' };
