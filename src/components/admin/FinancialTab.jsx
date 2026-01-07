import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import FinancialDashboard from '../gestor/FinancialDashboard';
import FinancialSkeleton from '../skeletons/FinancialSkeleton';

export default function FinancialTab() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date')
  });

  if (isLoading) {
    return <FinancialSkeleton />;
  }

  return <FinancialDashboard orders={orders} />;
}