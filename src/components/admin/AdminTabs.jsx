import React from 'react';
import { cn } from "@/lib/utils";

// ✅ Cardápio concentra visão do menu, produtos e complementos
const TABS = [
  { id: 'dishes', label: 'Cardápio' },
  { id: 'coupons', label: 'Cupons' },
  { id: 'promotions', label: 'Promoções' },
  { id: 'orders', label: 'Pedidos' },
  { id: 'theme', label: 'Cores' },
  { id: 'store', label: 'Loja' },
  { id: 'payment', label: 'Pagamentos', masterOnly: true },
];

export default function AdminTabs({ activeTab, setActiveTab, isMaster = false }) {
  const visibleTabs = TABS.filter(tab => !tab.masterOnly || isMaster);
  
  return (
    <div className="border-b border-border bg-card">
      <div className="flex overflow-x-auto scrollbar-hide">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0",
              activeTab === tab.id
                ? "border-orange-500 text-orange-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
