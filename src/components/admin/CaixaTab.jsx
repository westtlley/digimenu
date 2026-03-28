import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  DollarSign, TrendingUp, TrendingDown, CheckCircle, 
  AlertTriangle, ArrowLeft, ArrowRight, Banknote, CreditCard,
  Search, X, Filter, Calculator
} from 'lucide-react';
import moment from 'moment';
import toast, { Toaster } from 'react-hot-toast';
import { usePermission } from '../permissions/usePermission';
import { useManagerialAuth } from '@/hooks/useManagerialAuth';
import { getMenuContextEntityOpts, getMenuContextQueryKeyParts } from '@/utils/tenantScope';
import {
  buildCaixaShiftSummary,
  formatOperationalDateLabel,
  getCaixaClosedAt,
  getCaixaOpenedAt,
  normalizeOperationalDayCutoffTime,
} from '@/utils/operationalShift';
import {
  closeCaixaShift,
  createCaixaShiftMovement,
  openCaixaShift,
} from '@/services/caixaShiftService';
import { uiText } from '@/i18n/pt-BR/uiText';

export default function CaixaTab() {
  const caixaText = uiText.caixa;
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [selectedCaixa, setSelectedCaixa] = useState(null);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [withdrawalData, setWithdrawalData] = useState({ amount: '', reason: '' });
  const [supplyData, setSupplyData] = useState({ amount: '', reason: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, open, closed
  const [closingCashAmount, setClosingCashAmount] = useState('');

  const queryClient = useQueryClient();
  const { menuContext } = usePermission();
  const { requireAuthorization, modal } = useManagerialAuth();
  const menuContextQueryKey = getMenuContextQueryKeyParts(menuContext);
  const scopedEntityOpts = getMenuContextEntityOpts(menuContext);
  const caixasQueryKey = ['caixas', ...menuContextQueryKey];
  const caixaOperationsQueryKey = ['caixaOperations', ...menuContextQueryKey];
  const pdvSessionsQueryKey = ['pdvSessions', ...menuContextQueryKey];

  // âœ… CORREÃ‡ÃƒO: Buscar caixas com contexto do slug
  const { data: caixas = [] } = useQuery({
    queryKey: caixasQueryKey,
    queryFn: async () => {
      if (!menuContext) return [];
      return base44.entities.Caixa.list('-opening_date', scopedEntityOpts);
    },
    enabled: !!menuContext,
  });

  // âœ… CORREÃ‡ÃƒO: Buscar operaÃ§Ãµes com contexto do slug
  const { data: operations = [] } = useQuery({
    queryKey: caixaOperationsQueryKey,
    queryFn: async () => {
      if (!menuContext) return [];
      return base44.entities.CaixaOperation.list('-date', scopedEntityOpts);
    },
    enabled: !!menuContext,
  });

  // SessÃµes PDV ativas (multi-PDV: quem estÃ¡ em qual terminal)
  const { data: pdvSessionsRaw = [] } = useQuery({
    queryKey: pdvSessionsQueryKey,
    queryFn: async () => {
      if (!menuContext) return [];
      return base44.entities.PDVSession.list('-created_at', { ended_at: 'null', ...scopedEntityOpts }).catch(() => []);
    },
    enabled: !!menuContext,
  });
  const activePdvSessions = Array.isArray(pdvSessionsRaw) ? pdvSessionsRaw.filter(s => !s.ended_at) : [];
  const latestSessionsByTerminal = Array.from(
    activePdvSessions.reduce((acc, session) => {
      const key = String(session?.terminal_name || session?.terminal_id || 'pdv').toLowerCase().trim();
      const current = acc.get(key);
      const currentStarted = current?.started_at ? new Date(current.started_at).getTime() : 0;
      const sessionStarted = session?.started_at ? new Date(session.started_at).getTime() : 0;
      if (!current || sessionStarted >= currentStarted) {
        acc.set(key, session);
      }
      return acc;
    }, new Map()).values()
  ).sort((a, b) => {
    const aStarted = a?.started_at ? new Date(a.started_at).getTime() : 0;
    const bStarted = b?.started_at ? new Date(b.started_at).getTime() : 0;
    return bStarted - aStarted;
  });
  const displayedActiveSessions = latestSessionsByTerminal.slice(0, 5);
  const hiddenActiveSessionsCount = Math.max(0, latestSessionsByTerminal.length - displayedActiveSessions.length);
  const { data: stores = [] } = useQuery({
    queryKey: ['store', ...menuContextQueryKey],
    queryFn: async () => {
      if (!menuContext) return [];
      return base44.entities.Store.list(null, scopedEntityOpts);
    },
    enabled: !!menuContext,
  });
  const store = stores[0] || null;
  const operationalCutoffTime = normalizeOperationalDayCutoffTime(store?.operational_day_cutoff_time);

  const refreshCaixaQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: caixasQueryKey }),
      queryClient.invalidateQueries({ queryKey: caixaOperationsQueryKey }),
    ]);
  };

  const openCaixaMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return openCaixaShift({
        ...data,
        opened_by: user.email,
      }, scopedEntityOpts);
    },
    onSuccess: async () => {
      await refreshCaixaQueries();
      setShowOpenModal(false);
      setOpeningAmount('');
      toast.success('Caixa aberto com sucesso!');
    },
  });

  const closeCaixaMutation = useMutation({
    mutationFn: async ({ id, closingCash, closingNotes }) => closeCaixaShift(id, {
      closing_amount_cash: Number(closingCash) || 0,
      closing_balance: Number(closingCash) || 0,
      closing_notes: closingNotes || '',
      closing_source: 'painel_assinante',
    }, scopedEntityOpts),
    onSuccess: async (result, variables) => {
      const updatedCaixa = result?.caixa || result;
      await refreshCaixaQueries();
      setShowCloseModal(false);
      setSelectedCaixa((prev) => {
        if (!prev) return prev;
        if (updatedCaixa?.id && updatedCaixa.id === prev.id) return updatedCaixa;
        if (variables?.id !== prev.id) return prev;
        return {
          ...prev,
          status: 'closed',
          closing_source: 'painel_assinante',
          closing_amount_cash: Number(variables?.closingCash) || 0,
          closing_notes: variables?.closingNotes || prev.closing_notes || '',
          closing_date: new Date().toISOString(),
        };
      });
      setClosingCashAmount('');
      setClosingNotes('');
      toast.success('Caixa fechado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao fechar caixa:', error);
      const message = error?.message || '';
      const statusMatch = message.match(/\b(401|403|500)\b/);
      const statusCode = statusMatch?.[1];
      if (statusCode === '401') {
        toast.error('Nao autorizado. Faca login novamente e tente fechar o caixa.');
        return;
      }
      if (statusCode === '403') {
        toast.error('Sem permissao para fechar caixa neste estabelecimento.');
        return;
      }
      if (statusCode === '500') {
        toast.error('Erro interno ao fechar caixa. Tente novamente em instantes.');
        return;
      }
      toast.error(`Erro ao fechar caixa: ${error?.message || 'falha desconhecida'}`);
    }
  });

  const createOperationMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return createCaixaShiftMovement({
        ...data,
        operator: user.email,
      }, scopedEntityOpts);
    },
    onSuccess: async (result) => {
      if (result?.caixa) {
        setSelectedCaixa((prev) => (
          prev && String(prev.id) === String(result.caixa.id)
            ? result.caixa
            : prev
        ));
      }
      await refreshCaixaQueries();
    },
  });

  const handleOpenCaixa = () => {
    const openCaixas = caixas.filter(c => c.status === 'open');
    if (openCaixas.length > 0) {
      toast.error('Ja existe um caixa aberto!');
      return;
    }

    openCaixaMutation.mutate({
      opening_amount_cash: parseFloat(openingAmount) || 0,
    });
  };

  const handleWithdrawal = async () => {
    if (!selectedCaixa || !withdrawalData.amount || !withdrawalData.reason) {
      toast.error('Preencha todos os campos');
      return;
    }

    const withdrawalAmount = parseFloat(withdrawalData.amount);
    if (!Number.isFinite(withdrawalAmount) || withdrawalAmount <= 0) {
      toast.error('Informe um valor valido para a sangria');
      return;
    }

    const selectedSummary = buildCaixaShiftSummary({
      caixa: selectedCaixa,
      operations,
      closingBalance: selectedCaixa?.closing_balance ?? selectedCaixa?.closing_amount_cash ?? null,
      cutoffTime: operationalCutoffTime,
    });
    if (withdrawalAmount > selectedSummary.expectedBalance) {
      toast.error(`Saldo insuficiente! Saldo atual: ${formatCurrency(selectedSummary.expectedBalance)}`);
      return;
    }

    await createOperationMutation.mutateAsync({
      caixa_id: selectedCaixa.id,
      type: 'sangria',
      description: `Sangria: ${withdrawalData.reason}`,
      amount: withdrawalAmount,
      payment_method: 'dinheiro',
      reason: withdrawalData.reason,
    });

    setShowWithdrawalModal(false);
    setWithdrawalData({ amount: '', reason: '' });
    toast.success('Sangria registrada');
  };

  const handleSupply = async () => {
    if (!selectedCaixa || !supplyData.amount || !supplyData.reason) {
      toast.error('Preencha todos os campos');
      return;
    }

    const supplyAmount = parseFloat(supplyData.amount);
    if (!Number.isFinite(supplyAmount) || supplyAmount <= 0) {
      toast.error('Informe um valor valido para o suprimento');
      return;
    }

    await createOperationMutation.mutateAsync({
      caixa_id: selectedCaixa.id,
      type: 'suprimento',
      description: `Suprimento: ${supplyData.reason}`,
      amount: supplyAmount,
      payment_method: 'dinheiro',
      reason: supplyData.reason,
    });

    setShowSupplyModal(false);
    setSupplyData({ amount: '', reason: '' });
    toast.success('Suprimento registrado');
  };

  const handleCloseCaixa = async () => {
    if (!selectedCaixa || !closingCashAmount) {
      toast.error('Informe o valor em dinheiro físico para o fechamento.');
      return;
    }

    const actualCash = parseFloat(closingCashAmount);
    if (!Number.isFinite(actualCash) || actualCash < 0) {
      toast.error('Informe um valor valido de fechamento');
      return;
    }

    closeCaixaMutation.mutate({
      id: selectedCaixa.id,
      closingCash: actualCash,
      closingNotes,
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };
  const getClosingSourceLabel = (caixa) => {
    const source = String(caixa?.closing_source || '').toLowerCase().trim();
    if (source === 'pdv') return 'Fechado pelo PDV';
    if (source === 'painel_assinante') return 'Fechado no painel do assinante';
    return 'Origem do fechamento não informada';
  };

  const openCaixas = caixas.filter(c => c.status === 'open');
  const activeCaixa = openCaixas[0];

  // Filtros
  const filteredCaixas = caixas.filter(c => {
    const matchesSearch = !searchTerm || 
      c.id?.toString().includes(searchTerm) ||
      moment(c.opening_date).format('DD/MM/YYYY').includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'open' && c.status === 'open') ||
      (statusFilter === 'closed' && c.status === 'closed');
    return matchesSearch && matchesStatus;
  });
  const closedCaixas = filteredCaixas.filter(c => c.status === 'closed');
  const visibleClosedCaixas = closedCaixas.slice(0, 6);
  const activeCaixaSummary = useMemo(() => (
    activeCaixa
      ? buildCaixaShiftSummary({
          caixa: activeCaixa,
          operations,
          closingBalance: activeCaixa?.closing_balance ?? activeCaixa?.closing_amount_cash ?? null,
          cutoffTime: operationalCutoffTime,
        })
      : null
  ), [activeCaixa, operations, operationalCutoffTime]);

  // View caixa aberto
  if (selectedCaixa) {
    const caixaSummary = buildCaixaShiftSummary({
      caixa: selectedCaixa,
      operations,
      closingBalance: selectedCaixa?.closing_balance ?? selectedCaixa?.closing_amount_cash ?? null,
      cutoffTime: operationalCutoffTime,
    });
    const caixaOps = caixaSummary.operations;
    const vendas = caixaSummary.sales;
    const totalVendas = caixaSummary.totalSales;
    const totalSangrias = caixaSummary.totalSangrias;
    const totalSuprimentos = caixaSummary.totalSuprimentos;
    const cashVendas = caixaSummary.paymentTotals.cash;
    const saldoAtual = caixaSummary.expectedBalance;
    const isClosed = selectedCaixa.status === 'closed';

    return (
      <>
        <Toaster position="top-center" />
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setSelectedCaixa(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h2 className="text-2xl font-bold">Detalhes do Caixa</h2>
                <p className="text-sm text-muted-foreground">
                  Aberto em {moment(getCaixaOpenedAt(selectedCaixa)).format('DD/MM/YYYY HH:mm')}
                  {selectedCaixa.opened_by && <> por {selectedCaixa.opened_by}</>}
                </p>
                <p className="text-sm text-muted-foreground">
                  Dia operacional: {formatOperationalDateLabel(caixaSummary.operationalDate)}
                  {caixaSummary.turnLabel ? <> · {caixaSummary.turnLabel}</> : null}
                </p>
                {isClosed && selectedCaixa.closed_by && (
                  <p className="text-sm text-muted-foreground">
                    Fechado por: {selectedCaixa.closed_by}
                    {getCaixaClosedAt(selectedCaixa) ? <> · {moment(getCaixaClosedAt(selectedCaixa)).format('DD/MM/YYYY HH:mm')}</> : null}
                  </p>
                )}
              </div>
            </div>
            <Badge className={isClosed ? 'bg-muted text-muted-foreground' : 'bg-green-500'}>
              {isClosed ? caixaText.closed : caixaText.open}
            </Badge>
          </div>

          {/* Resumo Financeiro */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">{caixaText.cash}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(cashVendas)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">{caixaText.pix}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(vendas.filter(op => op.payment_method === 'pix').reduce((sum, op) => sum + op.amount, 0))}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">{caixaText.debit}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(vendas.filter(op => op.payment_method === 'debito').reduce((sum, op) => sum + op.amount, 0))}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">{caixaText.credit}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(vendas.filter(op => op.payment_method === 'credito').reduce((sum, op) => sum + op.amount, 0))}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">{caixaText.others}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(vendas.filter(op => op.payment_method === 'outro').reduce((sum, op) => sum + op.amount, 0))}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Saldo e AÃ§Ãµes */}
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{caixaText.physicalCashControl}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Fundo Inicial</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(selectedCaixa.opening_amount_cash)}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Vendas em Dinheiro</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(cashVendas)}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Suprimentos</p>
                    <p className="text-2xl font-bold text-orange-600">
                      +{formatCurrency(totalSuprimentos)}
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Sangrias</p>
                    <p className="text-2xl font-bold text-red-600">
                      -{formatCurrency(totalSangrias)}
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-primary-foreground">
                  <p className="text-sm opacity-90 mb-2">{caixaText.expectedCashBalance}</p>
                  <p className="text-4xl font-bold">{formatCurrency(saldoAtual)}</p>
                  {isClosed && caixaSummary.closingBalance != null && (
                    <p className="text-sm mt-2 opacity-90">
                      Informado: {formatCurrency(caixaSummary.closingBalance)} · Diferença: {formatCurrency(caixaSummary.differenceAmount)}
                    </p>
                  )}
                </div>

                {!isClosed && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => requireAuthorization('suprimento', () => setShowSupplyModal(true))}
                      className="bg-orange-500 hover:bg-orange-600 h-12"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Suprimento
                    </Button>
                    <Button
                      onClick={() => requireAuthorization('sangria', () => setShowWithdrawalModal(true))}
                      className="bg-red-500 hover:bg-red-600 h-12"
                    >
                      <TrendingDown className="w-4 h-4 mr-2" />
                      Sangria
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total de Vendas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-2">Total Geral</p>
                  <p className="text-4xl font-bold text-green-600">{formatCurrency(totalVendas)}</p>
                  <p className="text-xs text-muted-foreground mt-2">{caixaSummary.salesCount} vendas registradas</p>
                </div>

                {!isClosed && (
                  <Button
                    onClick={() => requireAuthorization('fechar_caixa', () => setShowCloseModal(true))}
                    className="w-full bg-primary hover:bg-primary/90 h-14 text-lg"
                  >
                    {caixaText.closeCashRegister}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* MovimentaÃ§Ãµes */}
          <Card>
            <CardHeader>
              <CardTitle>{caixaText.movementHistory}</CardTitle>
            </CardHeader>
            <CardContent>
              {caixaOps.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{caixaText.noMovements}</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {caixaOps.map(op => (
                    <div key={op.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {op.type === 'venda_pdv' && <Banknote className="w-5 h-5 text-green-600" />}
                        {op.type === 'sangria' && <TrendingDown className="w-5 h-5 text-red-600" />}
                        {op.type === 'suprimento' && <TrendingUp className="w-5 h-5 text-orange-600" />}
                        <div>
                          <p className="font-medium text-sm">{op.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {moment(op.date).format('DD/MM HH:mm')}
                            {op.operator && <> · {caixaText.operatorLabel}: {op.operator}</>}
                          </p>
                          {op.type === 'venda_pdv' && (
                            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                              <div>{op.payment_method}</div>
                              {op.payment_amount && (
                                <div>{caixaText.receivedLabel}: {formatCurrency(op.payment_amount)}</div>
                              )}
                              {op.change > 0 && (
                                <div>{caixaText.changeLabel}: {formatCurrency(op.change)}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`font-bold ${op.type === 'sangria' ? 'text-red-600' : 'text-green-600'}`}>
                        {op.type === 'sangria' ? '-' : '+'}{formatCurrency(op.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modals */}
        <Dialog open={showCloseModal} onOpenChange={(open) => {
          setShowCloseModal(open);
          if (!open) {
            setClosingCashAmount('');
            setClosingNotes('');
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Fechamento do Caixa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  {caixaText.postCloseWarning}
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total em Vendas</span>
                  <span className="font-bold">{formatCurrency(totalVendas)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Saldo Esperado em Dinheiro</span>
                  <span className="font-bold text-blue-600">{formatCurrency(saldoAtual)}</span>
                </div>
              </div>

              <div>
                <Label className="font-semibold">{caixaText.physicalCashAmountLabel}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={closingCashAmount}
                  onChange={(e) => setClosingCashAmount(e.target.value)}
                  placeholder="0,00"
                  className="text-xl font-bold h-14 text-center border-2"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">{caixaText.physicalCashAmountHelp}</p>
                {closingCashAmount && parseFloat(closingCashAmount) !== saldoAtual && (
                  <div className={`mt-2 p-3 rounded-lg ${
                    parseFloat(closingCashAmount) > saldoAtual 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`text-sm font-semibold ${
                      parseFloat(closingCashAmount) > saldoAtual ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {parseFloat(closingCashAmount) > saldoAtual ? 'OK' : 'Atenção'} · {caixaText.differenceLabel}: {formatCurrency(Math.abs(parseFloat(closingCashAmount) - saldoAtual))}
                      {parseFloat(closingCashAmount) > saldoAtual ? ' (Sobra)' : ' (Falta)'}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label>{caixaText.notesOptionalLabel}</Label>
                <Textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder={caixaText.closingNotesPlaceholder}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowCloseModal(false);
                setClosingCashAmount('');
                setClosingNotes('');
              }}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCloseCaixa} 
                disabled={!closingCashAmount}
                className="bg-primary"
              >
                Confirmar Fechamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showWithdrawalModal} onOpenChange={setShowWithdrawalModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Sangria</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={withdrawalData.amount}
                  onChange={(e) => setWithdrawalData({...withdrawalData, amount: e.target.value})}
                  placeholder="0,00"
                  className="text-lg font-semibold"
                />
                {withdrawalData.amount && selectedCaixa && (() => {
                  const summary = buildCaixaShiftSummary({
                    caixa: selectedCaixa,
                    operations,
                    closingBalance: selectedCaixa?.closing_balance ?? selectedCaixa?.closing_amount_cash ?? null,
                    cutoffTime: operationalCutoffTime,
                  });
                  const saldoAtual = summary.expectedBalance;
                  const withdrawalAmount = parseFloat(withdrawalData.amount);
                  const isValid = withdrawalAmount <= saldoAtual;
                  return (
                    <div className={`mt-2 p-2 rounded text-xs ${isValid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                      {caixaText.availableBalance}: {formatCurrency(saldoAtual)}
                      {!isValid && <span className="block font-semibold mt-1">{caixaText.availableBalanceExceeded}</span>}
                    </div>
                  );
                })()}
              </div>
              <div>
                <Label>Motivo</Label>
                <Input
                  value={withdrawalData.reason}
                  onChange={(e) => setWithdrawalData({...withdrawalData, reason: e.target.value})}
                  placeholder={caixaText.withdrawalPlaceholder}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWithdrawalModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleWithdrawal} className="bg-red-600">
                Registrar Sangria
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showSupplyModal} onOpenChange={setShowSupplyModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Suprimento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={supplyData.amount}
                  onChange={(e) => setSupplyData({...supplyData, amount: e.target.value})}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label>Motivo</Label>
                <Input
                  value={supplyData.reason}
                  onChange={(e) => setSupplyData({...supplyData, reason: e.target.value})}
                  placeholder={caixaText.supplyPlaceholder}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSupplyModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSupply} className="bg-orange-600">
                Registrar Suprimento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {modal}
      </>
    );
  }

  // View Principal
  return (
    <>
      <Toaster position="top-center" />
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">{caixaText.title}</h2>
            <p className="text-muted-foreground">{caixaText.subtitle}</p>
          </div>
          <Button
            onClick={() => requireAuthorization('abrir_caixa', () => setShowOpenModal(true))}
            disabled={openCaixas.length > 0}
            className="bg-green-600 hover:bg-green-700 h-12"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Abrir Caixa
          </Button>
        </div>

        {/* SessÃµes PDV ativas (multi-PDV: quem estÃ¡ em qual terminal) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              {caixaText.sessionsTitle}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{caixaText.sessionsDescription}</p>
          </CardHeader>
          <CardContent>
            {latestSessionsByTerminal.length === 0 ? (
              <p className="text-muted-foreground text-sm">{caixaText.noActiveSessions}</p>
            ) : (
              <>
                <ul className="space-y-2">
                  {displayedActiveSessions.map((s) => (
                    <li key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <span className="font-medium">{s.terminal_name || s.terminal_id || 'PDV'}</span>
                        <span className="text-muted-foreground text-sm ml-2">
                          - {s.operator_name || s.operator_email || 'Operador'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        desde {s.started_at ? moment(s.started_at).format('DD/MM HH:mm') : '-'}
                      </span>
                    </li>
                  ))}
                </ul>
                {hiddenActiveSessionsCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-3">
                    {caixaText.hiddenSessions(hiddenActiveSessionsCount)}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {openCaixas.length > 0 && (
          <Card className="border-green-500 border-2 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                    <DollarSign className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div>
                    <Badge className="bg-green-500 mb-2">{caixaText.openCashBadge}</Badge>
                    <p className="text-sm text-muted-foreground">
                      Aberto em {moment(getCaixaOpenedAt(activeCaixa)).format('DD/MM/YYYY HH:mm')}
                      {activeCaixa.opened_by && <> por {activeCaixa.opened_by}</>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Dia operacional: {formatOperationalDateLabel(activeCaixaSummary?.operationalDate)}
                    </p>
                    <p className="text-xl font-bold text-green-600">
                      Fundo Inicial: {formatCurrency(activeCaixa.opening_amount_cash)}
                    </p>
                    <p className="text-sm font-medium text-green-700">
                      Saldo esperado: {formatCurrency(activeCaixaSummary?.expectedBalance)}
                    </p>
                  </div>
                </div>
                <Button onClick={() => setSelectedCaixa(activeCaixa)} size="lg">
                  Gerenciar Caixa
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {openCaixas.length === 0 && (
          <Card className="border-border border-dashed border-2">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold text-muted-foreground mb-2">Nenhum caixa aberto</h3>
              <p className="text-muted-foreground mb-6">{caixaText.noOpenCashDescription}</p>
            </CardContent>
          </Card>
        )}

        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por data ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Abertos</SelectItem>
              <SelectItem value="closed">Fechados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-4">{caixaText.historyTitle}</h3>
          {closedCaixas.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Nenhum caixa fechado ainda
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleClosedCaixas.map((caixa) => {
                const caixaSummary = buildCaixaShiftSummary({
                  caixa,
                  operations,
                  closingBalance: caixa?.closing_balance ?? caixa?.closing_amount_cash ?? null,
                  cutoffTime: operationalCutoffTime,
                });

                return (
                  <Card
                    key={caixa.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedCaixa(caixa)}
                  >
                    <CardContent className="p-4">
                      <Badge className="bg-muted/500 mb-3">{caixaText.closedBadge}</Badge>
                      <p className="text-sm text-muted-foreground mb-1">
                        {formatOperationalDateLabel(caixaSummary.operationalDate)}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        Abertura: {moment(getCaixaOpenedAt(caixa)).format('DD/MM/YYYY HH:mm')}
                      </p>
                      {(caixa.opened_by || caixa.closed_by) && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {caixa.opened_by && <>Aberto por: {caixa.opened_by}</>}
                          {caixa.opened_by && caixa.closed_by && ' · '}
                          {caixa.closed_by && <>Fechado por: {caixa.closed_by}</>}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mb-2">{getClosingSourceLabel(caixa)}</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Vendas</span>
                          <span className="font-bold">{formatCurrency(caixaSummary.totalSales)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Saldo esperado</span>
                          <span className="font-bold">{formatCurrency(caixaSummary.expectedBalance)}</span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t">
                          <span className="font-medium">Fechamento</span>
                          <span className="font-bold text-green-600">
                            {formatCurrency(caixaSummary.closingBalance)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <Dialog open={showOpenModal} onOpenChange={setShowOpenModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Abrir Novo Caixa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  {caixaText.openingHint}
                </p>
              </div>
              <div>
                <Label>Fundo de Caixa Inicial (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="0,00"
                  className="text-xl font-bold h-14"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOpenModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleOpenCaixa}
                disabled={!openingAmount}
                className="bg-green-600"
              >
                Abrir Caixa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {modal}
    </>
  );
}



