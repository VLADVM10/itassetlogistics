import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import type { z } from 'astro/zod';
import * as schema from './content/schemas';

/*
 * One collection per page; each holds two entries, `en` and `uk`
 * (files src/content/pages/{en,uk}/<page>.json — spec section 6).
 */
const page = <S extends z.ZodType>(file: string, s: S) =>
  defineCollection({
    loader: glob({
      pattern: `{en,uk}/${file}.json`,
      base: './src/content/pages',
      generateId: ({ entry }) => entry.split('/')[0]!,
    }),
    schema: s,
  });

export const collections = {
  home: page('home', schema.home),
  hub: page('hub', schema.hub),
  managed: page('managed', schema.managed),
  media: page('media', schema.media),
  contact: page('contact', schema.contact),
  privacy: page('privacy', schema.privacy),
  notFound: page('404', schema.notFound),
  settings: defineCollection({
    loader: glob({ pattern: '{en,uk}.json', base: './src/content/settings' }),
    schema: schema.settings,
  }),
  contacts: defineCollection({
    loader: glob({ pattern: 'contacts.json', base: './src/content/settings' }),
    schema: schema.contacts,
  }),
};
