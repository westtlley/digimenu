import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'DigiMenu - Gestão de Restaurante',
        short_name: 'DigiMenu',
        description: 'Cardápio digital, PDV, Gestor de Pedidos, Entregador e Garçom',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
        ],
        categories: ['food', 'business']
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024 // 4 MB para bundles grandes
      }
    })
  ],
  server: {
    allowedHosts: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@api': path.resolve(__dirname, './src/api'),
      '@styles': path.resolve(__dirname, './src/styles'),
    },
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json']
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      onwarn(warning, warn) {
        // Ignorar avisos de extensões do navegador
        if (warning.code === 'UNRESOLVED_IMPORT' && warning.id?.includes('webpage_content_reporter')) {
          return;
        }
        // Ignorar outros avisos de extensões
        if (warning.id?.includes('chrome-extension://') || warning.id?.includes('moz-extension://')) {
          return;
        }
        warn(warning);
      },
    },
    // Melhorar tratamento de erros no build
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  // Ignorar erros de extensões do navegador no console
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
}) 