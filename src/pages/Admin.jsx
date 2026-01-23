import React, { useState, useEffect } from 'react';
import { Settings, LogOut, LogIn, Loader2, Package, Users, Lock, Menu, UtensilsCrossed, Calculator, Truck, KeyRound } from 'lucide-react';
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
import ThemeTab from '../components/admin/ThemeTab';
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
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { usePermission } from '../components/permissions/usePermission';
import { useQueryClient, useQuery } from '@tanstack/react-query';

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

  // TODOS OS HOOKS DEVEM VIR ANTES DE QUALQUER RETURN CONDICIONAL
  // Debug: Log para verificar o estado
  useEffect(() => {
    console.log('🔍 [Admin] Estado atual:');
    console.log('  - loading:', loading);
    console.log('  - isMaster:', isMaster);
    console.log('  - user:', user);
    console.log('  - user?.is_master:', user?.is_master);
    console.log('  - permissions:', permissions);
    console.log('  - permissions type:', typeof permissions);
    console.log('  - permissions is object:', typeof permissions === 'object');
    console.log('  - hasModuleAccess("dishes"):', hasModuleAccess('dishes'));
    console.log('  - subscriberData:', subscriberData);
  }, [loading, isMaster, user, permissions, subscriberData, hasModuleAccess]);

  // Verificação de Acesso - APENAS master pode acessar Admin
  // Assinantes devem usar PainelAssinante
  useEffect(() => {
    if (!loading) {
      console.log('🔍 [Admin] Verificando acesso após loading...');
      console.log('  - isMaster:', isMaster);
      console.log('  - subscriberData:', subscriberData);
      
      if (!isMaster && subscriberData && subscriberData.status === 'active') {
        console.log('🔄 [Admin] Redirecionando assinante para PainelAssinante');
        // Redirecionar assinantes para PainelAssinante
        navigate('/PainelAssinante', { replace: true });
      }
    }
  }, [loading, isMaster, subscriberData, navigate]);

  // Abrir aba via ?tab= na URL (ex: /admin?tab=store)
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  // Loading
  if (loading) {
    console.log('⏳ [Admin] Em loading...');
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Carregando...</p>
        </div>
      </div>
    );
  }
  
  // Se não for master, mostrar tela de acesso negado
  if (!isMaster) {
    console.log('🚫 [Admin] Acesso negado - não é master');
    console.log('🚫 [Admin] user?.is_master:', user?.is_master);
    console.log('🚫 [Admin] permissions:', permissions);
    
    // Se for assinante ativo, mostrar loading enquanto redireciona
    if (subscriberData && subscriberData.status === 'active') {
      console.log('🔄 [Admin] Redirecionando assinante...');
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-white">Redirecionando para Painel do Assinante...</p>
          </div>
        </div>
      );
    }
    
    console.log('🚫 [Admin] Renderizando tela de acesso negado');
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
            <Link to={createPageUrl('Cardapio')} className="block">
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
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab user={user} subscriberData={subscriberData} onNavigateToTab={setActiveTab} />;
      case 'caixa':
        return hasModuleAccess('caixa') ? <CaixaTab /> : <AccessDenied />;
      case 'whatsapp':
        return hasModuleAccess('whatsapp') ? <WhatsAppTab /> : <AccessDenied />;
      case 'clients':
        return hasModuleAccess('clients') ? <ClientsTab /> : <AccessDenied />;
      case 'dishes':
      case 'categories': // ✅ Redirecionar para dishes (categorias dentro de pratos)
      case 'complements': // ✅ Redirecionar para dishes (complementos dentro de pratos)
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
        return hasDishesAccess ? (
          <ErrorBoundary>
            <DishesTab 
              onNavigateToPizzas={() => setActiveTab('pizza_config')}
              initialTab={activeTab === 'categories' ? 'categories' : activeTab === 'complements' ? 'complements' : 'dishes'}
            />
          </ErrorBoundary>
        ) : (
          <div className="p-8 text-center">
            <p className="text-red-500 mb-2">Acesso negado ao módulo de pratos</p>
            <p className="text-sm text-gray-400">
              isMaster: {String(isMaster)} | hasModuleAccess: {String(hasModuleAccess('dishes'))}
            </p>
          </div>
        );
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
      case 'orders':
        return hasModuleAccess('orders') ? <OrdersTab /> : <AccessDenied />;
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
        return <DashboardTab user={user} subscriberData={subscriberData} onNavigateToTab={setActiveTab} />;
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
      <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Header Profissional com Logo */}
      <header className="text-white flex-shrink-0 sticky top-0 z-50 bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border-b border-gray-700 shadow-lg">
        <div className="px-3 sm:px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setShowMobileSidebar(true)}
              className="lg:hidden p-1.5 rounded-lg transition-colors hover:bg-white/10"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Logo da Loja */}
            {store?.logo ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border-2 border-white/20 shadow-md">
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
                  <Settings className="w-6 h-6 text-white" />
                </div>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 border-2 border-white/20">
                <Settings className="w-6 h-6 text-white" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-sm sm:text-base truncate">
                {store?.name || 'Painel Admin'}
              </h1>
              <p className="text-xs text-gray-300 truncate">Administração Master</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle className="text-white hover:bg-gray-700" />
            {(store?.id || subscriberData?.id) && <WhatsAppComandaToggle store={store} subscriber={subscriberData} />}
            {isMaster && (
              <Link to={createPageUrl('Assinantes')}>
                <Button variant="ghost" size="icon" className="text-white bg-purple-600 hover:bg-purple-700 sm:w-auto sm:px-3">
                  <Users className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Assinantes</span>
                </Button>
              </Link>
            )}
            <Link to={createPageUrl('PDV')}>
              <Button variant="ghost" size="icon" className="text-white bg-blue-600 hover:bg-blue-700 sm:w-auto sm:px-3" title="PDV">
                <Calculator className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">PDV</span>
              </Button>
            </Link>
            {hasGestorAccess && (
              <Link to={createPageUrl('GestorPedidos')}>
                <Button variant="ghost" size="icon" className="text-white bg-orange-600 hover:bg-orange-700 sm:w-auto sm:px-3" title="Gestor de Pedidos">
                  <Truck className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Gestor</span>
                </Button>
              </Link>
            )}
            <Link to={createPageUrl('Cardapio')}>
              <Button variant="ghost" size="icon" className="text-white bg-green-600 hover:bg-green-700 sm:w-auto sm:px-3" title="Cardápio">
                <UtensilsCrossed className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Cardápio</span>
              </Button>
            </Link>
            {isMaster && (
              <Button variant="ghost" size="icon" className="text-white bg-amber-600/80 hover:bg-amber-600 sm:w-auto sm:px-3" title="Alterar minha senha" onClick={() => setShowChangePassword(true)}>
                <KeyRound className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Senha</span>
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
            setActiveTab={(tab) => {
              setActiveTab(tab);
              setShowMobileSidebar(false);
            }} 
            isMaster={isMaster}
            permissions={permissions}
            collapsed={sidebarCollapsed}
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