import { getEntry, type CollectionEntry } from 'astro:content';
import type { Lang, PageKey } from '../i18n/routes';

/** Throws at build time if a file is missing, so a broken build never ships. */
function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Content missing: ${what}`);
  return value;
}

export async function getSettings(lang: Lang) {
  return required(await getEntry('settings', lang), `settings/${lang}.json`).data;
}

export async function getContacts() {
  return required(await getEntry('contacts', 'contacts'), 'settings/contacts.json').data;
}

const COLLECTION = {
  home: 'home',
  hub: 'hub',
  managed: 'managed',
  media: 'media',
  contact: 'contact',
  privacy: 'privacy',
  '404': 'notFound',
} as const satisfies Record<PageKey, string>;

type PageCollection = (typeof COLLECTION)[PageKey];
export type PageData<P extends PageKey> = CollectionEntry<(typeof COLLECTION)[P]>['data'];

export async function getPage<P extends PageKey>(page: P, lang: Lang): Promise<PageData<P>> {
  const collection: PageCollection = COLLECTION[page];
  const entry = await getEntry(collection, lang);
  return required(entry, `pages/${lang}/${page}.json`).data as PageData<P>;
}
