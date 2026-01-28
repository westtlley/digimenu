import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import FinancialDashboard from '../gestor/FinancialDashboard';
import FinancialSkeleton from '../skeletons/FinancialSkeleton';

export default function FinancialTab() {
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date')
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