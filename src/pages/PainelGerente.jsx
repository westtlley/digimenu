/**
 * Painel do Gerente — mesmo conteúdo e ferramentas do Painel do Assinante (cargo de confiança),
 * com identidade própria (header roxo, "Painel do Gerente") e aba "Meu perfil" para preencher dados e foto.
 */
import React, { useState, useEffect } from 'react';
import { Loader2, Menu, Power, Shield, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { apiClient as base44 } from '@/api/apiClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { usePermission } from '@/components/permissions/usePermission';
import { useQuery } from '@tanstack/react-query';
import { useDocumentHead } from '@/hooks/useDocumentHead';
import SharedSidebar from '../components/admin/SharedSidebar';
import InstallAppButton from '../components/InstallAppButton';
import WhatsAppComandaToggle from '../components/admin/WhatsAppComandaToggle';
import MobileQuickMenu from '../components/admin/MobileQuickMenu';
import DashboardTab from '../components/admin/DashboardTab';
import DishesTab from '../components/admin/DishesTab';
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
import ColaboradorProfile from '@/components/colaboradores/ColaboradorProfile';

export default function PainelGerente() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  const { loading, permissions, isMaster, hasModuleAccess, user, subscriberData } = usePermission();
  const roles = user?.profile_roles?.length ? user.profile_roles : user?.profile_role ? [user.profile_role] : [];
  const isGerente = roles.includes('gerente');
  const slug = subscriberData?.slug || null;
  const asSub = user?.subscriber_email || subscriberData?.email || null;

  const { data: stores = [] } = useQuery({
    queryKey: ['store', asSub ?? 'gerente'],
    queryFn: () => base44.entities.Store.list(null, asSub ? { as_subscriber: asSub } : {}),
  });
  const store = stores[0];
  useDocumentHead(store);

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const handleSetActiveTab = (tab) => {
    setActiveTab(tab);
    setShowMobileSidebar(false);
    setSearchParams({ tab }, { replace: true });
  };

  const handleLogout = () => {
    base44.auth.logout();
    navigate('/', { replace: true });
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/', { replace: true });
      return;
    }
    if (!isGerente) {
      navigate('/colaborador', { replace: true });
      return;
    }
  }, [loading, user, isGerente, navigate]);

  if (loading || !user || !isGerente) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-gray-900">
        <Loader2 className="w-10 h-10 animate-spin text-violet-600" />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'meu_perfil':
        return (
          <div className="max-w-2xl space-y-6">
            <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Meu perfil</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Estes dados aparecem nos apps (Garçom, PDV, Cozinha, Entregador) quando você estiver logado.
              </p>
              <div className="flex items-center gap-4 mb-4">
                {user?.photo || user?.google_photo ? (
                  <img src={user.photo || user.google_photo} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-violet-200 dark:border-violet-800" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center border-2 border-violet-200 dark:border-violet-800">
                    <User className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{user?.full_name || user?.email}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>
              </div>
              <Button onClick={() => setShowProfileEdit(true)} className="bg-violet-600 hover:bg-violet-700">
                Editar perfil e foto
              </Button>
            </section>
          </div>
        );
      case 'dashboard':
        return <DashboardTab user={user} subscriberData={subscriberData} onNavigateToTab={handleSetActiveTab} />;
      case 'pdv':
        return <div className="p-8 text-center">Use o botão PDV no header</div>;
      case 'caixa':
        return <CaixaTab />;
      case 'orders':
        return <OrdersTab />;
      case 'history':
        return <OrderHistoryTab />;
      case 'clients':
        return <ClientsTab />;
      case 'financial':
        return <FinancialTab />;
      case 'dishes':
      case 'categories':
      case 'complements':
        return (
          <DishesTab
            initialTab={activeTab === 'categories' ? 'categories' : activeTab === 'complements' ? 'complements' : 'dishes'}
          />
        );
      case 'pizza_config':
        return <PizzaConfigTab />;
      case 'delivery_zones':
        return <DeliveryZonesTab />;
      case 'coupons':
        return <CouponsTab />;
      case 'promotions':
        return <PromotionsTab />;
      case 'comandas':
        return <ComandasTab subscriberEmail={asSub || user?.email} />;
      case 'tables':
        return <TablesTab />;
      case 'theme':
        return <ThemeTab />;
      case 'store':
        return <StoreTab />;
      case 'payments':
        return <PaymentMethodsTab />;
      case 'printer':
        return <PrinterConfig />;
      case 'whatsapp':
        return <WhatsAppTab />;
      case 'colaboradores':
        return <ColaboradoresTab isGerentePanel />;
      case '2fa':
        return <TwoFactorAuth user={user} />;
      case 'lgpd':
        return <LGPDCompliance />;
      default:
        return <DashboardTab user={user} subscriberData={subscriberData} onNavigateToTab={handleSetActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen min-h-screen-mobile bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Header: identidade "Painel do Gerente" (roxo) */}
      <header className="bg-gradient-to-r from-violet-700 via-violet-600 to-violet-700 text-white flex-shrink-0 sticky top-0 z-50 shadow-lg safe-top">
        <div className="px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-1 sm:gap-2 max-w-full overflow-hidden">
          <div className="flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
            <button
              onClick={() => setShowMobileSidebar(true)}
              className="lg:hidden min-h-touch min-w-touch flex items-center justify-center p-2 -m-1 hover:bg-white/10 rounded-lg transition flex-shrink-0"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 border-2 border-white/30">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-sm sm:text-base md:text-lg truncate">Painel do Gerente</h1>
              <p className="text-xs text-white/90 truncate">{store?.name || subscriberData?.email || 'Estabelecimento'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <InstallAppButton pageName="Painel" compact />
            {store?.id && (
              <WhatsAppComandaToggle store={store} subscriber={subscriberData} compact />
            )}
            <MobileQuickMenu isMaster={false} hasGestorAccess={true} hasModuleAccess={() => true} slug={slug} plan={subscriberData?.plan || 'basic'} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hidden sm:flex min-h-touch min-w-touch" title="Sair">
                  <Power className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sair</AlertDialogTitle>
                  <AlertDialogDescription>Deseja encerrar sua sessão?</AlertDialogDescription>
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

      {showMobileSidebar && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setShowMobileSidebar(false)} />
      )}

      <div className="flex flex-1 overflow-x-hidden overflow-y-auto">
        <div
          className={`fixed lg:static inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out ${
            showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <SharedSidebar
            activeTab={activeTab}
            setActiveTab={handleSetActiveTab}
            isMaster={false}
            isGerente={true}
            slug={slug}
            permissions={permissions}
            plan={subscriberData?.plan || 'basic'}
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
            onClose={() => setShowMobileSidebar(false)}
            showStoreLogo={true}
            extraTopItem={{ id: 'meu_perfil', label: 'Meu perfil', icon: User }}
          />
        </div>

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="p-4 lg:p-6">
            {renderContent()}
          </div>
        </main>
      </div>

      {showProfileEdit && (
        <ColaboradorProfile
          user={user}
          profileRole="gerente"
          onClose={() => setShowProfileEdit(false)}
          onUpdate={() => setShowProfileEdit(false)}
        />
      )}
    </div>
  );
}
