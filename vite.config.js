import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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