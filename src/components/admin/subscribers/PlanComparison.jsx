import React from 'react';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Comparação side-by-side de planos
 */
export default function PlanComparison({ plans = [], currentPlan, onSelectPlan }) {
  if (plans.length < 2) {
    return null;
  }

  const features = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'dishes', label: 'Gestão de Cardápio', icon: '🍽️' },
    { id: 'orders', label: 'Gestão de Pedidos', icon: '📦' },
    { id: 'gestor_pedidos', label: 'Gestor Completo', icon: '🚚' },
    { id: 'delivery_zones', label: 'Zonas de Entrega', icon: '📍' },
    { id: 'coupons', label: 'Cupons', icon: '🎟️' },
    { id: 'promotions', label: 'Promoções', icon: '🎯' },
    { id: 'graficos', label: 'Relatórios', icon: '📈' },
    { id: 'financial', label: 'Financeiro', icon: '💰' },
    { id: 'whatsapp', label: 'WhatsApp', icon: '💬' }
  ];

  const getPermissionLevel = (plan, featureId) => {
    const permissions = plan.permissions || {};
    const actions = permissions[featureId] || [];
    
    if (actions.length === 0) return 'none';
    if (actions.length === 1 && actions[0] === 'view') return 'view';
    if (actions.includes('create') || actions.includes('update')) return 'full';
    return 'limited';
  };

  const renderFeature = (plan, featureId) => {
    const level = getPermissionLevel(plan, featureId);
    
    switch (level) {
      case 'none':
        return <X className="w-4 h-4 text-gray-300" />;
      case 'view':
        return <Badge variant="outline" className="text-xs bg-gray-100">Ver</Badge>;
      case 'limited':
        return <Badge variant="outline" className="text-xs bg-blue-100">Limitado</Badge>;
      case 'full':
        return <Check className="w-4 h-4 text-green-600" />;
      default:
        return <X className="w-4 h-4 text-gray-300" />;
    }
  };

  return (
    <div className="overflow-x-auto">
      <Card className="p-4">
        <h4 className="font-semibold text-lg mb-4">Comparação de Planos</h4>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2 text-sm font-medium text-gray-700">Recurso</th>
              {plans.map(plan => (
                <th
                  key={plan.slug}
                  className={cn(
                    'text-center p-2 text-sm font-medium cursor-pointer transition-colors',
                    currentPlan === plan.slug
                      ? 'bg-blue-100 text-blue-900'
                      : 'hover:bg-gray-50'
                  )}
                  onClick={() => onSelectPlan?.(plan.slug)}
                >
                  {plan.name}
                  {currentPlan === plan.slug && (
                    <Badge variant="secondary" className="ml-2 text-xs">Atual</Badge>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => (
              <tr key={feature.id} className="border-b hover:bg-gray-50">
                <td className="p-2 text-sm">
                  <span className="mr-2">{feature.icon}</span>
                  {feature.label}
                </td>
                {plans.map(plan => (
                  <td key={plan.slug} className="text-center p-2">
                    {renderFeature(plan, feature.id)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
