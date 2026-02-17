import React, { useState, useEffect } from 'react';
import { Loader2, Lock, LogOut, Menu, X, Store, Package, Receipt, Users, Settings, BarChart3, FileText, MapPin, Tag, Palette, CreditCard, Printer, MessageSquare, DollarSign, Power, Calculator, Truck, UtensilsCrossed, Calendar, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { apiClient as base44 } from '@/api/apiClient';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { usePermission } from '../components/permissions/usePermission';
import { PLAN_PRESETS } from '../components/permissions/PlanPresets';
import { formatBrazilianDate } from '../components/utils/dateUtils';
import { useSlugContext } from '@/hooks/useSlugContext';
import { useQuery } from '@tanstack/react-query';
import { useDocumentHead } from '@/hooks/useDocumentHead';
import toast from 'react-hot-toast';
import SharedSidebar from '../components/admin/SharedSidebar';
import InstallAppButton from '../components/InstallAppButton';
import DashboardTab from '../components/admin/DashboardTab';
import WhatsAppComandaToggle from '../components/admin/WhatsAppComandaToggle';
import MobileQuickMenu from '../components/admin/MobileQuickMenu';
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
import ComandasTab from '../components/admin/ComandasTab';
import StoreTab from '../components/admin/StoreTab';
import PaymentMethodsTab from '../components/admin/PaymentMethodsTab';
import PrinterConfig from '../components/gestor/PrinterConfig';
import CaixaTab from '../components/admin/CaixaTab';
import WhatsAppTab from '../components/admin/WhatsAppTab';
import ColaboradoresTab from '../components/admin/ColaboradoresTab';
import TwoFactorAuth from '../components/admin/TwoFactorAuth';
import LGPDCompliance from '../components/admin/LGPDCompliance';
import TablesTab from '../components/admin/TablesTab';
import BeveragesTab from '../components/admin/BeveragesTab';
import InventoryManagement from '../components/admin/InventoryManagement';
import AffiliateProgram from '../components/admin/AffiliateProgram';

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => tabFromUrl || 'dashboard');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { loading, permissions, isMaster, hasModuleAccess, user, subscriberData, refresh: refreshPermissions } = usePermission();

  // Recarregar contexto ao abrir o painel do assinante para aplicar alterações feitas pelo admin
  useEffect(() => {
    if (!isMaster && typeof refreshPermissions === 'function') {
      refreshPermissions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const daysRemaining = subscriberData?.expires_at
    ? Math.ceil((new Date(subscriberData.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const planDisplayName = subscriberData?.plan ? (PLAN_PRESETS[subscriberData.plan]?.name || subscriberData.plan.charAt(0).toUpperCase() + subscriberData.plan.slice(1)) : '';
  const periodLabel = subscriberData?.expires_at
    ? (daysRemaining !== null && daysRemaining <= 0)
      ? `Expirado em ${formatBrazilianDate(subscriberData.expires_at)}`
      : `Válido até ${formatBrazilianDate(subscriberData.expires_at)}${daysRemaining !== null && daysRemaining > 0 ? ` (${daysRemaining} dias restantes)` : ''}`
    : 'Permanente';

  const { slug, subscriberEmail, inSlugContext, loading: slugLoading, error: slugError } = useSlugContext();
  const asSub = (inSlugContext && isMaster && subscriberEmail) ? subscriberEmail : undefined;
  const canAccessSlug = !inSlugContext || isMaster || (user?.email || '').toLowerCase() === (subscriberEmail || '').toLowerCase() || (user?.subscriber_email || '').toLowerCase() === (subscriberEmail || '').toLowerCase();

  // Buscar dados da loja para header
  const { data: stores = [] } = useQuery({
    queryKey: ['store', asSub ?? 'me'],
    queryFn: () => base44.entities.Store.list(null, asSub ? { as_subscriber: asSub } : {}),
  });
  const store = stores[0];

  useDocumentHead(store);

  // Sincronizar aba com ?tab= na URL (ex.: refresh com ?tab=inventory)
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const handleSetActiveTab = (tab) => {
    setActiveTab(tab);
    setShowMobileSidebar(false);
    setSearchParams({ tab }, { replace: true });
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  // ✅ MOVER CÁLCULO DE ROLES ANTES DE QUALQUER RETURN CONDICIONAL
  // Verificar se é gerente (pode acessar mesmo sem assinatura ativa)
  // Suporta tanto profile_role (string) quanto profile_roles (array)
  // Só verificar se user estiver carregado
  const roles = user ? (user?.profile_roles?.length ? user.profile_roles : user?.profile_role ? [user.profile_role] : []) : [];
  const isGerente = roles.length > 0 && roles.includes('gerente');
  const isColaborador = roles.length > 0;
  
  // Só o dono (assinante) pode acessar o Painel do Assinante. Gerente/colaborador que não é dono → /colaborador
  const ownerEmail = (subscriberData?.email || '').toLowerCase().trim();
  const isOwner = ownerEmail && (user?.email || '').toLowerCase().trim() === ownerEmail;
  const mustRedirectToColaborador = !isMaster && user && ((isColaborador && !isOwner) || (!isOwner && ownerEmail));

  useEffect(() => {
    if (!loading && mustRedirectToColaborador) {
      navigate('/colaborador', { replace: true });
    }
  }, [loading, mustRedirectToColaborador, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }
  
  if (user && mustRedirectToColaborador) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Master pode acessar, mas assinantes precisam de assinatura ativa
  // ✅ CORREÇÃO: Verificar se subscriberData existe e se status é 'active'
  // Se subscriberData for null mas o usuário não é master, pode ser que ainda não carregou
  if (!isMaster && subscriberData && subscriberData.status !== 'active') {
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
            <Link to={createPageUrl('Cardapio', slug || undefined)} className="block">
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

  const to = (p) => createPageUrl(p, slug || undefined);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab user={user} subscriberData={subscriberData} onNavigateToTab={handleSetActiveTab} />;
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
      case 'categories': // ✅ Redirecionar para dishes (categorias dentro de pratos)
      case 'complements': // ✅ Redirecionar para dishes (complementos dentro de pratos)
        return hasModuleAccess('dishes') ? (
          <DishesTab 
            initialTab={activeTab === 'categories' ? 'categories' : activeTab === 'complements' ? 'complements' : 'dishes'}
          />
        ) : <AccessDenied />;
      case 'pizza_config':
        return hasModuleAccess('pizza_config') ? <PizzaConfigTab /> : <AccessDenied />;
      case 'beverages':
        return hasModuleAccess('dishes') ? <BeveragesTab /> : <AccessDenied />;
      case 'inventory':
        return hasModuleAccess('inventory') ? <InventoryManagement /> : <AccessDenied />;
      case 'delivery_zones':
        return hasModuleAccess('delivery_zones') ? <DeliveryZonesTab /> : <AccessDenied />;
      case 'coupons':
        return hasModuleAccess('coupons') ? <CouponsTab /> : <AccessDenied />;
      case 'promotions':
        return hasModuleAccess('promotions') ? <PromotionsTab /> : <AccessDenied />;
      case 'affiliates':
        return hasModuleAccess('affiliates') ? <AffiliateProgram /> : <AccessDenied />;
      case 'comandas':
        return hasModuleAccess('comandas') ? <ComandasTab subscriberEmail={subscriberData?.email || subscriberEmail || user?.subscriber_email || user?.email} /> : <AccessDenied />;
      case 'tables':
        return hasModuleAccess('tables') ? <TablesTab /> : <AccessDenied />;
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
      case 'colaboradores':
        return hasModuleAccess('colaboradores') ? <ColaboradoresTab /> : <AccessDenied />;
      case '2fa':
        return hasModuleAccess('2fa') ? <TwoFactorAuth user={user} /> : <AccessDenied />;
      case 'lgpd':
        return hasModuleAccess('lgpd') ? <LGPDCompliance /> : <AccessDenied />;
      default:
        return <DashboardTab user={user} subscriberData={subscriberData} onNavigateToTab={handleSetActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen min-h-screen-mobile bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Header Profissional com Logo */}
      <header className="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 text-white flex-shrink-0 sticky top-0 z-50 shadow-lg safe-top">
        <div className="px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-1 sm:gap-2 max-w-full overflow-hidden">
          <div className="flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
            <button
              onClick={() => setShowMobileSidebar(true)}
              className="lg:hidden min-h-touch min-w-touch flex items-center justify-center p-2 -m-1 hover:bg-white/10 rounded-lg transition flex-shrink-0"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            
            {/* Logo da Loja */}
            {store?.logo ? (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden flex-shrink-0 border-2 border-white/30 shadow-md">
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
                  <Store className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 border-2 border-white/30">
                <Store className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-sm sm:text-base md:text-lg truncate">{store?.name || 'Meu Painel'}</h1>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {subscriberData?.plan && (
                  <Badge className="bg-white/20 text-white text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 border-white/30">
                    Plano {subscriberData.plan.charAt(0).toUpperCase() + subscriberData.plan.slice(1)}
                  </Badge>
                )}
                {daysRemaining !== null && (
                  <Badge className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 ${
                    daysRemaining <= 7 ? 'bg-red-500/80' : 'bg-green-500/80'
                  } text-white border-0`}>
                    {daysRemaining > 0 ? `${daysRemaining}d restantes` : 'Expirado'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap overflow-x-auto scrollbar-hide">
            <InstallAppButton pageName="Painel" compact />
            {(store?.id || subscriberData?.id) && (
              <WhatsAppComandaToggle 
                store={store} 
                subscriber={subscriberData} 
                compact={true}
              />
            )}
            
            {/* Menu Rápido - Mobile e Desktop */}
            <MobileQuickMenu
              isMaster={isMaster}
              hasGestorAccess={hasModuleAccess('orders')}
              hasModuleAccess={hasModuleAccess}
              slug={slug}
              plan={subscriberData?.plan || 'basic'}
            />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 flex min-h-touch min-w-touch" title="Sair">
                  <Power className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deseja realmente sair?</AlertDialogTitle>
                  <AlertDialogDescription>Você precisará fazer login novamente para acessar o painel.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700">Sair</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
      <div className="flex flex-1 overflow-x-hidden overflow-y-auto">
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
            setActiveTab={handleSetActiveTab}
            isMaster={isMaster}
            isGerente={isGerente}
            slug={slug}
            permissions={permissions}
            plan={subscriberData?.plan || 'basic'} // ✅ Garantir que sempre tenha um valor padrão
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
            onClose={() => setShowMobileSidebar(false)}
            showStoreLogo={true}
          />
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="p-4 lg:p-6">
            {/* Card Plano ativo + Período (só para assinante, não master) */}
            {!isMaster && subscriberData && (
              <div className="mb-4 p-3 sm:p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/40">
                    <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Plano ativo</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{planDisplayName || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-600 pl-3 sm:pl-4">
                  <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Período</p>
                    <p className="font-medium text-gray-800 dark:text-gray-200">{periodLabel}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                  As ferramentas ao lado são as incluídas no seu plano pelo administrador.
                </p>
              </div>
            )}
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}