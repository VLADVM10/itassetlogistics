# IT Asset Logistics — site

Bilingual (EN default, UA under `/uk/`) static site on Astro, Sveltia CMS admin, hosted on Cityhost.
Spec: <https://claude.ai/artifact/Krg6Hofn5bpeQRYwDj7yTH> · Design: <https://claude.ai/artifact/G1nio1Kp2D7prh4Au3R3ZU>

## Requirements

- Node **22.23.4+** (see `.nvmrc`; Astro 7.4 refuses older 22.x).
  If the system Node is older, run any command through a portable Node:
  `npx -y -p node@22.23.4 node node_modules/astro/bin/astro.mjs <dev|build|check>`

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at http://localhost:4321 |
| `npm run check` | Types, content schemas, then `check:content` |
| `npm run check:content` | Every design text is present verbatim in the content JSON (needs local `_design/`) |
| `npm run build` | Build static site into `dist/` |
| `npm run build:preview` | Same, closed to search engines: `noindex, nofollow` on every page, `robots.txt` disallows all |

## Layout

```
src/
  content/pages/{en,uk}/*.json   page copy, one file per page and language
  content/settings/              menu/footer/form labels (en.json, uk.json), contacts.json
  content/schemas.ts             Zod schemas per page: strict fields, list limits, length caps
  content.config.ts              one collection per page (entries `en`, `uk`)
  i18n/routes.ts                 URLs and language helpers
  layouts/Base.astro             <head> SEO, hreflang, fonts, header/footer
  components/                    Logo, Header (+ mobile menu), LangSwitch, Footer, Icon,
                                 RequestForm, ContactDetails, SectionHead, CtaPanel, PageHero
  components/art/                illustrations: SVG from the design, unchanged (see below)
  components/home/, hub/, managed/, media/  page sections
  lib/richtext.ts                paragraphs, **bold** and [links](/path/) for Privacy bodies (escaped)
  views/                         page bodies shared by EN and UA routes
  pages/                         EN routes; pages/uk/ — UA routes
  scripts/                       client scripts: menu.ts, journey.ts (Equipment Hub)
  styles/                        tokens.css, base.css
public/                          favicons (brand kit C2), manifest
scripts/check-content.mjs        design ↔ JSON text check
```

Content notes:
- Privacy Policy bodies: paragraphs separated by a blank line; only `**bold**` and `[link](/path/)`.
- Form errors `too_short`, `too_long`, `phone`, the `sending` label and the 404 copy are drafts
  awaiting client approval; everything else is verbatim from the design.
- UA Privacy, section 10: «сторінку Contact» corrected to «сторінку «Контакти»» as the spec requires.

Illustrations: `components/art/*.astro` hold the SVGs exactly as in the approved design. The only
changes: `style=""` attributes became classes (no inline styles, for the CSP), `aria-label` and
localized labels inside the SVG (SEALED, city names) come from page JSON. Edit geometry only by
re-exporting from the design.

No inline CSS or JS in the build (`inlineStylesheets: 'never'`, `assetsInlineLimit: 0`) so the
CSP can stay strict; the only inline script is the `html.js` flag in `<head>`.

Rules: no text hard-coded in templates (all copy comes from JSON); no new colours or fonts
beyond `styles/tokens.css`; fonts are self-hosted (no Google Fonts).

## Status

Stage 1 (skeleton) — layout, header, footer, logo, i18n routes, SEO head, sitemap.
Stage 2 (content) — all EN/UA copy in JSON, strict schemas, design check.
Stage 3 (pages) — done. All pages in EN/UA: Home, Equipment Hub, Managed Storage, Media Storage,
Contact, Privacy Policy and 404 (no artboard: built from the Contact/Privacy page head).
Section heights match the design at 1440, 1100, 820, 700, 375 and 320 px. The Hub Journey
animation is already interactive (spec section 8). The form is markup only; sending arrives in
stage 5. Email/phone captions (`contact_labels` in settings) are drafts: the design has no
email/phone rows yet.
Stage 4 (interactive) — done and tested in headless Chrome: mobile menu (keyboard, Esc with focus
return, closes on link click and above 900px, plain list without JS), Journey (autoplay only in
view and with the tab visible, manual pick pauses, reduced motion starts paused, aria-live only
when paused, phone layout), Home hero rise-in, map routes pause on hover and keyboard focus,
reduced motion disables every animation and smooth scroll. JS per page: ≤ 1.3 KB gzip.
Accessibility over pixel parity on phones (≤560px): touch targets are ≥ 44×44 (spec section 13),
so the footer links, Privacy contents, Journey buttons and the Hub services link are taller than
in the artboards there; desktop layout is unchanged.
