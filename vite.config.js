import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'

// Garante que o index.html do build tenha type="module" nos scripts (evita Unexpected token 'export')
function enforceModuleScripts() {
  return {
    name: 'enforce-module-scripts',
    writeBundle(_, bundle) {
      const htmlPath = path.resolve(__dirname, 'dist/index.html')
      if (!fs.existsSync(htmlPath)) return
      let html = fs.readFileSync(htmlPath, 'utf-8')
      // Garantir que todo <script src="..."> tenha type="module"
      html = html.replace(/<script(\s+[^>]*?)src=/gi, (m) => {
        if (m.includes('type="module"') || m.includes("type='module'")) return m
        return m.replace('<script', '<script type="module"')
      })
      fs.writeFileSync(htmlPath, html)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    enforceModuleScripts(),
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
    // Evita "Unexpected token 'export'" — output compatível com navegadores que interpretam ESM
    target: 'es2020',
    // Garante que chunks sejam reconhecidos como módulos
    modulePreload: { polyfill: true },
    // Garante que os arquivos sejam servidos com o MIME type correto
    assetsInlineLimit: 4096,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        // Chunks em formato ESM; o HTML deve carregar com type="module"
        format: 'es',
        // Garantir que os arquivos tenham extensão .js
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
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
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    // Garantir que o build seja minificado corretamente
    minify: 'esbuild',
    // Garantir que os source maps não causem problemas
    sourcemap: false,
  },
  // Ignorar erros de extensões do navegador no console
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
}) 