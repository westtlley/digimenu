import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Target,
  Plus,
  ArrowLeft,
  Calendar,
  Loader2,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient as base44 } from '@/api/apiClient';
import { createPageUrl } from '@/utils';
import SaasMetricCard from '../components/admin/SaasMetricCard';
import AlertsSection from '../components/admin/AlertsSection';
import PlanDistributionChart from '../components/admin/PlanDistributionChart';
import UserAuthButton from '../components/atoms/UserAuthButton';
import ThemeToggle from '../components/ui/ThemeToggle';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/formatters';

export default function AdminMasterDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        if (!userData.is_master) {
          navigate('/admin', { replace: true });
        }
      } catch (e) {
        base44.auth.redirectToLogin();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [navigate]);

  // Buscar métricas SaaS
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['saas-metrics'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/metrics/saas`, {
        headers: {
          'Authorization': `Bearer ${base44.auth.getToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao buscar métricas');
      }
      
      const data = await response.json();
      return data.data;
    },
    enabled: !!user?.is_master,
    refetchInterval: 60000, // Atualizar a cada 1 minuto
    refetchOnWindowFocus: true
  });

  const handleRefresh = async () => {
    toast.promise(
      refetchMetrics(),
      {
        loading: 'Atualizando métricas...',
        success: 'Métricas atualizadas!',
        error: 'Erro ao atualizar métricas'
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user?.is_master) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/20">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Admin')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-2xl tracking-tight">Dashboard Executivo</h1>
                  <p className="text-gray-300 text-sm flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {new Date().toLocaleDateString('pt-BR', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </motion.div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={metricsLoading}
                className="text-white hover:bg-white/10"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${metricsLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Link to={createPageUrl('Assinantes')}>
                <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 font-semibold shadow-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Assinante
                </Button>
              </Link>
              <ThemeToggle className="text-white hover:bg-white/10" />
              <UserAuthButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Métricas Principais */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-orange-500" />
            Métricas Chave
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SaasMetricCard
              title="MRR"
              value={formatCurrency(metrics?.mrr || 0)}
              subtitle="Receita Recorrente Mensal"
              change={metrics?.growth}
              icon={DollarSign}
              color="green"
              loading={metricsLoading}
            />
            <SaasMetricCard
              title="ARR"
              value={formatCurrency(metrics?.arr || 0)}
              subtitle="Receita Recorrente Anual"
              icon={TrendingUp}
              color="blue"
              loading={metricsLoading}
            />
            <SaasMetricCard
              title="LTV"
              value={formatCurrency(metrics?.ltv || 0)}
              subtitle="Valor Vitalício do Cliente"
              icon={Target}
              color="purple"
              loading={metricsLoading}
            />
            <SaasMetricCard
              title="Assinantes"
              value={metrics?.payingSubscribers || 0}
              subtitle={`${metrics?.totalSubscribers || 0} total (${metrics?.activeSubscribers || 0} ativos)`}
              icon={Users}
              color="orange"
              loading={metricsLoading}
              onClick={() => navigate(createPageUrl('Assinantes'))}
            />
          </div>
        </motion.div>

        {/* Distribuição e Alertas */}
        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <PlanDistributionChart 
              distribution={metrics?.planDistribution || {}} 
              loading={metricsLoading}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <AlertsSection
              expiringCount={metrics?.expiringCount || 0}
              inactiveCount={metrics?.inactiveCount || 0}
              activeTrialsCount={metrics?.activeTrialsCount || 0}
              onViewExpiring={() => {
                navigate(createPageUrl('Assinantes'));
                toast.success('Filtrar por "Expirando em 7 dias"');
              }}
              onViewInactive={() => {
                navigate(createPageUrl('Assinantes'));
                toast.success('Filtrar por "Inativos"');
              }}
              onViewTrials={() => {
                navigate(createPageUrl('Assinantes'));
                toast.success('Filtrar por "Em Trial"');
              }}
            />
          </motion.div>
        </div>

        {/* Estatísticas Adicionais */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid md:grid-cols-3 gap-6"
        >
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">Taxa de Conversão</h3>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {(metrics?.trialConversion || 0).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 mt-1">Trial → Pagante</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">Novos Este Mês</h3>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {metrics?.newCustomersThisMonth || 0}
            </p>
            <p className="text-sm text-gray-600 mt-1">Novos assinantes</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">Ticket Médio</h3>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(
                metrics?.payingSubscribers > 0 
                  ? metrics.mrr / metrics.payingSubscribers 
                  : 0
              )}
            </p>
            <p className="text-sm text-gray-600 mt-1">Por assinante/mês</p>
          </div>
        </motion.div>

        {/* Ações Rápidas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-xl p-8 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">Pronto para crescer?</h3>
              <p className="text-orange-100">
                Gerencie seus assinantes, visualize relatórios e expanda seu SaaS.
              </p>
            </div>
            <div className="flex gap-3">
              <Link to={createPageUrl('Assinantes')}>
                <Button className="bg-white text-orange-600 hover:bg-orange-50 font-semibold shadow-lg">
                  <Users className="w-4 h-4 mr-2" />
                  Ver Todos Assinantes
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
