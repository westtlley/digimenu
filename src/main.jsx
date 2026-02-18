import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import ErrorBoundary from '@/components/ErrorBoundary'
import '@/index.css'
import '@/styles/animations.css'

// Inicializar Sentry
import('./utils/sentry.js').catch(() => {
  // Sentry opcional, não bloquear se não disponível
});

// Service Worker desativado. Garante desregistro após load (redundante com script inline no HTML).
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  });
}

// Ignorar erros de extensões do navegador e shaders
window.addEventListener('error', (event) => {
  // Ignorar erros de extensões do navegador
  if (
    event.filename?.includes('webpage_content_reporter') ||
    event.filename?.includes('chrome-extension://') ||
    event.filename?.includes('moz-extension://') ||
    event.filename?.includes('safari-extension://') ||
    event.message?.includes('webpage_content_reporter') ||
    event.message?.includes('Unexpected token \'export\'') ||
    event.message?.includes('Error parsing shader') ||
    event.message?.includes('GpuShader') ||
    event.message?.includes('GPU compositing') ||
    event.message?.includes('MIME type') ||
    event.message?.includes('message channel closed before a response was received') ||
    event.message?.includes('asynchronous response by returning true') ||
    event.error?.message?.includes('webpage_content_reporter') ||
    event.error?.message?.includes('Unexpected token \'export\'') ||
    event.error?.message?.includes('Error parsing shader') ||
    event.error?.message?.includes('MIME type') ||
    event.error?.message?.includes('message channel closed before a response was received') ||
    event.error?.message?.includes('asynchronous response by returning true')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return true;
  }
}, true);

// Ignorar erros não capturados de extensões e mensagens de canal fechado (extensões Chrome)
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message ?? '';
  const stack = event.reason?.stack ?? '';
  if (
    msg.includes('webpage_content_reporter') ||
    stack.includes('webpage_content_reporter') ||
    msg.includes('Unexpected token \'export\'') ||
    msg.includes('Error parsing shader') ||
    msg.includes('GpuShader') ||
    msg.includes('MIME type') ||
    msg.includes('message channel closed before a response was received') ||
    msg.includes('asynchronous response by returning true')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return true;
  }
});

// Suprimir erros de console de extensões (incl. "message channel closed" de extensões Chrome)
const originalError = console.error;
console.error = (...args) => {
  const message = typeof args[0] === 'string' ? args.join(' ') : String(args[0] ?? '');
  if (
    message.includes('webpage_content_reporter') ||
    message.includes('chrome-extension://') ||
    message.includes('Unexpected token \'export\'') ||
    message.includes('Error parsing shader') ||
    message.includes('GpuShader') ||
    message.includes('GPU compositing') ||
    message.includes('MIME type') ||
    message.includes('Expected a JavaScript-or-Wasm module script') ||
    message.includes('message channel closed before a response was received') ||
    message.includes('asynchronous response by returning true')
  ) {
    return; // Ignorar
  }
  originalError.apply(console, args);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
) 