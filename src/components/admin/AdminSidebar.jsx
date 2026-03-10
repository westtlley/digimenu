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
      { id: 'dishes', label: 'Restaurante', icon: UtensilsCrossed, module: 'dishes' },
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
      { id: 'garcom_app', label: 'App do Garçom', icon: UserCog, module: 'garcom', external: true, to: 'Garcom' },
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
      { id: 'service_requests', label: 'Solicitações', icon: Bell, masterOnly: true },
      { id: 'pagina_assinar', label: 'Editar Página de Vendas', icon: Layout, masterOnly: true },
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

export default function AdminSidebar({ activeTab, setActiveTab, isMaster = false, permissions = {}, plan, subscriberData, collapsed, setCollapsed, onClose, slug = null }) {
  const [expandedGroups, setExpandedGroups] = useState({
    gestao: true,
    operacao: true,
    cardapio: true,
    garcom: true, // Seção GARÇOM (Comandas e Mesas)
    delivery: true,
    sistema: true,
    marketing: true // Seção MARKETING (Promoções, Cupons, Afiliados)
  });

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
            {!collapsed && <span>{item.label}</span>}
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
                  <button key={leaf.id} onClick={() => { setActiveTab(leaf.id); onClose?.(); }} className="p-2 rounded-lg flex items-center justify-center" style={{ backgroundColor: active ? 'hsl(var(--primary))' : 'transparent', color: active ? 'hsl(var(--primary-foreground))' : 'var(--text-secondary)' }} title={leaf.label}>
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
          {!collapsed && <span className="truncate">{item.label}</span>}
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
        className={cn(
          "w-full flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
          indent
        )}
        style={isActive ? { 
          backgroundColor: 'hsl(var(--primary))', 
          color: 'hsl(var(--primary-foreground))' 
        } : { 
          color: 'var(--text-secondary)' 
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary, rgba(148,163,184,0.16))';
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
          isActive ? "text-current" : "text-muted-foreground"
        )} />
        {!collapsed && <span className="truncate">{item.label}</span>}
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
              aria-label="Fechar menu"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block p-1.5 rounded-lg hover:bg-muted/70 text-muted-foreground"
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
