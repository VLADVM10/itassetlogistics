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
| `npm run check` | Types, content schemas, EN/UA structure, admin config up to date, then `check:content` |
| `npm run check:i18n` | EN and UA content have the same keys and list sizes |
| `npm run cms:config` | Regenerate `public/admin/config.yml` from the content schemas |
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
  scripts/                       client scripts: menu.ts, journey.ts (Equipment Hub), form.ts
public/api/request.php           form endpoint; the handler itself is in server/ (see server/README.md)
server/                          PHP handler: validation, Turnstile, SQLite journal, PHPMailer → /_private/
  styles/                        tokens.css, base.css
public/                          favicons (brand kit C2), manifest
scripts/check-content.mjs        design ↔ JSON text check
scripts/check-i18n.mjs           EN/UA structure check
scripts/verify-build.mjs         dist check before publishing (pages, hreflang, links)
scripts/cms/                     admin config generator: build-config.mjs, labels.mjs, recommended.json
public/admin/                    Sveltia CMS: index.html (pinned version), config.yml (generated)
.github/workflows/deploy.yml     build + checks → `deploy` branch
ops/                             server side of the deploy (pull-deploy.sh, README.md), cloudflare.md
public/.htaccess                 Apache rules: old-URL and trailing-slash 301s, 404 per language
public/og-default.png            shared social image (C2 logo, 1200×630)
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
Stage 5 (form) — done. `scripts/form.ts` validates on submit with the texts from settings
(`aria-invalid`, `aria-describedby`, `role="alert"`, focus on the first error), loads Turnstile only
when the form nears the screen, sends JSON with a 20 s timeout, shows thanks only after
`{"ok":true}` and the failure block otherwise. `server/` checks method, Origin, rate limit,
honeypot, Turnstile and fields, saves to SQLite, then sends the email. Tested: handler on the
server (every status of spec section 9), 28 UI checks in headless Chrome, and end-to-end on the
domain with the real Turnstile widget. Turnstile: the client's widget (`TURNSTILE_SITE_KEY` in
`src/lib/env.ts`, secret in config.php via `ops/set-turnstile-secret.sh`); email goes from and to
`info@itassetlogistics.com` (password via `ops/set-smtp-password.sh`). Without JS the form cannot
pass Turnstile.

Hosting facts that shape stages 5 and 7: PHP's `open_basedir` is the site folder (hence
`/_private/`), and nginx serves static files (`.html`, `.txt`, CSS, JS, images) itself, so
`.htaccess` rules and headers do not reach them; security headers are set in Cloudflare.

Stage 6 (admin) — Sveltia CMS at `/admin/` (pinned 0.253.1 with SRI), GitHub backend on `main`.
`public/admin/config.yml` is generated from `src/content/schemas.ts` (`npm run cms:config`;
`npm run check` fails when it is stale), so the admin's list limits and length caps match the
build; Ukrainian names and hints live in `scripts/cms/labels.mjs`, recommended lengths are frozen
from the design texts in `scripts/cms/recommended.json`. EN and UA are edited side by side; list
items are added, removed and ordered in English and mirrored in Ukrainian (a new item arrives with
the English text to translate), and `check:i18n` stops the build if the two ever differ. Tested
with a copy of the repository in the admin's local-repository mode: saving changes only the edited
fields, keeps empty optional fields and key order. Deploy: see `ops/README.md` (pull model).
Sign-in through GitHub goes through the `sveltia-cms-auth` Worker (`AUTH_URL` in
`scripts/cms/build-config.mjs`, see `ops/README.md`); sign-in with a GitHub token also works.

Stage 7 (SEO and security) — done in code; the Cloudflare part is a checklist for the account
owner in `ops/cloudflare.md` (Full (strict) SSL, HSTS, always HTTPS, www → apex, security
headers, cache rules, no injected analytics). In code: strict CSP in a meta tag on every page
(`'self'`, one hashed inline line, Turnstile only) and its own policy for `/admin/`;
`Referrer-Policy` meta; shared Open Graph / Twitter image; `robots.txt` closes `/admin/` and
`/api/`; `.htaccess` gives the 301s of spec section 10 (old URLs, trailing slash, always to
https) and the 404 page in the language of the URL; one CSS file for the whole site (one request,
cached across pages — layout verified identical on every page at 1440 and 375 px); the logo's
visible text is part of its accessible name. Mobile Lighthouse on the live preview: Performance
98–100, Accessibility 100, Best Practices 100, LCP 1.3–1.6 s, CLS 0; SEO stays at 58 only because
the preview is `noindex` and the `description` texts await the client.
