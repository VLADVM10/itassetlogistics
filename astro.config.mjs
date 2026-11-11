// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const SITE = 'https://itassetlogistics.com';

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // CSS and JS go to /_astro/ files, never inline: the CSP (spec section 13) allows no inline code
    // except the one-line `html.js` flag in <head>, which stage 7 whitelists by hash.
    inlineStylesheets: 'never',
  },
  vite: {
    // One CSS file for the whole site (~11 KB brotli): one request instead of three render-blocking
    // ones per page, cached across pages (stage 7, LCP).
    build: { assetsInlineLimit: 0, cssCodeSplit: false },
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'uk'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      // 404 and the CMS are never in the sitemap (spec section 10).
      filter: (page) => !/\/404\/?$/.test(page) && !page.includes('/admin/'),
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', uk: 'uk' },
      },
    }),
  ],
});
