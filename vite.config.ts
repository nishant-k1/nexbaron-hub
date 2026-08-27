import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'favicon-digital.svg', 'favicon-print.svg', 'icons.svg'],
      manifest: {
        name: 'Nexbaron Hub',
        short_name: 'Nexbaron Hub',
        description: 'Customer portal for Nexbaron Digital & Print — track orders, invoices and chat',
        theme_color: '#0f1a1f',
        background_color: '#0f1a1f',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/favicon-digital.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/favicon-print.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
      devOptions: { enabled: true, navigateFallback: 'index.html', type: 'module' },
    }),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 5173 },
})
