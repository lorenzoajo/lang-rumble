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
        // Everything, word data included (~12 MB), is precached at install so every language
        // works offline from the first visit.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}', 'data/*.json'],
        // Pair files are ~1.3–1.7 MB; workbox skips anything over 2 MB by default.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
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
