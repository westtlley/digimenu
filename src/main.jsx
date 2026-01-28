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

// Ignorar erros de extensões do navegador
window.addEventListener('error', (event) => {
  // Ignorar erros de extensões do navegador
  if (
    event.filename?.includes('webpage_content_reporter') ||
    event.filename?.includes('chrome-extension://') ||
    event.filename?.includes('moz-extension://') ||
    event.filename?.includes('safari-extension://') ||
    event.message?.includes('webpage_content_reporter')
  ) {
    event.preventDefault();
    return true;
  }
}, true);

// Ignorar erros não capturados de extensões
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason?.message?.includes('webpage_content_reporter') ||
    event.reason?.stack?.includes('webpage_content_reporter')
  ) {
    event.preventDefault();
    return true;
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
) 