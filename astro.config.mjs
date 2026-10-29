import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
// Owner MUST set PUBLIC_SITE_URL to the real deployed domain before launch.
// The fallback is a placeholder for local builds only and must not be shipped as canonical.
const site = process.env.PUBLIC_SITE_URL || 'https://formfixindia.in';
export default defineConfig({
  site,
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
