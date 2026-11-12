#!/usr/bin/env node
/*
 * Generates public/admin/config.yml (Sveltia CMS, spec section 11) from the Zod content schemas,
 * so the admin's fields, list limits and length caps always match what the build accepts.
 * Names and hints: scripts/cms/labels.mjs. Recommended lengths come from the current texts.
 *
 *   npm run cms:config            write the file
 *   npm run cms:config -- --check exit 1 when the file is out of date (part of npm run check)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'astro/zod';
import YAML from 'yaml';
import * as schemas from '../../src/content/schemas.ts';
import { HINTS, KEYS, PAGES, PATHS } from './labels.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'public', 'admin', 'config.yml');
const CONTENT = path.join(ROOT, 'src', 'content');

const SITE_URL = 'https://itassetlogistics.com';
const REPO = 'VLADVM10/itassetlogistics';
/** Address of the sveltia-cms-auth Worker (GitHub sign-in). Empty: sign-in with a token only. */
const AUTH_URL = 'https://sveltia-cms-auth.skladovka-ua.workers.dev';
const LOCALES = ['en', 'uk'];
/** Strings longer than this get a multi-line editor. */
const TEXT_FROM = 160;

// ---------- labels ----------
const match = (pattern, p) => {
  const a = pattern.split('.');
  const b = p.split('.');
  return a.length === b.length && a.every((s, i) => s === '*' || s === b[i]);
};
const wildcards = (pattern) => pattern.split('.').filter((s) => s === '*').length;
function lookup(table, p) {
  if (p in table) return table[p];
  const hits = Object.keys(table).filter((k) => k.includes('*') && match(k, p));
  hits.sort((x, y) => wildcards(x) - wildcards(y));
  return hits.length ? table[hits[0]] : undefined;
}
const labelFor = (p, key) => lookup(PATHS, p) ?? KEYS[key] ?? key;

// ---------- recommended lengths ----------
// Frozen from the design texts (scripts/cms/recommended.json), so editing content never changes the
// config. Refresh only after a deliberate design change: `npm run cms:config -- --refresh-recommended`.
const RECOMMENDED_FILE = path.join(ROOT, 'scripts', 'cms', 'recommended.json');
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const chars = (s) => [...s].length;

function measureContent() {
  const content = {};
  for (const [name, file] of PAGES) {
    content[name] = LOCALES.map((l) => readJson(path.join(CONTENT, 'pages', l, `${file}.json`)));
  }
  content.settings = LOCALES.map((l) => readJson(path.join(CONTENT, 'settings', `${l}.json`)));
  content.contacts = [readJson(path.join(CONTENT, 'settings', 'contacts.json'))];
  const longest = {};
  const walk = (v, p) => {
    if (typeof v === 'string') longest[p] = Math.max(longest[p] ?? 0, chars(v));
    else if (Array.isArray(v)) v.forEach((x) => walk(x, `${p}.*`));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, `${p}.${k}`));
  };
  for (const [name, docs] of Object.entries(content)) docs.forEach((d) => walk(d, name));
  return Object.fromEntries(Object.entries(longest).sort(([a], [b]) => a.localeCompare(b)));
}

if (process.argv.includes('--refresh-recommended') || !existsSync(RECOMMENDED_FILE)) {
  writeFileSync(RECOMMENDED_FILE, `${JSON.stringify(measureContent(), null, 2)}\n`);
  console.log(`Wrote ${path.relative(ROOT, RECOMMENDED_FILE)}`);
}
const LONGEST = readJson(RECOMMENDED_FILE);

function lengthHint(p, max) {
  if (!max) return '';
  const longest = LONGEST[p] ?? 0;
  if (!longest) return `До ${max} символів.`;
  const recommended = Math.min(max, Math.max(10, Math.ceil((longest * 1.15) / 10) * 10));
  return recommended < max
    ? `Рекомендовано до ${recommended} символів (як у макеті), максимум ${max}.`
    : `До ${max} символів.`;
}

// ---------- fields ----------
function stringField(js, p, key, required, i18n) {
  const max = js.maxLength;
  const f = {
    name: key,
    label: labelFor(p, key),
    widget: max && max > TEXT_FROM ? 'text' : 'string',
  };
  if (p.endsWith('.og_image')) f.widget = 'image';
  // A key that must exist but may hold '' (no min length) is optional for the editor.
  if (!required || !(js.minLength >= 1)) f.required = false;
  const hint = [lookup(HINTS, p), f.widget === 'image' ? '' : lengthHint(p, max)].filter(Boolean).join(' ');
  if (hint) f.hint = hint;
  if (i18n) f.i18n = i18n;
  return f;
}

/** Text of a list item for the collapsed list view. */
function summaryOf(fields) {
  const first = fields.find((f) => ['title', 'name', 'caption'].includes(f.name)) ?? fields.find((f) => f.widget === 'string');
  return first ? `{{fields.${first.name}}}` : undefined;
}

/**
 * @param js      JSON schema node
 * @param p       path (`home.hero.title`, `*` for list items)
 * @param key     field name
 * @param ctx     { required, inList, depth, i18n }
 */
function build(js, p, key, ctx) {
  // contacts.email: '' or an email
  if (js.anyOf) {
    const f = stringField({}, p, key, false, ctx.i18n);
    return f;
  }

  if (js.type === 'object') {
    const req = new Set(js.required ?? []);
    const fields = Object.entries(js.properties).map(([k, v]) =>
      build(v, `${p}.${k}`, k, { ...ctx, required: req.has(k), depth: ctx.depth + 1 }),
    );
    const f = { name: key, label: labelFor(p, key), widget: 'object', fields };
    if (ctx.depth >= 1) f.collapsed = true;
    if (ctx.i18n) f.i18n = true;
    return f;
  }

  if (js.type === 'array') {
    const min = js.minItems ?? 0;
    const max = js.maxItems;
    const fixed = min === max;
    // Every language has its own text, but items are added, removed and ordered in English only,
    // so both languages always have the same list (also enforced by scripts/check-i18n.mjs).
    const itemI18n = ctx.i18n ? 'duplicate_if_empty' : undefined;
    const f = { name: key, label: labelFor(p, key), widget: 'list' };
    const item = js.items;
    if (item.type === 'object') {
      const req = new Set(item.required ?? []);
      f.fields = Object.entries(item.properties).map(([k, v]) => {
        const sub = build(v, `${p}.*.${k}`, k, { ...ctx, required: req.has(k), depth: ctx.depth + 1, i18n: itemI18n });
        if (sub.widget === 'list' && ctx.i18n) sub.i18n = true;
        return sub;
      });
      const summary = summaryOf(f.fields);
      if (summary) f.summary = summary;
    } else {
      f.field = stringField(item, `${p}.*`, 'item', true, itemI18n);
      f.field.label = labelFor(`${p}.*`, 'item');
    }
    f.label_singular = labelFor(`${p}.*`, 'item');
    if (f.label_singular === 'item') delete f.label_singular;
    f.min = min;
    if (max !== undefined) f.max = max;
    f.hint = fixed
      ? `Рівно ${min} — під стільки елементів розраховано макет.`
      : `Від ${min} до ${max}.`;
    if (fixed) {
      f.allow_add = false;
      f.allow_remove = false;
      f.allow_reorder = false; // the order is tied to the icons and links of the design
    }
    f.collapsed = true;
    if (ctx.i18n) f.i18n = true;
    return f;
  }

  return stringField(js, p, key, ctx.required, ctx.i18n === true ? true : ctx.i18n);
}

function fieldsOf(schemaName, i18n) {
  const js = z.toJSONSchema(schemas[schemaName], { io: 'input' });
  const req = new Set(js.required ?? []);
  return Object.entries(js.properties).map(([k, v]) =>
    build(v, `${schemaName}.${k}`, k, { required: req.has(k), depth: 0, i18n: i18n ? true : undefined }),
  );
}

// ---------- config ----------
const backend = { name: 'github', repo: REPO, branch: 'main' };
if (AUTH_URL) backend.base_url = AUTH_URL;
backend.commit_messages = {
  update: 'CMS: {{collection}} / {{slug}} — {{author-login}}',
  uploadMedia: 'CMS: upload {{path}} — {{author-login}}',
  deleteMedia: 'CMS: delete {{path}} — {{author-login}}',
};

const config = {
  backend,
  site_url: SITE_URL,
  display_url: SITE_URL,
  media_folder: 'public/images/uploads',
  public_folder: '/images/uploads',
  i18n: { locales: LOCALES, default_locale: 'en' },
  collections: [
    {
      name: 'pages',
      label: 'Сторінки',
      description: 'Тексти сторінок англійською та українською. Зміни зʼявляються на сайті за 1–3 хвилини після збереження.',
      format: 'json',
      i18n: true,
      editor: { preview: false },
      files: PAGES.map(([name, file, label]) => ({
        name: file,
        label,
        file: `src/content/pages/{{locale}}/${file}.json`,
        i18n: true,
        fields: fieldsOf(name, true),
      })),
    },
    {
      name: 'settings',
      label: 'Налаштування',
      format: 'json',
      i18n: true,
      editor: { preview: false },
      files: [
        {
          name: 'site',
          label: 'Меню, футер, форма',
          file: 'src/content/settings/{{locale}}.json',
          i18n: true,
          fields: fieldsOf('settings', true),
        },
        {
          name: 'contacts',
          label: 'Контакти (email, телефон, місто)',
          file: 'src/content/settings/contacts.json',
          i18n: false,
          fields: fieldsOf('contacts', false),
        },
      ],
    },
  ],
};

const header = [
  '# Sveltia CMS config. GENERATED by scripts/cms/build-config.mjs from src/content/schemas.ts —',
  '# do not edit by hand: change the schema or scripts/cms/labels.mjs and run `npm run cms:config`.',
  '',
].join('\n');
const yaml = header + YAML.stringify(config, { lineWidth: 0 });

if (process.argv.includes('--check')) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (current.replace(/\r\n/g, '\n') !== yaml) {
    console.error('public/admin/config.yml is out of date: run `npm run cms:config`.');
    process.exit(1);
  }
  console.log('cms:config up to date.');
} else {
  writeFileSync(OUT, yaml);
  console.log(`Wrote ${path.relative(ROOT, OUT)}`);
}
