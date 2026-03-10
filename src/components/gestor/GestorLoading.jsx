import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const TIME_FIRST_MSG = 9000;
const TIME_SECOND_MSG = 22000;
const TIME_RELOAD = 34000;

function clearCacheAndReload() {
  const run = async () => {
    try {
      const regs = (await navigator.serviceWorker?.getRegistrations?.()) || [];
      for (const reg of regs) {
        await reg.unregister();
      }
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.filter((n) => n !== 'meta-json').map((n) => caches.delete(n)));
      }
    } catch (_) {}
    window.location.reload();
  };
  run();
}

export default function GestorLoading() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), TIME_FIRST_MSG);
    const t2 = setTimeout(() => setPhase(2), TIME_SECOND_MSG);
    const t3 = setTimeout(() => setPhase(3), TIME_RELOAD);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-2">DigiMenu Operation</p>
        <h2 className="text-xl font-bold text-white">Sincronizando operacao do restaurante</h2>
        <p className="text-sm text-slate-400 mt-1">Fluxo em tempo real: pedido, cozinha e entrega.</p>

        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950 p-5 relative overflow-hidden">
          <div className="absolute left-10 right-10 top-1/2 h-[2px] -translate-y-1/2 bg-slate-700" />
          <div className="relative z-10 grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 text-xs font-bold">PED</div>
              <p className="text-[11px] text-slate-300 mt-2">Pedido</p>
            </div>
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center text-orange-300 text-xs font-bold">COZ</div>
              <p className="text-[11px] text-slate-300 mt-2">Cozinha</p>
            </div>
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 text-xs font-bold">ENT</div>
              <p className="text-[11px] text-slate-300 mt-2">Entrega</p>
            </div>
          </div>

          <div className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-orange-400 shadow-[0_0_16px_#fb923c] loading-flow-dot" />
        </div>

        <div className="mt-5 min-h-[56px]">
          {phase === 0 && <p className="text-sm text-slate-300">Carregando paineis e atualizando indicadores...</p>}
          {phase === 1 && <p className="text-sm text-amber-300">Ainda carregando dados. Estamos finalizando a sincronizacao.</p>}
          {phase === 2 && <p className="text-sm text-orange-300">Reconectando servicos para restaurar a operacao.</p>}
          {phase >= 3 && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-red-300">A conexao demorou mais que o esperado.</p>
              <Button onClick={clearCacheAndReload} className="bg-orange-500 hover:bg-orange-600">
                Recarregar
              </Button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .loading-flow-dot {
          left: 14%;
          animation: digimenu-flow 1.8s ease-in-out infinite;
        }
        @keyframes digimenu-flow {
          0% { left: 14%; opacity: 0.45; }
          50% { left: 50%; opacity: 1; }
          100% { left: 86%; opacity: 0.45; }
        }
        @media (prefers-reduced-motion: reduce) {
          .loading-flow-dot { animation: none; left: 50%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
