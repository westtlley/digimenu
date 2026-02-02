import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'digimenu_install_dismissed';
const DISMISS_DAYS = 7;

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsSupported(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Verificar se já está instalado (standalone = rodando como PWA)
    const inStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone
      || document.referrer.includes('android-app://');
    setIsInstalled(inStandalone);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
      return true;
    }
    return false;
  };

  return { deferredPrompt, isInstalled, isSupported, install };
}

export default function InstallAppButton({ pageName = 'App', compact = false }) {
  const { deferredPrompt, isInstalled, isSupported, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return false;
      const { until } = JSON.parse(saved);
      return until && Date.now() < until;
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      until: Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000
    }));
  };

  if (!isSupported || isInstalled || dismissed || !deferredPrompt) return null;

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={install}
        className="min-h-touch min-w-touch text-inherit opacity-90 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10"
        title={`Instalar ${pageName} como app`}
        aria-label={`Instalar ${pageName} como app`}
      >
        <Download className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
      <span className="text-sm text-white/90 hidden sm:inline">
        Instalar {pageName} como app
      </span>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="secondary"
          onClick={install}
          className="bg-white/20 hover:bg-white/30 text-white border-0 h-8 text-xs font-medium"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Instalar
        </Button>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white min-h-touch min-w-touch flex items-center justify-center"
          aria-label="Ocultar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
