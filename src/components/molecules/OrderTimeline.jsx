import React from 'react';
import { Check, Clock, AlertCircle, Truck, ChefHat, Package } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * OrderTimeline - Linha do tempo visual de um pedido
 * @param {Object} props
 * @param {Object} props.order - Dados do pedido
 * @param {Array} props.logs - Array de logs do pedido
 */
export function OrderTimeline({ order, logs = [] }) {
  const timeline = [
    {
      key: 'created',
      label: 'Pedido Recebido',
      icon: Package,
      date: order.created_date,
      color: 'blue',
      status: 'completed'
    },
    {
      key: 'accepted',
      label: 'Pedido Aceito',
      icon: Check,
      date: order.accepted_at,
      color: 'green',
      status: order.accepted_at ? 'completed' : order.status === 'cancelled' ? 'skipped' : 'pending'
    },
    {
      key: 'preparing',
      label: 'Em Preparo',
      icon: ChefHat,
      date: order.status === 'preparing' ? new Date().toISOString() : null,
      color: 'yellow',
      status: ['preparing', 'ready', 'out_for_delivery', 'delivered'].includes(order.status) ? 'completed' : order.status === 'cancelled' ? 'skipped' : 'pending'
    },
    {
      key: 'ready',
      label: 'Pedido Pronto',
      icon: Clock,
      date: order.ready_at,
      color: 'green',
      status: order.ready_at ? 'completed' : order.status === 'cancelled' ? 'skipped' : 'pending'
    },
  ];

  if (order.delivery_method === 'delivery') {
    timeline.push({
      key: 'out_for_delivery',
      label: 'Saiu para Entrega',
      icon: Truck,
      date: order.status === 'out_for_delivery' ? new Date().toISOString() : null,
      color: 'blue',
      status: ['out_for_delivery', 'delivered'].includes(order.status) ? 'completed' : order.status === 'cancelled' ? 'skipped' : 'pending'
    });
  }

  timeline.push({
    key: 'delivered',
    label: order.delivery_method === 'delivery' ? 'Entregue' : 'Retirado',
    icon: Check,
    date: order.delivered_at,
    color: 'green',
    status: order.status === 'delivered' ? 'completed' : order.status === 'cancelled' ? 'skipped' : 'pending'
  });

  if (order.status === 'cancelled') {
    timeline.push({
      key: 'cancelled',
      label: 'Pedido Cancelado',
      icon: AlertCircle,
      date: order.updated_date,
      color: 'red',
      status: 'completed',
      description: order.rejection_reason
    });
  }

  const statusColors = {
    completed: 'bg-green-500 border-green-500',
    pending: 'bg-gray-200 border-gray-300',
    skipped: 'bg-gray-100 border-gray-200'
  };

  const iconColors = {
    completed: 'text-white',
    pending: 'text-gray-400',
    skipped: 'text-gray-300'
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm text-gray-700 mb-3">Histórico do Pedido</h3>
      <div className="space-y-3">
        {timeline.map((item, index) => {
          const Icon = item.icon;
          const isLast = index === timeline.length - 1;

          return (
            <div key={item.key} className="relative flex gap-3">
              {/* Line connector */}
              {!isLast && (
                <div className={`absolute left-4 top-10 bottom-0 w-0.5 ${
                  item.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}

              {/* Icon */}
              <div className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${statusColors[item.status]}`}>
                <Icon className={`w-4 h-4 ${iconColors[item.status]}`} />
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`font-medium text-sm ${
                      item.status === 'completed' ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {item.label}
                    </p>
                    {item.date && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {format(new Date(item.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                    {item.description && (
                      <p className="text-xs text-red-600 mt-1 bg-red-50 px-2 py-1 rounded">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Logs adicionais */}
      {logs.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <h4 className="font-semibold text-xs text-gray-600 mb-2">Atividades Recentes</h4>
          <div className="space-y-2">
            {logs.slice(0, 5).map((log, index) => (
              <div key={index} className="text-xs text-gray-500 flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p>{log.action}</p>
                  <p className="text-gray-400">
                    {format(new Date(log.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    {log.user_email && ` - ${log.user_email}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}