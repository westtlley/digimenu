import React from 'react';
import { Lightbulb, Keyboard, XCircle, Printer, Bell, Clock } from 'lucide-react';
import { gestorHomeContents } from '@/data/gestorHomeContents';

const ICONS = {
  atalhos: Keyboard,
  cancelar: XCircle,
  comandas: Printer,
  notificacoes: Bell,
  'tempo-preparo': Clock,
};

export default function GestorDicasAtalhos({ onNavigate }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-orange-500" />
        <h2 className="text-xl font-bold text-gray-900">Dicas e atalhos</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {gestorHomeContents
          .slice()
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((card) => {
            const Icon = ICONS[card.id] || Lightbulb;
            const handleClick = () => {
              if (card.internalRoute === 'settings' && onNavigate) onNavigate('settings');
              if (card.externalUrl) window.open(card.externalUrl, '_blank');
            };
            return (
              <button
                key={card.id}
                type="button"
                onClick={handleClick}
                className="rounded-xl p-4 text-left transition hover:shadow-lg hover:scale-[1.02]"
                style={{
                  backgroundColor: card.backgroundColor || '#f97316',
                  color: card.contentFontColor || '#ffffff',
                }}
              >
                <Icon className="w-6 h-6 mb-2 opacity-90" />
                <h3 className="font-bold text-sm mb-1">{card.title}</h3>
                <p className="text-xs opacity-90 leading-relaxed">{card.description}</p>
              </button>
            );
          })}
      </div>
    </div>
  );
}
