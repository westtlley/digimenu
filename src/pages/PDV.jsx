import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiClient as base44 } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Receipt, ShoppingCart, AlertTriangle, ArrowLeft, Trash2, Plus, Minus, X, History, Clock, Loader2, LogOut, CreditCard, Wallet, TrendingUp, TrendingDown, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
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
import MenuVendasModal from '../components/pdv/MenuVendasModal';
import AtalhosHelpModal from '../components/pdv/AtalhosHelpModal';
import ReimpressaoVendaModal from '../components/pdv/ReimpressaoVendaModal';
import { formatCurrency } from '@/utils/formatters';
import { printReceipt, printCashClosingReport } from '@/utils/thermalPrint';

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
  const { slug, subscriberId, subscriberEmail, inSlugContext, loading: slugLoading, error: slugError } = useSlugContext();
  const canonicalPdvPath = useMemo(() => createPageUrl('PDV', slug || undefined), [slug]);
  const normalizedSlugSubscriber = useMemo(
    () => (inSlugContext && subscriberEmail ? String(subscriberEmail).toLowerCase().trim() : null),
    [inSlugContext, subscriberEmail]
  );
  const fallbackSubscriber = useMemo(() => {
    const candidate = user?.subscriber_email || user?.email;
    return candidate ? String(candidate).toLowerCase().trim() : null;
  }, [user?.subscriber_email, user?.email]);
  const fallbackSubscriberId = useMemo(() => user?.subscriber_id ?? null, [user?.subscriber_id]);
  const tenantIdentifier = normalizedSlugSubscriber || fallbackSubscriber;
  const tenantSubscriberId = ((inSlugContext ? subscriberId ?? null : null) || fallbackSubscriberId);
  const asSub = (inSlugContext && isMaster && normalizedSlugSubscriber) ? normalizedSlugSubscriber : undefined;
  const asSubId = (inSlugContext && isMaster && subscriberId != null) ? subscriberId : undefined;
  const tenantScope = asSubId ?? asSub ?? tenantSubscriberId ?? tenantIdentifier ?? 'none';

  const [showMenuVendas, setShowMenuVendas] = useState(false);
  const [showFechamentoModal, setShowFechamentoModal] = useState(false);
  const [showSangriaModal, setShowSangriaModal] = useState(false);
  const [showSuprimentoModal, setShowSuprimentoModal] = useState(false);
  const [showCloseCaixaDialog, setShowCloseCaixaDialog] = useState(false);
  const [showAtalhosHelp, setShowAtalhosHelp] = useState(false);
  const [showReimpressaoModal, setShowReimpressaoModal] = useState(false);
  const [sangriaData, setSangriaData] = useState({ amount: '', reason: '' });
  const [suprimentoData, setSuprimentoData] = useState({ amount: '', reason: '' });
  const [closingCashAmount, setClosingCashAmount] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  
  // Tracking de cancelamentos em tela (para relatÃƒÂ³rio de fechamento)
  const [canceledInScreenCount, setCanceledInScreenCount] = useState(0);
  const [canceledInScreenTotal, setCanceledInScreenTotal] = useState(0);
  const saleClientRequestIdRef = useRef(null);

  // Verificar autenticaÃƒÂ§ÃƒÂ£o e permissÃƒÂ£o
  useEffect(() => {
    if (slugLoading) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const me = await base44.auth.me();
        if (cancelled) return;
        setUser(me);
        if (!me) {
          base44.auth.redirectToLogin(canonicalPdvPath);
          return;
        }
        
        console.log('[PDV] Verificando acesso para usuÃƒÂ¡rio:', {
          email: me.email,
          subscriber_email: me.subscriber_email,
          profile_role: me.profile_role,
          profile_roles: me.profile_roles,
          is_master: me.is_master
        });
        
        // Verificar se tem perfil de PDV, ÃƒÂ© master, ÃƒÂ© assinante ou ÃƒÂ© gerente (acesso total)
        const isAssinante = me?.subscriber_email && (me?.email || '').toLowerCase().trim() === (me?.subscriber_email || '').toLowerCase().trim();
        const roles = me?.profile_roles?.length ? me.profile_roles : me?.profile_role ? [me.profile_role] : [];
        const isGerente = roles.includes('gerente');
        const isPDV = me?.profile_role === 'pdv' || roles.includes('pdv');
        
        // Se nÃƒÂ£o tem subscriber_email mas tem email, pode ser o prÃƒÂ³prio assinante
        const isOwner = !me.subscriber_email || (me.email && me.subscriber_email && me.email.toLowerCase().trim() === me.subscriber_email.toLowerCase().trim());
        
        const slugSubscriberNormalized = (subscriberEmail || '').toLowerCase().trim();
        const userSubscriberNormalized = (me?.subscriber_email || me?.email || '').toLowerCase().trim();
        const tenantMatchesSlug =
          !inSlugContext ||
          !slugSubscriberNormalized ||
          me?.is_master === true ||
          userSubscriberNormalized === slugSubscriberNormalized;
        const hasAccess = (isPDV || me?.is_master === true || isAssinante || isGerente || isOwner) && tenantMatchesSlug;
        
        console.log('[PDV] Resultado da verificaÃƒÂ§ÃƒÂ£o:', {
          isAssinante,
          isGerente,
          isPDV,
          isOwner,
          tenantMatchesSlug,
          hasAccess
        });
        
        setAllowed(hasAccess);
      } catch (e) {
        console.error('[PDV] Erro ao verificar permissÃƒÂµes:', e);
        if (!cancelled) {
          base44.auth.redirectToLogin(canonicalPdvPath);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canonicalPdvPath, inSlugContext, slugLoading, subscriberEmail]);
  
  // Define pÃƒÂ¡gina de volta baseado no tipo de usuÃƒÂ¡rio
  const userRoles = user?.profile_roles?.length ? user.profile_roles : user?.profile_role ? [user.profile_role] : [];
  const isPdvOperatorOnly = userRoles.includes('pdv') && !userRoles.includes('gerente') && !isMaster;
  const backPage = isMaster ? 'Admin' : (isPdvOperatorOnly ? 'ColaboradorHome' : 'PainelAssinante');
  const backUrl = backPage === 'ColaboradorHome'
    ? createPageUrl('ColaboradorHome')
    : createPageUrl(backPage, isMaster ? undefined : slug || undefined);

  // master em contexto slug usa as_subscriber; demais usuÃ¡rios usam escopo do prÃ³prio token.
  const subscriberIdentifier = tenantSubscriberId ?? tenantIdentifier;
  const opts = {};
  if (asSubId != null) opts.as_subscriber_id = asSubId;
  if (asSub) opts.as_subscriber = asSub;
  const { data: dishes = [] } = useQuery({
    queryKey: ['dishes', tenantScope],
    queryFn: () => base44.entities.Dish.list(null, opts),
    enabled: !!user && allowed,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', tenantScope],
    queryFn: () => base44.entities.Category.list('order', opts),
    enabled: !!user && allowed,
  });

  const { data: complementGroups = [] } = useQuery({
    queryKey: ['complementGroups', tenantScope],
    queryFn: () => base44.entities.ComplementGroup.list('order', opts),
    refetchOnMount: 'always',
    enabled: !!user && allowed,
  });

  const { data: caixas = [], isLoading: caixasLoading } = useQuery({
    queryKey: ['caixas', subscriberIdentifier ?? 'none'],
    queryFn: async () => {
      const result = await base44.entities.Caixa.list('-opening_date', opts);
      return result;
    },
    enabled: !!subscriberIdentifier && !!user,
    refetchInterval: 5000,
  });

  const { data: caixaOperationsAll = [] } = useQuery({
    queryKey: ['caixaOperations', tenantScope],
    queryFn: () => base44.entities.CaixaOperation.list('-date', opts).catch(() => []),
    enabled: !!user && allowed,
  });
  const caixaOperations = (openCaixa && Array.isArray(caixaOperationsAll))
    ? caixaOperationsAll.filter((op) => String(op.caixa_id) === String(openCaixa.id))
    : [];

  const { data: pdvSales = [] } = useQuery({
    queryKey: ['pedidosPDV', tenantScope],
    queryFn: () => base44.entities.PedidoPDV.list('-created_date', opts).catch(() => []),
    enabled: !!user && allowed,
  });

  const { data: storeList = [] } = useQuery({
    queryKey: ['store', tenantScope],
    queryFn: () => base44.entities.Store.list(null, opts),
    enabled: !!user && allowed,
  });
  const store = storeList[0] || { theme_primary_color: '#f97316' };

  const pdvTerminals = (Array.isArray(store?.pdv_terminals) && store.pdv_terminals.length > 0)
    ? store.pdv_terminals
    : ['PDV 1', 'PDV 2', 'PDV 3'];

  const { data: pdvSessionsRaw = [] } = useQuery({
    queryKey: ['pdvSessions', tenantScope],
    queryFn: () => base44.entities.PDVSession.list('-created_at', opts).catch(() => []),
    enabled: !!user && allowed,
  });
  // Filtrar sessÃƒÂµes ativas no frontend (ended_at null/undefined)
  const activePdvSessions = Array.isArray(pdvSessionsRaw) ? pdvSessionsRaw.filter(s => !s.ended_at) : [];

  const { data: pizzaSizes = [] } = useQuery({
    queryKey: ['pizzaSizes', tenantScope],
    queryFn: () => base44.entities.PizzaSize.list('order', opts),
    enabled: !!user && allowed,
  });

  const { data: pizzaFlavors = [] } = useQuery({
    queryKey: ['pizzaFlavors', tenantScope],
    queryFn: () => base44.entities.PizzaFlavor.list('order', opts),
    enabled: !!user && allowed,
  });

  const { data: pizzaEdges = [] } = useQuery({
    queryKey: ['pizzaEdges', tenantScope],
    queryFn: () => base44.entities.PizzaEdge.list(null, opts),
    enabled: !!user && allowed,
  });

  const { data: pizzaExtras = [] } = useQuery({
    queryKey: ['pizzaExtras', tenantScope],
    queryFn: () => base44.entities.PizzaExtra.list(null, opts),
    enabled: !!user && allowed,
  });

  const { data: pizzaCategories = [] } = useQuery({
    queryKey: ['pizzaCategories', tenantScope],
    queryFn: () => base44.entities.PizzaCategory.list('order', opts),
    enabled: !!user && allowed,
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions', tenantScope],
    queryFn: () => base44.entities.Promotion.list(null, opts),
    enabled: !!user && allowed,
  });

  const { showUpsellModal, upsellPromotions, checkUpsell, resetUpsell, closeUpsell } = useUpsell(
    Array.isArray(promotions) ? promotions : [],
    cart.reduce((s, i) => s + (i.totalPrice || 0) * (i.quantity || 1), 0)
  );

  useEffect(() => {
    // NÃƒÂ£o executar se jÃƒÂ¡ hÃƒÂ¡ um caixa no estado e nÃƒÂ£o estÃƒÂ¡ carregando
    if (caixasLoading) return;
    
    const activeCaixa = (caixas || []).find(c => c && c.status === 'open');
    
    // Se encontrou caixa aberto no backend, atualizar estado local
    if (activeCaixa) {
      setOpenCaixa(activeCaixa);
      setShowOpenCaixaModal(false);
    } 
    // Se nÃƒÂ£o hÃƒÂ¡ caixa aberto mas hÃƒÂ¡ caixas fechados, limpar estado e mostrar modal
    else if (Array.isArray(caixas) && caixas.length > 0 && !activeCaixa) {
      // SÃƒÂ³ limpar se realmente nÃƒÂ£o houver caixa aberto
      if (openCaixa && openCaixa.status === 'open') {
        setOpenCaixa(null);
      }
    }
    // Se nÃƒÂ£o hÃƒÂ¡ caixas na lista, mostrar modal
    else if (caixas.length === 0 && !openCaixa) {
      setShowOpenCaixaModal(true);
    }
  }, [caixas, caixasLoading]); // NÃƒÂ£o incluir openCaixa aqui para evitar loop

  const createPdvSessionMutation = useMutation({
    mutationFn: async (payload) => {
      if (!tenantIdentifier) {
        throw new Error('Assinante não identificado para este PDV.');
      }
      return base44.entities.PDVSession.create({
        ...payload,
        subscriber_id: tenantSubscriberId,
        subscriber_email: tenantIdentifier,
        owner_email: tenantIdentifier,
        ...(asSubId != null ? { as_subscriber_id: asSubId } : {}),
        ...(asSub ? { as_subscriber: asSub } : {}),
      });
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['pdvSessions'] });
      setPdvSession(session);
      setPdvTerminalId(session.terminal_id ?? session.terminal_name ?? '');
      setPdvTerminalName(session.terminal_name ?? session.terminal_id ?? '');
      setShowTerminalModal(false);
    },
  });

  const endPdvSessionMutation = useMutation({
    mutationFn: async (sessionId) => base44.entities.PDVSession.update(sessionId, { ended_at: new Date().toISOString() }, opts),
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

  const createOperationMutation = useMutation({
    mutationFn: async (data) => {
      if (!tenantIdentifier) {
        throw new Error('Assinante não identificado para registrar operação de caixa.');
      }
      return base44.entities.CaixaOperation.create({
        ...data,
        subscriber_id: tenantSubscriberId,
        subscriber_email: tenantIdentifier,
        owner_email: tenantIdentifier,
        operator: user?.email || 'operador',
        ...(asSubId != null ? { as_subscriber_id: asSubId } : {}),
        ...(asSub ? { as_subscriber: asSub } : {}),
        date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixaOperations'] });
    },
  });

  const openCaixaMutation = useMutation({
    mutationFn: async (data) => {
      if (!tenantIdentifier) {
        throw new Error('Assinante não identificado para abrir caixa.');
      }
      return base44.entities.Caixa.create({
        ...data,
        subscriber_id: tenantSubscriberId,
        subscriber_email: tenantIdentifier,
        owner_email: tenantIdentifier,
        opened_by: user?.email || tenantIdentifier,
        ...(asSubId != null ? { as_subscriber_id: asSubId } : {}),
        ...(asSub ? { as_subscriber: asSub } : {}),
        terminal_id: pdvTerminalId || null,
        terminal_name: pdvTerminalName || null
      });
    },
    onSuccess: async (newCaixa) => {
      console.log('[PDV] Caixa criado com sucesso:', newCaixa);
      
      // Invalidar e refetch imediato
      await queryClient.invalidateQueries({ queryKey: ['caixas'] });
      await queryClient.refetchQueries({ queryKey: ['caixas'] });
      
      // Definir o caixa aberto imediatamente
      setOpenCaixa(newCaixa);
      
      console.log('[PDV] Estado openCaixa definido para:', {
        id: newCaixa.id,
        status: newCaixa.status
      });
      
      setShowOpenCaixaModal(false);
      setOpeningAmount('');
      setLockThreshold('');
      toast.success('Caixa aberto com sucesso!');
    },
  });

  const closeCaixaMutation = useMutation({
    mutationFn: async ({ id, freshCaixa, totals, closingCash, closingNotes }) => {
      const updateData = {
        ...freshCaixa,
        opening_amount_cash: Number(freshCaixa.opening_amount_cash) || 0,
        status: 'closed',
        closing_source: 'pdv',
        total_cash: totals.cash,
        total_pix: totals.pix,
        total_debit: totals.debit,
        total_credit: totals.credit,
        total_other: totals.other,
        closing_amount_cash: Number(closingCash) || 0,
        closing_notes: closingNotes || '',
        closed_by: user?.email || tenantIdentifier || freshCaixa?.closed_by,
        closing_date: new Date().toISOString()
      };
      delete updateData.id;
      delete updateData.created_date;
      delete updateData.updated_date;
      delete updateData.created_by;
      return base44.entities.Caixa.update(id, updateData, opts);
    },
    onSuccess: async () => {
      // Limpar o estado ANTES de invalidar queries
      setOpenCaixa(null);
      setShowCloseCaixaDialog(false);
      setShowFechamentoModal(false);
      setClosingCashAmount('');
      setClosingNotes('');
      
      // Invalidar e refetch
      await queryClient.invalidateQueries({ queryKey: ['caixas'] });
      await queryClient.refetchQueries({ queryKey: ['caixas'] });
      
      toast.success('Caixa fechado com sucesso!');
      
      // Mostrar modal de abertura apÃƒÂ³s um delay para garantir que o estado estÃƒÂ¡ limpo
      setTimeout(() => {
        setShowOpenCaixaModal(true);
      }, 300);
    },
    onError: (error) => {
      const msg = error?.message || 'Erro ao fechar caixa';
      toast.error(`Erro ao fechar caixa: ${msg}`);
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
      await base44.entities.Caixa.update(openCaixa.id, updateData, opts);
    }
    queryClient.invalidateQueries({ queryKey: ['caixas'] });
    queryClient.invalidateQueries({ queryKey: ['caixaOperations'] });
    queryClient.refetchQueries({ queryKey: ['caixas'] });
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
      await base44.entities.Caixa.update(openCaixa.id, updateData, opts);
    }
    queryClient.invalidateQueries({ queryKey: ['caixas'] });
    queryClient.invalidateQueries({ queryKey: ['caixaOperations'] });
    queryClient.refetchQueries({ queryKey: ['caixas'] });
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
      toast.error('Abra o caixa para iniciar as vendas.');
      setShowOpenCaixaModal(true);
      return;
    }
    if (isCaixaLocked) {
      toast.error('Caixa travado. Faça uma retirada em Caixa para continuar.');
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
      toast.error('Abra o caixa para iniciar as vendas.');
      setShowOpenCaixaModal(true);
      return;
    }
    if (isCaixaLocked) {
      toast.error('Caixa travado. Faça uma retirada em Caixa para continuar.');
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
    const hasSaleInProgress = cart.length > 0
      || Number(discountReais || 0) > 0
      || Number(discountPercent || 0) > 0
      || !!customerPhone;
    
    if (!hasSaleInProgress) {
      setShowPaymentModal(false);
      setShowMobileCart(false);
      saleClientRequestIdRef.current = null;
      toast('Nenhuma venda em andamento para cancelar');
      return;
    }

    if (cart.length > 0) {
      // Tracking de cancelamento em tela para relatÃƒÂ³rio
      const cartTotal = calculateTotal();
      setCanceledInScreenCount(prev => prev + 1);
      setCanceledInScreenTotal(prev => prev + cartTotal);
    }
    
    setCart([]);
    setDiscountReais('');
    setDiscountPercent('');
    setCustomerName('Cliente Balcão');
    setCustomerPhone('');
    setSelectedDish(null);
    setSelectedPizza(null);
    setShowPaymentModal(false);
    setShowMobileCart(false);
    saleClientRequestIdRef.current = null;
    resetUpsell();
    toast.success('Venda em andamento cancelada');
  };

  usePDVHotkeys({
    onOpenHelp: () => setShowAtalhosHelp(true),
    onOpenMenuVendas: () => {
      if (!pdvSession) {
        toast.error('Selecione o terminal PDV para usar os atalhos.');
        return;
      }
      setShowMenuVendas(true);
    },
    onOpenFechamento: () => {
      if (!pdvSession) {
        toast.error('Selecione o terminal PDV para usar os atalhos.');
        return;
      }
      if (!openCaixa) {
        toast.error('Abra o caixa para acessar o fechamento.');
        return;
      }
      requireAuthorization('fechar_caixa', () => setShowFechamentoModal(true));
    },
    onCancelSale: clearCart,
    onFinishSale: () => {
      if (!openCaixa) {
      toast.error('Abra o caixa para iniciar as vendas.');
        return;
      }
      if (isCaixaLocked) {
      toast.error('Caixa travado. Faça uma retirada em Caixa para continuar.');
        return;
      }
      if (cart.length === 0) {
        toast.error('Adicione itens à comanda antes de finalizar.');
        return;
      }
      setShowPaymentModal(true);
    },
  }, showMenuVendas);
  useEffect(() => {
    if (!showPaymentModal) {
      saleClientRequestIdRef.current = null;
    }
  }, [showPaymentModal]);

  const subtotal = cart.reduce((sum, item) => sum + (item.totalPrice * item.quantity), 0);
  const discountFromPercent = subtotal * (parseFloat(discountPercent || 0) / 100);
  const totalDiscount = parseFloat(discountReais || 0) + discountFromPercent;
  const total = Math.max(0, subtotal - totalDiscount);

  // Verificar loading e acesso
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="bg-card rounded-2xl shadow-lg p-8 max-w-md text-center">
          <CreditCard className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Acesso restrito</h2>
          <p className="text-muted-foreground mb-6">Esta tela é apenas para o perfil PDV.</p>
          <Button onClick={() => base44.auth.logout()} className="bg-orange-600 hover:bg-orange-700 text-primary-foreground">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    );
  }

  const handleOpenCaixa = () => {
    const existingOpenCaixa = (Array.isArray(caixas) ? caixas : []).find((c) => c?.status === 'open');
    if (existingOpenCaixa || openCaixa?.status === 'open') {
      if (existingOpenCaixa) {
        setOpenCaixa(existingOpenCaixa);
      }
      setShowOpenCaixaModal(false);
      return;
    }

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
    
    console.log('[PDV] Abrindo caixa com dados:', {
      opening_amount_cash: amount,
      terminal_id: pdvTerminalId,
      terminal_name: pdvTerminalName,
      lock_threshold: lock
    });
    
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

  const generateClientRequestId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `pdv-${crypto.randomUUID()}`;
    }
    return `pdv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const isAutoPrintEnabled = () => {
    try {
      const settings = JSON.parse(localStorage.getItem('gestorSettings') || '{}');
      return settings.auto_print === true;
    } catch (_) {
      return false;
    }
  };

  const handleFinalizeSale = async (paymentData) => {
    if (!openCaixa) {
      toast.error('Abra o caixa para iniciar as vendas.');
      setShowPaymentModal(false);
      setShowOpenCaixaModal(true);
      return;
    }

    try {
      const user = await base44.auth.me();
      if (!saleClientRequestIdRef.current) {
        saleClientRequestIdRef.current = generateClientRequestId();
      }

      const queryParams = new URLSearchParams();
      if (asSubId != null) queryParams.set('as_subscriber_id', String(asSubId));
      if (asSub) queryParams.set('as_subscriber', asSub);
      const endpoint = queryParams.toString()
        ? `/pdv/finalizar-venda?${queryParams.toString()}`
        : '/pdv/finalizar-venda';

      const result = await base44.post(endpoint, {
        caixa_id: openCaixa.id,
        client_request_id: saleClientRequestIdRef.current,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_document: paymentData.document,
        items: cart.map((item) => ({
          dish_id: item.dish?.id,
          dish_name: item.dish?.name,
          quantity: item.quantity,
          unit_price: item.totalPrice ?? item.dish?.price,
          total_price: (item.totalPrice ?? item.dish?.price ?? 0) * item.quantity,
          selections: item.selections || (
            item.flavors
              ? { size: item.size, flavors: item.flavors, edge: item.edge, extras: item.extras, specifications: item.specifications }
              : {}
          )
        })),
        subtotal,
        discount: totalDiscount,
        total,
        payments: paymentData.payments,
        production_mode: paymentData.productionMode || 'financial',
        seller_email: user.email,
        seller_name: user.full_name,
        ...(pdvTerminalId && { pdv_terminal_id: pdvTerminalId }),
        ...(pdvTerminalName && { pdv_terminal_name: pdvTerminalName }),
        ...(pdvSession?.id && { pdv_session_id: pdvSession.id })
      });

      const createdOrder = result?.pedido_pdv || {};
      const orderCode = createdOrder.order_code || `PDV${Date.now().toString().slice(-8)}`;
      const normalizePaymentForUi = (payment = {}, fallback = {}) => {
        const method = payment?.method || fallback?.method || 'outro';
        const amount = Number(payment?.amount ?? payment?.payment_amount ?? fallback?.amount ?? 0) || 0;
        let tenderedAmount = Number(
          payment?.tendered_amount
          ?? payment?.payment_amount
          ?? fallback?.tendered_amount
          ?? fallback?.amount
          ?? amount
        ) || amount;

        if (method !== 'dinheiro') {
          tenderedAmount = amount;
        }

        return {
          ...fallback,
          ...payment,
          method,
          amount,
          tendered_amount: tenderedAmount,
          change: Number(payment?.change ?? fallback?.change ?? 0) || 0,
        };
      };

      const backendPayments = Array.isArray(createdOrder.payments) ? createdOrder.payments : [];
      const fallbackPayments = Array.isArray(paymentData.payments) ? paymentData.payments : [];
      const rawPayments = backendPayments.length ? backendPayments : fallbackPayments;
      const createdPayments = rawPayments.map((payment, index) => (
        normalizePaymentForUi(payment, fallbackPayments[index] || {})
      ));
      const createdChange = createdOrder.change != null ? createdOrder.change : paymentData.change;
      const createdTotal = createdOrder.total != null ? createdOrder.total : total;
      const createdCustomerName = createdOrder.customer_name || customerName;
      const createdSubtotal = createdOrder.subtotal != null ? createdOrder.subtotal : subtotal;
      const createdDiscount = createdOrder.discount != null ? createdOrder.discount : totalDiscount;
      const createdItems = Array.isArray(createdOrder.items) && createdOrder.items.length ? createdOrder.items : cart;
      const createdDate = createdOrder.created_date || createdOrder.created_at || new Date().toISOString();

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pedidosPDV'] }),
        queryClient.invalidateQueries({ queryKey: ['caixaOperations'] }),
        queryClient.invalidateQueries({ queryKey: ['caixas'] }),
      ]);

      const finalizedSale = {
        orderCode,
        total: createdTotal,
        subtotal: createdSubtotal,
        discount: createdDiscount,
        payments: createdPayments,
        change: createdChange,
        items: createdItems,
        customerName: createdCustomerName,
        date: createdDate
      };

      setLastSale(finalizedSale);

      setCart([]);
      setDiscountReais('');
      setDiscountPercent('');
      setCustomerName('Cliente Balcão');
      setCustomerPhone('');
      setShowPaymentModal(false);
      setShowMobileCart(false);
      setShowSuccessModal(true);
      saleClientRequestIdRef.current = null;

      if (!result?.idempotent && isAutoPrintEnabled()) {
        const autoPrintRef = String(finalizedSale.orderCode || createdOrder.id || createdDate || Date.now());
        const printed = printReceipt(finalizedSale, store, 'css', {
          jobId: `pdv-receipt-${autoPrintRef}`,
          dedupeKey: `pdv:auto:${autoPrintRef}`,
          dedupeWindowMs: 20000,
        });
        if (!printed) {
          toast.error('Popup bloqueado. Permita popups para impressão automática.');
        }
      }

      if (result?.idempotent) {
        toast.success('Venda já registrada anteriormente.');
      }
    } catch (error) {
      toast.error(error?.message || 'Erro ao finalizar venda');
    }
  };

  const handlePrintReceipt = (saleData = null) => {
    const isClickEvent = !!(saleData && typeof saleData === 'object' && (saleData.nativeEvent || saleData.currentTarget));
    const sale = isClickEvent ? lastSale : (saleData || lastSale);
    if (!sale) {
      toast.error('Nenhuma venda disponível para impressão');
      return;
    }

    // Usar funÃƒÂ§ÃƒÂ£o de impressÃƒÂ£o tÃƒÂ©rmica
    const printed = printReceipt(sale, store, 'css');
    if (!printed) {
      toast.error('Popup bloqueado. Permita popups para imprimir.');
    }
  };

  return (
    <div className="min-h-screen min-h-screen-mobile h-screen flex flex-col bg-muted/40">
      {authModal}

      {/* Header Fixo */}
      <div className="bg-card text-primary-foreground h-14 sm:h-16 flex-shrink-0 border-b border-border safe-top">
        <div className="h-full px-3 sm:px-4 flex items-center justify-between max-w-[2000px] mx-auto gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link to={backUrl} className="shrink-0">
              <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-card min-h-touch min-w-touch h-10 sm:h-10 px-2 sm:px-3">
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
              <Badge variant="outline" className="bg-green-600 text-primary-foreground border-green-600 h-8 font-semibold">
                Caixa Aberto
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-600 text-primary-foreground border-red-600 h-8 font-semibold">
                Caixa Fechado
              </Badge>
            )}
            <Badge variant="outline" className="text-primary-foreground border-border h-8 hidden sm:flex">
              {cart.length} {cart.length === 1 ? 'item' : 'itens'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pdvSession && setShowMenuVendas(true)}
              className="text-primary-foreground hover:bg-card h-10 hidden sm:flex"
              title="Menu de Vendas (F2) - Suprimento, Sangria, Fechamento"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Menu
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistoryModal(true)}
              className="text-primary-foreground hover:bg-card h-10 hidden sm:flex"
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
                className="text-primary-foreground hover:bg-card h-10 hidden sm:flex"
                title="Sair deste PDV (encerra sua sessão)"
              >
                {endPdvSessionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                Sair do PDV
              </Button>
            )}
            {pdvSession && (
              <Badge variant="outline" className="text-primary-foreground border-border h-8 font-normal">
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
          <p className="text-sm text-muted-foreground">Em qual PDV você está operando?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-2">
            {pdvTerminals.map((name, i) => (
              <Button
                key={i}
                variant="outline"
                className="h-12"
                disabled={createPdvSessionMutation.isPending}
                onClick={async () => {
                  const me = user || await base44.auth.me();
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
      {/* Modal Fechamento de Caixa (relatÃƒÂ³rio igual aos prints) */}
      <FechamentoCaixaModal
        open={showFechamentoModal}
        onOpenChange={setShowFechamentoModal}
        caixa={openCaixa}
        operations={caixaOperationsAll || []}
        storeName={store?.name}
        operatorName={user?.full_name || user?.email}
        terminalName={pdvTerminalName}
        canceledInScreenCount={canceledInScreenCount}
        canceledInScreenTotal={canceledInScreenTotal}
        onFecharClick={
          openCaixa?.status === 'open'
            ? () => requireAuthorization('fechar_caixa', () => { setShowFechamentoModal(false); setShowCloseCaixaDialog(true); })
            : undefined
        }
      />

      {/* Modal Menu de Vendas (F2) */}
      <MenuVendasModal
        open={showMenuVendas}
        onOpenChange={setShowMenuVendas}
        onSuprimento={() => { 
          setShowMenuVendas(false); 
          requireAuthorization('suprimento', () => setShowSuprimentoModal(true)); 
        }}
        onSangria={() => { 
          setShowMenuVendas(false); 
          requireAuthorization('sangria', () => setShowSangriaModal(true)); 
        }}
        onReimpressao={() => { setShowMenuVendas(false); setShowReimpressaoModal(true); }}
        onFechamento={() => { 
          setShowMenuVendas(false); 
          requireAuthorization('fechar_caixa', () => setShowFechamentoModal(true)); 
        }}
        onAbertura={() => { 
          setShowMenuVendas(false); 
          requireAuthorization('abrir_caixa', () => setShowOpenCaixaModal(true)); 
        }}
        onCancelarVenda={() => { setShowMenuVendas(false); clearCart(); }}
        caixaAberto={!!openCaixa}
      />

      {/* Modal de Ajuda com Atalhos (F1) */}
      <AtalhosHelpModal
        open={showAtalhosHelp}
        onOpenChange={setShowAtalhosHelp}
      />

      {/* Modal de ReimpressÃƒÂ£o de Venda */}
      <ReimpressaoVendaModal
        open={showReimpressaoModal}
        onOpenChange={setShowReimpressaoModal}
        onPrintReceipt={handlePrintReceipt}
        asSubscriber={asSub}
      />

      {/* Dialog valor ao fechar caixa (apÃƒÂ³s autorizaÃƒÂ§ÃƒÂ£o) */}
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

      {/* Layout Principal - Grid Fixo (sÃƒÂ³ apÃƒÂ³s selecionar terminal em multi-PDV) */}
      <div className="flex-1 overflow-hidden">
        {!pdvSession && allowed ? (
          <div className="flex items-center justify-center h-full p-8">
            <p className="text-muted-foreground">Selecione o terminal PDV acima para continuar.</p>
          </div>
        ) : (
        <div className="h-full max-w-[2000px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_480px]">
          
          {/* COLUNA ESQUERDA - PRODUTOS (70%) */}
          <div className="flex flex-col bg-card h-full overflow-hidden">
            
            {/* Categorias */}
            <div className="flex-shrink-0 bg-muted/40 border-b px-3 sm:px-4 py-2 sm:py-3">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors min-h-touch ${
                    selectedCategory === 'all'
                      ? 'bg-orange-500 text-primary-foreground'
                      : 'bg-card text-foreground hover:bg-muted border border-border'
                  }`}
                >
                  TODOS
                </button>
                {hasPizzas && (
                  <button
                    onClick={() => setSelectedCategory('pizzas')}
                    className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors min-h-touch ${
                      selectedCategory === 'pizzas' ? 'bg-orange-500 text-primary-foreground' : 'bg-card text-foreground hover:bg-muted border border-border'
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
                        ? 'bg-orange-500 text-primary-foreground'
                        : 'bg-card text-foreground hover:bg-muted border border-border'
                    }`}
                  >
                    {(cat.name || 'Categoria').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Busca */}
            <div className="flex-shrink-0 px-4 py-3 bg-card border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 bg-muted/40"
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
                    className="group bg-card rounded-xl border-2 border-border hover:border-orange-400 hover:shadow-md transition-all overflow-hidden"
                  >
                    <div className="aspect-square bg-muted/50 overflow-hidden">
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
                      <h4 className="font-bold text-sm text-foreground mb-2 line-clamp-2 min-h-[40px]">
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
                  <p className="text-muted-foreground">Nenhum produto encontrado</p>
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA - COMANDA (30%) */}
          <div className="hidden lg:flex flex-col bg-card h-full overflow-hidden border-l border-border">
            
            {/* Header Comanda */}
            <div className="flex-shrink-0 p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6 text-orange-400" />
                  <h3 className="text-xl font-bold text-primary-foreground">Comanda</h3>
                </div>
                <Badge className="bg-orange-500 text-primary-foreground px-3 py-1">
                  {cart.length}
                </Badge>
              </div>
            </div>

            {/* Lista de Itens - Com Scroll */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-foreground mb-3" />
                  <p className="text-muted-foreground text-sm">Nenhum item na comanda</p>
                  <p className="text-muted-foreground text-xs mt-1">Clique em um produto para adicionar</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="bg-card rounded-lg p-3 border border-border">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 pr-2">
                        <h4 className="font-bold text-primary-foreground text-sm mb-1">
                          {item.dish.name}
                        </h4>
                        {(item.flavors?.length > 0 || (item.selections && Object.keys(item.selections).length > 0)) && (
                          <div className="mb-1">
                            {item.size && <p className="text-xs text-muted-foreground">• {item.size.name}</p>}
                            {item.flavors?.map((f, i) => <p key={i} className="text-xs text-muted-foreground">• {f.name}</p>)}
                            {item.edge && item.edge.id !== 'none' && <p className="text-xs text-muted-foreground">• Borda: {item.edge.name}</p>}
                            {!item.flavors?.length && Object.entries(item.selections || {}).map(([gId, sel]) => {
                              if (Array.isArray(sel)) return sel.map((s, i) => <p key={`${gId}-${i}`} className="text-xs text-muted-foreground">• {s?.name}</p>);
                              return sel ? <p key={gId} className="text-xs text-muted-foreground">• {sel?.name}</p> : null;
                            })}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
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
                      <div className="flex items-center gap-2 bg-muted rounded-lg p-0.5">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-9 h-9 min-h-touch min-w-touch rounded hover:bg-muted flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4 text-primary-foreground" />
                        </button>
                        <span className="w-10 text-center font-bold text-lg text-primary-foreground">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-9 h-9 min-h-touch min-w-touch rounded hover:bg-muted flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4 text-primary-foreground" />
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
            <div className="flex-shrink-0 border-t border-border p-3 space-y-2">
              
              {/* Descontos */}
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={discountReais}
                  onChange={(e) => setDiscountReais(e.target.value)}
                  placeholder="Desc. R$"
                  className="h-8 bg-card border-border text-primary-foreground text-xs"
                />
                <Input
                  type="number"
                  step="0.01"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="Desc. %"
                  className="h-8 bg-card border-border text-primary-foreground text-xs"
                />
              </div>

              {/* Subtotal */}
              {totalDiscount > 0 && (
                <div className="flex items-center justify-between text-xs py-1 border-b border-border">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold text-primary-foreground">{formatCurrency(subtotal)}</span>
                </div>
              )}

              {/* Total */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-primary-foreground">TOTAL</span>
                  <span className="text-2xl font-bold text-primary-foreground">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* BotÃƒÂµes */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  variant="outline"
                  className="h-9 border-border text-muted-foreground hover:bg-card text-sm"
                >
                  Limpar
                </Button>
                <Button
                  onClick={() => {
                    if (isCaixaLocked) {
                      toast.error('Caixa travado. Faça uma retirada em Caixa para continuar.');
                      return;
                    }
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

      {/* Barra de atalhos (desktop) */}
      {pdvSession && (
        <div className="hidden lg:flex flex-shrink-0 px-4 py-2 bg-card border-t border-border text-muted-foreground text-xs justify-center gap-6 flex-wrap">
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded">F1</kbd> Ajuda</span>
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded">F2</kbd> Menu de Vendas</span>
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded">F4</kbd> Fechamento</span>
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded">F9</kbd> Cancelar venda</span>
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded">F11</kbd> Recebimento</span>
        </div>
      )}

      {/* BotÃƒÂ£o Flutuante Mobile (sÃƒÂ³ com sessÃƒÂ£o PDV) */}
      {pdvSession && (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] bg-card border-t border-border">
        <Button
          onClick={() => setShowMobileCart(true)}
          className="w-full min-h-[48px] h-14 bg-orange-500 hover:bg-orange-600 text-primary-foreground font-bold text-lg"
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
        <div className="lg:hidden fixed inset-0 z-50 bg-card flex flex-col">
          <div className="flex-shrink-0 p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-xl font-bold text-primary-foreground">Comanda</h3>
            <button
              onClick={() => setShowMobileCart(false)}
              className="text-primary-foreground min-h-touch min-w-touch flex items-center justify-center p-2 -m-1 hover:bg-card rounded"
              aria-label="Fechar comanda"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.map((item) => (
              <div key={item.id} className="bg-card rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-bold text-primary-foreground text-sm">{item.dish.name}</h4>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.totalPrice)} un.</p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-400 p-2 min-h-touch min-w-touch rounded hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-muted rounded-lg p-0.5">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-9 h-9 min-h-touch min-w-touch rounded flex items-center justify-center hover:bg-muted"
                    >
                      <Minus className="w-4 h-4 text-primary-foreground" />
                    </button>
                    <span className="w-10 text-center font-bold text-primary-foreground">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-9 h-9 min-h-touch min-w-touch rounded flex items-center justify-center hover:bg-muted"
                    >
                      <Plus className="w-4 h-4 text-primary-foreground" />
                    </button>
                  </div>
                  <span className="font-bold text-lg text-orange-400">
                    {formatCurrency(item.totalPrice * item.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex-shrink-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] border-t border-border space-y-3">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-primary-foreground">TOTAL</span>
                <span className="text-3xl font-bold text-primary-foreground">{formatCurrency(total)}</span>
              </div>
            </div>
            <Button
              onClick={() => {
                if (!openCaixa) {
      toast.error('Abra o caixa para iniciar as vendas.');
                  setShowMobileCart(false);
                  setShowOpenCaixaModal(true);
                  return;
                }
                if (isCaixaLocked) { 
      toast.error('Caixa travado. Faça uma retirada em Caixa para continuar.');
                  return; 
                }
                if (cart.length === 0) {
                  toast.error('Adicione itens à comanda antes de finalizar.');
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

      {/* Modal HistÃƒÂ³rico de Vendas */}
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
                <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma venda registrada ainda</p>
              </div>
            ) : (
              (pdvSales || []).filter(sale => sale).map((sale) => {
                // Validar e formatar data de forma segura
                let saleDate = null;
                try {
                  const dateStr = sale.created_date || sale.created_at;
                  if (dateStr && typeof dateStr === 'string' && dateStr.trim() !== '') {
                    saleDate = new Date(dateStr);
                    // Verificar se a data ÃƒÂ© vÃƒÂ¡lida
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
                              <span className="text-sm text-muted-foreground">
                                <Clock className="w-4 h-4 inline mr-1" />
                                {saleDate.toLocaleString('pt-BR')}
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-lg">{sale.customer_name}</p>
                          {sale.customer_phone && (
                            <p className="text-sm text-muted-foreground">📞 {sale.customer_phone}</p>
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

      {/* Modal Abertura de Caixa - OBRIGATÃƒâ€œRIO */}
      <Dialog open={showOpenCaixaModal} onOpenChange={(open) => {
        if (!open && !openCaixa) {
          toast.error('É obrigatório abrir o caixa para usar o PDV.');
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
              {openCaixa ? 'Abrir novo caixa' : 'CAIXA FECHADO - PDV BLOQUEADO'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {!openCaixa && (
              <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
                <p className="text-sm text-red-800 font-bold mb-2">
                  O PDV está bloqueado!
                </p>
                <p className="text-xs text-red-700">
                  Para realizar vendas no PDV, você deve abrir um caixa primeiro. Esta é uma operação obrigatória para controle financeiro.
                </p>
              </div>
            )}

            {openCaixa && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium">
                  Já existe um caixa aberto. Deseja abrir um novo?
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
              <p className="text-xs text-muted-foreground">Valor em dinheiro físico disponível no caixa ao abrir.</p>
            </div>

            <div className="space-y-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50">
              <Label className="text-base font-semibold">Valor limite de travamento (R$) - opcional</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={lockThreshold}
                onChange={(e) => setLockThreshold(e.target.value)}
                placeholder="Ex: 500"
                className="h-12 border-2 bg-card"
              />
              <p className="text-xs text-muted-foreground">Quando as vendas em dinheiro atingirem este valor, o PDV trava até ser feita uma retirada em Caixa.</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-800 font-medium">
                Após abrir o caixa, você poderá realizar vendas normalmente.
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
              {openCaixaMutation.isPending ? 'Abrindo caixa...' : 'Confirmar abertura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

