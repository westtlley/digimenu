import React from 'react';
import { Receipt, TrendingUp, DollarSign, Calculator } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatters';

/**
 * Cards de estatísticas para o app do garçom
 */
export default function StatsCards({ stats }) {
  const cards = [
    {
      label: 'Total de Comandas',
      value: stats.total,
      icon: Receipt,
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
      textColor: 'text-teal-700 dark:text-teal-300'
    },
    {
      label: 'Abertas',
      value: stats.open,
      icon: TrendingUp,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-700 dark:text-blue-300'
    },
    {
      label: 'Fechadas',
      value: stats.closed,
      icon: Calculator,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-700 dark:text-green-300'
    },
    {
      label: 'Valor Total',
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      textColor: 'text-orange-700 dark:text-orange-300'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className={`${card.bgColor} border-0 shadow-md hover:shadow-lg transition-shadow`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color} bg-opacity-10`}>
                  <Icon className={`w-5 h-5 ${card.textColor}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${card.textColor} mb-1`}>
                {card.value}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {card.label}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
