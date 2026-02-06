import React, { useState, useEffect } from 'react';
import { Settings, LogOut, LogIn, Loader2, Package, Users, Lock, Menu, UtensilsCrossed, Calculator, Truck, KeyRound, BarChart3 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useTheme } from '../components/theme/ThemeProvider';
import ThemeToggle from '../components/ui/ThemeToggle';
import { apiClient as base44 } from '@/api/apiClient';
import AdminSidebar from '../components/admin/AdminSidebar';
import DashboardTab from '../components/admin/DashboardTab';
import UserAuthButton from '../components/atoms/UserAuthButton';
import ClientsTab from '../components/admin/ClientsTab';
import CaixaTab from '../components/admin/CaixaTab';
import WhatsAppTab from '../components/admin/WhatsAppTab';
import DishesTab from '../components/admin/DishesTab';
import CategoriesTab from '../components/admin/CategoriesTab';
import ComplementsTab from '../components/admin/ComplementsTab';
import PizzaConfigTab from '../components/admin/PizzaConfigTab';
import DeliveryZonesTab from '../components/admin/DeliveryZonesTab';
import CouponsTab from '../components/admin/CouponsTab';
import PromotionsTab from '../components/admin/PromotionsTab';
import BeveragesTab from '../components/admin/BeveragesTab';
import ThemeTab from '../components/admin/ThemeTab';
import ComandasTab from '../components/admin/ComandasTab';
import OrdersTab from '../components/admin/OrdersTab';
import StoreTab from '../components/admin/StoreTab';
import PaymentMethodsTab from '../components/admin/PaymentMethodsTab';
import AssinarPageEditorTab from '../components/admin/AssinarPageEditorTab';
import ChangePasswordDialog from '../components/admin/ChangePasswordDialog';
import PrinterConfig from '../components/gestor/PrinterConfig';
import FinancialTab from '../components/admin/FinancialTab';
import OrderHistoryTab from '../components/admin/OrderHistoryTab';
import ErrorBoundary from '../components/ErrorBoundary';
import WhatsAppComandaToggle from '../components/admin/WhatsAppComandaToggle';
import MobileQuickMenu from '../components/admin/MobileQuickMenu';
import MasterSlugSettings from '../components/admin/MasterSlugSettings';
import ServiceRequestsTab from '../components/admin/ServiceRequestsTab';
import TablesTab from '../components/admin/TablesTab';
import InventoryManagement from '../components/admin/InventoryManagement';
import AffiliateProgram from '../components/admin/AffiliateProgram';
import LGPDCompliance from '../components/admin/LGPDCompliance';
import TwoFactorAuth from '../components/admin/TwoFactorAuth';
import ColaboradoresTab from '../components/admin/ColaboradoresTab';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import InstallAppButton from '../components/InstallAppButton';
import { createPageUrl } from '@/utils';
import { logger } from '@/utils/logger';
import { usePermission } from '../components/permissions/usePermission';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useDocumentHead } from '@/hooks/useDocumentHead';

function AccessDenied() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="p-8 rounded-xl shadow text-center" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid var(--border-color)` }}>
        <Lock className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Acesso não permitido</h2>
        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
          Esta funcionalidade não faz parte do seu plano.
        </p>
      </div>
    </div>
  );
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // ✅ FONTE ÚNICA DE VERDADE - usePermission
  const { loading, permissions, isMaster, hasModuleAccess, user, subscriberData, canCreate, canUpdate, canDelete, canView } = usePermission();
  const { isDark, toggleTheme } = useTheme();
  
  // Buscar dados da loja para header
  const { data: stores = [] } = useQuery({
    queryKey: ['store'],
    queryFn: () => base44.entities.Store.list(),
  });
  const store = stores[0];

  useDocumentHead(store);

  // Verificação de Acesso - APENAS master pode acessar Admin; assinantes → PainelAssinante
  useEffect(() => {
    if (!loading && !isMaster && subscriberData && subscriberData.status === 'active') {
      navigate('/PainelAssinante', { replace: true });
    }
  }, [loading, isMaster, subscriberData, navigate]);

  // Abrir aba via ?tab= na URL - ao mudar aba, atualiza URL para persistir no refresh
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const handleSetActiveTab = (tab) => {
    console.log('🍽️ [Admin] handleSetActiveTab chamado com tab:', tab);
    setActiveTab(tab);
    setShowMobileSidebar(false);
    setSearchParams({ tab }, { replace: true });
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Carregando...</p>
        </div>
      </div>
    );
  }
  
  if (!isMaster) {
    if (subscriberData && subscriberData.status === 'active') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-white">Redirecionando para Painel do Assinante...</p>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="rounded-2xl shadow-lg p-8 max-w-md text-center" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid var(--border-color)` }}>
          <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
          <p className="text-gray-400 mb-6">
            Esta página é exclusiva para administradores master. Assinantes devem acessar o Painel do Assinante.
          </p>
          <div className="space-y-3">
            {user && !isMaster && subscriberData && subscriberData.status === 'active' && (
              <Link to="/PainelAssinante" className="block">
                <Button className="w-full bg-orange-500 hover:bg-orange-600">
                  Ir para Painel do Assinante
                </Button>
              </Link>
            )}
            {!user && (
              <Link to={`/login?returnUrl=${encodeURIComponent('/Admin')}`} className="block">
                <Button className="w-full bg-orange-500 hover:bg-orange-600">
                  <LogIn className="w-4 h-4 mr-2" />
                  Fazer Login
                </Button>
              </Link>
            )}
            <a 
              href="https://wa.me/5586988196114" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
              <Button variant="outline" className="w-full bg-green-50 hover:bg-green-100 border-green-200">
                Falar no WhatsApp
              </Button>
            </a>
            <Link to={(user?.slug || subscriberData?.slug) ? `/s/${user?.slug || subscriberData?.slug}` : createPageUrl('Cardapio')} className="block">
              <Button variant="outline" className="w-full">
                Ver Cardápio
              </Button>
            </Link>
            {user && (
              <Button variant="ghost" onClick={handleLogout} className="w-full text-gray-400 hover:text-white hover:bg-[#2a2a2a]">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Renderizar abas
  const renderTabContent = () => {
    console.log('🍽️ [Admin] renderTabContent chamado, activeTab:', activeTab);
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab user={user} subscriberData={subscriberData} onNavigateToTab={handleSetActiveTab} />;
      case 'caixa':
        return hasModuleAccess('caixa') ? <CaixaTab /> : <AccessDenied />;
      case 'whatsapp':
        return hasModuleAccess('whatsapp') ? <WhatsAppTab /> : <AccessDenied />;
      case 'clients':
        return hasModuleAccess('clients') ? <ClientsTab /> : <AccessDenied />;
      case 'dishes':
      case 'categories': // ✅ Redirecionar para dishes (categorias dentro de pratos)
      case 'complements': // ✅ Redirecionar para dishes (complementos dentro de pratos)
        console.log('🍽️ [Admin] CASE DISHES EXECUTADO!', {
          activeTab,
          isMaster,
          loading,
          user: user?.email,
          subscriberData: subscriberData?.plan
        });
        // ✅ Master sempre tem acesso, mesmo se hasModuleAccess falhar temporariamente
        const hasDishesAccess = isMaster || hasModuleAccess('dishes');
        console.log('🍽️ [Admin] Renderizando DishesTab:', {
          activeTab,
          isMaster,
          hasModuleAccess: hasModuleAccess('dishes'),
          hasDishesAccess,
          permissions,
          permissionsType: typeof permissions
        });
        
        if (!hasDishesAccess) {
          console.error('🍽️ [Admin] ACESSO NEGADO ao DishesTab!');
          return (
            <div className="p-8 text-center">
              <p className="text-red-500 mb-2">Acesso negado ao módulo de pratos</p>
              <p className="text-sm text-gray-400">
                isMaster: {String(isMaster)} | hasModuleAccess: {String(hasModuleAccess('dishes'))}
              </p>
            </div>
          );
        }
        
        console.log('🍽️ [Admin] Renderizando DishesTab com ErrorBoundary...');
        console.log('🍽️ [Admin] DishesTab importado?', typeof DishesTab);
        console.log('🍽️ [Admin] Tentando criar elemento DishesTab...');
        
        try {
          const dishesTabElement = (
            <ErrorBoundary>
              <DishesTab 
                onNavigateToPizzas={() => handleSetActiveTab('pizza_config')}
                initialTab={activeTab === 'categories' ? 'categories' : activeTab === 'complements' ? 'complements' : 'dishes'}
              />
            </ErrorBoundary>
          );
          console.log('🍽️ [Admin] Elemento DishesTab criado com sucesso!', dishesTabElement);
          return dishesTabElement;
        } catch (error) {
          console.error('🚨 [Admin] ERRO ao renderizar DishesTab:', error);
          console.error('🚨 [Admin] Stack:', error?.stack);
          return (
            <div className="p-8 text-center">
              <p className="text-red-500 mb-2">Erro ao carregar cardápio</p>
              <p className="text-sm text-gray-400">{error?.message || 'Erro desconhecido'}</p>
              <pre className="text-xs mt-2 text-left bg-gray-100 p-2 rounded overflow-auto">
                {error?.stack}
              </pre>
            </div>
          );
        }
      case 'beverages':
        return hasModuleAccess('dishes') ? <BeveragesTab /> : <AccessDenied />;
      case 'pizza_config':
        return hasModuleAccess('pizza_config') ? <PizzaConfigTab /> : <AccessDenied />;
      case 'delivery_zones':
        return hasModuleAccess('delivery_zones') ? <DeliveryZonesTab /> : <AccessDenied />;
      case 'coupons':
        return hasModuleAccess('coupons') ? <CouponsTab /> : <AccessDenied />;
      case 'promotions':
        return hasModuleAccess('promotions') ? <PromotionsTab /> : <AccessDenied />;
      case 'comandas':
        return hasModuleAccess('comandas') ? <ComandasTab /> : <AccessDenied />;
      case 'colaboradores':
        return (isMaster || hasModuleAccess('colaboradores')) ? <ColaboradoresTab /> : <AccessDenied />;
      case '2fa':
        return (isMaster || hasModuleAccess('2fa')) ? <TwoFactorAuth /> : <AccessDenied />;
      case 'lgpd':
        return (isMaster || hasModuleAccess('lgpd')) ? <LGPDCompliance /> : <AccessDenied />;
      case 'theme':
        return hasModuleAccess('theme') ? <ThemeTab /> : <AccessDenied />;
      case 'orders':
        return hasModuleAccess('orders') ? <OrdersTab isMaster={user?.is_master} user={user} subscriberData={subscriberData} /> : <AccessDenied />;
      case 'history':
        return hasModuleAccess('history') ? <OrderHistoryTab /> : <AccessDenied />;
      case 'financial':
        return hasModuleAccess('financial') ? <FinancialTab /> : <AccessDenied />;
      case 'printer':
        return hasModuleAccess('printer') ? <PrinterConfig /> : <AccessDenied />;
      case 'store':
        return hasModuleAccess('store') ? <StoreTab /> : <AccessDenied />;
      case 'payments':
        return hasModuleAccess('payments') ? <PaymentMethodsTab /> : <AccessDenied />;
      case 'tables':
        return (isMaster || hasModuleAccess('tables')) ? <TablesTab /> : <AccessDenied />;
      case 'inventory':
        return hasModuleAccess('inventory') ? <InventoryManagement /> : <AccessDenied />;
      case 'affiliates':
        return hasModuleAccess('affiliates') ? <AffiliateProgram /> : <AccessDenied />;
      case 'service_requests':
        return isMaster ? <ServiceRequestsTab /> : <AccessDenied />;
      case 'pagina_assinar':
        return isMaster ? <AssinarPageEditorTab /> : <AccessDenied />;
      case 'graficos':
        return hasModuleAccess('graficos') ? (
          <div className="flex items-center justify-center h-96">
            <p className="text-gray-500">Gráficos em desenvolvimento</p>
          </div>
        ) : <AccessDenied />;
      case 'mais':
        return hasModuleAccess('mais') ? (
          <div className="flex items-center justify-center h-96">
            <p className="text-gray-500">Mais funcionalidades em breve</p>
          </div>
        ) : <AccessDenied />;
      default:
        return <DashboardTab user={user} subscriberData={subscriberData} onNavigateToTab={handleSetActiveTab} />;
    }
  };

  const hasGestorAccess = isMaster || hasModuleAccess('gestor_pedidos');

  // Garantir que é master antes de renderizar
  if (!isMaster) {
    console.error('❌ [Admin] Tentativa de renderizar Admin sem ser master!');
    console.error('❌ [Admin] isMaster:', isMaster);
    console.error('❌ [Admin] user:', user);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white p-8">
          <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
          <p className="mb-4">Esta página é exclusiva para administradores master.</p>
          <Link to="/PainelAssinante">
            <Button className="bg-orange-500 hover:bg-orange-600">
              Ir para Painel do Assinante
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  console.log('✅ [Admin] Renderizando Admin para master');
  console.log('✅ [Admin] activeTab:', activeTab);
  console.log('✅ [Admin] user:', user);
  
  try {
    return (
      <div className="min-h-screen min-h-screen-mobile flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Header Profissional com Logo */}
      <header className="text-white flex-shrink-0 sticky top-0 z-50 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border-b border-gray-700 shadow-lg safe-top">
        <div className="px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-1 sm:gap-2 max-w-full overflow-hidden">
          <div className="flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0 shrink-0">
            <button
              onClick={() => setShowMobileSidebar(true)}
              className="lg:hidden min-h-touch min-w-touch flex items-center justify-center p-2 -m-1 rounded-lg transition-colors hover:bg-white/10 flex-shrink-0"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            
            {/* Logo da Loja */}
            {store?.logo ? (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden flex-shrink-0 border-2 border-white/20 shadow-md">
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
                  <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 border-2 border-white/20">
                <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-xs sm:text-sm md:text-base truncate">
                {store?.name || 'Painel Admin'}
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-300 truncate">Administração Master</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 min-h-touch overflow-x-auto scrollbar-hide flex-shrink-0">
            <InstallAppButton pageName="Admin" compact />
            <ThemeToggle className="text-white hover:bg-gray-700 min-h-touch min-w-touch" />
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
              hasGestorAccess={hasGestorAccess}
              slug={user?.slug || subscriberData?.slug}
            />

            {isMaster && (
              <Button variant="ghost" size="icon" className="text-white bg-amber-600/80 hover:bg-amber-600 min-h-touch min-w-touch" title="Alterar minha senha" onClick={() => setShowChangePassword(true)}>
                <KeyRound className="w-4 h-4" />
              </Button>
            )}
            <UserAuthButton className="text-white" />
          </div>
        </div>
      </header>

      <ChangePasswordDialog open={showChangePassword} onOpenChange={setShowChangePassword} />

      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Main Layout with Sidebar */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <div
          className={`
            fixed lg:static inset-y-0 left-0 z-40
            transform transition-transform duration-300 ease-in-out
            ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <AdminSidebar 
            activeTab={activeTab} 
            setActiveTab={handleSetActiveTab} 
            isMaster={isMaster}
            permissions={permissions}
            plan={subscriberData?.plan}
            subscriberData={subscriberData}
            collapsed={sidebarCollapsed}
            slug={user?.slug || subscriberData?.slug}
            setCollapsed={setSidebarCollapsed}
            onClose={() => setShowMobileSidebar(false)}
          />
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-4 lg:p-6">
            {renderTabContent()}
          </div>
        </main>
      </div>
    </div>
    );
  } catch (error) {
    console.error('❌ [Admin] Erro ao renderizar:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white p-8">
          <h2 className="text-2xl font-bold mb-2">Erro ao carregar Admin</h2>
          <p className="mb-4">{error.message}</p>
          <Button onClick={() => window.location.reload()}>
            Recarregar Página
          </Button>
        </div>
      </div>
    );
  }
}