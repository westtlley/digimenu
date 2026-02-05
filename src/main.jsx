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

// Registrar Service Worker para modo offline
import('./utils/registerServiceWorker.js').then(({ registerServiceWorker }) => {
  registerServiceWorker();
}).catch(() => {
  console.warn('Service Worker não disponível');
});

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
    event.error?.message?.includes('webpage_content_reporter') ||
    event.error?.message?.includes('Unexpected token \'export\'') ||
    event.error?.message?.includes('Error parsing shader')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return true;
  }
}, true);

// Ignorar erros não capturados de extensões
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason?.message?.includes('webpage_content_reporter') ||
    event.reason?.stack?.includes('webpage_content_reporter') ||
    event.reason?.message?.includes('Unexpected token \'export\'') ||
    event.reason?.message?.includes('Error parsing shader') ||
    event.reason?.message?.includes('GpuShader')
  ) {
    event.preventDefault();
    event.stopPropagation();
    return true;
  }
});

// Suprimir erros de console de extensões
const originalError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  if (
    message.includes('webpage_content_reporter') ||
    message.includes('chrome-extension://') ||
    message.includes('Unexpected token \'export\'') ||
    message.includes('Error parsing shader') ||
    message.includes('GpuShader') ||
    message.includes('GPU compositing')
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