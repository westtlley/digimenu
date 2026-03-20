import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import FinancialDashboard from '../gestor/FinancialDashboard';
import FinancialSkeleton from '../skeletons/FinancialSkeleton';
import { useOrders } from '@/hooks/useOrders';
import { usePermission } from '../permissions/usePermission';
import { getMenuContextEntityOpts, getMenuContextQueryKeyParts } from '@/utils/tenantScope';
import { normalizeOperationalDayCutoffTime } from '@/utils/operationalShift';

export default function FinancialTab() {
  const { menuContext } = usePermission();
  const menuContextQueryKey = getMenuContextQueryKeyParts(menuContext);
  const scopedEntityOpts = getMenuContextEntityOpts(menuContext);
  
  // ✅ NOVO: Usar hook useOrders com contexto automático
  const { data: orders = [], isLoading: ordersLoading } = useOrders({
    orderBy: '-created_date'
  });

  // ✅ CORREÇÃO: Buscar pdvSales com contexto do slug
  const { data: pdvSales = [], isLoading: pdvLoading } = useQuery({
    queryKey: ['pedidosPDV', ...menuContextQueryKey],
    queryFn: async () => {
      if (!menuContext) return [];
      return base44.entities.PedidoPDV.list('-created_date', scopedEntityOpts);
    },
    enabled: !!menuContext,
  });
  const { data: stores = [], isLoading: storeLoading } = useQuery({
    queryKey: ['financialStore', ...menuContextQueryKey],
    queryFn: async () => {
      if (!menuContext) return [];
      return base44.entities.Store.list(null, scopedEntityOpts);
    },
    enabled: !!menuContext,
  });
  const store = stores[0] || null;
  const operationalCutoffTime = normalizeOperationalDayCutoffTime(store?.operational_day_cutoff_time);

  const isLoading = ordersLoading || pdvLoading || storeLoading;

  if (isLoading) {
    return <FinancialSkeleton />;
  }

  return <FinancialDashboard orders={orders} pdvSales={pdvSales} operationalCutoffTime={operationalCutoffTime} />;
}
