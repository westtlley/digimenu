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
  X,
  Bike,
  UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Menu rápido - Drawer flutuante com ícones de navegação
 * Agrupa: Dashboard, Assinantes, Cardápio, PDV, Gestor de Pedidos, Entregador, Garçom
 * Versão mobile e desktop com efeitos modernos
 */
export default function MobileQuickMenu({ 
  isMaster, 
  hasGestorAccess, 
  hasModuleAccess,
  slug,
  className = '' 
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const can = (module) => (typeof hasModuleAccess === 'function' ? hasModuleAccess(module) : true);

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
    ...(can('pdv') ? [{
      id: 'pdv',
      label: 'PDV',
      icon: Calculator,
      to: createPageUrl('PDV'),
      color: 'from-blue-600 to-blue-700',
      hoverColor: 'hover:from-blue-700 hover:to-blue-800'
    }] : []),
    ...(hasGestorAccess ? [
      {
        id: 'gestor',
        label: 'Gestor de Pedidos',
        icon: Settings,
        to: createPageUrl('GestorPedidos'),
        color: 'from-orange-600 to-orange-700',
        hoverColor: 'hover:from-orange-700 hover:to-orange-800'
      }
    ] : []),
    ...(can('orders') ? [{
      id: 'entregador',
      label: 'Entregador',
      icon: Bike,
      to: createPageUrl('Entregador'),
      color: 'from-cyan-600 to-cyan-700',
      hoverColor: 'hover:from-cyan-700 hover:to-cyan-800'
    }] : []),
    ...(can('garcom') ? [{
      id: 'garcom',
      label: 'Garçom',
      icon: UserCheck,
      to: createPageUrl('Garcom'),
      color: 'from-indigo-600 to-indigo-700',
      hoverColor: 'hover:from-indigo-700 hover:to-indigo-800'
    }] : [])
  ];

  if (menuItems.length === 0) return null;

  // Versão Desktop: Popover flutuante
  if (!isMobile) {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(!open)}
          className={`text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm ${className}`}
          title="Menu Rápido"
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        <AnimatePresence>
          {open && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              />
              
              {/* Menu Flutuante */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed top-16 right-4 z-50 w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200/50 dark:border-gray-700/50">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Menu Rápido</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOpen(false)}
                    className="h-8 w-8 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Menu Items Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {menuItems.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link
                          to={item.to}
                          onClick={() => setOpen(false)}
                          className="block"
                        >
                          <Button
                            variant="ghost"
                            className={`w-full h-20 flex flex-col items-center justify-center gap-2 bg-gradient-to-br ${item.color} ${item.hoverColor} text-white shadow-lg transition-all hover:scale-105 active:scale-95 rounded-xl`}
                          >
                            <Icon className="w-6 h-6" />
                            <span className="text-xs font-medium">{item.label}</span>
                          </Button>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Versão Mobile: Sheet inferior
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm min-h-touch min-w-touch ${className}`}
          title="Menu Rápido"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="bottom" 
        className="h-auto max-h-[85vh] rounded-t-3xl p-0 bg-gray-900/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-white/10 dark:border-gray-700/50 pb-[max(1rem,env(safe-area-inset-bottom,0px))] overflow-hidden"
      >
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="p-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
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
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05, type: "spring", damping: 20 }}
                >
                  <Link
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="block"
                  >
                    <Button
                      variant="ghost"
                      className={`w-full h-20 sm:h-24 flex flex-col items-center justify-center gap-2 bg-gradient-to-br ${item.color} ${item.hoverColor} text-white shadow-lg transition-all min-h-touch active:scale-95 hover:scale-105 rounded-xl backdrop-blur-sm`}
                    >
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                      <span className="text-xs sm:text-sm font-medium">{item.label}</span>
                    </Button>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}
