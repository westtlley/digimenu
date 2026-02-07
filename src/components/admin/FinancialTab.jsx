import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import FinancialDashboard from '../gestor/FinancialDashboard';
import FinancialSkeleton from '../skeletons/FinancialSkeleton';
import { useOrders } from '@/hooks/useOrders';
import { usePermission } from '../permissions/usePermission';

export default function FinancialTab() {
  const { menuContext } = usePermission();
  
  // ✅ NOVO: Usar hook useOrders com contexto automático
  const { data: orders = [], isLoading: ordersLoading } = useOrders({
    orderBy: '-created_date'
  });

  // ✅ CORREÇÃO: Buscar pdvSales com contexto do slug
  const { data: pdvSales = [], isLoading: pdvLoading } = useQuery({
    queryKey: ['pedidosPDV', menuContext?.type, menuContext?.value],
    queryFn: async () => {
      if (!menuContext) return [];
      const opts = {};
      if (menuContext.type === 'subscriber' && menuContext.value) {
        opts.as_subscriber = menuContext.value;
      }
      return base44.entities.PedidoPDV.list('-created_date', opts);
    },
    enabled: !!menuContext,
  });

  const isLoading = ordersLoading || pdvLoading;

  if (isLoading) {
    return <FinancialSkeleton />;
  }

  return <FinancialDashboard orders={orders} pdvSales={pdvSales} />;
}