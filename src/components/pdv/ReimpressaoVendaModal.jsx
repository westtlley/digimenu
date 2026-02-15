import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, Search, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient as base44 } from '@/api/apiClient';
import { formatCurrency } from '@/utils/formatters';

/**
 * Modal de Reimpressão de Venda (F4 no Menu de Vendas)
 * Busca venda por código e permite reimprimir o cupom
 */
export default function ReimpressaoVendaModal({ open, onOpenChange, onPrintReceipt }) {
  const [codigo, setCodigo] = useState('');
  const [searchCode, setSearchCode] = useState('');

  // Buscar venda quando código é fornecido
  const { data: vendas = [], isLoading, error } = useQuery({
    queryKey: ['pedidosPDV', searchCode],
    queryFn: async () => {
      if (!searchCode) return [];
      const result = await base44.entities.PedidoPDV.list(null, {});
      return result.filter(p => p.order_code?.includes(searchCode));
    },
    enabled: !!searchCode,
  });

  const venda = vendas[0];

  const handleSearch = () => {
    if (!codigo.trim()) return;
    setSearchCode(codigo.trim());
  };

  const handleReimprimir = () => {
    if (!venda) return;
    
    // Preparar dados para impressão
    const saleData = {
      orderCode: venda.order_code,
      total: venda.total,
      payments: venda.payment_method ? [{ 
        method: venda.payment_method, 
        methodLabel: venda.payment_method,
        amount: venda.payment_amount || venda.total 
      }] : [],
      change: venda.change || 0,
      items: venda.items || [],
      customerName: venda.customer_name || 'Cliente Balcão',
      date: venda.created_date
    };

    onPrintReceipt?.(saleData);
    onOpenChange(false);
    setCodigo('');
    setSearchCode('');
  };

  const handleClose = () => {
    onOpenChange(false);
    setCodigo('');
    setSearchCode('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Reimpressão de Venda
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Campo de busca */}
          <div className="space-y-2">
            <Label htmlFor="codigo">Código da Venda</Label>
            <div className="flex gap-2">
              <Input
                id="codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Digite o código da venda"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                autoFocus
              />
              <Button onClick={handleSearch} disabled={!codigo.trim() || isLoading}>
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>

          {/* Resultado da busca */}
          {isLoading && (
            <div className="text-center py-4 text-gray-500">
              Buscando venda...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">Erro ao buscar venda. Tente novamente.</span>
            </div>
          )}

          {searchCode && !isLoading && !venda && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">Nenhuma venda encontrada com o código "{searchCode}"</span>
            </div>
          )}

          {venda && (
            <div className="border rounded-lg p-4 space-y-2 bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-between">
                <span className="font-semibold">Pedido:</span>
                <span>#{venda.order_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Data:</span>
                <span>{new Date(venda.created_date).toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Cliente:</span>
                <span>{venda.customer_name || 'Cliente Balcão'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Itens:</span>
                <span>{venda.items?.length || 0}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="font-bold text-lg">Total:</span>
                <span className="font-bold text-lg">{formatCurrency(venda.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pagamento:</span>
                <span>{venda.payment_method || '-'}</span>
              </div>
              {venda.change > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Troco:</span>
                  <span>{formatCurrency(venda.change)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleReimprimir} 
            disabled={!venda}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Printer className="w-4 h-4 mr-2" />
            Reimprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
