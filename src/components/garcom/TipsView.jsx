import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DollarSign, TrendingUp, Calendar, Download, Receipt, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function TipsView({ garcomId, darkMode, isOpen, onClose }) {
  const [period, setPeriod] = useState('today'); // today, week, month, all

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Buscar gorjetas da API
  const { data: tips = [], isLoading } = useQuery({
    queryKey: ['waiter-tips', garcomId, period],
    queryFn: async () => {
      const response = await base44.get('/waiter-tips', { garcom_id: garcomId, period });
      return response || [];
    },
    enabled: isOpen && !!garcomId
  });

  // Calcular estatísticas
  const totalTips = tips.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const totalTipsCount = tips.length;
  const avgPerTip = totalTipsCount > 0 ? totalTips / totalTipsCount : 0;

  const exportReport = () => {
    const data = tips.map(tip => ({
      data: formatDate(tip.paid_at),
      comanda: tip.comanda_id || 'N/A',
      mesa: tip.table_id || 'N/A',
      cliente: tip.customer_name || 'N/A',
      valor: tip.amount,
      tipo: tip.tip_type === 'percent' ? `${tip.tip_percentage}%` : 'Fixo'
    }));

    const csv = [
      ['Data', 'Comanda', 'Mesa', 'Cliente', 'Valor', 'Tipo'],
      ...data.map(row => [row.data, row.comanda, row.mesa, row.cliente, row.valor, row.tipo])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gorjetas-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Minhas Gorjetas</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filtros de período */}
          <div className="flex gap-2 flex-wrap">
            {['today', 'week', 'month', 'all'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  period === p
                    ? 'bg-orange-500 text-white'
                    : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p === 'today' ? 'Hoje' : p === 'week' ? '7 Dias' : p === 'month' ? '30 Dias' : 'Todos'}
              </button>
            ))}
          </div>

          {/* Cards de estatísticas */}
          <div className="grid grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-green-50'} border ${darkMode ? 'border-gray-700' : 'border-green-200'}`}>
              <DollarSign className={`w-6 h-6 mb-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Recebido</p>
              <p className={`font-bold text-xl ${darkMode ? 'text-white' : 'text-green-700'}`}>
                {formatCurrency(totalTips)}
              </p>
            </div>

            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-blue-50'} border ${darkMode ? 'border-gray-700' : 'border-blue-200'}`}>
              <Receipt className={`w-6 h-6 mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Gorjetas</p>
              <p className={`font-bold text-xl ${darkMode ? 'text-white' : 'text-blue-700'}`}>
                {totalTipsCount}
              </p>
            </div>

            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-purple-50'} border ${darkMode ? 'border-gray-700' : 'border-purple-200'}`}>
              <TrendingUp className={`w-6 h-6 mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Média/Gorjeta</p>
              <p className={`font-bold text-xl ${darkMode ? 'text-white' : 'text-purple-700'}`}>
                {formatCurrency(avgPerTip)}
              </p>
            </div>
          </div>

          {/* Botão de exportar */}
          <div className="flex justify-end">
            <Button onClick={exportReport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          {/* Lista de gorjetas */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8">
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Carregando...</p>
              </div>
            ) : tips.length === 0 ? (
              <div className="text-center py-8">
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Nenhuma gorjeta encontrada neste período</p>
              </div>
            ) : (
              tips.map((tip) => (
                <div
                  key={tip.id}
                  className={`p-4 rounded-lg border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {tip.comanda_id ? `Comanda #${tip.comanda_id}` : tip.table_id ? `Mesa #${tip.table_id}` : 'N/A'}
                        </p>
                      </div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formatDate(tip.paid_at)}
                      </p>
                      {tip.customer_name && (
                        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Cliente: {tip.customer_name}
                        </p>
                      )}
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                          Tipo: {tip.tip_type === 'percent' ? `${tip.tip_percentage}%` : 'Fixo'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                        {formatCurrency(tip.amount)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
