import React, { useState, useEffect } from 'react';
import { apiClient as base44 } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Receipt, ShoppingCart, AlertTriangle, ArrowLeft, Trash2, Plus, Minus, X, History, Clock, Loader2, LogOut, CreditCard, Wallet, TrendingUp, TrendingDown, Lock } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useSlugContext } from '@/hooks/useSlugContext';
import NewDishModal from '../components/menu/NewDishModal';
import PizzaBuilderV2 from '../components/pizza/PizzaBuilderV2';
import PaymentModal from '../components/pdv/PaymentModal';
import SaleSuccessModal from '../components/pdv/SaleSuccessModal';
import UpsellModal from '../components/menu/UpsellModal';
import { usePermission } from '../components/permissions/usePermission';
import { useManagerialAuth } from '@/hooks/useManagerialAuth';
import { useUpsell } from '../components/hooks/useUpsell';
import { usePDVHotkeys } from '../utils/pdvFunctions';
import InstallAppButton from '../components/InstallAppButton';
import FechamentoCaixaModal from '../components/pdv/FechamentoCaixaModal';

export default function PDV() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [discountReais, setDiscountReais] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [selectedDish, setSelectedDish] = useState(null);
  const [customerName, setCustomerName] = useState('Cliente Balcão');
  const [customerPhone, setCustomerPhone] = useState('');
  const [openCaixa, setOpenCaixa] = useState(null);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showOpenCaixaModal, setShowOpenCaixaModal] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('');
  const [lockThreshold, setLockThreshold] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedPizza, setSelectedPizza] = useState(null);
  const [pdvSession, setPdvSession] = useState(null);
  const [pdvTerminalId, setPdvTerminalId] = useState('');
  const [pdvTerminalName, setPdvTerminalName] = useState('');
  const [showTerminalModal, setShowTerminalModal] = useState(false);

  const queryClient = useQueryClient();
  const { isMaster } = usePermission();
  const { requireAuthorization, modal: authModal } = useManagerialAuth();
  const { slug, subscriberEmail, inSlugContext, loading: slugLoading, error: slugError } = useSlugContext();
  const asSub = (inSlugContext && isMaster && subscriberEmail) ? subscriberEmail : undefined;

  const [showMenuVendas, setShowMenuVendas] = useState(false);
  const [showFechamentoModal, setShowFechamentoModal] = useState(false);
  const [showSangriaModal, setShowSangriaModal] = useState(false);
  const [showSuprimentoModal, setShowSuprimentoModal] = useState(false);
  const [showCloseCaixaDialog, setShowCloseCaixaDialog] = useState(false);
  const [sangriaData, setSangriaData] = useState({ amount: '', reason: '' });
  const [suprimentoData, setSuprimentoData] = useState({ amount: '', reason: '' });
  const [closingCashAmount, setClosingCashAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Verificar autenticação e permissão
  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        if (!me) {
          base44.auth.redirectToLogin('/PDV');
          return;
        }
        // Verificar se tem perfil de PDV, é master, ou é assinante (acesso livre)
        const isAssinante = me?.subscriber_email && (me?.email || '').toLowerCase().trim() === (me?.subscriber_email || '').toLowerCase().trim();
        const hasAccess = me?.profile_role === 'pdv' || me?.is_master === true || isAssinante;
        setAllowed(hasAccess);
        if (!hasAccess) {
          setLoading(false);
          return;
        }
      } catch (e) {
        base44.auth.redirectToLogin('/PDV');
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  
  // Define página de volta baseado no tipo de usuário
  const backPage = isMaster ? 'Admin' : 'PainelAssinante';
  const backUrl = createPageUrl(backPage, isMaster ? undefined : slug || undefined);

  const opts = asSub ? { as_subscriber: asSub } : {};
  const { data: dishes = [] } = useQuery({
    queryKey: ['dishes', asSub ?? 'me'],
    queryFn: () => base44.entities.Dish.list(null, opts),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', asSub ?? 'me'],
    queryFn: () => base44.entities.Category.list('order', opts),
  });

  const { data: complementGroups = [] } = useQuery({
    queryKey: ['complementGroups', asSub ?? 'me'],
    queryFn: () => base44.entities.ComplementGroup.list('order', opts),
    refetchOnMount: 'always',
  });

  const { data: caixas = [], isLoading: caixasLoading } = useQuery({
    queryKey: ['caixas', asSub ?? 'me'],
    queryFn: () => base44.entities.Caixa.list('-opening_date', opts),
    refetchInterval: 5000,
  });

  const { data: caixaOperationsAll = [] } = useQuery({
    queryKey: ['caixaOperations', asSub ?? 'me'],
    queryFn: () => base44.entities.CaixaOperation.list('-date', opts).catch(() => []),
    enabled: !!user && allowed,
  });
  const caixaOperations = (openCaixa && Array.isArray(caixaOperationsAll))
    ? caixaOperationsAll.filter((op) => String(op.caixa_id) === String(openCaixa.id))
    : [];

  const { data: pdvSales = [] } = useQuery({
    queryKey: ['pedidosPDV', asSub ?? 'me'],
    queryFn: () => base44.entities.PedidoPDV.list('-created_date', opts).catch(() => []),
  });

  const { data: storeList = [] } = useQuery({
    queryKey: ['store', asSub ?? 'me'],
    queryFn: () => base44.entities.Store.list(opts),
  });
  const store = storeList[0] || { theme_primary_color: '#f97316' };

  const pdvTerminals = (Array.isArray(store?.pdv_terminals) && store.pdv_terminals.length > 0)
    ? store.pdv_terminals
    : ['PDV 1', 'PDV 2', 'PDV 3'];

  const { data: pdvSessionsRaw = [] } = useQuery({
    queryKey: ['pdvSessions', asSub ?? 'me'],
    queryFn: () => base44.entities.PDVSession.list('-created_at', { ...opts, ended_at: 'null' }).catch(() => []),
    enabled: !!user && allowed,
  });
  const activePdvSessions = Array.isArray(pdvSessionsRaw) ? pdvSessionsRaw.filter(s => !s.ended_at) : [];

  const { data: pizzaSizes = [] } = useQuery({
    queryKey: ['pizzaSizes', asSub ?? 'me'],
    queryFn: () => base44.entities.PizzaSize.list('order', opts),
  });

  const { data: pizzaFlavors = [] } = useQuery({
    queryKey: ['pizzaFlavors', asSub ?? 'me'],
    queryFn: () => base44.entities.PizzaFlavor.list('order', opts),
  });

  const { data: pizzaEdges = [] } = useQuery({
    queryKey: ['pizzaEdges', asSub ?? 'me'],
    queryFn: () => base44.entities.PizzaEdge.list(null, opts),
  });

  const { data: pizzaExtras = [] } = useQuery({
    queryKey: ['pizzaExtras', asSub ?? 'me'],
    queryFn: () => base44.entities.PizzaExtra.list(null, opts),
  });

  const { data: pizzaCategories = [] } = useQuery({
    queryKey: ['pizzaCategories', asSub ?? 'me'],
    queryFn: () => base44.entities.PizzaCategory.list('order', opts),
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions', asSub ?? 'me'],
    queryFn: () => base44.entities.Promotion.list(opts),
  });

  const { showUpsellModal, upsellPromotions, checkUpsell, resetUpsell, closeUpsell } = useUpsell(
    Array.isArray(promotions) ? promotions : [],
    cart.reduce((s, i) => s + (i.totalPrice || 0) * (i.quantity || 1), 0)
  );

  useEffect(() => {
    const activeCaixa = (caixas || []).find(c => c && c.status === 'open');
    setOpenCaixa(activeCaixa || null);
    if (caixasLoading) return;
    if (!activeCaixa) setShowOpenCaixaModal(true);
    else setShowOpenCaixaModal(false);
  }, [caixas, caixasLoading]);

  const createPdvSessionMutation = useMutation({
    mutationFn: async (payload) => base44.entities.PDVSession.create(payload),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['pdvSessions'] });
      setPdvSession(session);
      setPdvTerminalId(session.terminal_id ?? session.terminal_name ?? '');
      setPdvTerminalName(session.terminal_name ?? session.terminal_id ?? '');
      setShowTerminalModal(false);
    },
  });

  const endPdvSessionMutation = useMutation({
    mutationFn: async (sessionId) => base44.entities.PDVSession.update(sessionId, { ended_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdvSessions'] });
      setPdvSession(null);
      setPdvTerminalId('');
      setPdvTerminalName('');
      setShowTerminalModal(true);
    },
  });

  useEffect(() => {
    if (!user || !allowed || pdvSession) return;
    const mySession = activePdvSessions.find(s => s.operator_email === user.email);
    if (mySession) {
      setPdvSession(mySession);
      setPdvTerminalId(mySession.terminal_id ?? mySession.terminal_name ?? '');
      setPdvTerminalName(mySession.terminal_name ?? mySession.terminal_id ?? '');
      setShowTerminalModal(false);
    } else {
      setShowTerminalModal(true);
    }
  }, [user, allowed, activePdvSessions, pdvSession]);

  const createPedidoMutation = useMutation({
    mutationFn: (data) => base44.entities.PedidoPDV.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidosPDV'] });
    },
  });

  const createOperationMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.CaixaOperation.create({
        ...data,
        subscriber_email: user?.subscriber_email || user?.email,
        operator: user.email,
        date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixaOperations'] });
    },
  });

  const openCaixaMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.Caixa.create({
        ...data,
        subscriber_email: user?.subscriber_email || user?.email,
        opened_by: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixas'] });
      setShowOpenCaixaModal(false);
      setOpeningAmount('');
      setLockThreshold('');
      toast.success('✅ Caixa aberto com sucesso!');
    },
  });

  const closeCaixaMutation = useMutation({
    mutationFn: async ({ id, freshCaixa, totals, closingCash, closingNotes }) => {
      const u = await base44.auth.me();
      const updateData = {
        ...freshCaixa,
        opening_amount_cash: Number(freshCaixa.opening_amount_cash) || 0,
        status: 'closed',
        total_cash: totals.cash,
        total_pix: totals.pix,
        total_debit: totals.debit,
        total_credit: totals.credit,
        total_other: totals.other,
        closing_amount_cash: Number(closingCash) || 0,
        closing_notes: closingNotes || '',
        closed_by: u.email,
        closing_date: new Date().toISOString()
      };
      delete updateData.id;
      delete updateData.created_date;
      delete updateData.updated_date;
      delete updateData.created_by;
      return base44.entities.Caixa.update(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixas'] });
      setShowCloseCaixaDialog(false);
      setShowFechamentoModal(false);
      setClosingCashAmount('');
      setClosingNotes('');
      toast.success('✅ Caixa fechado com sucesso!');
    },
  });

  const isCaixaLocked = !!(openCaixa?.lock_threshold != null && (Number(openCaixa?.total_cash) || 0) >= (Number(openCaixa?.lock_threshold) || 0));

  const handleSangriaFromPDV = async () => {
    if (!openCaixa || !sangriaData.amount || !sangriaData.reason) {
      toast.error('Preencha valor e motivo');
      return;
    }
    const amount = parseFloat(sangriaData.amount);
    const vendas = caixaOperations.filter((op) => op.type === 'venda_pdv');
    const sangrias = caixaOperations.filter((op) => op.type === 'sangria');
    const suprimentos = caixaOperations.filter((op) => op.type === 'suprimento');
    const cashVendas = vendas.filter((op) => op.payment_method === 'dinheiro').reduce((s, op) => s + op.amount, 0);
    const totalSangrias = sangrias.reduce((s, op) => s + op.amount, 0);
    const totalSuprimentos = suprimentos.reduce((s, op) => s + op.amount, 0);
    const saldoAtual = (openCaixa.opening_amount_cash || 0) + cashVendas + totalSuprimentos - totalSangrias;
    if (amount > saldoAtual) {
      toast.error('Saldo insuficiente no caixa');
      return;
    }
    await createOperationMutation.mutateAsync({
      caixa_id: openCaixa.id,
      type: 'sangria',
      description: `Sangria: ${sangriaData.reason}`,
      amount,
      payment_method: 'dinheiro',
      reason: sangriaData.reason
    });
    const freshCaixas = await base44.entities.Caixa.list('-opening_date', opts);
    const freshCaixa = Array.isArray(freshCaixas) ? freshCaixas.find((c) => String(c.id) === String(openCaixa.id)) : null;
    if (freshCaixa) {
      const updateData = { ...freshCaixa, withdrawals: (freshCaixa.withdrawals || 0) + amount };
      delete updateData.id;
      delete updateData.created_date;
      delete updateData.updated_date;
      delete updateData.created_by;
      await base44.entities.Caixa.update(openCaixa.id, updateData);
    }
    queryClient.invalidateQueries({ queryKey: ['caixas', 'caixaOperations'] });
    setShowSangriaModal(false);
    setSangriaData({ amount: '', reason: '' });
    toast.success('Sangria registrada');
  };

  const handleSuprimentoFromPDV = async () => {
    if (!openCaixa || !suprimentoData.amount || !suprimentoData.reason) {
      toast.error('Preencha valor e motivo');
      return;
    }
    const amount = parseFloat(suprimentoData.amount);
    await createOperationMutation.mutateAsync({
      caixa_id: openCaixa.id,
      type: 'suprimento',
      description: `Suprimento: ${suprimentoData.reason}`,
      amount,
      payment_method: 'dinheiro',
      reason: suprimentoData.reason
    });
    const freshCaixas = await base44.entities.Caixa.list('-opening_date', opts);
    const freshCaixa = Array.isArray(freshCaixas) ? freshCaixas.find((c) => String(c.id) === String(openCaixa.id)) : null;
    if (freshCaixa) {
      const updateData = { ...freshCaixa, supplies: (freshCaixa.supplies || 0) + amount };
      delete updateData.id;
      delete updateData.created_date;
      delete updateData.updated_date;
      delete updateData.created_by;
      await base44.entities.Caixa.update(openCaixa.id, updateData);
    }
    queryClient.invalidateQueries({ queryKey: ['caixas', 'caixaOperations'] });
    setShowSuprimentoModal(false);
    setSuprimentoData({ amount: '', reason: '' });
    toast.success('Suprimento registrado');
  };

  const handleCloseCaixaFromPDV = async () => {
    if (!openCaixa || !closingCashAmount) {
      toast.error('Informe o valor em dinheiro ao fechar');
      return;
    }
    const vendas = caixaOperations.filter((op) => op.type === 'venda_pdv');
    const totals = {
      cash: vendas.filter((op) => op.payment_method === 'dinheiro').reduce((s, op) => s + op.amount, 0),
      pix: vendas.filter((op) => op.payment_method === 'pix').reduce((s, op) => s + op.amount, 0),
      debit: vendas.filter((op) => op.payment_method === 'debito').reduce((s, op) => s + op.amount, 0),
      credit: vendas.filter((op) => op.payment_method === 'credito').reduce((s, op) => s + op.amount, 0),
      other: vendas.filter((op) => op.payment_method === 'outro').reduce((s, op) => s + op.amount, 0)
    };
    const freshCaixas = await base44.entities.Caixa.list('-opening_date', opts);
    const freshCaixa = Array.isArray(freshCaixas) ? freshCaixas.find((c) => String(c.id) === String(openCaixa.id)) : null;
    if (!freshCaixa) {
      toast.error('Caixa não encontrado');
      return;
    }
    closeCaixaMutation.mutate({
      id: openCaixa.id,
      freshCaixa,
      totals,
      closingCash: parseFloat(closingCashAmount),
      closingNotes
    });
  };

  const safeDishes = Array.isArray(dishes) ? dishes : [];
  const activeDishes = safeDishes.filter(d => d && d.is_active !== false);
  const hasPizzas = activeDishes.some(d => d.product_type === 'pizza');
  const filteredDishes = activeDishes.filter(d => {
    if (!d || !d.name) return false;
    const matchesSearch = !searchTerm || d.name.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesCategory = true;
    if (selectedCategory === 'pizzas') matchesCategory = d.product_type === 'pizza';
    else if (selectedCategory !== 'all') matchesCategory = d.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDishClick = (dish) => {
    if (!openCaixa) {
      toast.error('⚠️ Abra o caixa para iniciar as vendas');
      setShowOpenCaixaModal(true);
      return;
    }
    if (isCaixaLocked) {
      toast.error('🔒 Caixa travado. Faça uma retirada em Caixa para continuar.');
      return;
    }

    if (dish.product_type === 'pizza' && pizzaSizes?.length > 0 && pizzaFlavors?.length > 0) {
      setSelectedPizza(dish);
      return;
    }

    const dishGroups = complementGroups.filter(group =>
      dish.complement_groups?.some(cg => cg.group_id === group.id)
    );

    if (dishGroups.length > 0) {
      setSelectedDish(dish);
    } else {
      addToCart({ dish, totalPrice: dish.price ?? 0, selections: {} });
    }
  };

  const addToCart = (item) => {
    if (!openCaixa) {
      toast.error('⚠️ Abra o caixa para iniciar as vendas');
      setShowOpenCaixaModal(true);
      return;
    }
    if (isCaixaLocked) {
      toast.error('🔒 Caixa travado. Faça uma retirada em Caixa para continuar.');
      return;
    }
    const newItem = { ...item, quantity: 1, id: Date.now() };
    setCart(prev => {
      const next = [...prev, newItem];
      const newTotal = next.reduce((s, i) => s + (i.totalPrice || 0) * (i.quantity || 1), 0);
      setTimeout(() => checkUpsell(newTotal), 100);
      return next;
    });
    setSelectedDish(null);
    setSelectedPizza(null);
    toast.success(`${item.dish.name} adicionado!`);
  };

  const handleUpsellAccept = (promotion) => {
    if (!promotion) return;
    const promoDish = safeDishes.find(d => d.id === promotion.offer_dish_id);
    if (!promoDish) {
      closeUpsell();
      return;
    }
    if (promotion.type === 'replace') {
      setCart([]);
    }
    const promoItem = {
      dish: { ...promoDish, price: promotion.offer_price },
      totalPrice: promotion.offer_price,
      selections: {}
    };
    addToCart(promoItem);
    closeUpsell();
  };

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(id);
    } else {
      setCart(cart.map(item => item.id === id ? { ...item, quantity: newQuantity } : item));
    }
  };

  const removeItem = (id) => {
    setCart(cart.filter(item => item.id !== id));
    toast.success('Item removido');
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setDiscountReais('');
    setDiscountPercent('');
    setCustomerName('Cliente Balcão');
    setCustomerPhone('');
    resetUpsell();
    toast.success('Venda limpa');
  };

  usePDVHotkeys({
    onOpenMenuVendas: () => pdvSession && setShowMenuVendas(true),
    onOpenFechamento: () => pdvSession && openCaixa && setShowFechamentoModal(true),
    onCancelSale: clearCart,
    onFinishSale: () => {
      if (cart.length > 0 && !isCaixaLocked && openCaixa) setShowPaymentModal(true);
    },
  });

  const subtotal = cart.reduce((sum, item) => sum + (item.totalPrice * item.quantity), 0);
  const discountFromPercent = subtotal * (parseFloat(discountPercent || 0) / 100);
  const totalDiscount = parseFloat(discountReais || 0) + discountFromPercent;
  const total = Math.max(0, subtotal - totalDiscount);

  // Verificar loading e acesso
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md text-center">
          <CreditCard className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Acesso restrito</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Esta tela é apenas para o perfil PDV.</p>
          <Button onClick={() => base44.auth.logout()} className="bg-orange-600 hover:bg-orange-700 text-white">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    );
  }

  const handleOpenCaixa = () => {
    const amount = parseFloat(openingAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Informe um valor válido de abertura');
      return;
    }
    const lock = lockThreshold ? parseFloat(lockThreshold) : null;
    if (lockThreshold && (isNaN(lock) || lock <= 0)) {
      toast.error('Valor limite de travamento deve ser maior que zero ou vazio');
      return;
    }
    openCaixaMutation.mutate({
      opening_amount_cash: amount,
      opening_date: new Date().toISOString(),
      status: 'open',
      total_cash: 0,
      total_pix: 0,
      total_debit: 0,
      total_credit: 0,
      total_other: 0,
      withdrawals: 0,
      supplies: 0,
      lock_threshold: lock || null
    });
  };

  const handleFinalizeSale = async (paymentData) => {
    if (!openCaixa) {
      toast.error('⚠️ Abra o caixa para iniciar as vendas');
      setShowPaymentModal(false);
      setShowOpenCaixaModal(true);
      return;
    }

    const user = await base44.auth.me();
    const orderCode = `PDV${Date.now().toString().slice(-8)}`;

    // Criar pedido com pagamentos mistos
    const pedidoData = {
      subscriber_email: user?.subscriber_email || user?.email,
      order_code: orderCode,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_document: paymentData.document,
      items: cart.map(item => ({
        dish_id: item.dish?.id,
        dish_name: item.dish?.name,
        quantity: item.quantity,
        unit_price: item.totalPrice ?? item.dish?.price,
        total_price: (item.totalPrice ?? item.dish?.price ?? 0) * item.quantity,
        selections: item.selections || (item.flavors ? { size: item.size, flavors: item.flavors, edge: item.edge, extras: item.extras, specifications: item.specifications } : {})
      })),
      subtotal,
      discount: totalDiscount,
      total,
      payment_method: paymentData.payments.length === 1 
        ? paymentData.payments[0].methodLabel 
        : `Misto (${paymentData.payments.map(p => p.methodLabel).join(' + ')})`,
      payment_amount: paymentData.payments.reduce((sum, p) => sum + p.amount, 0),
      change: paymentData.change,
      caixa_id: openCaixa.id,
      seller_email: user.email,
      seller_name: user.full_name,
      ...(pdvTerminalId && { pdv_terminal_id: pdvTerminalId }),
      ...(pdvTerminalName && { pdv_terminal_name: pdvTerminalName }),
      ...(pdvSession?.id && { pdv_session_id: pdvSession.id })
    };

    await createPedidoMutation.mutateAsync(pedidoData);

    // Criar operações separadas para cada pagamento
    for (const payment of paymentData.payments) {
      await createOperationMutation.mutateAsync({
        caixa_id: openCaixa.id,
        type: 'venda_pdv',
        description: `PDV #${orderCode} - ${customerName} (${payment.methodLabel})`,
        amount: payment.amount,
        payment_method: payment.method,
        payment_amount: payment.amount,
        change: 0, // Troco só no último pagamento
        pedido_pdv_id: orderCode
      });
    }

    queryClient.invalidateQueries({ queryKey: ['caixas'] });

    setLastSale({
      orderCode,
      total,
      payments: paymentData.payments,
      change: paymentData.change,
      items: cart,
      customerName
    });

    setCart([]);
    setDiscountReais('');
    setDiscountPercent('');
    setCustomerName('Cliente Balcão');
    setCustomerPhone('');
    setShowPaymentModal(false);
    setShowMobileCart(false);
    setShowSuccessModal(true);
  };

  const handlePrintReceipt = () => {
    if (!lastSale) return;

    const printWindow = window.open('', '', 'width=300,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>Cupom #${lastSale.orderCode}</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 12px; 
              padding: 10px;
              margin: 0;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000; margin: 10px 0; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { font-size: 16px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="center bold">CUPOM NÃO FISCAL</div>
          <div class="center">PDV - Venda Presencial</div>
          <div class="line"></div>
          <div>Pedido: #${lastSale.orderCode}</div>
          <div>Data: ${new Date().toLocaleString('pt-BR')}</div>
          <div>Cliente: ${lastSale.customerName}</div>
          <div class="line"></div>
          ${lastSale.items.map(item => {
            const details = item.flavors?.length ? ` (${item.size?.name || ''} ${item.flavors.map(f => f.name).join(' + ')})` : '';
            return `
            <div class="item">
              <span>${item.quantity}x ${item.dish.name}${details || ''}</span>
              <span>${formatCurrency(item.totalPrice * item.quantity)}</span>
            </div>
          `}).join('')}
          <div class="line"></div>
          <div class="item bold total">
            <span>TOTAL</span>
            <span>${formatCurrency(lastSale.total)}</span>
          </div>
          <div class="line"></div>
          ${lastSale.payments.map(p => `
            <div>${p.methodLabel}: ${formatCurrency(p.amount)}</div>
          `).join('')}
          ${lastSale.change > 0 ? `<div>Troco: ${formatCurrency(lastSale.change)}</div>` : ''}
          <div class="line"></div>
          <div class="center">Obrigado pela preferência!</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  return (
    <div className="min-h-screen min-h-screen-mobile h-screen flex flex-col bg-gray-50">
      <Toaster position="top-center" />
      {authModal}

      {/* Header Fixo */}
      <div className="bg-gray-900 text-white h-14 sm:h-16 flex-shrink-0 border-b border-gray-700 safe-top">
        <div className="h-full px-3 sm:px-4 flex items-center justify-between max-w-[2000px] mx-auto gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link to={backUrl} className="shrink-0">
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800 min-h-touch min-w-touch h-10 sm:h-10 px-2 sm:px-3">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <h1 className="font-bold text-sm sm:text-lg truncate">PDV - Venda Presencial</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <InstallAppButton pageName="PDV" compact />
            {openCaixa ? (
              <Badge variant="outline" className="bg-green-600 text-white border-green-600 h-8 font-semibold">
                ✅ Caixa Aberto
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-600 text-white border-red-600 h-8 font-semibold">
                🔒 Caixa Fechado
              </Badge>
            )}
            <Badge variant="outline" className="text-white border-gray-600 h-8 hidden sm:flex">
              {cart.length} {cart.length === 1 ? 'item' : 'itens'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pdvSession && setShowMenuVendas(true)}
              className="text-white hover:bg-gray-800 h-10 hidden sm:flex"
              title="Menu de Vendas (F2) - Suprimento, Sangria, Fechamento"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Menu
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistoryModal(true)}
              className="text-white hover:bg-gray-800 h-10 hidden sm:flex"
            >
              <History className="w-4 h-4 mr-2" />
              Histórico
            </Button>
            {pdvSession && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => endPdvSessionMutation.mutate(pdvSession.id)}
                disabled={endPdvSessionMutation.isPending}
                className="text-white hover:bg-gray-800 h-10 hidden sm:flex"
                title="Sair deste PDV (encerra sua sessão)"
              >
                {endPdvSessionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                Sair do PDV
              </Button>
            )}
            {pdvSession && (
              <Badge variant="outline" className="text-white border-gray-500 h-8 font-normal">
                {pdvTerminalName}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Selecionar terminal (multi-PDV) */}
      <Dialog open={showTerminalModal} onOpenChange={setShowTerminalModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar terminal PDV</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">Em qual PDV você está operando?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-2">
            {pdvTerminals.map((name, i) => (
              <Button
                key={i}
                variant="outline"
                className="h-12"
                disabled={createPdvSessionMutation.isPending}
                onClick={async () => {
                  const me = await base44.auth.me();
                  await createPdvSessionMutation.mutateAsync({
                    terminal_id: String(i + 1),
                    terminal_name: typeof name === 'string' ? name : `PDV ${i + 1}`,
                    operator_email: me?.email,
                    operator_name: me?.full_name,
                    started_at: new Date().toISOString()
                  });
                }}
              >
                {typeof name === 'string' ? name : `PDV ${i + 1}`}
              </Button>
            ))}
          </div>
          <DialogFooter />
        </DialogContent>
      </Dialog>

      {/* Menu de Vendas (F2) - Suprimento, Sangria, Fechamento */}
      <Dialog open={showMenuVendas} onOpenChange={setShowMenuVendas}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Menu de Vendas</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <Button
              variant="outline"
              className="h-14 flex flex-col gap-1"
              onClick={() => {
                setShowMenuVendas(false);
                requireAuthorization('suprimento', () => setShowSuprimentoModal(true));
              }}
            >
              <TrendingUp className="w-6 h-6 text-green-600" />
              <span>Suprimento (F2)</span>
              <span className="text-xs text-gray-500">Adicionar troco</span>
            </Button>
            <Button
              variant="outline"
              className="h-14 flex flex-col gap-1"
              onClick={() => {
                setShowMenuVendas(false);
                requireAuthorization('sangria', () => setShowSangriaModal(true));
              }}
            >
              <TrendingDown className="w-6 h-6 text-red-600" />
              <span>Sangria (F3)</span>
              <span className="text-xs text-gray-500">Retirada</span>
            </Button>
            <Button
              variant="outline"
              className="h-14 flex flex-col gap-1 col-span-2"
              onClick={() => {
                setShowMenuVendas(false);
                setShowFechamentoModal(true);
              }}
            >
              <Lock className="w-6 h-6" />
              <span>Fechamento (F4)</span>
              <span className="text-xs text-gray-500">Relatório e fechar caixa</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Fechamento de Caixa (relatório igual aos prints) */}
      <FechamentoCaixaModal
        open={showFechamentoModal}
        onOpenChange={setShowFechamentoModal}
        caixa={openCaixa}
        operations={caixaOperationsAll || []}
        storeName={store?.name}
        operatorName={user?.full_name || user?.email}
        terminalName={pdvTerminalName}
        onFecharClick={
          openCaixa?.status === 'open'
            ? () => requireAuthorization('fechar_caixa', () => { setShowFechamentoModal(false); setShowCloseCaixaDialog(true); })
            : undefined
        }
      />

      {/* Dialog valor ao fechar caixa (após autorização) */}
      <Dialog open={showCloseCaixaDialog} onOpenChange={setShowCloseCaixaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar caixa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label>Valor em dinheiro ao fechar (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={closingCashAmount}
              onChange={(e) => setClosingCashAmount(e.target.value)}
              placeholder="0,00"
            />
            <Label>Observações (opcional)</Label>
            <Input
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="Observações do fechamento"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseCaixaDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleCloseCaixaFromPDV}
              disabled={!closingCashAmount || closeCaixaMutation.isPending}
            >
              {closeCaixaMutation.isPending ? 'Fechando...' : 'Confirmar Fechamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Sangria */}
      <Dialog open={showSangriaModal} onOpenChange={setShowSangriaModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Sangria (retirada)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={sangriaData.amount}
                onChange={(e) => setSangriaData((s) => ({ ...s, amount: e.target.value }))}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label>Motivo</Label>
              <Input
                value={sangriaData.reason}
                onChange={(e) => setSangriaData((s) => ({ ...s, reason: e.target.value }))}
                placeholder="Ex: Depósito bancário"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSangriaModal(false)}>Cancelar</Button>
            <Button className="bg-red-600" onClick={handleSangriaFromPDV}>Registrar Sangria</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Suprimento */}
      <Dialog open={showSuprimentoModal} onOpenChange={setShowSuprimentoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Suprimento (adicionar troco)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={suprimentoData.amount}
                onChange={(e) => setSuprimentoData((s) => ({ ...s, amount: e.target.value }))}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label>Motivo</Label>
              <Input
                value={suprimentoData.reason}
                onChange={(e) => setSuprimentoData((s) => ({ ...s, reason: e.target.value }))}
                placeholder="Ex: Reforço de caixa"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuprimentoModal(false)}>Cancelar</Button>
            <Button className="bg-orange-600" onClick={handleSuprimentoFromPDV}>Registrar Suprimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Layout Principal - Grid Fixo (só após selecionar terminal em multi-PDV) */}
      <div className="flex-1 overflow-hidden">
        {!pdvSession && allowed ? (
          <div className="flex items-center justify-center h-full p-8">
            <p className="text-gray-500">Selecione o terminal PDV acima para continuar.</p>
          </div>
        ) : (
        <div className="h-full max-w-[2000px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_480px]">
          
          {/* COLUNA ESQUERDA - PRODUTOS (70%) */}
          <div className="flex flex-col bg-white h-full overflow-hidden">
            
            {/* Categorias */}
            <div className="flex-shrink-0 bg-gray-50 border-b px-3 sm:px-4 py-2 sm:py-3">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors min-h-touch ${
                    selectedCategory === 'all'
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  TODOS
                </button>
                {hasPizzas && (
                  <button
                    onClick={() => setSelectedCategory('pizzas')}
                    className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors min-h-touch ${
                      selectedCategory === 'pizzas' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    PIZZAS
                  </button>
                )}
                {(categories || []).filter(cat => cat && cat.name).map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors min-h-touch ${
                      selectedCategory === cat.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    {(cat.name || 'Categoria').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Busca */}
            <div className="flex-shrink-0 px-4 py-3 bg-white border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Buscar produto por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 bg-gray-50"
                />
              </div>
            </div>

            {/* Grid de Produtos - Com Scroll */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                {filteredDishes.map(dish => (
                  <button
                    key={dish.id}
                    onClick={() => handleDishClick(dish)}
                    className="group bg-white rounded-xl border-2 border-gray-200 hover:border-orange-400 hover:shadow-md transition-all overflow-hidden"
                  >
                    <div className="aspect-square bg-gray-100 overflow-hidden">
                      {dish.image ? (
                        <img
                          src={dish.image}
                          alt={dish.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl">
                          🍽️
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="font-bold text-sm text-gray-900 mb-2 line-clamp-2 min-h-[40px]">
                        {dish.name}
                      </h4>
                      <div className="text-xl font-bold text-orange-600">
                        {dish.product_type === 'pizza'
                          ? (dish.pizza_config?.sizes?.[0] ? formatCurrency(dish.pizza_config.sizes[0].price_tradicional) : 'Montar')
                          : formatCurrency(dish.price)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {filteredDishes.length === 0 && (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-400">Nenhum produto encontrado</p>
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA - COMANDA (30%) */}
          <div className="hidden lg:flex flex-col bg-gray-900 h-full overflow-hidden border-l border-gray-700">
            
            {/* Header Comanda */}
            <div className="flex-shrink-0 p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6 text-orange-400" />
                  <h3 className="text-xl font-bold text-white">Comanda</h3>
                </div>
                <Badge className="bg-orange-500 text-white px-3 py-1">
                  {cart.length}
                </Badge>
              </div>
            </div>

            {/* Lista de Itens - Com Scroll */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-gray-700 mb-3" />
                  <p className="text-gray-500 text-sm">Nenhum item na comanda</p>
                  <p className="text-gray-600 text-xs mt-1">Clique em um produto para adicionar</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 pr-2">
                        <h4 className="font-bold text-white text-sm mb-1">
                          {item.dish.name}
                        </h4>
                        {(item.flavors?.length > 0 || (item.selections && Object.keys(item.selections).length > 0)) && (
                          <div className="mb-1">
                            {item.size && <p className="text-xs text-gray-400">• {item.size.name}</p>}
                            {item.flavors?.map((f, i) => <p key={i} className="text-xs text-gray-400">• {f.name}</p>)}
                            {item.edge && item.edge.id !== 'none' && <p className="text-xs text-gray-400">• Borda: {item.edge.name}</p>}
                            {!item.flavors?.length && Object.entries(item.selections || {}).map(([gId, sel]) => {
                              if (Array.isArray(sel)) return sel.map((s, i) => <p key={`${gId}-${i}`} className="text-xs text-gray-400">• {s?.name}</p>);
                              return sel ? <p key={gId} className="text-xs text-gray-400">• {sel?.name}</p> : null;
                            })}
                          </div>
                        )}
                        <p className="text-xs text-gray-400">
                          {formatCurrency(item.totalPrice)} un.
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-gray-700 rounded-lg p-0.5">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-9 h-9 min-h-touch min-w-touch rounded hover:bg-gray-600 flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4 text-white" />
                        </button>
                        <span className="w-10 text-center font-bold text-lg text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-9 h-9 min-h-touch min-w-touch rounded hover:bg-gray-600 flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4 text-white" />
                        </button>
                      </div>
                      <span className="font-bold text-xl text-orange-400">
                        {formatCurrency(item.totalPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Comanda */}
            <div className="flex-shrink-0 border-t border-gray-700 p-3 space-y-2">
              
              {/* Descontos */}
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={discountReais}
                  onChange={(e) => setDiscountReais(e.target.value)}
                  placeholder="Desc. R$"
                  className="h-8 bg-gray-800 border-gray-700 text-white text-xs"
                />
                <Input
                  type="number"
                  step="0.01"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="Desc. %"
                  className="h-8 bg-gray-800 border-gray-700 text-white text-xs"
                />
              </div>

              {/* Subtotal */}
              {totalDiscount > 0 && (
                <div className="flex items-center justify-between text-xs py-1 border-b border-gray-700">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="font-semibold text-white">{formatCurrency(subtotal)}</span>
                </div>
              )}

              {/* Total */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-white">TOTAL</span>
                  <span className="text-2xl font-bold text-white">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Botões */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  variant="outline"
                  className="h-9 border-gray-700 text-gray-300 hover:bg-gray-800 text-sm"
                >
                  Limpar
                </Button>
                <Button
                  onClick={() => {
                    if (isCaixaLocked) { toast.error('🔒 Caixa travado. Faça uma retirada em Caixa para continuar.'); return; }
                    setShowPaymentModal(true);
                  }}
                  disabled={cart.length === 0}
                  className="h-9 bg-green-600 hover:bg-green-700 font-bold text-sm"
                >
                  Finalizar
                </Button>
              </div>
            </div>
          </div>

        </div>
        )}
      </div>

      {/* Barra de atalhos (F2, F4, F9, F11) - desktop */}
      {pdvSession && (
        <div className="hidden lg:flex flex-shrink-0 px-4 py-2 bg-gray-800 border-t border-gray-700 text-gray-400 text-xs justify-center gap-6 flex-wrap">
          <span><kbd className="px-1.5 py-0.5 bg-gray-700 rounded">F2</kbd> Menu de Vendas</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-700 rounded">F4</kbd> Fechamento</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-700 rounded">F9</kbd> Cancelar venda</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-700 rounded">F11</kbd> Recebimento</span>
        </div>
      )}

      {/* Botão Flutuante Mobile (só com sessão PDV) */}
      {pdvSession && (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] bg-gray-900 border-t border-gray-700">
        <Button
          onClick={() => setShowMobileCart(true)}
          className="w-full min-h-[48px] h-14 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg"
          disabled={cart.length === 0}
        >
          <ShoppingCart className="w-5 h-5 mr-2" />
          Ver Comanda ({cart.length})
          {cart.length > 0 && <span className="ml-2">• {formatCurrency(total)}</span>}
        </Button>
      </div>
      )}

      {/* Modal Comanda Mobile */}
      {showMobileCart && (
        <div className="lg:hidden fixed inset-0 z-50 bg-gray-900 flex flex-col">
          <div className="flex-shrink-0 p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Comanda</h3>
            <button
              onClick={() => setShowMobileCart(false)}
              className="text-white min-h-touch min-w-touch flex items-center justify-center p-2 -m-1 hover:bg-gray-800 rounded"
              aria-label="Fechar comanda"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.map((item) => (
              <div key={item.id} className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-bold text-white text-sm">{item.dish.name}</h4>
                    <p className="text-xs text-gray-400">{formatCurrency(item.totalPrice)} un.</p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-400 p-2 min-h-touch min-w-touch rounded hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-gray-700 rounded-lg p-0.5">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-9 h-9 min-h-touch min-w-touch rounded flex items-center justify-center hover:bg-gray-600"
                    >
                      <Minus className="w-4 h-4 text-white" />
                    </button>
                    <span className="w-10 text-center font-bold text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-9 h-9 min-h-touch min-w-touch rounded flex items-center justify-center hover:bg-gray-600"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <span className="font-bold text-lg text-orange-400">
                    {formatCurrency(item.totalPrice * item.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex-shrink-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] border-t border-gray-700 space-y-3">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-white">TOTAL</span>
                <span className="text-3xl font-bold text-white">{formatCurrency(total)}</span>
              </div>
            </div>
            <Button
              onClick={() => {
                if (!openCaixa) {
                  toast.error('⚠️ Abra o caixa para iniciar as vendas');
                  setShowMobileCart(false);
                  setShowOpenCaixaModal(true);
                  return;
                }
                if (isCaixaLocked) { 
                  toast.error('🔒 Caixa travado. Faça uma retirada em Caixa para continuar.'); 
                  return; 
                }
                if (cart.length === 0) {
                  toast.error('Adicione itens à comanda antes de finalizar');
                  return;
                }
                setShowMobileCart(false);
                setShowPaymentModal(true);
              }}
              disabled={cart.length === 0 || !openCaixa || isCaixaLocked}
              className="w-full min-h-[48px] h-12 bg-green-600 hover:bg-green-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Finalizar Venda
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <NewDishModal
        isOpen={!!selectedDish}
        onClose={() => setSelectedDish(null)}
        dish={selectedDish}
        complementGroups={complementGroups}
        onAddToCart={addToCart}
        primaryColor={store.theme_primary_color || '#f97316'}
      />

      {selectedPizza && (
        <PizzaBuilderV2
          dish={selectedPizza}
          sizes={pizzaSizes}
          flavors={pizzaFlavors}
          edges={pizzaEdges}
          extras={pizzaExtras}
          categories={pizzaCategories}
          onAddToCart={addToCart}
          onClose={() => setSelectedPizza(null)}
          primaryColor={store.theme_primary_color || '#f97316'}
          store={store}
        />
      )}

      <UpsellModal
        isOpen={showUpsellModal}
        onClose={closeUpsell}
        promotions={upsellPromotions}
        dishes={safeDishes}
        onAccept={handleUpsellAccept}
        onDecline={closeUpsell}
        primaryColor={store.theme_primary_color || '#f97316'}
        darkMode
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        total={total}
        formatCurrency={formatCurrency}
        onConfirm={handleFinalizeSale}
      />

      <SaleSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        orderCode={lastSale?.orderCode}
        total={lastSale?.total}
        payments={lastSale?.payments}
        change={lastSale?.change}
        formatCurrency={formatCurrency}
        onPrint={handlePrintReceipt}
      />

      {/* Modal Histórico de Vendas */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <History className="w-6 h-6 text-orange-500" />
              Histórico de Vendas PDV
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-4">
            {!pdvSales || pdvSales.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma venda registrada ainda</p>
              </div>
            ) : (
              (pdvSales || []).filter(sale => sale).map((sale) => {
                // Validar e formatar data de forma segura
                let saleDate = null;
                try {
                  const dateStr = sale.created_date || sale.created_at;
                  if (dateStr && typeof dateStr === 'string' && dateStr.trim() !== '') {
                    saleDate = new Date(dateStr);
                    // Verificar se a data é válida
                    if (isNaN(saleDate.getTime())) {
                      saleDate = null;
                    }
                  }
                } catch (e) {
                  console.error('Erro ao processar data:', e);
                  saleDate = null;
                }

                return (
                  <Card key={sale.id} className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-orange-500">#{sale.order_code}</Badge>
                            {saleDate && (
                              <span className="text-sm text-gray-600">
                                <Clock className="w-4 h-4 inline mr-1" />
                                {saleDate.toLocaleString('pt-BR')}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-lg">{sale.customer_name}</p>
                          {sale.customer_phone && (
                            <p className="text-sm text-gray-600">📞 {sale.customer_phone}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(sale.total)}
                          </p>
                          <Badge variant="outline" className="mt-1">
                            {sale.payment_method}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-1 border-t pt-2">
                        {sale.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>
                              {item.quantity}x {item.dish_name}
                            </span>
                            <span className="font-medium">
                              {formatCurrency(item.total_price)}
                            </span>
                          </div>
                        ))}
                        {sale.discount > 0 && (
                          <div className="flex justify-between text-sm text-red-600 pt-1 border-t">
                            <span>Desconto</span>
                            <span>-{formatCurrency(sale.discount)}</span>
                          </div>
                        )}
                        {sale.change > 0 && (
                          <div className="flex justify-between text-sm text-blue-600">
                            <span>Troco</span>
                            <span>{formatCurrency(sale.change)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Abertura de Caixa - OBRIGATÓRIO */}
      <Dialog open={showOpenCaixaModal} onOpenChange={(open) => {
        if (!open && !openCaixa) {
          toast.error('🚫 É OBRIGATÓRIO abrir o caixa para usar o PDV!');
          return;
        }
        setShowOpenCaixaModal(open);
      }}>
        <DialogContent 
          className="sm:max-w-md" 
          onInteractOutside={(e) => {
            if (!openCaixa) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (!openCaixa) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">
              {openCaixa ? '🔓 Abrir Novo Caixa' : '🔒 CAIXA FECHADO - PDV BLOQUEADO'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {!openCaixa && (
              <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
                <p className="text-sm text-red-800 font-bold mb-2">
                  ⚠️ O PDV está bloqueado!
                </p>
                <p className="text-xs text-red-700">
                  Para realizar vendas no PDV, você DEVE abrir um caixa primeiro. Esta é uma operação obrigatória para controle financeiro.
                </p>
              </div>
            )}

            {openCaixa && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium">
                  💡 Já existe um caixa aberto. Deseja abrir um novo?
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-base font-semibold">Valor de Abertura em Dinheiro (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                placeholder="0,00"
                className="text-2xl font-bold h-16 text-center border-2"
                autoFocus
              />
              <p className="text-xs text-gray-600">Valor em dinheiro físico disponível no caixa ao abrir</p>
            </div>

            <div className="space-y-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50">
              <Label className="text-base font-semibold">Valor limite de travamento (R$) – opcional</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={lockThreshold}
                onChange={(e) => setLockThreshold(e.target.value)}
                placeholder="Ex: 500"
                className="h-12 border-2 bg-white"
              />
              <p className="text-xs text-gray-600">Quando as vendas em dinheiro atingirem este valor, o PDV trava até ser feita uma retirada em Caixa</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-800 font-medium">
                ✅ Após abrir o caixa, você poderá realizar vendas normalmente
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            {openCaixa ? (
              <Button 
                variant="outline" 
                onClick={() => setShowOpenCaixaModal(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
            ) : (
              <Link to={backUrl} className="w-full sm:w-auto">
                <Button 
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
            )}
            <Button
              onClick={() => requireAuthorization('abrir_caixa', () => handleOpenCaixa())}
              disabled={!openingAmount || parseFloat(openingAmount) < 0 || openCaixaMutation.isPending}
              className="bg-green-600 hover:bg-green-700 font-semibold w-full sm:w-auto"
            >
              {openCaixaMutation.isPending ? 'Abrindo Caixa...' : '✅ Confirmar Abertura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}