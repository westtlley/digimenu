import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Share2, DollarSign, ExternalLink, Info, CheckCircle, Clock, 
  Package, TrendingUp, ShoppingCart, Users, AlertCircle, Copy, Download
} from 'lucide-react';
import { formatBrazilianDateTime } from '@/components/utils/dateUtils';
import moment from 'moment';
import StatCard from '@/components/ui/StatCard';
import { SkeletonStats } from '@/components/ui/skeleton';
import DashboardMetrics from './DashboardMetrics';
import DashboardCharts from './DashboardCharts';
import DashboardAdvancedAnalytics from './DashboardAdvancedAnalytics';

export default function DashboardTab({ user, subscriberData, onNavigateToTab }) {
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: store } = useQuery({
    queryKey: ['store'],
    queryFn: () => base44.entities.Store.list().then(stores => stores[0]),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['dashboardOrders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
  });

  const { data: pdvSales = [] } = useQuery({
    queryKey: ['dashboardPDVSales'],
    queryFn: () => base44.entities.PedidoPDV.list('-created_date'),
  });

  const { data: dishes = [] } = useQuery({
    queryKey: ['dishes'],
    queryFn: () => base44.entities.Dish.list(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list('order'),
  });

  // Cálculos: exclui cancelados; faturamento só de entregues
  const today = moment().startOf('day');
  const todayOrders = (orders || []).filter(o => moment(o.created_date).isSame(today, 'day') && o.status !== 'cancelled');
  const todayRevenue = todayOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total || 0), 0);
  
  const thisMonth = moment().startOf('month');
  const monthOrders = (orders || []).filter(o => moment(o.created_date).isSameOrAfter(thisMonth) && o.status !== 'cancelled');
  const monthRevenue = monthOrders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + (o.total || 0), 0);

  const newOrders = orders.filter(o => o.status === 'new').length;
  const preparingOrders = orders.filter(o => ['accepted', 'preparing'].includes(o.status)).length;
  const readyOrders = orders.filter(o => o.status === 'ready').length;
  const deliveringOrders = orders.filter(o => o.status === 'out_for_delivery').length;

  const activeDishes = dishes.filter(d => d.is_active !== false).length;
  const inactiveDishes = dishes.filter(d => d.is_active === false).length;

  const daysRemaining = subscriberData?.expires_at
    ? moment(subscriberData.expires_at).diff(moment(), 'days')
    : null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  // Determinar slug: master usa user.slug, assinante usa subscriberData.slug
  const currentSlug = user?.is_master ? user?.slug : subscriberData?.slug;
  const menuLink = currentSlug 
    ? `${window.location.origin}/s/${currentSlug}`
    : `${window.location.origin}${createPageUrl('Cardapio')}`;

  const copyLink = () => {
    navigator.clipboard.writeText(menuLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=Confira nosso cardápio digital: ${menuLink}`, '_blank');
  };

  const statusLabel = (s) => ({ new: 'Novo', accepted: 'Aceito', preparing: 'Preparando', ready: 'Pronto', out_for_delivery: 'Em Rota', delivered: 'Entregue', cancelled: 'Cancelado' }[s] || s);

  const exportOrdersCSV = () => {
    const headers = ['Data', 'Código', 'Cliente', 'Status', 'Pagamento', 'Total'];
    const rows = orders.map((o) => [
      formatBrazilianDateTime(o.created_date),
      o.order_code || o.id?.toString().slice(-6),
      o.customer_name || '',
      statusLabel(o.status),
      o.payment_method || '',
      (o.total || 0).toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(';')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pedidos-${moment().format('DD-MM-YYYY')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold truncate" style={{ color: 'var(--text-primary)' }}>
            Boa {moment().hour() < 12 ? 'dia' : moment().hour() < 18 ? 'tarde' : 'noite'}, {subscriberData?.name?.split(' ')[0] || user?.full_name?.split(' ')[0] || 'Usuário'}!
          </h2>
          <p className="text-sm sm:text-base truncate" style={{ color: 'var(--text-secondary)' }}>{store?.name || 'Sua Loja'}</p>
        </div>
        {daysRemaining !== null && (
          <Badge className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold ${daysRemaining <= 7 ? 'bg-red-500' : 'bg-green-500'} text-white flex-shrink-0`}>
            {daysRemaining > 0 ? `${daysRemaining} dias restantes` : 'Assinatura Expirada'}
          </Badge>
        )}
      </div>

      {/* Métricas Avançadas */}
      <DashboardMetrics orders={orders} dishes={dishes} pdvSales={pdvSales} />

      {/* Gráficos de Vendas */}
      {(orders.length > 0 || pdvSales.length > 0) && <DashboardCharts orders={orders} pdvSales={pdvSales} />}

      {/* Análises Avançadas */}
      {orders.length > 0 && (
        <DashboardAdvancedAnalytics 
          orders={orders} 
          dishes={dishes} 
          categories={categories} 
        />
      )}

      {/* Stats Cards Rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={ShoppingCart}
          value={todayOrders.length}
          label="Pedidos Hoje"
          color="info"
          delay={0}
        />
        <StatCard
          icon={DollarSign}
          value={formatCurrency(monthRevenue)}
          label="Faturamento Mês"
          color="success"
          delay={0.1}
        />
        <StatCard
          icon={Clock}
          value={newOrders}
          label="Novos Pedidos"
          color="warning"
          delay={0.2}
        />
        <StatCard
          icon={Package}
          value={activeDishes}
          label="Pratos Ativos"
          color="primary"
          delay={0.3}
        />
      </div>

      {/* Pedidos em Andamento */}
      <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Package className="w-5 h-5" />
            Pedidos em Andamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <div className="rounded-lg p-4 text-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <p className="text-3xl font-bold text-blue-600">{newOrders}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Novos</p>
            </div>
            <div className="rounded-lg p-4 text-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <p className="text-3xl font-bold text-yellow-600">{preparingOrders}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Preparando</p>
            </div>
            <div className="rounded-lg p-4 text-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <p className="text-3xl font-bold text-green-600">{readyOrders}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Prontos</p>
            </div>
            <div className="rounded-lg p-4 text-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <p className="text-3xl font-bold text-purple-600">{deliveringOrders}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Em Entrega</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <Link to={createPageUrl('GestorPedidos')} className="flex-1">
              <Button className="w-full min-h-touch">Ver Todos os Pedidos</Button>
            </Link>
            <Button variant="outline" onClick={exportOrdersCSV} className="flex-1 min-h-touch">
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Exportar CSV</span>
              <span className="sm:hidden">Exportar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cardápio Digital */}
      <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Cardápio Digital</CardTitle>
          <Link to={currentSlug ? `/s/${currentSlug}` : createPageUrl('Cardapio')} target="_blank">
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Visualizar
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <Input 
              value={menuLink} 
              readOnly 
              className="flex-1 text-xs sm:text-sm min-h-touch"
              style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            />
            <Button variant="outline" size="icon" onClick={copyLink} className="min-h-touch min-w-touch flex-shrink-0">
              {copiedLink ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={shareWhatsApp} className="flex-1 min-h-touch">
              <Share2 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Compartilhar no WhatsApp</span>
              <span className="sm:hidden">WhatsApp</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Atalhos Rápidos - ao clicar troca a aba (dishes, history, store) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card 
          className="hover:shadow-lg transition-shadow cursor-pointer" 
          onClick={() => onNavigateToTab ? onNavigateToTab('dishes') : (window.location.href = createPageUrl('Admin') + '?tab=dishes')} 
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <CardContent className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4 min-h-touch">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm sm:text-base truncate" style={{ color: 'var(--text-primary)' }}>Gerenciar Cardápio</p>
              <p className="text-xs sm:text-sm truncate" style={{ color: 'var(--text-secondary)' }}>Pratos, categorias e mais</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="hover:shadow-lg transition-shadow cursor-pointer" 
          onClick={() => onNavigateToTab ? onNavigateToTab('history') : (window.location.href = createPageUrl('Admin') + '?tab=history')} 
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <CardContent className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4 min-h-touch">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm sm:text-base truncate" style={{ color: 'var(--text-primary)' }}>Ver Pedidos</p>
              <p className="text-xs sm:text-sm truncate" style={{ color: 'var(--text-secondary)' }}>Histórico completo</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="hover:shadow-lg transition-shadow cursor-pointer" 
          onClick={() => onNavigateToTab ? onNavigateToTab('store') : (window.location.href = createPageUrl('Admin') + '?tab=store')} 
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <CardContent className="p-4 sm:p-6 flex items-center gap-3 sm:gap-4 min-h-touch">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm sm:text-base truncate" style={{ color: 'var(--text-primary)' }}>Configurações</p>
              <p className="text-xs sm:text-sm truncate" style={{ color: 'var(--text-secondary)' }}>Loja e pagamentos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ajuda */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            <Info className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Ajuda - Manual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs sm:text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Está com alguma dúvida sobre como usar?</p>
            <Button variant="outline" className="w-full min-h-touch text-xs sm:text-sm">ACESSAR MANUAL</Button>
          </CardContent>
        </Card>
        <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <CardTitle className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>Suporte</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs sm:text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Abra um chamado e receberá um contato</p>
            <a href="https://wa.me/5586988196114" target="_blank" rel="noopener noreferrer" className="block">
              <Button className="w-full bg-green-600 hover:bg-green-700 min-h-touch text-xs sm:text-sm">ABRIR CHAMADO</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}