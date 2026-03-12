import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Loader2, Lock, LogOut, Menu, X, Store, Package, Receipt, Users, Settings, BarChart3, FileText, MapPin, Tag, Palette, CreditCard, Printer, MessageSquare, DollarSign, Power, Calculator, Truck, UtensilsCrossed, Calendar, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { apiClient as base44 } from '@/api/apiClient';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { usePermission } from '../components/permissions/usePermission';
import { PLAN_PRESETS } from '../components/permissions/PlanPresets';
import { useEntitlements } from '../hooks/useEntitlements';
import { LimitBanner80 } from '../components/plans';
import { formatBrazilianDate } from '../components/utils/dateUtils';
import { useSlugContext } from '@/hooks/useSlugContext';
import { useQuery } from '@tanstack/react-query';
import { useDocumentHead } from '@/hooks/useDocumentHead';
import toast from 'react-hot-toast';
import SharedSidebar from '../components/admin/SharedSidebar';
import InstallAppButton from '../components/InstallAppButton';
import WhatsAppComandaToggle from '../components/admin/WhatsAppComandaToggle';
import MobileQuickMenu from '../components/admin/MobileQuickMenu';
import AccessDenied from '@/components/admin/AccessDenied';
import PanelShell from '@/components/layout/PanelShell';
import ErrorBoundary from '@/components/ErrorBoundary';

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
if (isDev) {
  console.info('[PAINEL_ASSINANTE] module loaded');
}

const DashboardTab = lazy(() => import('../components/admin/DashboardTab'));
const DishesTab = lazy(() => import('../components/admin/DishesTab'));
const PizzaConfigTab = lazy(() => import('../components/admin/PizzaConfigTab'));
const OrdersTab = lazy(() => import('../components/admin/OrdersTab'));
const OrderHistoryTab = lazy(() => import('../components/admin/OrderHistoryTab'));
const ClientsTab = lazy(() => import('../components/admin/ClientsTab'));
const FinancialTab = lazy(() => import('../components/admin/FinancialTab'));
const DeliveryZonesTab = lazy(() => import('../components/admin/DeliveryZonesTab'));
const CouponsTab = lazy(() => import('../components/admin/CouponsTab'));
const PromotionsTab = lazy(() => import('../components/admin/PromotionsTab'));
const ThemeTab = lazy(() => import('../components/admin/ThemeTab'));
const ComandasTab = lazy(() => import('../components/admin/ComandasTab'));
const StoreTab = lazy(() => import('../components/admin/StoreTab'));
const PaymentMethodsTab = lazy(() => import('../components/admin/PaymentMethodsTab'));
const PrinterConfig = lazy(() => import('../components/gestor/PrinterConfig'));
const CaixaTab = lazy(() => import('../components/admin/CaixaTab'));
const WhatsAppTab = lazy(() => import('../components/admin/WhatsAppTab'));
const ColaboradoresTab = lazy(() => import('../components/admin/ColaboradoresTab'));
const TwoFactorAuth = lazy(() => import('../components/admin/TwoFactorAuth'));
const LGPDCompliance = lazy(() => import('../components/admin/LGPDCompliance'));
const ManagerialAuthTab = lazy(() => import('../components/admin/ManagerialAuthTab'));
const TablesTab = lazy(() => import('../components/admin/TablesTab'));
const BeveragesTab = lazy(() => import('../components/admin/BeveragesTab'));
const InventoryManagement = lazy(() => import('../components/admin/InventoryManagement'));
const AffiliateProgram = lazy(() => import('../components/admin/AffiliateProgram'));

function PanelContentLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
    </div>
  );
}

export default function PainelAssinante() {
  if (isDev) {
    console.info('[PAINEL_ASSINANTE] render start');
  }
  // ✅ TODOS OS HOOKS DEVEM VIR ANTES DE QUALQUER RETURN CONDICIONAL
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => tabFromUrl || 'dashboard');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { loading, permissions, isMaster, hasModuleAccess, user, subscriberData, refresh: refreshPermissions } = usePermission();
  const { percentUsed } = useEntitlements();
  if (isDev) {
    console.info('[PAINEL_ASSINANTE] state', {
      loading,
      isMaster,
      userEmail: user?.email ?? null,
      subscriberStatus: subscriberData?.status ?? null,
      subscriberEmail: subscriberData?.email ?? null,
    });
  }

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
  // Em slug context: usar subscriberEmail do slug para Store e dados (evita misturar com usuário logado de outro estabelecimento)
  const asSub = (inSlugContext && subscriberEmail) ? subscriberEmail : undefined;
  const canAccessSlug = !inSlugContext || isMaster || (user?.email || '').toLowerCase() === (subscriberEmail || '').toLowerCase() || (user?.subscriber_email || '').toLowerCase() === (subscriberEmail || '').toLowerCase();

  // Buscar dados da loja: em slug context usa o assinante do slug; fora usa 'me'
  const { data: stores = [] } = useQuery({
    queryKey: ['store', asSub ?? 'me'],
    queryFn: () => base44.entities.Store.list(null, asSub ? { as_subscriber: asSub } : {}),
    enabled: !inSlugContext || !!subscriberEmail,
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

  // Em slug context, aguardar slug carregar para identificar corretamente o assinante (email do slug)
  const blockingLoading = loading || (inSlugContext && slugLoading);

  if (blockingLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Crítico: assinante de estabelecimento A não pode acessar painel de estabelecimento B pela URL
  if (inSlugContext && !canAccessSlug && user && !isMaster) {
    return (
      <AccessDenied
        context="subscriber"
        title="Acesso negado"
        message="Este painel pertence a outro estabelecimento. Acesse o painel da sua conta."
        showContact={false}
        customAction={
          <>
            <Button
              onClick={() => {
                const lastSlug = localStorage.getItem('lastVisitedSlug');
                if (lastSlug) navigate(`/s/${lastSlug}`);
                else navigate('/colaborador');
              }}
              className="w-full"
            >
              Ir para meu painel
            </Button>
            <Link to="/" className="block">
              <Button variant="outline" className="w-full">Voltar ao início</Button>
            </Link>
          </>
        }
      />
    );
  }
  
  if (user && mustRedirectToColaborador) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Master pode acessar, mas assinantes precisam de assinatura ativa
  // ✅ CORREÇÃO: Verificar se subscriberData existe e se status é 'active'
  // Se subscriberData for null mas o usuário não é master, pode ser que ainda não carregou
  if (!isMaster && subscriberData && subscriberData.status !== 'active') {
    return (
      <AccessDenied
        context="subscriber"
        title="Assinatura Inativa"
        message="Sua assinatura está inativa. Entre em contato para renovar."
        showContact={false}
        customAction={
          <>
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
            <Button variant="ghost" onClick={handleLogout} className="w-full text-muted-foreground hover:text-foreground hover:bg-muted">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </>
        }
      />
    );
  }

  const to = (p) => createPageUrl(p, slug || undefined);

  // Escopo para listagens (orders/clients): priorizar slug quando em slug context (identificação correta).
  // Master em slug: asSub (subscriberEmail do slug). Slug context: subscriberEmail do slug (loja atual).
  // Sem slug: subscriberData ou user.
  let effectiveSubscriberForList =
    asSub ??
    (inSlugContext && subscriberEmail ? subscriberEmail : null) ??
    subscriberData?.email ??
    user?.subscriber_email ??
    user?.email;
  if (!effectiveSubscriberForList && user?.email) {
    effectiveSubscriberForList = user.email;
  }

  const isBasicPizzariaProfile = !isMaster &&
    String(subscriberData?.plan || '').toLowerCase() === 'basic' &&
    hasModuleAccess('pizza_config');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab user={user} subscriberData={subscriberData} onNavigateToTab={handleSetActiveTab} />;
      case 'pdv':
        return hasModuleAccess('pdv') ? <div className="p-8 text-center">Use o botão PDV no header</div> : <AccessDenied />;
      case 'caixa':
        return hasModuleAccess('caixa') ? <CaixaTab /> : <AccessDenied />;
      case 'orders':
        return hasModuleAccess('orders') ? (
          <OrdersTab
            storeId={store?.id}
            store={store}
            slug={slug}
            asSub={asSub}
            subscriberEmail={effectiveSubscriberForList}
            isMaster={isMaster}
            user={user}
            subscriberData={subscriberData}
          />
        ) : <AccessDenied />;
      case 'history':
        return hasModuleAccess('history') ? <OrderHistoryTab /> : <AccessDenied />;
      case 'clients':
        return hasModuleAccess('clients') ? (
          <ClientsTab
            storeId={store?.id}
            store={store}
            slug={slug}
            asSub={asSub}
            subscriberEmail={effectiveSubscriberForList}
          />
        ) : <AccessDenied />;
      case 'financial':
        return hasModuleAccess('financial') ? <FinancialTab /> : <AccessDenied />;
      case 'dishes':
      case 'categories': // ✅ Redirecionar para dishes (categorias dentro de pratos)
      case 'complements': // ✅ Redirecionar para dishes (complementos dentro de pratos)
        return hasModuleAccess('dishes') && !isBasicPizzariaProfile ? (
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
      case 'managerial_auth':
        return hasModuleAccess('managerial_auth') ? <ManagerialAuthTab /> : <AccessDenied />;
      case 'lgpd':
        return hasModuleAccess('lgpd') ? <LGPDCompliance /> : <AccessDenied />;
      default:
        return <DashboardTab user={user} subscriberData={subscriberData} onNavigateToTab={handleSetActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen min-h-screen-mobile bg-background flex flex-col">
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
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap lg:flex-nowrap">
                {subscriberData?.plan && (
                  <Badge className="bg-white/20 text-white text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 border-white/30">
                    Plano {subscriberData.plan.charAt(0).toUpperCase() + subscriberData.plan.slice(1)}
                  </Badge>
                )}
                {daysRemaining !== null && (
                  <Badge className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 lg:hidden ${
                    daysRemaining <= 7 ? 'bg-red-500/80' : 'bg-green-500/80'
                  } text-white border-0`}>
                    {daysRemaining > 0 ? `${daysRemaining}d restantes` : 'Expirado'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap overflow-x-auto scrollbar-hide lg:flex-nowrap lg:overflow-visible">
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
      <div className="flex flex-1 overflow-x-hidden overflow-y-auto lg:overflow-y-hidden">
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
            plan={subscriberData?.plan || 'basic'}
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
            onClose={() => setShowMobileSidebar(false)}
            showStoreLogo={true}
            store={store}
          />
        </div>

        {/* Content */}
        <PanelShell withMinHeight={false}>
            {/* Card Plano ativo + Período (só para assinante, não master) */}
            {!isMaster && subscriberData && (
              <div className="mb-4 p-3 sm:p-4 rounded-xl bg-card border border-border shadow-sm flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Plano ativo</p>
                    <p className="font-semibold text-foreground">{planDisplayName || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 border-l border-border pl-3 sm:pl-4">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Período</p>
                    <p className="font-medium text-foreground">{periodLabel}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground ml-auto">
                  As ferramentas ao lado são as incluídas no seu plano pelo administrador.
                </p>
              </div>
            )}
            {/* Aviso 80% limite de pedidos (não bloqueia) */}
            {!isMaster && percentUsed?.orders >= 80 && percentUsed?.orders < 100 && (
              <div className="mb-4">
                <LimitBanner80
                  percentUsed={percentUsed.orders}
                  onViewPlans={() => setActiveTab('store')}
                />
              </div>
            )}
            <ErrorBoundary>
              <Suspense fallback={<PanelContentLoader />}>
                {renderContent()}
              </Suspense>
            </ErrorBoundary>
        </PanelShell>
      </div>
    </div>
  );
}


