import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Receipt, Loader2, LogOut, Plus, Edit2, XCircle, History, Trash2, Filter, Search, X, AlertCircle, CheckCircle2, Calculator, Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import toast from 'react-hot-toast';
import InstallAppButton from '../components/InstallAppButton';
import { useComandaWebSocket } from '@/hooks/useComandaWebSocket';
import { useWaiterCallWebSocket } from '@/hooks/useWaiterCallWebSocket';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { saveComandaOffline, updateComandaOffline, getComandasOffline } from '@/utils/offlineStorage';
import ColaboradorProfile from '../components/colaboradores/ColaboradorProfile';

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

export default function Garcom() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('open');
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingComanda, setEditingComanda] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [comandaToClose, setComandaToClose] = useState(null);
  const [historyCallsOpen, setHistoryCallsOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        setAllowed(me?.profile_role === 'garcom' || me?.is_master === true);
        if (!me) base44.auth.redirectToLogin('/Garcom');
      } catch (e) {
        base44.auth.redirectToLogin('/Garcom');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { online, syncing } = useOfflineSync();
  
  const { data: comandas = [], isLoading } = useQuery({
    queryKey: ['Comanda', statusFilter, online],
    queryFn: async () => {
      const params = statusFilter && statusFilter !== 'all' ? { status: statusFilter } : {};
      if (online) {
        return base44.entities.Comanda.list('-created_at', params);
      } else {
        // Buscar do IndexedDB quando offline
        const offlineComandas = await getComandasOffline();
        return offlineComandas.filter(c => {
          if (statusFilter === 'all') return true;
          return (c.status || 'open') === statusFilter;
        });
      }
    },
    enabled: allowed,
    refetchInterval: online ? 5000 : false,
  });

  const { data: dishes = [] } = useQuery({
    queryKey: ['Dish'],
    queryFn: () => base44.entities.Dish.list(),
    enabled: allowed,
  });

  const safeDishes = Array.isArray(dishes) ? dishes.filter((d) => d.is_active !== false) : [];

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (online) {
        return await base44.entities.Comanda.create(data);
      } else {
        // Salvar offline
        const offlineComanda = {
          ...data,
          id: `offline_${Date.now()}`,
          code: data.code || `C-${Date.now().toString().slice(-6)}`
        };
        return await saveComandaOffline(offlineComanda);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Comanda'] });
      setFormOpen(false);
      setEditingComanda(null);
      toast.success(online ? 'Comanda criada com sucesso!' : 'Comanda salva offline. Será sincronizada quando voltar online.');
    },
    onError: (e) => toast.error(e?.message || 'Erro ao criar comanda'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      if (online) {
        return await base44.entities.Comanda.update(id, data);
      } else {
        // Atualizar offline
        return await updateComandaOffline({ ...data, id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['Comanda'] });
      setFormOpen(false);
      setEditingComanda(null);
      toast.success(online ? 'Comanda atualizada com sucesso!' : 'Comanda atualizada offline. Será sincronizada quando voltar online.');
    },
    onError: (e) => toast.error(e?.message || 'Erro ao atualizar comanda'),
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

  const handlePrintComanda = (comanda) => {
    const printWindow = window.open('', '_blank');
    const items = Array.isArray(comanda.items) ? comanda.items : [];
    const itemsHtml = items.map(item => {
      const itemTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
      return `
        <div style="margin: 5px 0; padding: 5px 0; border-bottom: 1px dashed #ccc;">
          <div style="display: flex; justify-content: space-between;">
            <span><strong>${item.quantity}x</strong> ${item.dish_name || 'Item'}</span>
            <span>${formatCurrency(itemTotal)}</span>
          </div>
          ${item.unit_price ? `<div style="font-size: 10px; color: #666;">Unit: ${formatCurrency(item.unit_price)}</div>` : ''}
          ${item.observations ? `<div style="font-size: 10px; color: #666; font-style: italic;">Obs: ${item.observations}</div>` : ''}
        </div>
      `;
    }).join('');

    const total = comanda.total || items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comanda ${comanda.code || `#${comanda.id}`}</title>
          <meta charset="utf-8">
          <style>
            @page {
              size: 80mm auto;
              margin: 5mm;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.4;
              padding: 10px;
              margin: 0;
              max-width: 80mm;
            }
            .header {
              text-align: center;
              margin-bottom: 10px;
              padding-bottom: 10px;
              border-bottom: 2px dashed #000;
            }
            .info {
              margin: 8px 0;
              font-size: 11px;
            }
            .total {
              border-top: 2px solid #000;
              margin-top: 10px;
              padding-top: 10px;
              font-weight: bold;
              font-size: 14px;
              text-align: right;
            }
            .code {
              background: #fff3cd;
              border: 2px solid #ff9800;
              padding: 8px;
              margin: 10px 0;
              text-align: center;
              font-size: 18px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 18px;">COMANDA</h1>
          </div>
          <div class="code">${comanda.code || `#${comanda.id}`}</div>
          <div class="info">
            ${comanda.table_name ? `<strong>Mesa:</strong> ${comanda.table_name}<br>` : ''}
            ${comanda.customer_name ? `<strong>Cliente:</strong> ${comanda.customer_name}<br>` : ''}
            ${comanda.customer_phone ? `<strong>Telefone:</strong> ${comanda.customer_phone}<br>` : ''}
            <strong>Data:</strong> ${comanda.created_at ? new Date(comanda.created_at).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
          </div>
          <div style="margin: 15px 0;">
            <strong>ITENS:</strong>
            ${itemsHtml}
          </div>
          <div class="total">
            TOTAL: ${formatCurrency(total)}
          </div>
          <div style="text-align: center; margin-top: 15px; font-size: 10px; color: #666;">
            ${new Date().toLocaleString('pt-BR')}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const filtered = comandas.filter((c) => {
    // Filtro por status
    if (statusFilter !== 'all' && (c.status || 'open') !== statusFilter) {
      return false;
    }
    
    // Busca por código, mesa ou cliente
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const code = (c.code || `#${c.id}`).toLowerCase();
      const table = (c.table_name || '').toLowerCase();
      const customer = (c.customer_name || '').toLowerCase();
      return code.includes(term) || table.includes(term) || customer.includes(term);
    }
    
    return true;
  });

  // Estatísticas rápidas
  const stats = {
    total: comandas.length,
    open: comandas.filter(c => (c.status || 'open') === 'open').length,
    closed: comandas.filter(c => c.status === 'closed').length,
    totalValue: comandas.reduce((sum, c) => sum + (c.total || 0), 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950 dark:to-emerald-950">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600 dark:text-teal-400" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950 dark:to-emerald-950">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 max-w-md text-center border border-teal-200 dark:border-teal-800">
          <Receipt className="w-16 h-16 text-teal-600 dark:text-teal-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Acesso restrito</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Esta tela é apenas para o perfil Garçom.</p>
          <Button onClick={() => base44.auth.logout()} className="bg-teal-600 hover:bg-teal-700 text-white">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-screen-mobile bg-gradient-to-br from-teal-50 via-emerald-50 to-teal-50 dark:from-teal-950 dark:via-emerald-950 dark:to-teal-950 pb-safe">
      {/* Header com gradiente teal */}
      <header className="bg-gradient-to-r from-teal-600 to-teal-700 dark:from-teal-700 dark:to-teal-800 text-white sticky top-0 z-20 shadow-lg">
        <div className="px-4 py-4 flex items-center justify-between safe-top">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl">Comandas</h1>
              <p className="text-xs text-teal-100 opacity-90">Gestão de comandas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <InstallAppButton pageName="Garçom" compact />
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-white/20 min-h-touch" 
              onClick={() => setShowProfile(true)}
            >
              <User className="w-5 h-5 mr-1" />
              <span className="hidden sm:inline">Perfil</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-white/20 min-h-touch" 
              onClick={() => base44.auth.logout()}
            >
              <LogOut className="w-5 h-5 mr-1" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-6xl mx-auto pb-24 safe-bottom">
        {/* Notificação de chamadas de garçom */}
        {waiterCalls.length > 0 && (
          <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500 rounded-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6 text-orange-600 dark:text-orange-400 animate-pulse" />
                <div>
                  <p className="font-bold text-orange-900 dark:text-orange-100">
                    {waiterCalls.length} {waiterCalls.length === 1 ? 'chamada pendente' : 'chamadas pendentes'}
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    {waiterCalls.map(c => `Mesa ${c.table_number || c.table_id}`).join(', ')}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setWaiterCalls([])}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Limpar
              </Button>
            </div>
          </div>
        )}

        {/* Relatórios e Estatísticas */}
        {!isLoading && comandas.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Relatórios</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Comandas Hoje</p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {comandas.filter(c => {
                          const today = new Date().toDateString();
                          const created = c.created_at ? new Date(c.created_at).toDateString() : '';
                          return created === today;
                        }).length}
                      </p>
                    </div>
                    <Receipt className="w-8 h-8 text-blue-600 dark:text-blue-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">Valor Total Hoje</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {formatCurrency(comandas.filter(c => {
                          const today = new Date().toDateString();
                          const created = c.created_at ? new Date(c.created_at).toDateString() : '';
                          return created === today;
                        }).reduce((sum, c) => sum + (c.total || 0), 0))}
                      </p>
                    </div>
                    <Calculator className="w-8 h-8 text-green-600 dark:text-green-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Ticket Médio</p>
                      <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                        {(() => {
                          const todayComandas = comandas.filter(c => {
                            const today = new Date().toDateString();
                            const created = c.created_at ? new Date(c.created_at).toDateString() : '';
                            return created === today;
                          });
                          const total = todayComandas.reduce((sum, c) => sum + (c.total || 0), 0);
                          return formatCurrency(todayComandas.length > 0 ? total / todayComandas.length : 0);
                        })()}
                      </p>
                    </div>
                    <Calculator className="w-8 h-8 text-orange-600 dark:text-orange-400 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Estatísticas rápidas */}
        {!isLoading && comandas.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-teal-200 dark:border-teal-800">
              <CardContent className="p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-teal-200 dark:border-teal-800">
              <CardContent className="p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400">Abertas</p>
                <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{stats.open}</p>
              </CardContent>
            </Card>
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-teal-200 dark:border-teal-800">
              <CardContent className="p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400">Fechadas</p>
                <p className="text-lg font-bold text-gray-600 dark:text-gray-400">{stats.closed}</p>
              </CardContent>
            </Card>
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-teal-200 dark:border-teal-800">
              <CardContent className="p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Geral</p>
                <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{formatCurrency(stats.totalValue)}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Busca */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, mesa ou cliente..."
              className="pl-10 pr-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
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
        </div>

        {/* Filtros em chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setStatusFilter('open')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all min-h-touch ${
              statusFilter === 'open'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            Abertas
          </button>
          <button
            onClick={() => setStatusFilter('closed')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all min-h-touch ${
              statusFilter === 'closed'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            Fechadas
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all min-h-touch ${
              statusFilter === 'all'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            Todas
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600 dark:text-teal-400" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardContent className="py-16 text-center">
              <Receipt className="w-16 h-16 mx-auto mb-4 text-teal-400 dark:text-teal-500 opacity-50" />
              <p className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                Nenhuma comanda encontrada
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {statusFilter !== 'all' ? 'Altere o filtro ou' : ''} crie uma nova comanda.
              </p>
              <Button onClick={handleNew} className="bg-teal-600 hover:bg-teal-700 text-white min-h-touch">
                <Plus className="w-5 h-5 mr-2" />
                Nova Comanda
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => {
              const st = c.status || 'open';
              const isOpen = st === 'open';
              return (
                <Card
                  key={c.id}
                  className={`overflow-hidden rounded-2xl shadow-lg transition-all hover:shadow-xl border-l-4 ${
                    isOpen
                      ? 'border-l-teal-500 bg-white dark:bg-gray-800'
                      : 'border-l-gray-400 bg-gray-50 dark:bg-gray-900/50'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Receipt className={`w-5 h-5 ${isOpen ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'}`} />
                        <span className="text-gray-900 dark:text-white">{c.code || `#${c.id}`}</span>
                      </CardTitle>
                      <Badge
                        variant={isOpen ? 'default' : 'secondary'}
                        className={
                          isOpen
                            ? 'bg-teal-600 text-white'
                            : st === 'cancelled'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-500 text-white'
                        }
                      >
                        {st === 'open' ? 'Aberta' : st === 'closed' ? 'Fechada' : 'Cancelada'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {c.table_name ? `Mesa ${c.table_name}` : 'Sem mesa'}
                      </p>
                      {c.customer_name && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{c.customer_name}</p>
                      )}
                    </div>
                    
                    {/* Contador de itens */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2 py-1 rounded-full">
                        {Array.isArray(c.items) ? c.items.length : 0} {Array.isArray(c.items) && c.items.length === 1 ? 'item' : 'itens'}
                      </span>
                      {Array.isArray(c.items) && c.items.length > 0 && (
                        <span className="text-gray-400">
                          {c.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} unidades
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                        {formatCurrency(c.total)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {formatDate(c.created_at)}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {isOpen && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(c);
                            }}
                            className="flex-1 min-h-touch border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/30"
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClose(c);
                            }}
                            className="flex-1 min-h-touch border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/30"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Fechar
                          </Button>
                        </>
                      )}
                      {isOpen && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancel(c);
                          }}
                          className="w-full min-h-touch text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleHistory(c);
                        }}
                        className="w-full min-h-touch text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <History className="w-4 h-4 mr-1" />
                        Ver detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* FAB Nova Comanda */}
      <button
        onClick={handleNew}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-full shadow-2xl flex items-center justify-center z-30 transition-all hover:scale-110 min-h-touch safe-bottom"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Modais */}
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

      {/* Modal de Histórico de Chamadas */}
      <Dialog open={historyCallsOpen} onOpenChange={setHistoryCallsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-teal-700 dark:text-teal-300 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Histórico de Chamadas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {allWaiterCalls.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma chamada registrada</p>
              </div>
            ) : (
              allWaiterCalls.map((call) => {
                const isPending = call.status === 'pending';
                const callDate = call.created_at ? new Date(call.created_at).toLocaleString('pt-BR') : '';
                const responseTime = call.answered_at && call.created_at
                  ? Math.round((new Date(call.answered_at) - new Date(call.created_at)) / 1000)
                  : null;
                
                return (
                  <div
                    key={call.id}
                    className={`p-4 rounded-lg border ${
                      isPending
                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Bell className={`w-5 h-5 ${isPending ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400'}`} />
                          <span className="font-bold text-lg">
                            Mesa {call.table_number || call.table_id || 'N/A'}
                          </span>
                          {isPending && (
                            <Badge className="bg-orange-600 text-white animate-pulse">Pendente</Badge>
                          )}
                          {!isPending && (
                            <Badge className="bg-green-600 text-white">Atendida</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Chamada: {callDate}
                        </p>
                        {call.answered_at && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Atendida: {new Date(call.answered_at).toLocaleString('pt-BR')}
                          </p>
                        )}
                        {responseTime !== null && (
                          <p className="text-sm text-teal-600 dark:text-teal-400 font-medium">
                            Tempo de resposta: {responseTime}s
                          </p>
                        )}
                        {call.answered_by && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Atendido por: {call.answered_by}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de fechamento */}
      <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <DialogContent className="bg-white dark:bg-gray-800 border-teal-200 dark:border-teal-800">
          <DialogHeader>
            <DialogTitle className="text-teal-700 dark:text-teal-300 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Confirmar fechamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-gray-700 dark:text-gray-300">
              Tem certeza que deseja fechar a comanda <strong>{comandaToClose?.code || `#${comandaToClose?.id}`}</strong>?
            </p>
            {comandaToClose && (
              <div className="bg-teal-50 dark:bg-teal-900/20 p-3 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Total:</strong> {formatCurrency(comandaToClose.total || 0)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Itens:</strong> {Array.isArray(comandaToClose.items) ? comandaToClose.items.length : 0}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseConfirm(false)} className="border-gray-300 dark:border-gray-600">
              Cancelar
            </Button>
            <Button onClick={confirmClose} className="bg-teal-600 hover:bg-teal-700 text-white">
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
    
    // Validações
    if (mode === 'create' && items.length === 0) {
      toast.error('Adicione pelo menos um item à comanda');
      return;
    }
    
    if (mode === 'edit' && items.length === 0) {
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-800 border-teal-200 dark:border-teal-800">
        <DialogHeader>
          <DialogTitle className="text-teal-700 dark:text-teal-300">
            {mode === 'create' && 'Nova Comanda'}
            {mode === 'edit' && `Editar ${comanda?.code || ''}`}
            {mode === 'close' && `Fechar Comanda ${comanda?.code || ''}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isClose && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Mesa</Label>
                  <Input
                    value={table_name}
                    onChange={(e) => setTableName(e.target.value)}
                    placeholder="Ex: 1"
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Cliente</Label>
                  <Input
                    value={customer_name}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nome"
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Telefone</Label>
                <Input
                  value={customer_phone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-gray-700 dark:text-gray-300">Itens</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={!dishes.length} className="border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300">
                    <Plus className="w-3 h-3 mr-1" /> Adicionar
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex gap-2 flex-wrap items-end p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <Select value={it.dish_id} onValueChange={(v) => setDish(idx, v)}>
                        <SelectTrigger className="flex-1 min-w-[120px] bg-white dark:bg-gray-700">
                          <SelectValue placeholder="Prato" />
                        </SelectTrigger>
                        <SelectContent>
                          {dishes.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={1}
                        value={it.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                        className="w-16 bg-white dark:bg-gray-700"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        value={it.unit_price}
                        onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-24 bg-white dark:bg-gray-700"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-lg text-teal-700 dark:text-teal-300">Total:</span>
              <span className="font-bold text-xl text-teal-700 dark:text-teal-300">
                {formatCurrency(isClose ? comanda?.total : totalItems)}
              </span>
            </div>
            {!isClose && items.length > 0 && (
              <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                {items.length} {items.length === 1 ? 'item' : 'itens'} · {items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)} unidades
              </p>
            )}
          </div>

          {isClose && (
            <div>
              <Label className="text-gray-700 dark:text-gray-300">Pagamentos</Label>
              <div className="space-y-2 mt-2">
                {payments.map((p, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Select value={p.method} onValueChange={(v) => setPayment(i, 'method', v)}>
                      <SelectTrigger className="w-[160px] bg-white dark:bg-gray-700">
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
                      className="bg-white dark:bg-gray-700"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removePayment(i)} className="text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addPayment} className="border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300">
                  <Plus className="w-3 h-3 mr-1" /> Forma de pagamento
                </Button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900/50 rounded">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total:</span>
                  <span className="text-sm font-bold text-teal-700 dark:text-teal-300">{formatCurrency(totalItems)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900/50 rounded">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total pago:</span>
                  <span className={`text-sm font-bold ${totalPaid >= totalItems ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(totalPaid)}
                  </span>
                </div>
                {totalPaid > totalItems && (
                  <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                    <span className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-1">
                      <Calculator className="w-4 h-4" />
                      Troco:
                    </span>
                    <span className="text-sm font-bold text-green-700 dark:text-green-300">
                      {formatCurrency(totalPaid - totalItems)}
                    </span>
                  </div>
                )}
                {!canClose && totalItems > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-gray-300 dark:border-gray-600">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || (isClose && !canClose && totalItems > 0)} 
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
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
                      {formatAt(h.at)}
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
