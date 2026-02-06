import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import FinancialDashboard from '../gestor/FinancialDashboard';
import FinancialSkeleton from '../skeletons/FinancialSkeleton';
import { useOrders } from '@/hooks/useOrders';

export default function FinancialTab() {
  // ✅ NOVO: Usar hook useOrders com contexto automático
  const { data: orders = [], isLoading: ordersLoading } = useOrders({
    orderBy: '-created_date'
  });

  const { data: pdvSales = [], isLoading: pdvLoading } = useQuery({
    queryKey: ['pedidosPDV'],
    queryFn: () => base44.entities.PedidoPDV.list('-created_date')
  });

  const isLoading = ordersLoading || pdvLoading;

  if (isLoading) {
    return <FinancialSkeleton />;
  }

  return <FinancialDashboard orders={orders} pdvSales={pdvSales} />;
}