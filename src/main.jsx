import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import ErrorBoundary from '@/components/ErrorBoundary'
import '@/index.css'
import '@/styles/animations.css'

const CHUNK_RELOAD_STORAGE_KEY = 'digimenu:chunk-reload-once'

const isChunkLoadErrorText = (value = '') => {
  const message = String(value || '')
  return [
    'Failed to fetch dynamically imported module',
    'Importing a module script failed',
    'ChunkLoadError',
    'Loading chunk',
    'Expected a JavaScript-or-Wasm module script',
    'MIME type',
  ].some((token) => message.includes(token))
}

const isIgnorableRuntimeNoise = ({ message = '', filename = '', stack = '' }) => {
  const text = [message, filename, stack].filter(Boolean).join(' ')
  return (
    text.includes('webpage_content_reporter') ||
    text.includes('chrome-extension://') ||
    text.includes('moz-extension://') ||
    text.includes('safari-extension://') ||
    text.includes('message channel closed before a response was received') ||
    text.includes('asynchronous response by returning true') ||
    text.includes('Error parsing shader') ||
    text.includes('GpuShader') ||
    text.includes('GPU compositing')
  )
}

const tryRecoverChunkLoad = (errorLike) => {
  const message = [
    errorLike?.message,
    errorLike?.reason?.message,
    errorLike?.stack,
  ]
    .filter(Boolean)
    .join(' ')

  if (!isChunkLoadErrorText(message) || typeof window === 'undefined') {
    return false
  }

  try {
    const lastReloadAttempt = window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY)
    if (!lastReloadAttempt) {
      window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(Date.now()))
      window.location.reload()
      return true
    }

    const elapsed = Date.now() - Number(lastReloadAttempt)
    if (!Number.isFinite(elapsed) || elapsed > 15000) {
      window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(Date.now()))
      window.location.reload()
      return true
    }

    window.sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY)
  } catch (_error) {
    // Se sessionStorage falhar, deixa o erro seguir para o console/error boundary.
  }

  return false
}

// Inicializar Sentry
import('./utils/sentry.js').catch(() => {
  // Sentry opcional, nÃ£o bloquear se nÃ£o disponÃ­vel
})

// Service Worker desativado. Garante desregistro apÃ³s load (redundante com script inline no HTML).
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister())
    })
  })
}

// Ignorar ruÃ­do de extensÃµes, mas nÃ£o esconder falhas reais do app.
window.addEventListener(
  'error',
  (event) => {
    const message = event.message ?? event.error?.message ?? ''
    const filename = event.filename ?? ''
    const stack = event.error?.stack ?? ''

    if (isIgnorableRuntimeNoise({ message, filename, stack })) {
      event.preventDefault()
      event.stopPropagation()
      return true
    }

    if (tryRecoverChunkLoad({ message, stack })) {
      event.preventDefault()
      event.stopPropagation()
      return true
    }
  },
  true
)

window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message ?? ''
  const stack = event.reason?.stack ?? ''

  if (isIgnorableRuntimeNoise({ message, stack })) {
    event.preventDefault()
    event.stopPropagation()
    return true
  }

  if (tryRecoverChunkLoad({ reason: event.reason, stack })) {
    event.preventDefault()
    event.stopPropagation()
    return true
  }
})

// Suprimir apenas ruÃ­do conhecido de extensÃµes; erros reais do app devem continuar visÃ­veis.
const originalError = console.error
console.error = (...args) => {
  const message = typeof args[0] === 'string' ? args.join(' ') : String(args[0] ?? '')
  if (isIgnorableRuntimeNoise({ message })) {
    return
  }
  originalError.apply(console, args)
}

try {
  window.sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY)
} catch (_error) {
  // Ignorar indisponibilidade de sessionStorage.
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
