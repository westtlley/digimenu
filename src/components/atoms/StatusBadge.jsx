import React from 'react';
import { Badge } from '@/components/ui/badge';

/**
 * StatusBadge - Badge com variantes de status predefinidas
 * @param {Object} props
 * @param {string} props.status - Status (success, error, warning, info)
 * @param {React.ReactNode} props.children - Conteúdo do badge
 * @param {string} props.className - Classes CSS adicionais
 */
export function StatusBadge({ status = 'info', children, className = '' }) {
  const variants = {
    success: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
    warning: 'bg-yellow-100 text-yellow-700',
    info: 'bg-blue-100 text-blue-700',
    default: 'bg-gray-100 text-gray-700'
  };

  return (
    <Badge className={`${variants[status] || variants.default} ${className}`}>
      {children}
    </Badge>
  );
}

/**
 * OrderStatusBadge - Badge específico para status de pedidos
 */
export function OrderStatusBadge({ status, className = '' }) {
  const statusConfig = {
    new: { label: 'Novo', variant: 'warning' },
    accepted: { label: 'Aceito', variant: 'info' },
    preparing: { label: 'Preparando', variant: 'info' },
    ready: { label: 'Pronto', variant: 'success' },
    out_for_delivery: { label: 'Em rota', variant: 'info' },
    delivered: { label: 'Entregue', variant: 'success' },
    cancelled: { label: 'Cancelado', variant: 'error' }
  };

  const config = statusConfig[status] || { label: status, variant: 'default' };

  return (
    <StatusBadge status={config.variant} className={className}>
      {config.label}
    </StatusBadge>
  );
}