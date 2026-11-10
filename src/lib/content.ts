import { getEntry } from 'astro:content';
import type { Lang, PageKey } from '../i18n/routes';

/** Throws at build time if a file is missing, so a broken build never ships. */
function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Content missing: ${what}`);
  return value;
}

export async function getSettings(lang: Lang) {
  const entry = await getEntry('settings', lang);
  return required(entry, `settings/${lang}.json`).data;
}

export async function getContacts() {
  const entry = await getEntry('contacts', 'contacts');
  return required(entry, 'settings/contacts.json').data;
}

export async function getPage(page: PageKey, lang: Lang) {
  const entry = await getEntry('pages', `${lang}/${page}`);
  return required(entry, `pages/${lang}/${page}.json`).data;
}
