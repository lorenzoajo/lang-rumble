import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/lang-rumble/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Lang Rumble',
        short_name: 'Lang Rumble',
        description: 'Learn the 2,000 most used words of a language with a Ruzzle-style word game',
        theme_color: '#6d28d9',
        background_color: '#150e2b',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // The app shell, the manifest and the dictionaries are precached; pair files (~1.5 MB each)
        // are cached on first use so installing doesn't download every language.
        globPatterns: [
          '**/*.{js,css,html,svg,png,webmanifest}',
          'data/manifest.json',
          'data/dict-*.json',
        ],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.includes('/data/') && url.pathname.endsWith('.json'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'word-data', expiration: { maxEntries: 32 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.ts', 'scripts/**/*.spec.ts'],
  },
})
