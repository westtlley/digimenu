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
  Wallet,
  MessageCircle,
  Settings,
  TrendingUp,
  BarChart3,
  Layers,
  LayoutGrid,
  Pizza,
  Package,
  FileText,
  Receipt,
  QrCode,
  Sparkles,
  UserCog,
  Key,
  Shield,
  Wine
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient as base44 } from '@/api/apiClient';

/**
 * Estrutura de menu padronizada e profissional
 * Categorias organizadas logicamente
 */
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
      { id: 'inventory', label: 'Gestão de Estoque', icon: Package, module: 'inventory' },
    ]
  },

  // 🍽️ CARDÁPIO
  {
    id: 'cardapio',
    label: '🍽️ CARDÁPIO',
    icon: UtensilsCrossed,
    section: 'section',
    submenu: [
      { id: 'restaurante_grp', label: 'Restaurante', icon: UtensilsCrossed, section: 'subsection', submenu: [
        { id: 'dishes', label: 'Pratos', icon: UtensilsCrossed, module: 'dishes' },
        { id: 'categories', label: 'Categorias', icon: Layers, module: 'dishes' },
        { id: 'complements', label: 'Complementos', icon: LayoutGrid, module: 'dishes' },
      ]},
      { id: 'pizza_config', label: 'Pizzaria', icon: Pizza, module: 'pizza_config' },
      { id: 'beverages', label: 'Bebidas', icon: Wine, module: 'dishes' },
    ]
  },

  // 🧑‍🍳 GARÇOM
  {
    id: 'garcom',
    label: '🧑‍🍳 GARÇOM',
    icon: Receipt,
    section: 'section',
    submenu: [
      { id: 'comandas', label: 'Comandas', icon: Receipt, module: 'comandas' },
      { id: 'tables', label: 'Mesas e QR Code', icon: QrCode, module: 'tables' },
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
      { id: 'colaboradores', label: 'Colaboradores', icon: UserCog, module: 'colaboradores' },
      { id: '2fa', label: 'Autenticação 2FA', icon: Key, module: '2fa' },
      { id: 'lgpd', label: 'Conformidade LGPD', icon: Shield, module: 'lgpd' },
    ]
  },

  // 💰 MARKETING
  {
    id: 'marketing',
    label: '💰 MARKETING',
    icon: TrendingUp,
    section: 'section',
    submenu: [
      { id: 'promotions', label: 'Promoções', icon: Megaphone, module: 'promotions' },
      { id: 'coupons', label: 'Cupons', icon: Ticket, module: 'coupons' },
      { id: 'affiliates', label: 'Programa de Afiliados', icon: Users, module: 'affiliates' },
    ]
  }
];

export default function SharedSidebar({ 
  activeTab, 
  setActiveTab, 
  isMaster = false, 
  permissions = {}, 
  plan,
  collapsed, 
  setCollapsed, 
  onClose,
  showStoreLogo = true
}) {
  const [expandedGroups, setExpandedGroups] = useState({
    gestao: true,
    operacao: true,
    cardapio: true,
    restaurante_grp: true,
    garcom: true, // Seção GARÇOM (Comandas e Mesas)
    delivery: true,
    sistema: true,
    marketing: true // Seção MARKETING (Promoções, Cupons, Afiliados)
  });

  // Buscar dados da loja para mostrar logo
  const { data: stores = [] } = useQuery({
    queryKey: ['store'],
    queryFn: () => base44.entities.Store.list(),
    enabled: showStoreLogo,
  });

  const store = stores[0];

  const hasModuleAccess = (module) => {
    if (isMaster) return true;
    
    // Módulos especiais que não dependem de permissões
    if (module === 'colaboradores') return ['premium', 'pro'].includes((plan || '').toLowerCase());
    
    // Novos módulos avançados - disponíveis para todos os planos pagos
    if (['affiliates', 'lgpd', '2fa', 'tables', 'inventory'].includes(module)) {
      const planLower = (plan || '').toLowerCase();
      return ['basic', 'pro', 'premium', 'ultra'].includes(planLower);
    }
    
    if (!permissions || typeof permissions !== 'object') return false;
    
    const modulePerms = permissions[module];
    return Array.isArray(modulePerms) && modulePerms.length > 0;
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const hideDishesBasicPizzas = (sub) =>
    plan === 'basic' && sub.id === 'dishes' && hasModuleAccess('pizza_config');

  const getLeafItems = (it) => {
    if (!it.submenu) return [];
    return it.submenu.flatMap(s =>
      s.section === 'subsection'
        ? (s.submenu || []).filter(x => x.module && hasModuleAccess(x.module) && !hideDishesBasicPizzas(x))
        : (s.module && hasModuleAccess(s.module) && !hideDishesBasicPizzas(s) ? [s] : [])
    );
  };

  const renderMenuItem = (item, isSubmenu = false) => {
    if (item.module && !hasModuleAccess(item.module)) {
      if (!item.submenu) return null;
      const hasAny = item.submenu.some(s => s.section === 'subsection' ? (s.submenu || []).some(x => x.module && hasModuleAccess(x.module)) : (s.module && hasModuleAccess(s.module)));
      if (!hasAny) return null;
    } else if (!item.module && !item.submenu) return null;

    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const indent = isSubmenu ? 'pl-6' : 'pl-3';
    const isSectionOrSub = (item.section === 'section' || item.section === 'subsection') && item.submenu;

    if (isSectionOrSub) {
      const isExpanded = expandedGroups[item.id];
      const visibleSubmenu = (item.submenu || []).filter(sub => {
        if (sub.section === 'subsection')
          return (sub.submenu || []).some(s => s.module && hasModuleAccess(s.module) && !hideDishesBasicPizzas(s));
        return sub.module && hasModuleAccess(sub.module) && !hideDishesBasicPizzas(sub);
      });
      if (visibleSubmenu.length === 0) return null;

      return (
        <div key={item.id} className="mb-4">
          <button
            onClick={() => toggleGroup(item.id)}
            className={cn(
              "w-full flex items-center justify-between gap-2 px-2 py-2 text-xs font-bold transition-colors",
              item.section === 'subsection' ? "text-gray-600 hover:text-gray-800 dark:text-gray-300" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 uppercase tracking-wider"
            )}
          >
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded ? "transform rotate-180" : "")} />}
          </button>
          {!collapsed && isExpanded && (
            <div className="mt-1 space-y-0.5">
              {visibleSubmenu.filter(sub => sub.id !== item.id).map(sub => renderMenuItem(sub, true))}
            </div>
          )}
          {collapsed && (
            <div className="flex flex-col gap-0.5">
              {getLeafItems(item).map(leaf => {
                const LeafIcon = leaf.icon;
                const active = activeTab === leaf.id;
                return (
                  <button key={leaf.id} onClick={() => { setActiveTab(leaf.id); onClose?.(); }} className={cn("p-2 rounded-lg flex items-center justify-center", active ? "bg-orange-500 text-white" : "text-gray-500 dark:text-gray-400")} title={leaf.label}>
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
          "w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          indent,
          isActive 
            ? "bg-orange-500 text-white shadow-md" 
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        )}
      >
        <Icon className={cn(
          "w-4 h-4 flex-shrink-0",
          isActive ? "text-white" : "text-gray-500 dark:text-gray-400"
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
      {/* Header do Sidebar com Logo */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        {!collapsed && showStoreLogo && store?.logo && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700">
              <img 
                src={store.logo} 
                alt={store.name || 'Loja'} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = 'flex';
                  }
                }}
              />
              <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center hidden">
                <Store className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                {store.name || 'Minha Loja'}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                Painel Admin
              </p>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-1">
          {!collapsed && (
<button
            onClick={onClose}
            className="lg:hidden min-h-touch min-w-touch flex items-center justify-center p-2 -m-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
            aria-label="Fechar menu"
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
      
      {/* Menu de Navegação */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {MENU_STRUCTURE.map(item => renderMenuItem(item))}
      </nav>

      {/* Footer do Sidebar - Informações da Loja */}
      {!collapsed && store && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <p className="text-xs font-semibold text-orange-900 dark:text-orange-200">Status da Loja</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                store.is_open ? "bg-green-500" : "bg-red-500"
              )} />
              <p className="text-xs text-orange-700 dark:text-orange-300">
                {store.is_open ? 'Aberta' : 'Fechada'}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
