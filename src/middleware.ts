/*
 * Typography for every built page (runs once per page at build time, the site is static).
 * Narrow screens break lines often, so three common breaks are prevented in visible text:
 *  - a dash starting a line: the space before " — " / " – " becomes a no-break space;
 *  - a one-letter Ukrainian word (в, з, і, у, а, о, й, я) ending a line: the space after it
 *    becomes a no-break space;
 *  - a short prefix split at its hyphen ("з-за", "IT-обладнання"): a word joiner after the hyphen.
 * Only text between tags is touched: attributes (alt, aria-label, meta content, data-*),
 * <script>, <style>, <textarea> and <pre> stay exactly as in the content JSON.
 */
import { defineMiddleware } from 'astro:middleware';

const NBSP = ' ';
const WORD_JOINER = '⁠';
const LETTER = 'A-Za-zА-Яа-яІіЇїЄєҐґ’\'';
const SKIP = /^<(script|style|textarea|pre)\b/i;

const DASH_RE = / ([—–]) /g;
const ONE_LETTER_RE = new RegExp(`(^|[\\s(«„"])([ВвЗзІіУуАаОоЙйЯя]) (?=[${LETTER}0-9«„"(])`, 'g');
const SHORT_HYPHEN_RE = new RegExp(`(^|[\\s(«„"])([${LETTER}]{1,2})-(?=[${LETTER}])`, 'g');

export function typeset(text: string): string {
  return text
    .replace(DASH_RE, `${NBSP}$1 `)
    // twice: "і в Україні" has two one-letter words in a row sharing a space
    .replace(ONE_LETTER_RE, `$1$2${NBSP}`)
    .replace(ONE_LETTER_RE, `$1$2${NBSP}`)
    .replace(SHORT_HYPHEN_RE, `$1$2-${WORD_JOINER}`);
}

export function typesetHtml(html: string): string {
  const parts = html.split(/(<[^>]*>)/);
  let skipUntil: string | null = null;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part.startsWith('<')) {
      if (skipUntil) {
        if (part.toLowerCase().startsWith(skipUntil)) skipUntil = null;
      } else {
        const m = SKIP.exec(part);
        if (m && !part.endsWith('/>')) skipUntil = `</${m[1]!.toLowerCase()}`;
      }
      continue;
    }
    if (!skipUntil && part.trim()) parts[i] = typeset(part);
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
