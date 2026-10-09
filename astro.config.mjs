import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// Dominio definitivo pendiente de confirmar con el cliente (ver docs/deploy.md).
const site = process.env.PUBLIC_SITE_URL || 'https://krens.example';

export default defineConfig({
  site,
  output: 'static',
  adapter: vercel(),
  integrations: [sitemap({ filter: (page) => !/\/(gracias|admin)/.test(page) })],
  image: { responsiveStyles: false },
  env: {
    schema: {
      PUBLIC_META_PIXEL_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_GA4_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      LEADS_WEBHOOK_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      LEADS_WEBHOOK_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      META_CAPI_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      META_TEST_EVENT_CODE: envField.string({ context: 'server', access: 'secret', optional: true }),
      ADMIN_USERNAME: envField.string({ context: 'server', access: 'secret', optional: true }),
      ADMIN_PASSWORD_HASH: envField.string({ context: 'server', access: 'secret', optional: true }),
      ADMIN_IMAGE_HOSTS: envField.string({ context: 'server', access: 'public', optional: true }),
      UPSTASH_REDIS_REST_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      UPSTASH_REDIS_REST_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Nombres que genera el Marketplace de Vercel (sin prefijo y con prefijo STORAGE).
      KV_REST_API_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      KV_REST_API_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      STORAGE_KV_REST_API_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      STORAGE_KV_REST_API_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
});
