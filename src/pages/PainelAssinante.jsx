import React, { useState, useEffect } from 'react';
import { Loader2, Lock, LogOut, Menu, X, Store, Package, Receipt, Users, Settings, BarChart3, FileText, MapPin, Tag, Palette, CreditCard, Printer, MessageSquare, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient as base44 } from '@/api/apiClient';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { usePermission } from '../components/permissions/usePermission';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import SharedSidebar from '../components/admin/SharedSidebar';
import DashboardTab from '../components/admin/DashboardTab';
import WhatsAppComandaToggle from '../components/admin/WhatsAppComandaToggle';
import DishesTab from '../components/admin/DishesTab';
import CategoriesTab from '../components/admin/CategoriesTab';
import ComplementsTab from '../components/admin/ComplementsTab';
import PizzaConfigTab from '../components/admin/PizzaConfigTab';
import OrdersTab from '../components/admin/OrdersTab';
import OrderHistoryTab from '../components/admin/OrderHistoryTab';
import ClientsTab from '../components/admin/ClientsTab';
import FinancialTab from '../components/admin/FinancialTab';
import DeliveryZonesTab from '../components/admin/DeliveryZonesTab';
import CouponsTab from '../components/admin/CouponsTab';
import PromotionsTab from '../components/admin/PromotionsTab';
import ThemeTab from '../components/admin/ThemeTab';
import StoreTab from '../components/admin/StoreTab';
import PaymentMethodsTab from '../components/admin/PaymentMethodsTab';
import PrinterConfig from '../components/gestor/PrinterConfig';
import CaixaTab from '../components/admin/CaixaTab';
import WhatsAppTab from '../components/admin/WhatsAppTab';

function AccessDenied() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="bg-white p-8 rounded-xl shadow text-center">
        <Lock className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-semibold">Acesso não permitido</h2>
        <p className="text-sm text-gray-500 mt-2">
          Esta funcionalidade não está disponível no seu plano atual.
        </p>
      </div>
    </div>
  );
}

export default function PainelAssinante() {
  // ✅ TODOS OS HOOKS DEVEM VIR ANTES DE QUALQUER RETURN CONDICIONAL
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const { loading, permissions, isMaster, hasModuleAccess, user, subscriberData } = usePermission();
  
  // Buscar dados da loja para header
  const { data: stores = [] } = useQuery({
    queryKey: ['store'],
    queryFn: () => base44.entities.Store.list(),
  });
  const store = stores[0];

  // Abrir aba via ?tab= na URL (ex: /painelassinante?tab=store)
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  // Calcular dias restantes
  const daysRemaining = subscriberData?.expires_at
    ? Math.ceil((new Date(subscriberData.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Master pode acessar, mas assinantes precisam de assinatura ativa
  if (!isMaster && (!subscriberData || subscriberData.status !== 'active')) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Assinatura Inativa</h2>
          <p className="text-gray-600 mb-6">
            Sua assinatura está inativa. Entre em contato para renovar.
          </p>
          <div className="space-y-3">
            <a 
              href="https://wa.me/5586988196114" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full bg-green-600 hover:bg-green-700">
                Falar no WhatsApp
              </Button>
            </a>
            <Link to={createPageUrl('Cardapio')} className="block">
              <Button variant="outline" className="w-full">
                Ver Cardápio
              </Button>
            </Link>
            <Button variant="ghost" onClick={handleLogout} className="w-full text-gray-500">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab user={user} subscriberData={subscriberData} onNavigateToTab={setActiveTab} />;
      case 'pdv':
        return hasModuleAccess('pdv') ? <div className="p-8 text-center">Use o botão PDV no header</div> : <AccessDenied />;
      case 'caixa':
        return hasModuleAccess('caixa') ? <CaixaTab /> : <AccessDenied />;
      case 'orders':
        return hasModuleAccess('orders') ? <OrdersTab /> : <AccessDenied />;
      case 'history':
        return hasModuleAccess('history') ? <OrderHistoryTab /> : <AccessDenied />;
      case 'clients':
        return hasModuleAccess('clients') ? <ClientsTab /> : <AccessDenied />;
      case 'financial':
        return hasModuleAccess('financial') ? <FinancialTab /> : <AccessDenied />;
      case 'dishes':
        return hasModuleAccess('dishes') ? <DishesTab /> : <AccessDenied />;
      case 'categories':
        return hasModuleAccess('dishes') ? <CategoriesTab /> : <AccessDenied />;
      case 'complements':
        return hasModuleAccess('dishes') ? <ComplementsTab /> : <AccessDenied />;
      case 'pizza_config':
        return hasModuleAccess('pizza_config') ? <PizzaConfigTab /> : <AccessDenied />;
      case 'delivery_zones':
        return hasModuleAccess('delivery_zones') ? <DeliveryZonesTab /> : <AccessDenied />;
      case 'coupons':
        return hasModuleAccess('coupons') ? <CouponsTab /> : <AccessDenied />;
      case 'promotions':
        return hasModuleAccess('promotions') ? <PromotionsTab /> : <AccessDenied />;
      case 'theme':
        return hasModuleAccess('theme') ? <ThemeTab /> : <AccessDenied />;
      case 'store':
        return hasModuleAccess('store') ? <StoreTab /> : <AccessDenied />;
      case 'payments':
        return hasModuleAccess('payments') ? <PaymentMethodsTab /> : <AccessDenied />;
      case 'printer':
        return hasModuleAccess('printer') ? <PrinterConfig /> : <AccessDenied />;
      case 'whatsapp':
        return hasModuleAccess('whatsapp') ? <WhatsAppTab /> : <AccessDenied />;
      default:
        return <DashboardTab user={user} subscriberData={subscriberData} onNavigateToTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Header Profissional com Logo */}
      <header className="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 text-white flex-shrink-0 sticky top-0 z-50 shadow-lg">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setShowMobileSidebar(true)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Logo da Loja */}
            {store?.logo ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border-2 border-white/30 shadow-md">
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
                <div className="w-full h-full bg-white/20 flex items-center justify-center hidden">
                  <Store className="w-6 h-6 text-white" />
                </div>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 border-2 border-white/30">
                <Store className="w-6 h-6 text-white" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg truncate">{store?.name || 'Meu Painel'}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                {subscriberData?.plan && (
                  <Badge className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 border-white/30">
                    Plano {subscriberData.plan.charAt(0).toUpperCase() + subscriberData.plan.slice(1)}
                  </Badge>
                )}
                {daysRemaining !== null && (
                  <Badge className={`text-[10px] px-1.5 py-0.5 ${
                    daysRemaining <= 7 ? 'bg-red-500/80' : 'bg-green-500/80'
                  } text-white border-0`}>
                    {daysRemaining > 0 ? `${daysRemaining}d restantes` : 'Expirado'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {hasModuleAccess('pdv') && (
              <Link to={createPageUrl('PDV')}>
                <Button size="sm" className="bg-white text-orange-600 hover:bg-orange-50">
                  <Package className="w-4 h-4 mr-2" />
                  PDV
                </Button>
              </Link>
            )}
            {hasModuleAccess('gestor_pedidos') ? (
              <Link to={createPageUrl('GestorPedidos')}>
                <Button size="sm" className="bg-white text-orange-600 hover:bg-orange-50">
                  <Receipt className="w-4 h-4 mr-2" />
                  Gestor
                </Button>
              </Link>
            ) : (
              <Button 
                size="sm" 
                className="bg-white/50 text-orange-400 cursor-not-allowed" 
                disabled
                title="Não disponível no seu plano"
              >
                <Receipt className="w-4 h-4 mr-2" />
                Gestor
              </Button>
            )}
            {(store?.id || subscriberData?.id) && <WhatsAppComandaToggle store={store} subscriber={subscriberData} />}
            <Link to={createPageUrl('Cardapio')} className="hidden sm:block">
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/10">
                Ver Cardápio
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={handleLogout} className="text-white hover:bg-white/10 hidden sm:flex">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Profissional Categorizado */}
        <div
          className={`
            fixed lg:static inset-y-0 left-0 z-40
            transform transition-transform duration-300 ease-in-out
            ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <SharedSidebar
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              setShowMobileSidebar(false);
            }}
            isMaster={isMaster}
            permissions={permissions}
            plan={subscriberData?.plan}
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
            onClose={() => setShowMobileSidebar(false)}
            showStoreLogo={true}
          />
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4 lg:p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}