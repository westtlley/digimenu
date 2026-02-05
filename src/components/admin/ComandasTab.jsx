import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Receipt, Edit2, XCircle, History, Trash2, Search, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
];

const formatCurrency = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const formatDate = (d) =>
  d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';

export default function ComandasTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingComanda, setEditingComanda] = useState(null);
  const [formMode, setFormMode] = useState('create'); // create | edit | close
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [comandaToClose, setComandaToClose] = useState(null);

  const { data: comandas = [], isLoading } = useQuery({
    queryKey: ['Comanda', statusFilter],
    queryFn: () => {
      const params = statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {};
      return base44.entities.Comanda.list('-created_at', params);
    },
  });

  const { data: dishes = [] } = useQuery({
    queryKey: ['Dish'],
    queryFn: () => base44.entities.Dish.list(),
  });

  const safeDishes = Array.isArray(dishes) ? dishes.filter((d) => d.is_active !== false) : [];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Comanda.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Comanda'] });
      setFormOpen(false);
      setEditingComanda(null);
      toast.success('Comanda criada');
    },
    onError: (e) => toast.error(e?.message || 'Erro ao criar'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Comanda.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Comanda'] });
      setFormOpen(false);
      setEditingComanda(null);
      toast.success('Comanda atualizada');
    },
    onError: (e) => toast.error(e?.message || 'Erro ao atualizar'),
  });

  const handleNew = () => {
    setEditingComanda(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleEdit = (c) => {
    setEditingComanda(c);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleClose = (c) => {
    setComandaToClose(c);
    setShowCloseConfirm(true);
  };

  const confirmClose = () => {
    if (comandaToClose) {
      setEditingComanda(comandaToClose);
      setFormMode('close');
      setFormOpen(true);
      setShowCloseConfirm(false);
      setComandaToClose(null);
    }
  };

  const handleCancel = (c) => {
    if (window.confirm(`Tem certeza que deseja cancelar a comanda ${c.code || `#${c.id}`}?`)) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const history = [
        ...(Array.isArray(c.history) ? c.history : []),
        {
          at: new Date().toISOString(),
          by: user?.email || 'sistema',
          action: 'cancelled',
          details: {},
        },
      ];
      updateMutation.mutate({
        id: c.id,
        data: {
          ...c,
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: user?.email,
          history,
        },
      });
    }
  };

  const handleHistory = (c) => {
    setEditingComanda(c);
    setHistoryOpen(true);
  };

  const filtered = comandas.filter((c) => {
    if (statusFilter === 'all') return true;
    return (c.status || 'open') === statusFilter;
  });

  // Estatísticas
  const stats = useMemo(() => {
    const safeComandas = Array.isArray(comandas) ? comandas : [];
    const open = safeComandas.filter(c => (c.status || 'open') === 'open').length;
    const closed = safeComandas.filter(c => c.status === 'closed').length;
    const totalValue = safeComandas.reduce((sum, c) => {
      const total = parseFloat(c.total || c.total_value || 0);
      return sum + (isNaN(total) ? 0 : total);
    }, 0);

    return {
      open,
      closed,
      totalValue
    };
  }, [comandas]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Comandas
          </h2>
          {!isLoading && comandas.length > 0 && (
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {stats.open} abertas · {stats.closed} fechadas · Total: {formatCurrency(stats.totalValue)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="open">Abertas</SelectItem>
              <SelectItem value="closed">Fechadas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Comanda
          </Button>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por código, mesa ou cliente..."
          className="pl-10 pr-10"
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <CardContent className="py-12 text-center">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" style={{ color: 'var(--text-muted)' }} />
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Nenhuma comanda encontrada</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {statusFilter !== 'all' ? 'Altere o filtro ou' : ''} crie uma nova comanda.
            </p>
            <Button onClick={handleNew} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Nova Comanda
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const st = c.status || 'open';
            const isOpen = st === 'open';
            return (
              <Card
                key={c.id}
                className="overflow-hidden"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              >
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    <span style={{ color: 'var(--text-primary)' }}>{c.code || `#${c.id}`}</span>
                  </CardTitle>
                  <Badge
                    variant={isOpen ? 'default' : 'secondary'}
                    className={isOpen ? 'bg-green-600' : st === 'cancelled' ? 'bg-red-600' : ''}
                  >
                    {st === 'open' ? 'Aberta' : st === 'closed' ? 'Fechada' : 'Cancelada'}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p style={{ color: 'var(--text-secondary)' }}>
                    {c.table_name ? `Mesa ${c.table_name}` : '—'} {c.customer_name ? ` · ${c.customer_name}` : ''}
                  </p>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(c.total)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(c.created_at)}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {isOpen && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(c)}>
                          <Edit2 className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleClose(c)}>
                          <XCircle className="w-3 h-3 mr-1" />
                          Fechar
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleHistory(c)}>
                      <History className="w-3 h-3 mr-1" />
                      Histórico
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ComandaFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        comanda={editingComanda}
        dishes={safeDishes}
        onCreate={createMutation.mutate}
        onUpdate={updateMutation.mutate}
        isCreating={createMutation.isPending}
        isUpdating={updateMutation.isPending}
      />

      <ComandaHistoryModal
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        comanda={editingComanda}
      />

      {/* Modal de confirmação de fechamento */}
      <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <DialogContent style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--text-primary)' }} className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Confirmar fechamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p style={{ color: 'var(--text-primary)' }}>
              Tem certeza que deseja fechar a comanda <strong>{comandaToClose?.code || `#${comandaToClose?.id}`}</strong>?
            </p>
            {comandaToClose && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <strong>Total:</strong> {formatCurrency(comandaToClose.total || 0)}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <strong>Itens:</strong> {Array.isArray(comandaToClose.items) ? comandaToClose.items.length : 0}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseConfirm(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmClose}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ComandaFormModal({
  open,
  onOpenChange,
  mode,
  comanda,
  dishes,
  onCreate,
  onUpdate,
  isCreating,
  isUpdating,
}) {
  const [table_name, setTableName] = useState('');
  const [customer_name, setCustomerName] = useState('');
  const [customer_phone, setCustomerPhone] = useState('');
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([{ method: 'pix', amount: '' }]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  React.useEffect(() => {
    if (!open) return;
    if (comanda) {
      setTableName(comanda.table_name || '');
      setCustomerName(comanda.customer_name || '');
      setCustomerPhone(comanda.customer_phone || '');
      setItems(Array.isArray(comanda.items) ? comanda.items : []);
      setPayments(
        Array.isArray(comanda.payments) && comanda.payments.length
          ? comanda.payments.map((p) => ({ method: p.method || 'pix', amount: String(p.amount || '') }))
          : [{ method: 'pix', amount: '' }]
      );
    } else {
      setTableName('');
      setCustomerName('');
      setCustomerPhone('');
      setItems([]);
      setPayments([{ method: 'pix', amount: '' }]);
    }
  }, [open, comanda]);

  const totalItems = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const canClose = totalPaid >= totalItems && totalItems > 0;

  const addItem = () => {
    const d = dishes[0];
    setItems((prev) => [
      ...prev,
      {
        dish_id: d?.id,
        dish_name: d?.name || 'Item',
        quantity: 1,
        unit_price: d?.price ?? d?.unit_price ?? 0,
        observations: '',
      },
    ]);
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const setDish = (idx, dishId) => {
    const d = dishes.find((x) => x.id === dishId || String(x.id) === String(dishId));
    if (d) {
      setItems((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], dish_id: d.id, dish_name: d.name, unit_price: d.price ?? d.unit_price ?? 0 };
        return next;
      });
    }
  };

  const addPayment = () => setPayments((p) => [...p, { method: 'pix', amount: '' }]);
  const removePayment = (i) => setPayments((p) => p.filter((_, j) => j !== i));
  const setPayment = (i, field, value) => {
    setPayments((p) => {
      const n = [...p];
      n[i] = { ...n[i], [field]: value };
      return n;
    });
  };

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
      const history = appendHistory(comanda.history || [], 'closed', { payments: payArr });
      onUpdate({
        id: comanda.id,
        data: {
          ...comanda,
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: user?.email,
          payments: payArr,
          total: totalItems,
          history,
        },
      });
    } else if (mode === 'edit' && comanda) {
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--text-primary)' }}>
            {mode === 'create' && 'Nova Comanda'}
            {mode === 'edit' && `Editar ${comanda?.code || ''}`}
            {mode === 'close' && `Fechar Comanda ${comanda?.code || ''}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isClose && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Mesa</Label>
                  <Input
                    value={table_name}
                    onChange={(e) => setTableName(e.target.value)}
                    placeholder="Ex: 1"
                    className="min-h-touch"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Cliente</Label>
                  <Input
                    value={customer_name}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nome"
                    className="min-h-touch"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Telefone</Label>
                <Input
                  value={customer_phone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="min-h-touch"
                  style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Itens</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={!dishes.length}>
                    <Plus className="w-3 h-3 mr-1" /> Adicionar
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {items.length === 0 ? (
                    <div className="text-center py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                      Nenhum item adicionado. Clique em "Adicionar" para começar.
                    </div>
                  ) : (
                    items.map((it, idx) => {
                      const itemTotal = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
                      return (
                        <div key={idx} className="flex gap-2 flex-wrap items-end p-3 rounded border hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                          <Select value={it.dish_id} onValueChange={(v) => setDish(idx, v)}>
                            <SelectTrigger className="flex-1 min-w-[140px]">
                              <SelectValue placeholder="Selecione o prato" />
                            </SelectTrigger>
                            <SelectContent>
                              {dishes.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name} {d.price ? `- ${formatCurrency(d.price)}` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-1">
                            <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>Qtd:</Label>
                            <Input
                              type="number"
                              min={1}
                              value={it.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                              className="w-16 text-center"
                              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Label className="text-xs" style={{ color: 'var(--text-muted)' }}>R$:</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={it.unit_price}
                              onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="w-24"
                              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                            />
                          </div>
                          <div className="flex items-center gap-2 px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                              {formatCurrency(itemTotal)}
                            </span>
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          <div className="p-3 rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Total:</span>
              <span className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
                {formatCurrency(isClose ? comanda?.total : totalItems)}
              </span>
            </div>
            {!isClose && items.length > 0 && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {items.length} {items.length === 1 ? 'item' : 'itens'} · {items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)} unidades
              </p>
            )}
          </div>

          {isClose && (
            <div>
              <Label>Pagamentos</Label>
              <div className="space-y-2 mt-2">
                {payments.map((p, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Select value={p.method} onValueChange={(v) => setPayment(i, 'method', v)}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={p.amount}
                      onChange={(e) => setPayment(i, 'amount', e.target.value)}
                      style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removePayment(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addPayment}>
                  <Plus className="w-3 h-3 mr-1" /> Forma de pagamento
                </Button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Total:</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalItems)}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Total pago:</span>
                  <span className={`text-sm font-bold ${totalPaid >= totalItems ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(totalPaid)}
                  </span>
                </div>
                {totalPaid > totalItems && (
                  <div className="flex justify-between items-center p-2 rounded border border-green-200 dark:border-green-800" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">Troco:</span>
                    <span className="text-sm font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(totalPaid - totalItems)}
                    </span>
                  </div>
                )}
                {!canClose && totalItems > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded border border-red-200 dark:border-red-800" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-xs text-red-600 dark:text-red-400">
                      Valor pago insuficiente. Faltam {formatCurrency(totalItems - totalPaid)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || (isClose && !canClose && totalItems > 0)}>
              {loading ? 'Salvando...' : mode === 'create' ? 'Criar' : mode === 'close' ? 'Fechar comanda' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ComandaHistoryModal({ open, onOpenChange, comanda }) {
  const history = Array.isArray(comanda?.history) ? comanda.history : [];
  const formatAt = (at) => (at ? new Date(at).toLocaleString('pt-BR') : '');

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
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--text-primary)' }} className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico — {comanda?.code || `#${comanda?.id}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-8">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nenhuma alteração registrada.</p>
            </div>
          ) : (
            history.map((h, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex-shrink-0 mt-0.5">
                  {getActionIcon(h.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {getActionLabel(h.action)}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatAt(h.at)}
                    </span>
                  </div>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    Por: {h.by || 'Sistema'}
                  </p>
                  {h.details && Object.keys(h.details).length > 0 && (
                    <div className="mt-2 p-2 rounded text-xs overflow-x-auto" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      {h.details.payments && Array.isArray(h.details.payments) && (
                        <div className="space-y-1">
                          <p className="font-medium">Pagamentos:</p>
                          {h.details.payments.map((p, idx) => (
                            <p key={idx} className="pl-2">
                              {PAYMENT_METHODS.find(m => m.value === p.method)?.label || p.method}: {formatCurrency(p.amount)}
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
