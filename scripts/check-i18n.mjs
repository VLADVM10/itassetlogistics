#!/usr/bin/env node
/*
 * EN and UA content must have the same structure: the same keys and the same number of items in
 * every list (spec sections 6 and 11). The admin keeps lists in step, and this check makes sure a
 * broken edit stops the build instead of reaching the site.
 * Run: npm run check:i18n (also part of npm run check and the deploy workflow).
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'src', 'content');
const read = (...p) => JSON.parse(readFileSync(path.join(CONTENT, ...p), 'utf8'));

const problems = [];
function compare(en, uk, where) {
  const kind = (v) => (Array.isArray(v) ? 'list' : v === null ? 'null' : typeof v);
  if (kind(en) !== kind(uk)) {
    problems.push(`${where}: EN is ${kind(en)}, UA is ${kind(uk)}`);
    return;
  }
  if (Array.isArray(en)) {
    if (en.length !== uk.length) problems.push(`${where}: EN has ${en.length} items, UA has ${uk.length}`);
    en.slice(0, uk.length).forEach((v, i) => compare(v, uk[i], `${where}[${i + 1}]`));
  } else if (en && typeof en === 'object') {
    const keys = new Set([...Object.keys(en), ...Object.keys(uk)]);
    for (const k of keys) {
      if (!(k in en)) problems.push(`${where}.${k}: only in UA`);
      else if (!(k in uk)) problems.push(`${where}.${k}: only in EN`);
      else compare(en[k], uk[k], `${where}.${k}`);
    }
  }
}

for (const file of readdirSync(path.join(CONTENT, 'pages', 'en')).filter((f) => f.endsWith('.json'))) {
  compare(read('pages', 'en', file), read('pages', 'uk', file), `pages/${file}`);
}
compare(read('settings', 'en.json'), read('settings', 'uk.json'), 'settings');

if (problems.length) {
  console.error(`EN/UA content differs in structure (${problems.length}):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('check:i18n: EN and UA have the same structure.');
