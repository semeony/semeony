import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/daywell-sunrise-192.png', 'icons/daywell-sunrise-512.png', 'icons/daywell-sunrise-512-maskable.png'],
      manifest: {
        id: './',
        name: 'Daywell Daily Planner',
        short_name: 'Daywell',
        description: 'Plan your day around your energy, appointments and priorities.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f6f4ef',
        theme_color: '#2563eb',
        categories: ['productivity', 'lifestyle'],
        icons: [
          {
            src: './icons/daywell-sunrise-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: './icons/daywell-sunrise-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: './icons/daywell-sunrise-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
