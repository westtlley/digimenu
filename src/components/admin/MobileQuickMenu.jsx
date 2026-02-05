import React, { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Users, 
  UtensilsCrossed, 
  Calculator, 
  Settings,
  Menu,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * Menu rápido mobile - Drawer flutuante com ícones de navegação
 * Agrupa: Dashboard, Assinantes, Cardápio, PDV, Gestor de Pedidos
 */
export default function MobileQuickMenu({ 
  isMaster, 
  hasGestorAccess, 
  slug,
  className = '' 
}) {
  const [open, setOpen] = useState(false);

  const menuItems = [
    ...(isMaster ? [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: BarChart3,
        to: createPageUrl('AdminMasterDashboard'),
        color: 'from-orange-500 to-orange-600',
        hoverColor: 'hover:from-orange-600 hover:to-orange-700'
      },
      {
        id: 'assinantes',
        label: 'Assinantes',
        icon: Users,
        to: createPageUrl('Assinantes'),
        color: 'from-purple-600 to-purple-700',
        hoverColor: 'hover:from-purple-700 hover:to-purple-800'
      }
    ] : []),
    {
      id: 'cardapio',
      label: 'Cardápio',
      icon: UtensilsCrossed,
      to: slug ? createPageUrl('Cardapio', slug) : createPageUrl('Cardapio'),
      color: 'from-green-600 to-green-700',
      hoverColor: 'hover:from-green-700 hover:to-green-800'
    },
    {
      id: 'pdv',
      label: 'PDV',
      icon: Calculator,
      to: createPageUrl('PDV'),
      color: 'from-blue-600 to-blue-700',
      hoverColor: 'hover:from-blue-700 hover:to-blue-800'
    },
    ...(hasGestorAccess ? [
      {
        id: 'gestor',
        label: 'Gestor de Pedidos',
        icon: Settings,
        to: createPageUrl('GestorPedidos'),
        color: 'from-orange-600 to-orange-700',
        hoverColor: 'hover:from-orange-700 hover:to-orange-800'
      }
    ] : [])
  ];

  if (menuItems.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`text-white bg-white/10 hover:bg-white/20 min-h-touch min-w-touch ${className}`}
          title="Menu Rápido"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="bottom" 
        className="h-auto max-h-[85vh] rounded-t-2xl p-0 bg-gray-900 border-t border-gray-700 pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Menu Rápido</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="text-white hover:bg-white/10 min-h-touch min-w-touch"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="block"
                >
                  <Button
                    variant="ghost"
                    className={`w-full h-20 sm:h-24 flex flex-col items-center justify-center gap-2 bg-gradient-to-br ${item.color} ${item.hoverColor} text-white shadow-lg transition-all min-h-touch active:scale-95`}
                  >
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                    <span className="text-xs sm:text-sm font-medium">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
