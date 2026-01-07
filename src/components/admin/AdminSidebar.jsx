import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import { usePermission } from '../permissions/usePermission';
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
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'financial', label: 'Financeiro', icon: DollarSign },
      { id: 'caixa', label: 'Caixa', icon: Wallet },
      { id: 'graficos', label: 'Gráficos', icon: TrendingUp },
    ]
  },

  // 🧾 OPERAÇÃO
  {
    id: 'operacao',
    label: '🧾 OPERAÇÃO',
    icon: ClipboardList,
    section: 'section',
    submenu: [
      { id: 'orders', label: 'Gestor de Pedidos', icon: ClipboardList },
      { id: 'history', label: 'Histórico de Pedidos', icon: History },
      { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    ]
  },

  // 🍔 CARDÁPIO
  {
    id: 'cardapio',
    label: '🍔 CARDÁPIO',
    icon: UtensilsCrossed,
    section: 'section',
    submenu: [
      { id: 'dishes', label: 'Pratos', icon: UtensilsCrossed },
      { id: 'categories', label: 'Categorias', icon: Layers },
      { id: 'complements', label: 'Complementos', icon: Grid3x3 },
      { id: 'pizza_config', label: 'Pizzas', icon: Pizza },
      { id: 'promotions', label: 'Promoções', icon: Megaphone },
      { id: 'coupons', label: 'Cupons', icon: Ticket },
    ]
  },

  // 🚚 DELIVERY
  {
    id: 'delivery',
    label: '🚚 DELIVERY',
    icon: MapPin,
    section: 'section',
    submenu: [
      { id: 'delivery_zones', label: 'Zonas de Entrega', icon: MapPin },
      { id: 'payments', label: 'Métodos de Pagamento', icon: CreditCard },
    ]
  },

  // ⚙️ SISTEMA
  {
    id: 'sistema',
    label: '⚙️ SISTEMA',
    icon: Settings,
    section: 'section',
    submenu: [
      { id: 'store', label: 'Loja', icon: Store },
      { id: 'theme', label: 'Tema', icon: Palette },
      { id: 'printer', label: 'Impressora', icon: Printer },
      { id: 'mais', label: 'Mais Funcionalidades', icon: Plus },
    ]
  }
];

export default function AdminSidebar({ activeTab, setActiveTab, isMaster = false, permissions = {}, collapsed, setCollapsed, onClose }) {
  const [expandedGroups, setExpandedGroups] = useState({
    gestao: true,
    operacao: true,
    cardapio: true,
    delivery: true,
    sistema: true
  });

  const hasModuleAccess = (module) => {
    if (isMaster) return true;
    if (!permissions || !permissions[module]) return false;
    return permissions[module].length > 0;
  };


  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const renderMenuItem = (item, isSubmenu = false) => {
    if (item.masterOnly && !isMaster) return null;
    
    // Verificar acesso ao módulo baseado em permissões
    if (!hasModuleAccess(item.id)) return null;

    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const indent = isSubmenu ? 'pl-6' : 'pl-3';

    if (item.section === 'section' && item.submenu) {
      const isExpanded = expandedGroups[item.id];
      
      // Filtrar submenus baseado em permissões
      const visibleSubmenu = item.submenu.filter(subItem => hasModuleAccess(subItem.id));

      
      // Se nenhum submenu visível, não mostrar o grupo
      if (visibleSubmenu.length === 0) return null;
      
      return (
        <div key={item.id} className="mb-4">
          <button
            onClick={() => toggleGroup(item.id)}
            className={cn(
              "w-full flex items-center justify-between gap-2 px-2 py-2 text-xs font-bold transition-colors",
              "text-gray-500 hover:text-gray-300 uppercase tracking-wider"
            )}
          >
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && (
              <ChevronDown className={cn(
                "w-3 h-3 transition-transform",
                isExpanded ? "transform rotate-180" : ""
              )} />
            )}
          </button>
          
          {!collapsed && isExpanded && (
            <div className="mt-1 space-y-0.5">
              {visibleSubmenu.map(subItem => renderMenuItem(subItem, true))}
            </div>
          )}
          
          {collapsed && (
            <div className="h-px my-2 mx-2" style={{ backgroundColor: 'var(--border-color)' }} />
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
      "border-r flex flex-col transition-all duration-300 h-full lg:relative",
      collapsed ? "w-16" : "w-64"
    )} style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
      <div className="p-3 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-color)' }}>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:block p-1.5 rounded-lg ml-auto"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
      
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {MENU_STRUCTURE.map(item => renderMenuItem(item))}
      </nav>
    </aside>
  );
}