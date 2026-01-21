import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

const TIME_FIRST_MSG = 10000;   // 10s
const TIME_SECOND_MSG = 25000;  // 25s
const TIME_RECARREGAR = 35000;  // 35s

function clearCacheAndReload() {
  const run = async () => {
    try {
      const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
      for (const r of regs) await r.unregister();
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.filter(n => n !== 'meta-json').map(n => caches.delete(n)));
      }
    } catch (e) { /* ignore */ }
    window.location.reload();
  };
  run();
}

export default function GestorLoading() {
  const [phase, setPhase] = useState(0); // 0: spinner only, 1: demorou, 2: reiniciar, 3: recarregar

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), TIME_FIRST_MSG);
    const t2 = setTimeout(() => setPhase(2), TIME_SECOND_MSG);
    const t3 = setTimeout(() => setPhase(3), TIME_RECARREGAR);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#7a7775] z-[100]">
      {/* Spinner dois anéis – laranja #f97316 e #ffedd5 (identidade DigiMenu) */}
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#f97316"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray="70.69 70.69"
            style={{
              transformOrigin: '50px 50px',
              animation: 'gestor-spin 1.7s linear infinite',
            }}
          />
          <circle
            cx="50"
            cy="50"
            r="37"
            fill="none"
            stroke="#ffedd5"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray="58.12 58.12"
            strokeDashoffset="39.27"
            style={{
              transformOrigin: '50px 50px',
              animation: 'gestor-spin-rev 1.7s linear infinite',
            }}
          />
        </svg>
      </div>

      <p className="mt-4 text-white/90 text-sm">Carregando Gestor de Pedidos...</p>

      {/* Mensagens de atraso – tipografia iFood: título 26px, subtítulo 18px, texto branco */}
      <div className="mt-6 text-center max-w-sm px-4">
        {phase >= 1 && (
          <p className="text-[26px] font-bold text-white">Isso está demorando mais que o esperado</p>
        )}
        {phase >= 1 && phase < 2 && (
          <p className="text-lg text-white/90 mt-1">Estamos verificando o seu problema!</p>
        )}
        {phase >= 2 && phase < 3 && (
          <p className="text-lg text-white/90 mt-1">Vamos reiniciar seu Gestor de Pedidos. Aguarde.</p>
        )}
        {phase >= 3 && (
          <Button
            onClick={clearCacheAndReload}
            className="rounded mt-4 bg-orange-500 hover:bg-orange-600 uppercase font-bold transition-all duration-100"
          >
            Recarregar
          </Button>
        )}
      </div>

      <style>{`
        @keyframes gestor-spin { to { transform: rotate(360deg); } }
        @keyframes gestor-spin-rev { to { transform: rotate(-360deg); } }
        @media (prefers-reduced-motion: reduce) {
          [style*="animation: gestor-spin"] { animation: none; }
          [style*="animation: gestor-spin-rev"] { animation: none; }
        }
      `}</style>
    </div>
  );
}
