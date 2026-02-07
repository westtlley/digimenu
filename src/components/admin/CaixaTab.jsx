import React, { useState } from 'react';
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
  Search, X, Filter
} from 'lucide-react';
import moment from 'moment';
import toast, { Toaster } from 'react-hot-toast';
import { usePermission } from '../permissions/usePermission';

export default function CaixaTab() {
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

  // ✅ CORREÇÃO: Buscar caixas com contexto do slug
  const { data: caixas = [] } = useQuery({
    queryKey: ['caixas', menuContext?.type, menuContext?.value],
    queryFn: async () => {
      if (!menuContext) return [];
      const opts = {};
      if (menuContext.type === 'subscriber' && menuContext.value) {
        opts.as_subscriber = menuContext.value;
      }
      return base44.entities.Caixa.list('-opening_date', opts);
    },
    enabled: !!menuContext,
  });

  // ✅ CORREÇÃO: Buscar operações com contexto do slug
  const { data: operations = [] } = useQuery({
    queryKey: ['caixaOperations', menuContext?.type, menuContext?.value],
    queryFn: async () => {
      if (!menuContext) return [];
      const opts = {};
      if (menuContext.type === 'subscriber' && menuContext.value) {
        opts.as_subscriber = menuContext.value;
      }
      return base44.entities.CaixaOperation.list('-date', opts);
    },
    enabled: !!menuContext,
  });

  const openCaixaMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.Caixa.create({
        ...data,
        owner_email: user.subscriber_email || user.email,
        opened_by: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixas'] });
      setShowOpenModal(false);
      setOpeningAmount('');
      toast.success('✅ Caixa aberto com sucesso!');
    },
  });

  const closeCaixaMutation = useMutation({
    mutationFn: async ({ id, freshCaixa, totals, closingCash, closingNotes }) => {
      const user = await base44.auth.me();
      
      // Usar spread operator com freshCaixa e sobrescrever apenas o necessário
      const updateData = {
  ...freshCaixa,

  // 🔐 Campo obrigatório garantido
  opening_amount_cash: Number(freshCaixa.opening_amount_cash) || 0,

  status: 'closed',
  total_cash: totals.cash,
  total_pix: totals.pix,
  total_debit: totals.debit,
  total_credit: totals.credit,
  total_other: totals.other,
  closing_amount_cash: Number(closingCash) || 0,
  closing_notes: closingNotes || '',
  closed_by: user.email,
  closing_date: new Date().toISOString()
};

      
      // Remover campos que não devem ser atualizados
      delete updateData.id;
      delete updateData.created_date;
      delete updateData.updated_date;
      delete updateData.created_by;
      
      return base44.entities.Caixa.update(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixas'] });
      setShowCloseModal(false);
      setSelectedCaixa(null);
      setClosingNotes('');
      toast.success('✅ Caixa fechado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao fechar caixa:', error);
      toast.error('Erro ao fechar caixa: ' + error.message);
    }
  });

  const createOperationMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.CaixaOperation.create({
        ...data,
        operator: user.email,
        date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixaOperations'] });
      queryClient.invalidateQueries({ queryKey: ['caixas'] });
    },
  });

  const handleOpenCaixa = () => {
    const openCaixas = caixas.filter(c => c.status === 'open');
    if (openCaixas.length > 0) {
      toast.error('❌ Já existe um caixa aberto!');
      return;
    }

    openCaixaMutation.mutate({
      opening_amount_cash: parseFloat(openingAmount) || 0,
      opening_date: new Date().toISOString(),
      status: 'open',
      total_cash: 0,
      total_pix: 0,
      total_debit: 0,
      total_credit: 0,
      total_other: 0,
      withdrawals: 0,
      supplies: 0
    });
  };

  const handleWithdrawal = async () => {
    if (!withdrawalData.amount || !withdrawalData.reason) {
      toast.error('Preencha todos os campos');
      return;
    }

    // Calcular saldo atual antes de permitir sangria
    const caixaOps = operations.filter(op => op.caixa_id === selectedCaixa.id);
    const vendas = caixaOps.filter(op => op.type === 'venda_pdv');
    const sangrias = caixaOps.filter(op => op.type === 'sangria');
    const suprimentos = caixaOps.filter(op => op.type === 'suprimento');

    const cashVendas = vendas.filter(op => op.payment_method === 'dinheiro').reduce((sum, op) => sum + op.amount, 0);
    const totalSangrias = sangrias.reduce((sum, op) => sum + op.amount, 0);
    const totalSuprimentos = suprimentos.reduce((sum, op) => sum + op.amount, 0);
    
    const saldoAtual = (selectedCaixa.opening_amount_cash || 0) + cashVendas + totalSuprimentos - totalSangrias;
    const withdrawalAmount = parseFloat(withdrawalData.amount);

    if (withdrawalAmount > saldoAtual) {
      toast.error(`⚠️ Saldo insuficiente! Saldo atual: ${formatCurrency(saldoAtual)}`);
      return;
    }

    await createOperationMutation.mutateAsync({
      caixa_id: selectedCaixa.id,
      type: 'sangria',
      description: `Sangria: ${withdrawalData.reason}`,
      amount: parseFloat(withdrawalData.amount),
      payment_method: 'dinheiro',
      reason: withdrawalData.reason
    });

    // Buscar dados frescos do banco antes de atualizar
    const freshCaixas = await base44.entities.Caixa.list();
    const freshCaixa = freshCaixas.find(c => c.id === selectedCaixa.id);

    if (!freshCaixa) {
      toast.error('Caixa não encontrado');
      return;
    }

    // Usar spread para garantir todos os campos
    const updateData = {
      ...freshCaixa,
      withdrawals: (freshCaixa.withdrawals || 0) + parseFloat(withdrawalData.amount)
    };
    delete updateData.id;
    delete updateData.created_date;
    delete updateData.updated_date;
    delete updateData.created_by;

    await base44.entities.Caixa.update(selectedCaixa.id, updateData);

    queryClient.invalidateQueries({ queryKey: ['caixas'] });
    setShowWithdrawalModal(false);
    setWithdrawalData({ amount: '', reason: '' });
    toast.success('💰 Sangria registrada');
  };

  const handleSupply = async () => {
    if (!supplyData.amount || !supplyData.reason) {
      toast.error('Preencha todos os campos');
      return;
    }

    await createOperationMutation.mutateAsync({
      caixa_id: selectedCaixa.id,
      type: 'suprimento',
      description: `Suprimento: ${supplyData.reason}`,
      amount: parseFloat(supplyData.amount),
      payment_method: 'dinheiro',
      reason: supplyData.reason
    });

    // Buscar dados frescos do banco antes de atualizar
    const freshCaixas = await base44.entities.Caixa.list();
    const freshCaixa = freshCaixas.find(c => c.id === selectedCaixa.id);

    if (!freshCaixa) {
      toast.error('Caixa não encontrado');
      return;
    }

    // Usar spread para garantir todos os campos
    const updateData = {
      ...freshCaixa,
      supplies: (freshCaixa.supplies || 0) + parseFloat(supplyData.amount)
    };
    delete updateData.id;
    delete updateData.created_date;
    delete updateData.updated_date;
    delete updateData.created_by;

    await base44.entities.Caixa.update(selectedCaixa.id, updateData);

    queryClient.invalidateQueries({ queryKey: ['caixas'] });
    setShowSupplyModal(false);
    setSupplyData({ amount: '', reason: '' });
    toast.success('💵 Suprimento registrado');
  };

  const handleCloseCaixa = async () => {
    if (!selectedCaixa || !closingCashAmount) {
      toast.error('Informe o valor em dinheiro físico para fechamento');
      return;
    }

    const cashOperations = operations.filter(op => 
      op.caixa_id === selectedCaixa.id && op.type === 'venda_pdv'
    );

    // Calcular totais por forma de pagamento
    const totals = {
      cash: cashOperations.filter(op => op.payment_method === 'dinheiro').reduce((sum, op) => sum + op.amount, 0),
      pix: cashOperations.filter(op => op.payment_method === 'pix').reduce((sum, op) => sum + op.amount, 0),
      debit: cashOperations.filter(op => op.payment_method === 'debito').reduce((sum, op) => sum + op.amount, 0),
      credit: cashOperations.filter(op => op.payment_method === 'credito').reduce((sum, op) => sum + op.amount, 0),
      other: cashOperations.filter(op => op.payment_method === 'outro').reduce((sum, op) => sum + op.amount, 0),
    };

    // Buscar dados frescos do banco antes de fechar
    const freshCaixas = await base44.entities.Caixa.list();
    const freshCaixa = freshCaixas.find(c => c.id === selectedCaixa.id);

    if (!freshCaixa) {
      toast.error('Caixa não encontrado');
      return;
    }

    const expectedCash = 
      (freshCaixa.opening_amount_cash || 0) +
      totals.cash +
      (freshCaixa.supplies || 0) -
      (freshCaixa.withdrawals || 0);

    const actualCash = parseFloat(closingCashAmount);

    closeCaixaMutation.mutate({
      id: selectedCaixa.id,
      freshCaixa,
      totals,
      closingCash: actualCash,
      closingNotes: closingNotes + (actualCash !== expectedCash ? `\n\nDiferença: ${formatCurrency(actualCash - expectedCash)}` : '')
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
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

  // View caixa aberto
  if (selectedCaixa) {
    const caixaOps = operations.filter(op => op.caixa_id === selectedCaixa.id);
    const vendas = caixaOps.filter(op => op.type === 'venda_pdv');
    const sangrias = caixaOps.filter(op => op.type === 'sangria');
    const suprimentos = caixaOps.filter(op => op.type === 'suprimento');

    const totalVendas = vendas.reduce((sum, op) => sum + op.amount, 0);
    const totalSangrias = sangrias.reduce((sum, op) => sum + op.amount, 0);
    const totalSuprimentos = suprimentos.reduce((sum, op) => sum + op.amount, 0);

    const cashVendas = vendas.filter(op => op.payment_method === 'dinheiro').reduce((sum, op) => sum + op.amount, 0);
    const saldoAtual = (selectedCaixa.opening_amount_cash || 0) + cashVendas + totalSuprimentos - totalSangrias;

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
                <p className="text-sm text-gray-600">
                  Aberto em {moment(selectedCaixa.opening_date).format('DD/MM/YYYY HH:mm')}
                </p>
              </div>
            </div>
            <Badge className={isClosed ? 'bg-gray-500' : 'bg-green-500'}>
              {isClosed ? '🔒 Fechado' : '✅ Aberto'}
            </Badge>
          </div>

          {/* Resumo Financeiro */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">💵 Dinheiro</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(cashVendas)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">📲 PIX</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(vendas.filter(op => op.payment_method === 'pix').reduce((sum, op) => sum + op.amount, 0))}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">💳 Débito</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(vendas.filter(op => op.payment_method === 'debito').reduce((sum, op) => sum + op.amount, 0))}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">💳 Crédito</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(vendas.filter(op => op.payment_method === 'credito').reduce((sum, op) => sum + op.amount, 0))}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-600">🧾 Outros</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatCurrency(vendas.filter(op => op.payment_method === 'outro').reduce((sum, op) => sum + op.amount, 0))}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Saldo e Ações */}
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Controle de Dinheiro Físico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Fundo Inicial</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(selectedCaixa.opening_amount_cash)}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Vendas em Dinheiro</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(cashVendas)}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Suprimentos</p>
                    <p className="text-2xl font-bold text-orange-600">
                      +{formatCurrency(totalSuprimentos)}
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Sangrias</p>
                    <p className="text-2xl font-bold text-red-600">
                      -{formatCurrency(totalSangrias)}
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-white">
                  <p className="text-sm opacity-90 mb-2">💵 Saldo Atual em Dinheiro</p>
                  <p className="text-4xl font-bold">{formatCurrency(saldoAtual)}</p>
                </div>

                {!isClosed && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => setShowSupplyModal(true)}
                      className="bg-orange-500 hover:bg-orange-600 h-12"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Suprimento
                    </Button>
                    <Button
                      onClick={() => setShowWithdrawalModal(true)}
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
                  <p className="text-sm text-gray-600 mb-2">Total Geral</p>
                  <p className="text-4xl font-bold text-green-600">{formatCurrency(totalVendas)}</p>
                  <p className="text-xs text-gray-500 mt-2">{vendas.length} vendas registradas</p>
                </div>

                {!isClosed && (
                  <Button
                    onClick={() => setShowCloseModal(true)}
                    className="w-full bg-gray-900 hover:bg-gray-800 h-14 text-lg"
                  >
                    🔒 Fechar Caixa
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Movimentações */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Movimentações</CardTitle>
            </CardHeader>
            <CardContent>
              {caixaOps.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nenhuma movimentação registrada</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {caixaOps.map(op => (
                    <div key={op.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {op.type === 'venda_pdv' && <Banknote className="w-5 h-5 text-green-600" />}
                        {op.type === 'sangria' && <TrendingDown className="w-5 h-5 text-red-600" />}
                        {op.type === 'suprimento' && <TrendingUp className="w-5 h-5 text-orange-600" />}
                        <div>
                          <p className="font-medium text-sm">{op.description}</p>
                          <p className="text-xs text-gray-500">
                            {moment(op.date).format('DD/MM HH:mm')}
                          </p>
                          {op.type === 'venda_pdv' && (
                            <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                              <div>💳 {op.payment_method}</div>
                              {op.payment_amount && (
                                <div>💵 Recebido: {formatCurrency(op.payment_amount)}</div>
                              )}
                              {op.change > 0 && (
                                <div>💸 Troco: {formatCurrency(op.change)}</div>
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
                  ⚠️ Após o fechamento, o caixa não poderá ser editado
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
                <Label className="font-semibold">Valor Real em Dinheiro Físico (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={closingCashAmount}
                  onChange={(e) => setClosingCashAmount(e.target.value)}
                  placeholder="0,00"
                  className="text-xl font-bold h-14 text-center border-2"
                  autoFocus
                />
                <p className="text-xs text-gray-600 mt-1">Informe o valor físico contado no caixa</p>
                {closingCashAmount && parseFloat(closingCashAmount) !== saldoAtual && (
                  <div className={`mt-2 p-3 rounded-lg ${
                    parseFloat(closingCashAmount) > saldoAtual 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`text-sm font-semibold ${
                      parseFloat(closingCashAmount) > saldoAtual ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {parseFloat(closingCashAmount) > saldoAtual ? '✅' : '⚠️'} Diferença: {formatCurrency(Math.abs(parseFloat(closingCashAmount) - saldoAtual))}
                      {parseFloat(closingCashAmount) > saldoAtual ? ' (Sobra)' : ' (Falta)'}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label>Observações (opcional)</Label>
                <Textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Adicione observações sobre o fechamento..."
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
                className="bg-gray-900"
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
                  const caixaOps = operations.filter(op => op.caixa_id === selectedCaixa.id);
                  const vendas = caixaOps.filter(op => op.type === 'venda_pdv');
                  const sangrias = caixaOps.filter(op => op.type === 'sangria');
                  const suprimentos = caixaOps.filter(op => op.type === 'suprimento');
                  const cashVendas = vendas.filter(op => op.payment_method === 'dinheiro').reduce((sum, op) => sum + op.amount, 0);
                  const totalSangrias = sangrias.reduce((sum, op) => sum + op.amount, 0);
                  const totalSuprimentos = suprimentos.reduce((sum, op) => sum + op.amount, 0);
                  const saldoAtual = (selectedCaixa.opening_amount_cash || 0) + cashVendas + totalSuprimentos - totalSangrias;
                  const withdrawalAmount = parseFloat(withdrawalData.amount);
                  const isValid = withdrawalAmount <= saldoAtual;
                  return (
                    <div className={`mt-2 p-2 rounded text-xs ${isValid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                      Saldo disponível: {formatCurrency(saldoAtual)}
                      {!isValid && <span className="block font-semibold mt-1">⚠️ Valor excede o saldo disponível!</span>}
                    </div>
                  );
                })()}
              </div>
              <div>
                <Label>Motivo</Label>
                <Input
                  value={withdrawalData.reason}
                  onChange={(e) => setWithdrawalData({...withdrawalData, reason: e.target.value})}
                  placeholder="Ex: Depósito bancário, pagamento fornecedor..."
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
                  placeholder="Ex: Fundo adicional, reforço de caixa..."
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
            <h2 className="text-3xl font-bold">💰 Controle de Caixa</h2>
            <p className="text-gray-600">Gerencie abertura, fechamento e movimentações diárias</p>
          </div>
          <Button
            onClick={() => setShowOpenModal(true)}
            disabled={openCaixas.length > 0}
            className="bg-green-600 hover:bg-green-700 h-12"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Abrir Caixa
          </Button>
        </div>

        {openCaixas.length > 0 && (
          <Card className="border-green-500 border-2 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                    <DollarSign className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <Badge className="bg-green-500 mb-2">✅ Caixa Aberto</Badge>
                    <p className="text-sm text-gray-600">
                      Aberto em {moment(activeCaixa.opening_date).format('DD/MM/YYYY HH:mm')}
                    </p>
                    <p className="text-xl font-bold text-green-600">
                      Fundo Inicial: {formatCurrency(activeCaixa.opening_amount_cash)}
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
          <Card className="border-gray-300 border-dashed border-2">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-600 mb-2">Nenhum caixa aberto</h3>
              <p className="text-gray-500 mb-6">Abra um caixa para começar a registrar vendas</p>
            </CardContent>
          </Card>
        )}

        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
          <h3 className="text-xl font-bold mb-4">📋 Histórico de Caixas</h3>
          {filteredCaixas.filter(c => c.status === 'closed').length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                Nenhum caixa fechado ainda
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCaixas.filter(c => c.status === 'closed').slice(0, 12).map(caixa => (
                <Card
                  key={caixa.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedCaixa(caixa)}
                >
                  <CardContent className="p-4">
                    <Badge className="bg-gray-500 mb-3">🔒 Fechado</Badge>
                    <p className="text-sm text-gray-600 mb-2">
                      {moment(caixa.opening_date).format('DD/MM/YYYY')}
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Vendas</span>
                        <span className="font-bold">
                          {formatCurrency(
                            (caixa.total_cash || 0) +
                            (caixa.total_pix || 0) +
                            (caixa.total_debit || 0) +
                            (caixa.total_credit || 0) +
                            (caixa.total_other || 0)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="font-medium">Fechamento</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(caixa.closing_amount_cash)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                  💡 Informe o valor em dinheiro físico que você está colocando no caixa para começar o dia
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
    </>
  );
}