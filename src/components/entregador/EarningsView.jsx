import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DollarSign, TrendingUp, Calendar, Download, Package, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function EarningsView({ entregadorId, darkMode, isOpen, onClose }) {
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

  // Buscar ganhos da API
  const { data: earnings = [], isLoading } = useQuery({
    queryKey: ['delivery-earnings', entregadorId, period],
    queryFn: async () => {
      const response = await base44.get('/delivery-earnings', { entregador_id: entregadorId, period });
      return response || [];
    },
    enabled: isOpen && !!entregadorId
  });

  // Calcular estatísticas
  const totalEarnings = earnings.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalDeliveries = earnings.length;
  const avgPerDelivery = totalDeliveries > 0 ? totalEarnings / totalDeliveries : 0;
  const paidEarnings = earnings.filter(e => e.paid).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const unpaidEarnings = totalEarnings - paidEarnings;

  const exportReport = () => {
    const data = earnings.map(earning => ({
      data: formatDate(earning.delivered_at),
      pedido: earning.order_id || 'N/A',
      valor: earning.amount,
      tipo: earning.calculation_type,
      distancia: earning.distance_km ? `${earning.distance_km} km` : 'N/A',
      pago: earning.paid ? 'Sim' : 'Não'
    }));

    const csv = [
      ['Data', 'Pedido', 'Valor', 'Tipo de Cálculo', 'Distância', 'Pago'],
      ...data.map(row => [row.data, row.pedido, row.valor, row.tipo, row.distancia, row.pago])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ganhos-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Meus Ganhos</DialogTitle>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-green-50'} border ${darkMode ? 'border-gray-700' : 'border-green-200'}`}>
              <DollarSign className={`w-6 h-6 mb-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Ganho</p>
              <p className={`font-bold text-xl ${darkMode ? 'text-white' : 'text-green-700'}`}>
                {formatCurrency(totalEarnings)}
              </p>
            </div>

            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-blue-50'} border ${darkMode ? 'border-gray-700' : 'border-blue-200'}`}>
              <Package className={`w-6 h-6 mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Entregas</p>
              <p className={`font-bold text-xl ${darkMode ? 'text-white' : 'text-blue-700'}`}>
                {totalDeliveries}
              </p>
            </div>

            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-purple-50'} border ${darkMode ? 'border-gray-700' : 'border-purple-200'}`}>
              <TrendingUp className={`w-6 h-6 mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Média/Entrega</p>
              <p className={`font-bold text-xl ${darkMode ? 'text-white' : 'text-purple-700'}`}>
                {formatCurrency(avgPerDelivery)}
              </p>
            </div>

            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-orange-50'} border ${darkMode ? 'border-gray-700' : 'border-orange-200'}`}>
              <Clock className={`w-6 h-6 mb-2 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>A Receber</p>
              <p className={`font-bold text-xl ${darkMode ? 'text-white' : 'text-orange-700'}`}>
                {formatCurrency(unpaidEarnings)}
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

          {/* Lista de ganhos */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8">
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Carregando...</p>
              </div>
            ) : earnings.length === 0 ? (
              <div className="text-center py-8">
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Nenhum ganho encontrado neste período</p>
              </div>
            ) : (
              earnings.map((earning) => (
                <div
                  key={earning.id}
                  className={`p-4 rounded-lg border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          Pedido #{earning.order_id || 'N/A'}
                        </p>
                        {earning.paid && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
                            Pago
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {formatDate(earning.delivered_at)}
                      </p>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                          Tipo: {earning.calculation_type || 'N/A'}
                        </span>
                        {earning.distance_km && (
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                            Distância: {parseFloat(earning.distance_km).toFixed(2)} km
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                        {formatCurrency(earning.amount)}
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
