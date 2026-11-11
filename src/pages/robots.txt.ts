import type { APIRoute } from 'astro';
import { PREVIEW } from '../lib/env';
import { SITE_URL } from '../i18n/routes';

const LIVE = `User-agent: *
Allow: /
Disallow: /admin/

Sitemap: ${SITE_URL}/sitemap-index.xml
`;
const CLOSED = `# Preview build: not for indexing
User-agent: *
Disallow: /
`;

export const GET: APIRoute = () =>
  new Response(PREVIEW ? CLOSED : LIVE, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
