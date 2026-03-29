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
  ShieldCheck,
  Wine
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient as base44 } from '@/api/apiClient';
import { createPageUrl } from '@/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import LanguageSelector from '@/components/i18n/LanguageSelector';

/**
 * Estrutura de menu padronizada e profissional
 * Categorias organizadas logicamente
 */
const MENU_STRUCTURE = [
  // GESTÃƒO
  {
    id: 'gestao',
    label: 'GESTÃƒO',
    icon: BarChart3,
    section: 'section',
    submenu: [
      { id: 'dashboard', label: 'Dashboard', icon: Home, module: 'dashboard' },
      { id: 'financial', label: 'Financeiro', icon: DollarSign, module: 'financial' },
      { id: 'caixa', label: 'Caixa', icon: Wallet, module: 'caixa' },
    ]
  },

  // OPERAÃ‡ÃƒO
  {
    id: 'operacao',
    label: 'OPERAÃ‡ÃƒO',
    icon: ClipboardList,
    section: 'section',
    submenu: [
      { id: 'orders', label: 'Gestor de Pedidos', icon: ClipboardList, module: 'orders' },
      { id: 'history', label: 'HistÃ³rico de Pedidos', icon: History, module: 'history' },
      { id: 'clients', label: 'Clientes', icon: Users, module: 'clients' },
      { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, module: 'whatsapp' },
      { id: 'inventory', label: 'GestÃ£o de Estoque', icon: Package, module: 'inventory' },
    ]
  },

  // CARDÃPIO
  {
    id: 'cardapio',
    label: 'CARDÃPIO',
    icon: UtensilsCrossed,
    section: 'section',
    submenu: [
      { id: 'dishes', label: 'Restaurante', icon: UtensilsCrossed, module: 'dishes' },
      { id: 'pizza_config', label: 'Pizzaria', icon: Pizza, module: 'pizza_config' },
      { id: 'beverages', label: 'Bebidas', icon: Wine, module: 'dishes' },
    ]
  },

  // GARÃ‡OM
  {
    id: 'garcom',
    label: 'GARÃ‡OM',
    icon: Receipt,
    section: 'section',
    submenu: [
      { id: 'garcom_app', label: 'App do GarÃ§om', icon: UserCog, module: 'garcom', external: true, to: 'Garcom' },
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
      { id: 'payments', label: 'MÃ©todos de Pagamento', icon: CreditCard, module: 'payments' },
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
      { id: '2fa', label: 'AutenticaÃ§Ã£o 2FA', icon: Key, module: '2fa' },
      { id: 'managerial_auth', label: 'AutorizaÃ§Ã£o Gerencial', icon: ShieldCheck, module: 'managerial_auth' },
      { id: 'lgpd', label: 'Conformidade LGPD', icon: Shield, module: 'lgpd' },
    ]
  },

  // MARKETING
  {
    id: 'marketing',
    label: 'MARKETING',
    icon: TrendingUp,
    section: 'section',
    submenu: [
      { id: 'promotions', label: 'PromoÃ§Ãµes', icon: Megaphone, module: 'promotions' },
      { id: 'coupons', label: 'Cupons', icon: Ticket, module: 'coupons' },
      { id: 'affiliates', label: 'Programa de Afiliados', icon: Users, module: 'affiliates' },
    ]
  }
];

export default function SharedSidebar({ 
  activeTab, 
  setActiveTab, 
  isMaster = false,
  isGerente = false,
  permissions = {}, 
  plan,
  collapsed, 
  setCollapsed, 
  onClose,
  showStoreLogo = true,
  slug = null,
  /** Store do estabelecimento (slug) â€” evita misturar com loja do usuÃ¡rio logado */
  store: storeProp = null,
  /** Item extra no topo do menu (ex.: { id: 'meu_perfil', label: 'Meu perfil', icon: User }) para Painel do Gerente */
  extraTopItem = null
}) {
  const { t } = useLanguage();
  const [expandedGroups, setExpandedGroups] = useState({
    gestao: true,
    operacao: true,
    cardapio: true,
    garcom: true, // SeÃ§Ã£o GARÃ‡OM (Comandas e Mesas)
    delivery: true,
    sistema: true,
    marketing: true // SeÃ§Ã£o MARKETING (PromoÃ§Ãµes, Cupons, Afiliados)
  });

  // Usar store passado pelo pai (contexto correto) ou buscar
  const { data: stores = [] } = useQuery({
    queryKey: ['store'],
    queryFn: () => base44.entities.Store.list(),
    enabled: showStoreLogo && !storeProp,
  });

  const store = storeProp ?? stores[0];
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
    managerial_auth: t('navigation.items.managerialAuth', 'Autorização Gerencial'),
    lgpd: t('navigation.items.lgpd', 'Conformidade LGPD'),
    promotions: t('navigation.items.promotions', 'Promoções'),
    coupons: t('navigation.items.coupons', 'Cupons'),
    affiliates: t('navigation.items.affiliates', 'Programa de Afiliados'),
  };
  const resolveMenuLabel = (item) => menuLabelById[item?.id] || item?.label;
  const sidebarSubtitle = isMaster
    ? t('navigation.subtitles.master', 'Administração Master')
    : isGerente
      ? t('navigation.subtitles.manager', 'Painel do Gerente')
      : t('navigation.subtitles.subscriber', 'Painel do Assinante');

  const hasModuleAccess = (module) => {
    if (isMaster) return true;

    // âœ… Backend Ã© a Ãºnica fonte de verdade para permissÃµes (jÃ¡ filtradas por plano)
    if (permissions && typeof permissions === 'object') {
      const modulePerms = permissions[module];
      if (Array.isArray(modulePerms) && modulePerms.length > 0) return true;
    }
    
    return false;
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Plano BÃ¡sico: mostrar sÃ³ Restaurante OU Pizzaria (nunca os dois)
  const hideDishesBasicPizzas = (sub) =>
    plan === 'basic' && sub.id === 'dishes' && hasModuleAccess('pizza_config');
  const hidePizzaConfigBasicRestaurant = (sub) =>
    plan === 'basic' && sub.id === 'pizza_config' && hasModuleAccess('dishes') && !hasModuleAccess('pizza_config');

  const getLeafItems = (it) => {
    if (!it.submenu) return [];
    return it.submenu.flatMap(s =>
      s.section === 'subsection'
        ? (s.submenu || []).filter(x => x.module && hasModuleAccess(x.module) && !hideDishesBasicPizzas(x) && !hidePizzaConfigBasicRestaurant(x))
        : (s.module && hasModuleAccess(s.module) && !hideDishesBasicPizzas(s) && !hidePizzaConfigBasicRestaurant(s) ? [s] : [])
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
          return (sub.submenu || []).some(s => s.module && hasModuleAccess(s.module) && !hideDishesBasicPizzas(s) && !hidePizzaConfigBasicRestaurant(s));
        return sub.module && hasModuleAccess(sub.module) && !hideDishesBasicPizzas(sub) && !hidePizzaConfigBasicRestaurant(sub);
      });
      if (visibleSubmenu.length === 0) return null;

      return (
        <div key={item.id} className="mb-4">
          <button
            onClick={() => toggleGroup(item.id)}
            className={cn(
              "w-full flex items-center justify-between gap-2 px-2 py-2 text-xs font-bold transition-colors",
              item.section === 'subsection' ? "text-foreground/80 hover:text-foreground" : "text-muted-foreground hover:text-foreground uppercase tracking-wider"
            )}
          >
            {!collapsed && <span>{resolveMenuLabel(item)}</span>}
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
                  <button key={leaf.id} onClick={() => { setActiveTab(leaf.id); onClose?.(); }} className={cn("p-2 rounded-lg flex items-center justify-center transition-colors", active ? "bg-accent text-primary" : "text-muted-foreground hover:bg-accent")} title={resolveMenuLabel(leaf)} aria-label={resolveMenuLabel(leaf)}>
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
            "w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            indent,
            "text-foreground hover:bg-accent"
          )}
        >
          <Icon className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
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
      {/* Header do Sidebar com Logo */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        {!collapsed && showStoreLogo && store?.logo && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-border">
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
              <p className="text-xs font-semibold text-foreground truncate">
                {store.name || 'Minha Loja'}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {sidebarSubtitle}
              </p>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-1">
          {!collapsed && (
            <button
              onClick={onClose}
              className="lg:hidden min-h-touch min-w-touch flex items-center justify-center p-2 -m-1 rounded-lg hover:bg-accent text-muted-foreground"
              aria-label={t('navigation.closeMenu', 'Fechar menu')}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
            aria-label={collapsed ? t('navigation.expandMenu', 'Expandir menu') : t('navigation.collapseMenu', 'Recolher menu')}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {/* Menu de NavegaÃ§Ã£o */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {extraTopItem && (() => {
          const ItemIcon = extraTopItem.icon;
          const isActive = activeTab === extraTopItem.id;
          return (
            <div className="mb-4">
          <button
            type="button"
            onClick={() => { setActiveTab(extraTopItem.id); onClose?.(); }}
            title={extraTopItem.label}
            className={cn(
              "w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-accent border-l-2 border-primary text-accent-foreground pl-2"
                : "text-foreground hover:bg-accent border-l-2 border-transparent pl-2"
            )}
          >
            <ItemIcon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                {!collapsed && <span className="truncate">{extraTopItem.label}</span>}
              </button>
            </div>
          );
        })()}
        {MENU_STRUCTURE.map(item => renderMenuItem(item))}
      </nav>

      {/* Footer do Sidebar - Status da Loja */}
      {!collapsed && store && (
        <div className="p-3 border-t border-border">
          <div className="bg-card rounded-lg p-3 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-foreground">{t('navigation.storeStatusTitle', 'Status da loja')}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full shrink-0",
                store.is_open ? "bg-green-500" : "bg-destructive"
              )} />
              <p className="text-xs text-muted-foreground">
                {store.is_open ? t('navigation.storeOpen', 'Aberta') : t('navigation.storeClosed', 'Fechada')}
              </p>
            </div>
          </div>
          <LanguageSelector className="mt-3" />
        </div>
      )}
    </aside>
  );
}

