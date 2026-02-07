import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Receipt, Loader2, LogOut, Plus, XCircle, History, Filter, Search, X, AlertCircle, CheckCircle2, Bell, User, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import toast from 'react-hot-toast';
import InstallAppButton from '../components/InstallAppButton';
import { useComandaWebSocket } from '@/hooks/useComandaWebSocket';
import { useWaiterCallWebSocket } from '@/hooks/useWaiterCallWebSocket';
import { useComandas } from '@/hooks/useComandas';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { COMANDA_STATUS, DEBOUNCE_DELAYS } from '@/utils/constants';
import ColaboradorProfile from '../components/colaboradores/ColaboradorProfile';
import TipsView from '../components/garcom/TipsView';
import ComandaFormModal from '../components/garcom/ComandaFormModal';
import ComandaHistoryModal from '../components/garcom/ComandaHistoryModal';
import ComandaCard from '../components/garcom/ComandaCard';
import StatsCards from '../components/garcom/StatsCards';
import ErrorBoundary from '../components/ErrorBoundary';

export default function Garcom() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState(COMANDA_STATUS.OPEN);
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingComanda, setEditingComanda] = useState(null);
  const [formMode, setFormMode] = useState('create');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [comandaToClose, setComandaToClose] = useState(null);
  const [historyCallsOpen, setHistoryCallsOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showTips, setShowTips] = useState(false);

  // Debounce da busca
  const debouncedSearchTerm = useDebounce(searchTerm, DEBOUNCE_DELAYS.SEARCH);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        if (!me) {
          base44.auth.redirectToLogin('/Garcom');
          return;
        }
        // Verificar se tem perfil de garçom ou é master
        const hasAccess = me?.profile_role === 'garcom' || me?.is_master === true;
        setAllowed(hasAccess);
        if (!hasAccess) {
          setLoading(false);
          return;
        }
      } catch (e) {
        base44.auth.redirectToLogin('/Garcom');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Hook customizado para comandas
  const { comandas, isLoading, stats, createMutation, updateMutation, online } = useComandas(statusFilter, allowed);

  // WebSocket para atualização em tempo real
  useComandaWebSocket(allowed);

  // WebSocket para chamadas de garçom
  const { waiterCalls, allWaiterCalls, setWaiterCalls } = useWaiterCallWebSocket(allowed);

  // Buscar pratos
  const { data: dishes = [] } = useQuery({
    queryKey: ['Dish'],
    queryFn: () => base44.entities.Dish.list(),
    enabled: allowed,
  });

  const safeDishes = useMemo(() => {
    return Array.isArray(dishes) ? dishes.filter((d) => d.is_active !== false) : [];
  }, [dishes]);

  // Memoizar comandas filtradas
  const filteredComandas = useMemo(() => {
    return comandas.filter((c) => {
      // Filtro por status
      if (statusFilter !== 'all' && (c.status || COMANDA_STATUS.OPEN) !== statusFilter) {
        return false;
      }
      
      // Busca por código, mesa ou cliente
      if (debouncedSearchTerm.trim()) {
        const term = debouncedSearchTerm.toLowerCase().trim();
        const code = (c.code || `#${c.id}`).toLowerCase();
        const table = (c.table_name || '').toLowerCase();
        const customer = (c.customer_name || '').toLowerCase();
        return code.includes(term) || table.includes(term) || customer.includes(term);
      }
      
      return true;
    });
  }, [comandas, statusFilter, debouncedSearchTerm]);

  // Memoizar estatísticas de hoje
  const todayStats = useMemo(() => {
    const today = new Date().toDateString();
    const todayComandas = comandas.filter(c => {
      const created = c.created_at ? new Date(c.created_at).toDateString() : '';
      return created === today;
    });
    
    const totalValue = todayComandas.reduce((sum, c) => sum + (c.total || 0), 0);
    const averageTicket = todayComandas.length > 0 ? totalValue / todayComandas.length : 0;
    
    return {
      count: todayComandas.length,
      totalValue,
      averageTicket
    };
  }, [comandas]);

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
          status: COMANDA_STATUS.CANCELLED,
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
            @page { size: 80mm auto; margin: 5mm; }
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
            .info { margin: 8px 0; font-size: 11px; }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-emerald-50 to-teal-50 dark:from-teal-950 dark:via-emerald-950 dark:to-teal-950">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600 dark:text-teal-400" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-teal-50 via-emerald-50 to-teal-50 dark:from-teal-950 dark:via-emerald-950 dark:to-teal-950">
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
    <ErrorBoundary>
      <div className="min-h-screen min-h-screen-mobile bg-gradient-to-br from-teal-50 via-emerald-50 to-teal-50 dark:from-teal-950 dark:via-emerald-950 dark:to-teal-950 pb-safe">
        {/* Header melhorado */}
        <header className="bg-gradient-to-r from-teal-600 via-teal-700 to-teal-600 dark:from-teal-800 dark:via-teal-900 dark:to-teal-800 text-white sticky top-0 z-20 shadow-xl backdrop-blur-sm">
          <div className="px-4 py-4 flex items-center justify-between safe-top">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg">
                <Receipt className="w-7 h-7" />
              </div>
              <div>
                <h1 className="font-bold text-xl">Comandas</h1>
                <p className="text-xs text-teal-100 opacity-90">Gestão de comandas em tempo real</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <InstallAppButton pageName="Garçom" compact />
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/20 min-h-touch" 
                onClick={() => setShowProfile(true)}
                aria-label="Abrir perfil"
              >
                <User className="w-5 h-5 mr-1" />
                <span className="hidden sm:inline">Perfil</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/20 min-h-touch" 
                onClick={() => base44.auth.logout()}
                aria-label="Sair"
              >
                <LogOut className="w-5 h-5 mr-1" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="p-4 max-w-7xl mx-auto pb-24 safe-bottom">
          {/* Notificação de chamadas de garçom - melhorado */}
          {waiterCalls.length > 0 && (
            <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border-2 border-orange-500 rounded-2xl shadow-lg animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <Bell className="w-6 h-6 text-white animate-bounce" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-orange-900 dark:text-orange-100">
                      {waiterCalls.length} {waiterCalls.length === 1 ? 'chamada pendente' : 'chamadas pendentes'}
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      {waiterCalls.map(c => `Mesa ${c.table_number || c.table_id}`).join(', ')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setHistoryCallsOpen(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <History className="w-4 h-4 mr-1" />
                    Histórico
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setWaiterCalls([])}
                    className="border-orange-300 text-orange-700 dark:text-orange-300"
                  >
                    Limpar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Estatísticas de hoje - melhorado */}
          {!isLoading && comandas.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                Relatórios de Hoje
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <Receipt className="w-8 h-8 opacity-80" />
                    <Badge className="bg-white/20 text-white border-0">{todayStats.count}</Badge>
                  </div>
                  <p className="text-sm opacity-90 mb-1">Comandas Hoje</p>
                  <p className="text-3xl font-bold">{todayStats.count}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle2 className="w-8 h-8 opacity-80" />
                  </div>
                  <p className="text-sm opacity-90 mb-1">Valor Total Hoje</p>
                  <p className="text-3xl font-bold">{formatCurrency(todayStats.totalValue)}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <History className="w-8 h-8 opacity-80" />
                  </div>
                  <p className="text-sm opacity-90 mb-1">Ticket Médio</p>
                  <p className="text-3xl font-bold">{formatCurrency(todayStats.averageTicket)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Estatísticas rápidas - melhorado */}
          {!isLoading && comandas.length > 0 && (
            <StatsCards stats={stats} />
          )}

          {/* Busca melhorada */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código, mesa ou cliente..."
                className="pl-10 pr-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 h-12 text-base"
                aria-label="Buscar comandas"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 min-h-touch min-w-touch"
                  aria-label="Limpar busca"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Filtros melhorados */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { value: COMANDA_STATUS.OPEN, label: 'Abertas', count: stats.open },
              { value: COMANDA_STATUS.CLOSED, label: 'Fechadas', count: stats.closed },
              { value: 'all', label: 'Todas', count: stats.total }
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all min-h-touch ${
                  statusFilter === filter.value
                    ? 'bg-teal-600 text-white shadow-lg scale-105'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700'
                }`}
                aria-label={`Filtrar por ${filter.label}`}
              >
                {filter.label}
                {filter.count > 0 && (
                  <Badge className={`ml-2 ${statusFilter === filter.value ? 'bg-white/20 text-white' : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'}`}>
                    {filter.count}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {/* Lista de comandas */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600 dark:text-teal-400" />
            </div>
          ) : filteredComandas.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-12 text-center border border-teal-200 dark:border-teal-800">
              <Receipt className="w-20 h-20 mx-auto mb-4 text-teal-400 dark:text-teal-500 opacity-50" />
              <p className="font-semibold text-xl text-gray-900 dark:text-white mb-2">
                Nenhuma comanda encontrada
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {statusFilter !== 'all' ? 'Altere o filtro ou' : ''} crie uma nova comanda.
              </p>
              <Button onClick={handleNew} className="bg-teal-600 hover:bg-teal-700 text-white min-h-touch px-6 py-3 text-base">
                <Plus className="w-5 h-5 mr-2" />
                Nova Comanda
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredComandas.map((c) => (
                <ComandaCard
                  key={c.id}
                  comanda={c}
                  onEdit={handleEdit}
                  onClose={handleClose}
                  onCancel={handleCancel}
                  onHistory={handleHistory}
                  onPrint={handlePrintComanda}
                />
              ))}
            </div>
          )}
        </main>

        {/* FAB Nova Comanda - melhorado */}
        <button
          onClick={handleNew}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-full shadow-2xl flex items-center justify-center z-30 transition-all hover:scale-110 active:scale-95 min-h-touch safe-bottom"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
          aria-label="Criar nova comanda"
        >
          <Plus className="w-8 h-8" />
        </button>

        {/* Modais */}
        <ComandaFormModal
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) {
              setEditingComanda(null);
            }
          }}
          mode={formMode}
          comanda={editingComanda}
          dishes={safeDishes}
          onCreate={createMutation.mutate}
          onUpdate={updateMutation.mutate}
          isCreating={createMutation.isPending}
          isUpdating={updateMutation.isPending}
          user={user}
        />

        <ComandaHistoryModal
          open={historyOpen}
          onOpenChange={(open) => {
            setHistoryOpen(open);
            if (!open) {
              setEditingComanda(null);
            }
          }}
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

        {/* Modal de Perfil */}
        {showProfile && user && (
          <ColaboradorProfile
            user={user}
            profileRole="garcom"
            onClose={() => setShowProfile(false)}
            onUpdate={(updatedUser) => {
              setUser(updatedUser);
              queryClient.invalidateQueries({ queryKey: ['Comanda'] });
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
