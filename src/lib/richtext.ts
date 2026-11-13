/*
 * Minimal rich text for long texts in JSON (Privacy Policy bodies, spec section 6):
 * paragraphs separated by a blank line, **bold**, [label](/path/).
 * Everything else is escaped, so editors cannot inject HTML.
 */
const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Only site-relative links, anchors, https and mailto are allowed. */
const SAFE_HREF = /^(\/(?!\/)|#|https:\/\/|mailto:)/;

/** One line of inline rich text (**bold**, [label](/path/)) as HTML, for short fields. */
export function inline(text: string): string {
  return escape(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label: string, href: string) => {
      const raw = href.replace(/&amp;/g, '&');
      if (!SAFE_HREF.test(raw)) return label;
      const external = raw.startsWith('https://');
      return `<a href="${href}"${external ? ' rel="noopener"' : ''}>${label}</a>`;
    });
}

/** Splits text into paragraphs (blank line) and returns their inline HTML. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => inline(p.replace(/\s*\n\s*/g, ' ')));
}
