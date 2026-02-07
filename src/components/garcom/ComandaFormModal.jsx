import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Trash2, Calculator } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/utils/formatters';
import { PAYMENT_METHODS } from '@/utils/constants';
import toast from 'react-hot-toast';

/**
 * Modal para criar/editar/fechar comanda
 */
export default function ComandaFormModal({
  open,
  onOpenChange,
  mode,
  comanda,
  dishes = [],
  onCreate,
  onUpdate,
  isCreating = false,
  isUpdating = false,
  user
}) {
  const [table_name, setTableName] = useState('');
  const [customer_name, setCustomerName] = useState('');
  const [customer_phone, setCustomerPhone] = useState('');
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([{ method: 'pix', amount: '' }]);
  const [tip, setTip] = useState({ type: 'percent', value: '' });
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitCount, setSplitCount] = useState(2);

  useEffect(() => {
    if (mode === 'edit' && comanda) {
      setTableName(comanda.table_name || '');
      setCustomerName(comanda.customer_name || '');
      setCustomerPhone(comanda.customer_phone || '');
      setItems(Array.isArray(comanda.items) ? comanda.items : []);
      setPayments(Array.isArray(comanda.payments) && comanda.payments.length > 0 
        ? comanda.payments 
        : [{ method: 'pix', amount: '' }]);
      setTip(comanda.tip ? { type: comanda.tip.type || 'percent', value: comanda.tip.value || '' } : { type: 'percent', value: '' });
      setSplitEnabled(!!comanda.split_count);
      setSplitCount(comanda.split_count || 2);
    } else if (mode === 'create') {
      setTableName('');
      setCustomerName('');
      setCustomerPhone('');
      setItems([]);
      setPayments([{ method: 'pix', amount: '' }]);
      setTip({ type: 'percent', value: '' });
      setSplitEnabled(false);
      setSplitCount(2);
    } else if (mode === 'close' && comanda) {
      setTableName(comanda.table_name || '');
      setCustomerName(comanda.customer_name || '');
      setCustomerPhone(comanda.customer_phone || '');
      setItems(Array.isArray(comanda.items) ? comanda.items : []);
      setPayments([{ method: 'pix', amount: '' }]);
      setTip({ type: 'percent', value: '' });
      setSplitEnabled(false);
      setSplitCount(2);
    }
  }, [mode, comanda, open]);

  const addItem = () => {
    if (dishes.length === 0) {
      toast.error('Nenhum prato disponível');
      return;
    }
    setItems([...items, { dish_id: dishes[0].id, dish_name: dishes[0].name, quantity: 1, unit_price: dishes[0].price || 0, observations: '' }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const addPayment = () => {
    setPayments([...payments, { method: 'pix', amount: '' }]);
  };

  const updatePayment = (index, field, value) => {
    const newPayments = [...payments];
    newPayments[index] = { ...newPayments[index], [field]: value };
    setPayments(newPayments);
  };

  const removePayment = (index) => {
    if (payments.length > 1) {
      setPayments(payments.filter((_, i) => i !== index));
    }
  };

  const totalItems = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0);
  
  const tipAmount = tip.value 
    ? (tip.type === 'percent' 
        ? totalItems * (parseFloat(tip.value) / 100)
        : parseFloat(tip.value))
    : 0;

  const totalWithTip = totalItems + tipAmount;
  const splitAmount = splitEnabled && splitCount > 0 ? totalWithTip / splitCount : totalWithTip;

  const appendHistory = (arr, action, details) => {
    return [
      ...(Array.isArray(arr) ? arr : []),
      {
        at: new Date().toISOString(),
        by: user?.email || 'sistema',
        action,
        details: details || {},
      },
    ];
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (mode === 'create' && items.length === 0) {
      toast.error('A comanda deve ter pelo menos um item');
      return;
    }

    if (mode === 'create') {
      const history = appendHistory([], 'created', {});
      onCreate({
        code: undefined,
        status: 'open',
        table_name: table_name.trim() || null,
        customer_name: customer_name.trim() || null,
        customer_phone: customer_phone.trim() || null,
        items,
        payments: [],
        total: totalItems,
        created_by: user?.email,
        history,
      });
    } else if (mode === 'close' && comanda) {
      const payArr = payments
        .filter((p) => parseFloat(p.amount) > 0)
        .map((p) => ({
          method: p.method,
          amount: parseFloat(p.amount),
          created_at: new Date().toISOString(),
          created_by: user?.email,
        }));
      
      if (payArr.reduce((sum, p) => sum + p.amount, 0) < totalWithTip) {
        toast.error('O valor dos pagamentos deve ser igual ao total');
        return;
      }

      const history = appendHistory(comanda.history || [], 'closed', { 
        payments: payArr,
        tip: tipAmount > 0 ? tip : null,
        tip_amount: tipAmount,
        split_count: splitEnabled ? splitCount : null
      });
      
      onUpdate({
        id: comanda.id,
        data: {
          ...comanda,
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: user?.email,
          payments: payArr,
          total: totalWithTip,
          tip: tipAmount > 0 ? tip : null,
          tip_amount: tipAmount,
          split_count: splitEnabled ? splitCount : null,
          history,
        },
      });
    } else if (mode === 'edit' && comanda) {
      if (items.length === 0) {
        toast.error('A comanda deve ter pelo menos um item');
        return;
      }
      
      const history = appendHistory(comanda.history || [], 'updated', { summary: 'Alteração de itens ou dados' });
      onUpdate({
        id: comanda.id,
        data: {
          ...comanda,
          table_name: table_name.trim() || null,
          customer_name: customer_name.trim() || null,
          customer_phone: customer_phone.trim() || null,
          items,
          total: totalItems,
          history,
        },
      });
    }
  };

  const isClose = mode === 'close';
  const loading = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' && 'Nova Comanda'}
            {mode === 'edit' && `Editar Comanda ${comanda?.code || `#${comanda?.id}`}`}
            {mode === 'close' && `Fechar Comanda ${comanda?.code || `#${comanda?.id}`}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dados da Mesa/Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Mesa</Label>
              <Input
                value={table_name}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="Número ou nome da mesa"
                disabled={isClose}
              />
            </div>
            <div>
              <Label>Cliente</Label>
              <Input
                value={customer_name}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nome do cliente"
                disabled={isClose}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Telefone</Label>
              <Input
                type="tel"
                value={customer_phone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                disabled={isClose}
              />
            </div>
          </div>

          {/* Itens */}
          {!isClose && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Itens</Label>
                <Button type="button" onClick={addItem} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 p-2 border rounded-lg">
                    <Select
                      value={item.dish_id}
                      onValueChange={(value) => {
                        const dish = dishes.find(d => d.id === value);
                        updateItem(idx, 'dish_id', value);
                        updateItem(idx, 'dish_name', dish?.name || '');
                        updateItem(idx, 'unit_price', dish?.price || 0);
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione o prato" />
                      </SelectTrigger>
                      <SelectContent>
                        {dishes.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name} - {formatCurrency(d.price || 0)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-20"
                      placeholder="Qtd"
                    />
                    <Input
                      type="text"
                      value={item.observations || ''}
                      onChange={(e) => updateItem(idx, 'observations', e.target.value)}
                      className="flex-1"
                      placeholder="Observações"
                    />
                    <Button type="button" onClick={() => removeItem(idx)} size="sm" variant="ghost">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">Nenhum item adicionado</p>
                )}
              </div>
            </div>
          )}

          {/* Exibir itens no fechamento */}
          {isClose && items.length > 0 && (
            <div>
              <Label>Itens da Comanda</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div>
                      <p className="font-medium">{item.quantity}x {item.dish_name}</p>
                      {item.observations && <p className="text-xs text-gray-500">{item.observations}</p>}
                    </div>
                    <p className="font-bold">{formatCurrency((item.quantity || 0) * (item.unit_price || 0))}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Subtotal:</span>
              <span className="font-bold">{formatCurrency(totalItems)}</span>
            </div>

            {/* Gorjeta */}
            {isClose && (
              <div className="space-y-2 mb-2">
                <div className="flex items-center gap-2">
                  <Label className="flex-1">Gorjeta</Label>
                  <Select value={tip.type} onValueChange={(v) => setTip({ ...tip, type: v })}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">%</SelectItem>
                      <SelectItem value="fixed">R$</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    value={tip.value}
                    onChange={(e) => setTip({ ...tip, value: e.target.value })}
                    className="w-24"
                    placeholder="0"
                  />
                </div>
                {tipAmount > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Gorjeta:</span>
                    <span>{formatCurrency(tipAmount)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Dividir conta */}
            {isClose && (
              <div className="space-y-2 mb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="split"
                    checked={splitEnabled}
                    onChange={(e) => setSplitEnabled(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="split" className="flex-1">Dividir conta</Label>
                  {splitEnabled && (
                    <Input
                      type="number"
                      min="2"
                      value={splitCount}
                      onChange={(e) => setSplitCount(parseInt(e.target.value) || 2)}
                      className="w-20"
                    />
                  )}
                </div>
                {splitEnabled && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Valor por pessoa ({splitCount}):</span>
                    <span>{formatCurrency(splitAmount)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(totalWithTip)}</span>
            </div>
          </div>

          {/* Pagamentos (apenas no fechamento) */}
          {isClose && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Pagamentos</Label>
                <Button type="button" onClick={addPayment} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {payments.map((payment, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Select
                      value={payment.method}
                      onValueChange={(value) => updatePayment(idx, 'method', value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map(m => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={payment.amount}
                      onChange={(e) => updatePayment(idx, 'amount', e.target.value)}
                      className="flex-1"
                      placeholder="Valor"
                    />
                    {payments.length > 1 && (
                      <Button type="button" onClick={() => removePayment(idx)} size="sm" variant="ghost">
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Total pago: {formatCurrency(payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-teal-600 hover:bg-teal-700">
              {loading ? 'Salvando...' : mode === 'create' ? 'Criar' : mode === 'close' ? 'Fechar comanda' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
