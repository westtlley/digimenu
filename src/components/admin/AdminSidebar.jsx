import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import { 
  UtensilsCrossed, 
  Ticket, 
  Megaphone, 
  ClipboardList,
  Palette,
  Store,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MapPin,
  Printer,
  DollarSign,
  History,
  Home,
  Users,
  ShoppingCart,
  Wallet,
  MessageCircle,
  Settings,
  QrCode,
  Clock,
  TrendingUp,
  BarChart3,
  Layers,
  Plus,
  Grid3x3,
  Pizza
} from 'lucide-react';

const MENU_STRUCTURE = [
  // 📊 GESTÃO
  {
    id: 'gestao',
    label: '📊 GESTÃO',
    icon: BarChart3,
    section: 'section',
    submenu: [
      { id: 'dashboard', label: 'Dashboard', icon: Home, module: 'dashboard' },
      { id: 'financial', label: 'Financeiro', icon: DollarSign, module: 'financial' },
      { id: 'caixa', label: 'Caixa', icon: Wallet, module: 'caixa' },
    ]
  },

  // 🧾 OPERAÇÃO
  {
    id: 'operacao',
    label: '🧾 OPERAÇÃO',
    icon: ClipboardList,
    section: 'section',
    submenu: [
      { id: 'orders', label: 'Gestor de Pedidos', icon: ClipboardList, module: 'orders' },
      { id: 'history', label: 'Histórico de Pedidos', icon: History, module: 'history' },
      { id: 'clients', label: 'Clientes', icon: Users, module: 'clients' },
      { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, module: 'whatsapp' },
    ]
  },

  // CARDÁPIO: Restaurante (Pratos, Categorias, Complementos), Pizzas, Promoções, Cupons
  {
    id: 'cardapio',
    label: 'CARDÁPIO',
    icon: UtensilsCrossed,
    section: 'section',
    submenu: [
      { id: 'restaurante_grp', label: 'Restaurante', icon: UtensilsCrossed, section: 'subsection', submenu: [
        { id: 'dishes', label: 'Restaurante', icon: UtensilsCrossed, module: 'dishes' },
        { id: 'categories', label: 'Categorias', icon: Layers, module: 'dishes' },
        { id: 'complements', label: 'Complementos', icon: Grid3x3, module: 'dishes' },
      ]},
      { id: 'pizza_config', label: 'Pizzas', icon: Pizza, module: 'pizza_config' },
      { id: 'promotions', label: 'Promoções', icon: Megaphone, module: 'promotions' },
      { id: 'coupons', label: 'Cupons', icon: Ticket, module: 'coupons' },
    ]
  },

  // 🚚 DELIVERY
  {
    id: 'delivery',
    label: '🚚 DELIVERY',
    icon: MapPin,
    section: 'section',
    submenu: [
      { id: 'delivery_zones', label: 'Zonas de Entrega', icon: MapPin, module: 'delivery_zones' },
      { id: 'payments', label: 'Métodos de Pagamento', icon: CreditCard, module: 'payments' },
    ]
  },

  // ⚙️ SISTEMA
  {
    id: 'sistema',
    label: '⚙️ SISTEMA',
    icon: Settings,
    section: 'section',
    submenu: [
      { id: 'store', label: 'Loja', icon: Store, module: 'store' },
      { id: 'theme', label: 'Tema', icon: Palette, module: 'theme' },
      { id: 'printer', label: 'Impressora', icon: Printer, module: 'printer' },
    ]
  }
];

export default function AdminSidebar({ activeTab, setActiveTab, isMaster = false, permissions = {}, collapsed, setCollapsed, onClose }) {
  const [expandedGroups, setExpandedGroups] = useState({
    gestao: true,
    operacao: true,
    cardapio: true,
    restaurante_grp: true,
    delivery: true,
    sistema: true
  });

  // ✅ CORREÇÃO: Blindado com Array.isArray
  const hasModuleAccess = (module) => {
    if (isMaster) return true;
    if (!permissions || typeof permissions !== 'object') return false;
    
    const modulePerms = permissions[module];
    return Array.isArray(modulePerms) && modulePerms.length > 0;
  };


  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const getLeafItems = (it) => {
    if (!it.submenu) return [];
    return it.submenu.flatMap(s =>
      s.section === 'subsection'
        ? (s.submenu || []).filter(x => x.module && hasModuleAccess(x.module))
        : (s.module && hasModuleAccess(s.module) ? [s] : [])
    );
  };

  const renderMenuItem = (item, isSubmenu = false) => {
    if (item.masterOnly && !isMaster) return null;
    if (item.module && !hasModuleAccess(item.module)) return null;

    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const indent = isSubmenu ? 'pl-6' : 'pl-3';
    const isSectionOrSub = (item.section === 'section' || item.section === 'subsection') && item.submenu;

    if (isSectionOrSub) {
      const isExpanded = expandedGroups[item.id];
      const visibleSubmenu = item.submenu.filter(sub => {
        if (sub.section === 'subsection')
          return (sub.submenu || []).some(s => s.module && hasModuleAccess(s.module));
        return sub.module && hasModuleAccess(sub.module);
      });
      if (visibleSubmenu.length === 0) return null;

      return (
        <div key={item.id} className="mb-4">
          <button
            onClick={() => toggleGroup(item.id)}
            className={cn(
              "w-full flex items-center justify-between gap-2 px-2 py-2 text-xs font-bold transition-colors",
              item.section === 'subsection' ? "text-gray-600 hover:text-gray-800" : "text-gray-500 hover:text-gray-300 uppercase tracking-wider"
            )}
          >
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && (
              <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded ? "transform rotate-180" : "")} />
            )}
          </button>
          {!collapsed && isExpanded && (
            <div className="mt-1 space-y-0.5">
              {visibleSubmenu.map(sub => renderMenuItem(sub, true))}
            </div>
          )}
          {collapsed && (
            <div className="flex flex-col gap-0.5">
              {getLeafItems(item).map(leaf => {
                const LeafIcon = leaf.icon;
                const active = activeTab === leaf.id;
                return (
                  <button key={leaf.id} onClick={() => { setActiveTab(leaf.id); onClose?.(); }} className="p-2 rounded-lg flex items-center justify-center" style={{ backgroundColor: active ? '#f97316' : 'transparent', color: active ? '#fff' : 'var(--text-secondary)' }} title={leaf.label}>
                    <LeafIcon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => {
          setActiveTab(item.id);
          if (onClose) onClose();
        }}
        className={cn(
          "w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          indent
        )}
        style={isActive ? { 
          backgroundColor: '#f97316', 
          color: '#ffffff' 
        } : { 
          color: 'var(--text-secondary)' 
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
      >
        <Icon className={cn(
          "w-4 h-4 flex-shrink-0",
          isActive ? "text-white" : "text-gray-500"
        )} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </button>
    );
  };

  return (
    <aside className={cn(
      "border-r flex flex-col transition-all duration-300 h-full lg:relative bg-white dark:bg-gray-900",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header — só botões; logo/info só no header superior do Admin */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end">
        <div className="flex items-center gap-1">
          {!collapsed && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {MENU_STRUCTURE.map(item => renderMenuItem(item))}
      </nav>
    </aside>
  );
}