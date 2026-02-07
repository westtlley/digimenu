import React from 'react';
import { Receipt, Edit2, XCircle, History, CheckCircle2, Clock, User, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatRelativeTime } from '@/utils/formatters';
import { COMANDA_STATUS } from '@/utils/constants';

/**
 * Card de comanda para o app do garçom
 */
export default function ComandaCard({ 
  comanda, 
  onEdit, 
  onClose, 
  onCancel, 
  onHistory,
  onPrint 
}) {
  const status = comanda.status || COMANDA_STATUS.OPEN;
  const isOpen = status === COMANDA_STATUS.OPEN;
  const isClosed = status === COMANDA_STATUS.CLOSED;
  const isCancelled = status === COMANDA_STATUS.CANCELLED;

  const items = Array.isArray(comanda.items) ? comanda.items : [];
  const totalItems = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  return (
    <Card className={`transition-all hover:shadow-lg ${
      isOpen ? 'border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-900/10' :
      isClosed ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10' :
      'border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/10'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                {comanda.code || `#${comanda.id}`}
              </h3>
              <Badge 
                variant={isOpen ? 'default' : isClosed ? 'secondary' : 'destructive'}
                className={
                  isOpen ? 'bg-teal-500 text-white' :
                  isClosed ? 'bg-green-500 text-white' :
                  'bg-red-500 text-white'
                }
              >
                {isOpen ? 'Aberta' : isClosed ? 'Fechada' : 'Cancelada'}
              </Badge>
            </div>
            
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              {comanda.table_name && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Mesa:</span>
                  <span>{comanda.table_name}</span>
                </div>
              )}
              {comanda.customer_name && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{comanda.customer_name}</span>
                </div>
              )}
              {comanda.customer_phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  <span>{comanda.customer_phone}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatRelativeTime(comanda.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-3 mt-3 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {totalItems} {totalItems === 1 ? 'item' : 'itens'}
            </span>
            <span className="text-lg font-bold text-teal-700 dark:text-teal-300">
              {formatCurrency(comanda.total || 0)}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {isOpen && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(comanda)}
                  className="flex-1 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onClose(comanda)}
                  className="flex-1 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Fechar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCancel(comanda)}
                  className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Cancelar
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onHistory(comanda)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <History className="w-4 h-4 mr-1" />
              Histórico
            </Button>
            {onPrint && (
              <Button
              size="sm"
              variant="ghost"
              onClick={() => onPrint(comanda)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Imprimir
            </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
