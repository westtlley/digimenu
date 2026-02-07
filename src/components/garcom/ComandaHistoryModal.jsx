import React from 'react';
import { Plus, Edit2, CheckCircle2, XCircle, History } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate } from '@/utils/formatters';

/**
 * Modal para exibir histórico de uma comanda
 */
export default function ComandaHistoryModal({ open, onOpenChange, comanda }) {
  const history = Array.isArray(comanda?.history) ? comanda.history : [];

  const getActionIcon = (action) => {
    switch (action) {
      case 'created':
        return <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'updated':
        return <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'closed':
        return <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return <History className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getActionLabel = (action) => {
    const labels = {
      created: 'Criada',
      updated: 'Atualizada',
      closed: 'Fechada',
      cancelled: 'Cancelada',
    };
    return labels[action] || action;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-800 border-teal-200 dark:border-teal-800">
        <DialogHeader>
          <DialogTitle className="text-teal-700 dark:text-teal-300 flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico — {comanda?.code || `#${comanda?.id}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600 opacity-50" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma alteração registrada.</p>
            </div>
          ) : (
            history.map((h, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg border border-teal-100 dark:border-teal-900 bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  {getActionIcon(h.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-teal-700 dark:text-teal-300">
                      {getActionLabel(h.action)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      {formatDate(h.at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Por: {h.by || 'Sistema'}
                  </p>
                  {h.details && Object.keys(h.details).length > 0 && (
                    <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
                      {h.details.payments && Array.isArray(h.details.payments) && (
                        <div className="space-y-1">
                          <p className="font-medium">Pagamentos:</p>
                          {h.details.payments.map((p, idx) => (
                            <p key={idx} className="pl-2">
                              {p.method}: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.amount)}
                            </p>
                          ))}
                        </div>
                      )}
                      {h.details.summary && (
                        <p className="italic">{h.details.summary}</p>
                      )}
                      {!h.details.payments && !h.details.summary && (
                        <pre className="text-xs">{JSON.stringify(h.details, null, 2)}</pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
