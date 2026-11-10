import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/*
 * Content lives in JSON, one file per page and language (spec section 6).
 * Stage 1 validates the shared parts (seo); per-page section schemas with
 * list limits arrive in stage 2 together with the copy from the design.
 */

const text = z.string().trim().min(1);

const seo = z.object({
  title: text,
  description: z.string().trim(),
  og_image: z.string().trim().optional(),
});

const pages = defineCollection({
  loader: glob({ pattern: '{en,uk}/*.json', base: './src/content/pages' }),
  schema: z.looseObject({ seo }),
});

const navItem = z.strictObject({ label: text });

const settings = defineCollection({
  loader: glob({ pattern: '{en,uk}.json', base: './src/content/settings' }),
  schema: z.strictObject({
    nav: z.strictObject({
      aria_label: text,
      home: navItem,
      hub: navItem,
      managed: navItem,
      media: navItem,
      contact: navItem,
      privacy: navItem,
      menu_open: text,
      menu_close: text,
      lang_switch: text,
      skip_link: text,
      logo_label: text,
    }),
    footer: z.strictObject({
      aria_label: text,
      domain: text,
    }),
  }),
});

const contacts = defineCollection({
  loader: glob({ pattern: 'contacts.json', base: './src/content/settings' }),
  schema: z.strictObject({
    email: z.union([z.literal(''), z.email()]),
    phone: z.string().trim().max(32),
    city_en: text,
    city_uk: text,
  }),
});

export const collections = { pages, settings, contacts };
