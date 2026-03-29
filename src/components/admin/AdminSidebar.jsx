import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  Pizza,
  Layout,
  Receipt,
  Bell,
  Wine,
  Package,
  UserCog,
  Key,
  Shield,
  ShieldCheck
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import LanguageSelector from '@/components/i18n/LanguageSelector';

const MENU_STRUCTURE = [
  // GESTÃO
  {
    id: 'gestao',
    label: 'GESTÃO',
    icon: BarChart3,
    section: 'section',
    submenu: [
      { id: 'dashboard', label: 'Dashboard', icon: Home, module: 'dashboard' },
      { id: 'financial', label: 'Financeiro', icon: DollarSign, module: 'financial' },
      { id: 'caixa', label: 'Caixa', icon: Wallet, module: 'caixa' },
    ]
  },

  // OPERAÇÃO
  {
    id: 'operacao',
    label: 'OPERAÇÃO',
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

  // CARDÁPIO
  {
    id: 'cardapio',
    label: 'CARDÁPIO',
    icon: UtensilsCrossed,
    section: 'section',
    submenu: [
      { id: 'dishes', label: 'Restaurante', icon: UtensilsCrossed, module: 'dishes' },
      { id: 'pizza_config', label: 'Pizzaria', icon: Pizza, module: 'pizza_config' },
      { id: 'beverages', label: 'Bebidas', icon: Wine, module: 'dishes' },
    ]
  },

  // GARÇOM
  {
    id: 'garcom',
    label: 'GARÇOM',
    icon: Receipt,
    section: 'section',
    submenu: [
      { id: 'garcom_app', label: 'App do Garçom', icon: UserCog, module: 'garcom', external: true, to: 'Garcom' },
      { id: 'comandas', label: 'Comandas', icon: Receipt, module: 'comandas' },
      { id: 'tables', label: 'Mesas e QR Code', icon: QrCode, module: 'tables' },
    ]
  },

  // DELIVERY
  {
    id: 'delivery',
    label: 'DELIVERY',
    icon: MapPin,
    section: 'section',
    submenu: [
      { id: 'delivery_zones', label: 'Zonas de Entrega', icon: MapPin, module: 'delivery_zones' },
      { id: 'payments', label: 'Métodos de Pagamento', icon: CreditCard, module: 'payments' },
    ]
  },

  // SISTEMA
  {
    id: 'sistema',
    label: 'SISTEMA',
    icon: Settings,
    section: 'section',
    submenu: [
      { id: 'store', label: 'Loja', icon: Store, module: 'store' },
      { id: 'theme', label: 'Tema', icon: Palette, module: 'theme' },
      { id: 'printer', label: 'Impressora', icon: Printer, module: 'printer' },
      { id: 'colaboradores', label: 'Colaboradores', icon: UserCog, module: 'colaboradores' },
      { id: '2fa', label: 'Autenticação 2FA', icon: Key, module: '2fa' },
      { id: 'lgpd', label: 'Conformidade LGPD', icon: Shield, module: 'lgpd' },
      { id: 'service_requests', label: 'Solicitações', icon: Bell, masterOnly: true },
      { id: 'pagina_assinar', label: 'Editar Página de Vendas', icon: Layout, masterOnly: true },
    ]
  },

  // MARKETING
  {
    id: 'marketing',
    label: 'MARKETING',
    icon: TrendingUp,
    section: 'section',
    submenu: [
      { id: 'promotions', label: 'Promoções', icon: Megaphone, module: 'promotions' },
      { id: 'coupons', label: 'Cupons', icon: Ticket, module: 'coupons' },
      { id: 'affiliates', label: 'Programa de Afiliados', icon: Users, module: 'affiliates' },
    ]
  }
];

export default function AdminSidebar({ activeTab, setActiveTab, isMaster = false, permissions = {}, plan, subscriberData, collapsed, setCollapsed, onClose, slug = null }) {
  const { t } = useLanguage();
  const [expandedGroups, setExpandedGroups] = useState({
    gestao: true,
    operacao: true,
    cardapio: true,
    garcom: true, // Seção GARÇOM (Comandas e Mesas)
    delivery: true,
    sistema: true,
    marketing: true // Seção MARKETING (Promoções, Cupons, Afiliados)
  });
  const menuLabelById = {
    gestao: t('navigation.sections.management', 'Gestão').toUpperCase(),
    operacao: t('navigation.sections.operation', 'Operação').toUpperCase(),
    cardapio: t('navigation.sections.menu', 'Cardápio').toUpperCase(),
    garcom: t('navigation.sections.waiter', 'Garçom').toUpperCase(),
    delivery: t('navigation.sections.delivery', 'Delivery').toUpperCase(),
    sistema: t('navigation.sections.system', 'Sistema').toUpperCase(),
    marketing: t('navigation.sections.marketing', 'Marketing').toUpperCase(),
    dashboard: t('navigation.items.dashboard', 'Dashboard'),
    financial: t('navigation.items.financial', 'Financeiro'),
    caixa: t('navigation.items.cashRegister', 'Caixa'),
    orders: t('navigation.items.orderManager', 'Gestor de Pedidos'),
    history: t('navigation.items.orderHistory', 'Histórico de Pedidos'),
    clients: t('navigation.items.clients', 'Clientes'),
    whatsapp: t('navigation.items.whatsapp', 'WhatsApp'),
    inventory: t('navigation.items.inventory', 'Gestão de Estoque'),
    dishes: t('navigation.items.restaurant', 'Restaurante'),
    pizza_config: t('navigation.items.pizza', 'Pizzaria'),
    beverages: t('navigation.items.beverages', 'Bebidas'),
    garcom_app: t('navigation.items.waiterApp', 'App do Garçom'),
    comandas: t('navigation.items.tabs', 'Comandas'),
    tables: t('navigation.items.tables', 'Mesas e QR Code'),
    delivery_zones: t('navigation.items.deliveryZones', 'Zonas de Entrega'),
    payments: t('navigation.items.paymentMethods', 'Métodos de Pagamento'),
    store: t('navigation.items.store', 'Loja'),
    theme: t('navigation.items.theme', 'Tema'),
    printer: t('navigation.items.printer', 'Impressora'),
    colaboradores: t('navigation.items.team', 'Colaboradores'),
    '2fa': t('navigation.items.auth2fa', 'Autenticação 2FA'),
    lgpd: t('navigation.items.lgpd', 'Conformidade LGPD'),
    service_requests: t('navigation.items.serviceRequests', 'Solicitações'),
    pagina_assinar: t('navigation.items.salesPage', 'Editar Página de Vendas'),
    promotions: t('navigation.items.promotions', 'Promoções'),
    coupons: t('navigation.items.coupons', 'Cupons'),
    affiliates: t('navigation.items.affiliates', 'Programa de Afiliados'),
  };
  const resolveMenuLabel = (item) => menuLabelById[item?.id] || item?.label;

  // ✅ Backend é a única fonte de verdade para permissões
  const hasModuleAccess = (module) => {
    if (isMaster) return true;
    
    // Verificar permissões do backend (já filtradas por plano no getUserContext)
    if (permissions && typeof permissions === 'object') {
      const modulePerms = permissions[module];
      if (Array.isArray(modulePerms) && modulePerms.length > 0) return true;
    }
    
    return false;
  };


  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const getLeafItems = (it) => {
    if (!it.submenu) return [];
    return it.submenu.flatMap(s => {
      if (s.section === 'subsection')
        return (s.submenu || []).filter(x => x.module && hasModuleAccess(x.module));
      return (s.module && hasModuleAccess(s.module)) || (s.masterOnly && isMaster) ? [s] : [];
    });
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
      const visibleSubmenu = (item.submenu || []).filter(sub => {
        // Verificar minPlan primeiro
        if (sub.minPlan && !isMaster) {
          const currentPlan = (plan || 'basic').toString().toLowerCase();
          const planOrder = { 'free': 0, 'basic': 1, 'pro': 2, 'ultra': 3 };
          const minPlanLevel = planOrder[sub.minPlan] || 0;
          const currentPlanLevel = planOrder[currentPlan] || 0;
          if (currentPlanLevel < minPlanLevel) return false;
        }
        
        if (sub.section === 'subsection')
          return (sub.submenu || []).some(s => s.module && hasModuleAccess(s.module));
        return (sub.module && hasModuleAccess(sub.module)) || (sub.masterOnly && isMaster);
      });
      if (visibleSubmenu.length === 0) return null;

      return (
        <div key={item.id} className="mb-4">
          <button
            onClick={() => toggleGroup(item.id)}
            className={cn(
              "w-full flex items-center justify-between gap-2 px-2 py-2 text-xs font-bold transition-colors",
              item.section === 'subsection' ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground hover:text-foreground uppercase tracking-wider"
            )}
          >
            {!collapsed && <span>{resolveMenuLabel(item)}</span>}
            {!collapsed && (
              <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded ? "transform rotate-180" : "")} />
            )}
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
                  <button
                    key={leaf.id}
                    onClick={() => { setActiveTab(leaf.id); onClose?.(); }}
                    className={cn(
                      "p-2 rounded-lg flex items-center justify-center transition-colors",
                      active ? "bg-accent text-primary" : "text-muted-foreground hover:bg-accent"
                    )}
                    title={resolveMenuLabel(leaf)}
                    aria-label={resolveMenuLabel(leaf)}
                  >
                    <LeafIcon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Se for link externo, usar Link do react-router
    if (item.external && item.to) {
      const linkUrl = createPageUrl(item.to, slug);
      return (
        <Link
          key={item.id}
          to={linkUrl}
          onClick={() => {
            if (onClose) onClose();
          }}
          className={cn(
            "w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            indent,
            "text-foreground hover:bg-muted/70"
          )}
        >
          <Icon className={cn(
            "w-4 h-4 flex-shrink-0",
            "text-muted-foreground"
          )} />
          {!collapsed && <span className="truncate">{resolveMenuLabel(item)}</span>}
        </Link>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => {
          setActiveTab(item.id);
          if (onClose) onClose();
        }}
        title={resolveMenuLabel(item)}
        aria-label={resolveMenuLabel(item)}
        className={cn(
          "w-full flex items-center gap-3 py-2.5 rounded-r-lg text-sm font-medium transition-all duration-200 border-l-2 pl-2",
          indent,
          isActive
            ? "bg-accent border-primary text-accent-foreground"
            : "border-transparent text-foreground hover:bg-accent"
        )}
      >
        <Icon className={cn(
          "w-4 h-4 flex-shrink-0",
          isActive ? "text-primary" : "text-muted-foreground"
        )} />
        {!collapsed && <span className="truncate">{resolveMenuLabel(item)}</span>}
      </button>
    );
  };

  return (
    <aside className={cn(
      "border-r border-border flex flex-col transition-all duration-300 h-full lg:relative bg-card",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header — só botões; logo/info só no header superior do Admin */}
      <div className="p-3 border-b border-border flex items-center justify-end">
        <div className="flex items-center gap-1">
          {!collapsed && (
            <button
              onClick={onClose}
              className="lg:hidden min-h-touch min-w-touch flex items-center justify-center p-2 -m-1 rounded-lg hover:bg-muted/70 text-muted-foreground"
              aria-label={t('navigation.closeMenu', 'Fechar menu')}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block p-1.5 rounded-lg hover:bg-muted/70 text-muted-foreground"
            aria-label={collapsed ? t('navigation.expandMenu', 'Expandir menu') : t('navigation.collapseMenu', 'Recolher menu')}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {MENU_STRUCTURE.map(item => renderMenuItem(item))}
      </nav>

      {!collapsed && (
        <div className="border-t border-border p-3">
          <LanguageSelector compact />
        </div>
      )}
    </aside>
  );
}
