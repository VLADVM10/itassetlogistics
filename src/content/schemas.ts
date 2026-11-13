import { z } from 'astro/zod';

/*
 * Page content schemas (spec section 6).
 * - Every object is strict: an unknown or misspelled field stops the build.
 * - List sizes follow the spec table; the layout is designed for exactly these counts.
 * - Length caps are hard limits that protect the layout; recommended lengths live in the CMS hints.
 */

const str = (max: number) => z.string().trim().min(1).max(max);
const optional = (max: number) => z.string().trim().max(max);
const list = <T extends z.ZodType>(item: T, min: number, max: number) => z.array(item).min(min).max(max);

const label = str(90); // mono section eyebrows, small captions
const heading = str(160); // H2/H3
const button = str(60);
const text = str(700); // paragraphs
const alt = str(300); // aria-label of illustrations

export const seo = z.strictObject({
  title: str(120),
  description: optional(200),
  og_image: z.string().trim().optional(),
});

/** H1 with the blue part as a separate field (spec section 6). */
const h1 = z.strictObject({
  before: str(120),
  accent: optional(80),
  after: optional(120),
});

const titled = z.strictObject({ title: heading, text });

/* ---------- Home ---------- */
export const home = z.strictObject({
  seo,
  hero: z.strictObject({
    label,
    h1,
    intro: text,
    cta_primary: button,
    cta_secondary: button,
    operations_label: label,
    operations: list(str(24), 5, 5),
    benefits: list(str(60), 3, 3),
    illustration_label: alt,
    tag: z.strictObject({
      title: str(40),
      serial_label: str(30),
      serial: str(30),
      device_label: str(30),
      device: str(30),
      asset_label: str(30),
      asset_id: str(30),
      location_label: str(30),
      location: str(40),
      status_label: str(30),
      status: str(30),
      note: str(120),
    }),
  }),
  inside: z.strictObject({
    label,
    title: heading,
    intro: text,
    items: list(z.strictObject({ caption: str(80), illustration_label: alt }), 4, 4),
    sealed_label: str(20),
  }),
  what_we_do: z.strictObject({
    label,
    title: heading,
    cards: list(
      z.strictObject({ title: heading, text, link_label: button, illustration_label: alt }),
      2,
      2,
    ),
    media_question: str(120),
    media_link: button,
  }),
  journey: z.strictObject({
    label,
    title: heading,
    intro: text,
    cta: button,
    card_title: str(60),
    card_meta: str(160),
    events: list(z.strictObject({ title: str(60), text: str(200) }), 4, 6),
    note: str(160),
  }),
  nationwide: z.strictObject({
    label,
    title: heading,
    intro: text,
    points: list(titled, 3, 3),
    map_label: alt,
    cities: z.strictObject({
      chernihiv: str(20),
      zhytomyr: str(20),
      rivne: str(20),
      lviv: str(20),
      uzhhorod: str(20),
      vinnytsia: str(20),
      odesa: str(20),
      mykolaiv: str(20),
      dnipro: str(20),
      poltava: str(20),
      kharkiv: str(20),
    }),
    map_kyiv: str(20),
    map_caption: str(240),
    abroad: z.strictObject({ title: heading, steps: list(str(40), 3, 3), text }),
  }),
  contact: z.strictObject({
    label,
    title: heading,
    intro: text,
    location_label: label,
    message_placeholder: str(160),
    thanks: str(300),
  }),
});

/* ---------- Equipment Hub ---------- */
export const hub = z.strictObject({
  seo,
  hero: z.strictObject({
    label,
    h1,
    lead: text,
    paragraphs: list(text, 1, 3),
    cta_primary: button,
    cta_secondary: button,
    benefits: list(str(70), 4, 4),
    illustration_label: alt,
  }),
  services: z.strictObject({
    label,
    title: heading,
    intro: text,
    items: list(z.strictObject({ title: heading, text, result: str(90) }), 6, 6),
    result_label: str(30),
    note: text,
    link: button,
  }),
  how: z.strictObject({
    label,
    title: heading,
    intro: text,
    intro_2: text,
    card_title: str(80),
    serial: str(30), // fictional serial on the moving marker (spec section 8)
    controls: z.strictObject({ previous: str(20), play: str(20), pause: str(20), next: str(20) }),
    status_label: str(20),
    // 5 stages + the final "Back in Stock" state (spec section 8)
    stages: list(
      z.strictObject({ name: str(24), title: str(60), status: str(40), text: str(220) }),
      6,
      6,
    ),
    footnote: str(160),
  }),
  equipment: z.strictObject({
    label,
    title: heading,
    intro: text,
    items: list(titled, 6, 6),
    aside: z.strictObject({ title: heading, text, cta: button }),
  }),
  scenarios: z.strictObject({
    label,
    title: heading,
    intro: text,
    situation_label: str(30),
    help_label: str(30),
    items: list(z.strictObject({ title: heading, situation: text, help: text }), 3, 3),
    note: text,
  }),
  cta: z.strictObject({ label, title: heading, lead: text, text, button, note: str(160) }),
});

/* ---------- Managed Storage ---------- */
export const managed = z.strictObject({
  seo,
  hero: z.strictObject({
    label,
    h1,
    lead: text,
    paragraphs: list(text, 1, 3),
    cta_primary: button,
    cta_secondary: button,
    benefits: list(str(70), 3, 3),
    illustration_label: alt,
  }),
  what_we_store: z.strictObject({
    label,
    title: heading,
    intro: text,
    items: list(z.strictObject({ title: heading, text, illustration_label: alt }), 4, 4),
    aside: titled,
  }),
  services: z.strictObject({
    label,
    title: heading,
    intro: text,
    core: z.strictObject({ title: heading, intro: text, items: list(titled, 4, 4) }),
    optional: z.strictObject({ title: heading, intro: text, items: list(str(160), 4, 8) }),
    aside: titled,
  }),
  arrangements: z.strictObject({ label, title: heading, intro: text, items: list(titled, 4, 4) }),
  cta: z.strictObject({ label, title: heading, lead: text, paragraphs: list(text, 0, 3), button }),
});

/* ---------- Media Storage & Handling ---------- */
export const media = z.strictObject({
  seo,
  hero: z.strictObject({
    label,
    h1,
    lead: text,
    paragraphs: list(text, 1, 3),
    cta_primary: button,
    benefits: list(str(70), 3, 3),
    illustration_label: alt,
  }),
  what_we_handle: z.strictObject({
    label,
    title: heading,
    intro: text,
    items: list(titled, 3, 3),
    note: text,
    disclaimer: text,
  }),
  handling: z.strictObject({
    label,
    title: heading,
    intro: text,
    steps: list(titled, 4, 4),
    note: titled,
  }),
  after_storage: z.strictObject({
    label,
    title: heading,
    intro: text,
    items: list(z.strictObject({ title: heading, paragraphs: list(text, 1, 2) }), 3, 3),
    note: text,
  }),
  cta: z.strictObject({ label, title: heading, lead: text, paragraphs: list(text, 0, 3), button }),
});

/* ---------- Contact ---------- */
export const contact = z.strictObject({
  seo,
  hero: z.strictObject({ label, h1, intro: text, location_label: label, about: text }),
  form: z.strictObject({ message_placeholder: str(160), thanks: str(300) }),
});

/* ---------- Privacy Policy ---------- */
// body: paragraphs separated by a blank line; only **bold** and [links](/path/) are allowed.
export const privacy = z.strictObject({
  seo,
  h1: heading,
  intro: text,
  toc_label: label,
  sections: list(z.strictObject({ title: str(120), body: str(6000) }), 1, 20),
});

/* ---------- 404 ---------- */
export const notFound = z.strictObject({
  seo,
  title: heading,
  text: str(300),
  home_link: button,
  contact_link: button,
});

/* ---------- Global settings ---------- */
const navItem = z.strictObject({ label: str(60) });

export const settings = z.strictObject({
  nav: z.strictObject({
    aria_label: label,
    home: navItem,
    hub: navItem,
    managed: navItem,
    media: navItem,
    contact: navItem,
    privacy: navItem,
    menu_open: label,
    menu_close: label,
    lang_switch: label,
    skip_link: label,
    logo_label: label,
  }),
  footer: z.strictObject({ aria_label: label, domain: str(60) }),
  // "Other services" links at the end of each service page (titles come from nav)
  related: z.strictObject({ label, hub: str(140), managed: str(140), media: str(140) }),
  // analytics cookie banner (shown only when GA_MEASUREMENT_ID is set in src/lib/env.ts)
  consent: z.strictObject({ label, text: str(300), accept: button, decline: button, settings: button }),
  // captions for the email/phone rows on Home and Contact (shown only when contacts.json has a value)
  contact_labels: z.strictObject({ email: str(30), phone: str(30) }),
  form: z.strictObject({
    labels: z.strictObject({
      name: str(40),
      company: str(40),
      email: str(40),
      phone: str(40),
      message: str(40),
    }),
    // {min} / {max} are replaced with the limits checked on the server
    errors: z.strictObject({
      required: str(120),
      email: str(120),
      too_short: str(120),
      too_long: str(120),
      phone: str(160),
    }),
    submit: button,
    sending: button,
    failure: str(240),
    failure_email: str(60),
    policy_before: str(160),
    policy_link: str(60),
    policy_after: z.string().max(20),
  }),
});

export const contacts = z.strictObject({
  email: z.union([z.literal(''), z.email()]),
  phone: z
    .string()
    .trim()
    .max(32)
    .regex(/^[\d+\s()-]*$/, 'digits, +, spaces, ( ) and - only'),
  city_en: str(60),
  city_uk: str(60),
});
