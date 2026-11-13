#!/usr/bin/env node
/*
 * Checks dist/ before it may be published (spec section 12, step 3):
 * all 14 pages and both 404s exist, hreflang pairs point at pages that exist and point back,
 * internal links and assets resolve, the form endpoint and the admin are in place.
 * Exit 1 stops the deploy: the site stays on the previous version.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SITE = 'https://itassetlogistics.com';

const PAGES = ['', 'equipment-hub/', 'managed-storage/', 'media-storage/', 'contact/', 'privacy-policy/'];
const REQUIRED = [
  ...PAGES.flatMap((p) => [`${p}index.html`, `uk/${p}index.html`]),
  '404.html',
  'uk/404/index.html',
  'robots.txt',
  'sitemap-index.xml',
  '.htaccess',
  'og-default.png',
  'api/request.php',
  'admin/index.html',
  'admin/config.yml',
];

const problems = [];
for (const f of REQUIRED) if (!existsSync(path.join(DIST, f))) problems.push(`missing ${f}`);

/** URL path → file in dist, or null. */
function resolve(urlPath) {
  const clean = decodeURI(urlPath.split(/[?#]/)[0]);
  const file = path.join(DIST, clean);
  if (clean.endsWith('/')) return existsSync(path.join(file, 'index.html')) ? file : null;
  return existsSync(file) && statSync(file).isFile() ? file : null;
}

const htmlFiles = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.html') && !p.includes(`${path.sep}admin${path.sep}`)) htmlFiles.push(p);
  }
};
walk(DIST);

const alternatesOf = new Map();
for (const file of htmlFiles) {
  const rel = path.relative(DIST, file).split(path.sep).join('/');
  const html = readFileSync(file, 'utf8');

  // internal links and assets
  for (const [, attr] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    if (!attr.startsWith('/') || attr.startsWith('//')) continue;
    if (attr === '/api/request.php') continue;
    if (!resolve(attr)) problems.push(`${rel}: broken link ${attr}`);
  }
  // links in page content stay in the page's language (editors type paths by hand in the CMS)
  const isUk = rel.startsWith('uk/');
  const main = html.match(/<main[\s\S]*<\/main>/)?.[0] ?? '';
  for (const [, href] of main.matchAll(/<a\s[^>]*href="(\/[^"#]*)/g)) {
    if (href.startsWith('/_astro/') || href.startsWith('/api/')) continue;
    if (isUk !== (href === '/uk/' || href.startsWith('/uk/'))) problems.push(`${rel}: link to the other language ${href}`);
  }

  // hreflang
  const alts = Object.fromEntries([...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]));
  if (rel === '404.html' || rel === 'uk/404/index.html') continue;
  for (const lang of ['en', 'uk', 'x-default']) {
    if (!alts[lang]) problems.push(`${rel}: no hreflang ${lang}`);
    else if (!alts[lang].startsWith(SITE + '/') || !resolve(alts[lang].slice(SITE.length))) problems.push(`${rel}: hreflang ${lang} → missing page ${alts[lang]}`);
  }
  const self = `${SITE}/${rel.replace(/index\.html$/, '')}`;
  alternatesOf.set(self, alts);
}
// pairs point back at each other
for (const [self, alts] of alternatesOf) {
  for (const lang of ['en', 'uk']) {
    const other = alternatesOf.get(alts[lang]);
    if (other && other[lang] !== alts[lang]) problems.push(`${self}: hreflang ${lang} not reciprocal`);
    if (other && !Object.values(other).includes(self)) problems.push(`${alts[lang]} does not link back to ${self}`);
  }
}

if (problems.length) {
  console.error(`Build check failed (${problems.length}):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`Build check passed: ${htmlFiles.length} HTML files, ${alternatesOf.size} pages with hreflang pairs.`);
