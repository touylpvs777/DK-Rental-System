import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,woff2,png,svg}'],
        navigateFallback: '/index.html',
      },
      manifest: {
        name: 'DK Forklift',
        short_name: 'DK Fleet',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'vendor-charts'
          }
          if (
            id.includes('node_modules/@tanstack/react-table')
            || id.includes('node_modules/react-hook-form')
            || id.includes('node_modules/zod')
            || id.includes('node_modules/@hookform/resolvers')
          ) {
            return 'vendor-forms'
          }
          // xlsx is large and only needed on export-click — kept out of every
          // other chunk so it's only fetched when exportExcel.ts is dynamically
          // imported, not bundled into the app's initial load.
          if (id.includes('node_modules/xlsx')) {
            return 'vendor-xlsx'
          }
        },
      },
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
})
