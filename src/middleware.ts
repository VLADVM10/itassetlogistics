/*
 * Typography for every built page (runs once per page at build time, the site is static).
 * Narrow screens break lines often, so three common breaks are prevented in visible text:
 *  - a dash starting a line: the space before " — " / " – " becomes a no-break space;
 *  - a one-letter Ukrainian word (в, з, і, у, а, о, й, я) ending a line: the space after it
 *    becomes a no-break space;
 *  - a short prefix split at its hyphen ("з-за", "IT-обладнання"): the word is wrapped in
 *    <span class="nw"> (white-space: nowrap). A span, not an invisible joiner character, so the
 *    text stays exactly the same for search engines, copy-paste and page search.
 * Only text between tags is touched: attributes (alt, aria-label, meta content, data-*) stay as in
 * the content JSON, and so do <title>, <script>, <style>, <textarea>, <pre>, <option> and inline
 * <svg> (a span would not render inside SVG text, and the title is what search results show).
 */
import { defineMiddleware } from 'astro:middleware';

const NBSP = ' ';
const LETTER = 'A-Za-zА-Яа-яІіЇїЄєҐґ’\'';
const SKIP = /^<(script|style|textarea|pre|title|option|svg)\b/i;

const DASH_RE = / ([—–]) /g;
const ONE_LETTER_RE = new RegExp(`(^|[\\s(«„"])([ВвЗзІіУуАаОоЙйЯя]) (?=[${LETTER}0-9«„"(])`, 'g');
const SHORT_HYPHEN_RE = new RegExp(`(^|[\\s(«„"])([${LETTER}]{1,2}-[${LETTER}0-9]+)`, 'g');

export function typeset(text: string): string {
  return text
    .replace(DASH_RE, `${NBSP}$1 `)
    // twice: "і в Україні" has two one-letter words in a row sharing a space
    .replace(ONE_LETTER_RE, `$1$2${NBSP}`)
    .replace(ONE_LETTER_RE, `$1$2${NBSP}`)
    .replace(SHORT_HYPHEN_RE, '$1<span class="nw">$2</span>');
}

export function typesetHtml(html: string): string {
  const parts = html.split(/(<[^>]*>)/);
  let skipTag: string | null = null; // element whose contents are left as they are
  let depth = 0; // nesting of that element (an <svg> inside an <svg>)
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part.startsWith('<')) {
      const lower = part.toLowerCase();
      if (skipTag) {
        if (lower.startsWith(`</${skipTag}`)) {
          if (--depth === 0) skipTag = null;
        } else if (new RegExp(`^<${skipTag}\\b`).test(lower) && !part.endsWith('/>')) {
          depth++;
        }
      } else {
        const m = SKIP.exec(part);
        if (m && !part.endsWith('/>')) {
          skipTag = m[1]!.toLowerCase();
          depth = 1;
        }
      }
      continue;
    }
    if (!skipTag && part.trim()) parts[i] = typeset(part);
  }
  return parts.join('');
}

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (!response.headers.get('content-type')?.includes('text/html')) return response;
  const html = await response.text();
  return new Response(typesetHtml(html), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
});
