import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiClient as base44 } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Receipt, ShoppingCart, AlertTriangle, ArrowLeft, Trash2, Plus, Minus, X, History, Clock, Loader2, LogOut, CreditCard, Wallet, TrendingUp, TrendingDown, Lock, Star } from 'lucide-react';
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
import { usePDVKeyboardShortcuts } from '@/hooks/usePDVKeyboardShortcuts';
import { usePDVStats, getPdvDishScore } from '@/hooks/usePDVStats';
import InstallAppButton from '../components/InstallAppButton';
import FechamentoCaixaModal from '../components/pdv/FechamentoCaixaModal';
import { getScopedStorageKey, getTenantScopeKey } from '@/utils/tenantScope';
import MenuVendasModal from '../components/pdv/MenuVendasModal';
import AtalhosHelpModal from '../components/pdv/AtalhosHelpModal';
import ReimpressaoVendaModal from '../components/pdv/ReimpressaoVendaModal';
import PDVFavoritesPanel from '../components/pdv/PDVFavoritesPanel';
import PDVTopSellingPanel from '../components/pdv/PDVTopSellingPanel';
import { formatCurrency } from '@/utils/formatters';
import { printReceipt, printCashClosingReport } from '@/utils/thermalPrint';
import { userIsTenantOwner, userMatchesTenant } from '@/utils/tenantScope';
import {
  buildCaixaShiftSummary,
  formatOperationalDateLabel,
  getCaixaOpenedAt,
  normalizeOperationalDayCutoffTime,
} from '@/utils/operationalShift';
import {
  closeCaixaShift,
  createCaixaShiftMovement,
  openCaixaShift,
} from '@/services/caixaShiftService';

const PDV_FAVORITE_SLOTS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

function normalizePdvFavorites(rawValue) {
  if (!rawValue || typeof rawValue !== 'object') return {};
  return PDV_FAVORITE_SLOTS.reduce((accumulator, slot) => {
    const rawDishId = rawValue?.[slot];
    if (rawDishId === null || rawDishId === undefined) return accumulator;
    const normalizedDishId = String(rawDishId).trim();
    if (!normalizedDishId) return accumulator;
    accumulator[slot] = normalizedDishId;
    return accumulator;
  }, {});
}

export default function PDV() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pdvCodeInput, setPdvCodeInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState([]);
  const [discountReais, setDiscountReais] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [selectedDish, setSelectedDish] = useState(null);
  const [customerName, setCustomerName] = useState('Cliente BalcÃ£o');
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
  const { isMaster, hasRole, canAccessOperationalRoute } = usePermission();
  const { requireAuthorization, modal: authModal } = useManagerialAuth();
  const { slug, subscriberId, subscriberEmail, inSlugContext, loading: slugLoading } = useSlugContext();
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
  const tenantScope = getTenantScopeKey(asSubId ?? tenantSubscriberId, asSub ?? tenantIdentifier, 'none');
  const gestorSettingsStorageKey = useMemo(() => {
    const storageContext = (asSubId ?? tenantSubscriberId) != null || (asSub ?? tenantIdentifier)
      ? {
          type: 'subscriber',
          value: asSub ?? tenantIdentifier,
          subscriber_id: asSubId ?? tenantSubscriberId ?? null,
        }
      : null;
    return getScopedStorageKey('gestorSettings', storageContext, 'global');
  }, [asSub, asSubId, tenantIdentifier, tenantSubscriberId]);
  const pdvFavoritesStorageKey = useMemo(() => {
    const storageContext = (asSubId ?? tenantSubscriberId) != null || (asSub ?? tenantIdentifier)
      ? {
          type: 'subscriber',
          value: asSub ?? tenantIdentifier,
          subscriber_id: asSubId ?? tenantSubscriberId ?? null,
        }
      : null;
    return getScopedStorageKey('pdvFavorites', storageContext, 'global');
  }, [asSub, asSubId, tenantIdentifier, tenantSubscriberId]);
  const pdvStatsStorageKey = useMemo(() => {
    const storageContext = (asSubId ?? tenantSubscriberId) != null || (asSub ?? tenantIdentifier)
      ? {
          type: 'subscriber',
          value: asSub ?? tenantIdentifier,
          subscriber_id: asSubId ?? tenantSubscriberId ?? null,
        }
      : null;
    return getScopedStorageKey('pdvStats', storageContext, 'global');
  }, [asSub, asSubId, tenantIdentifier, tenantSubscriberId]);
  const { pdvStats, recordDishUsage } = usePDVStats({ storageKey: pdvStatsStorageKey });

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
  const [highlightedDishId, setHighlightedDishId] = useState(null);
  const [highlightedCartItemId, setHighlightedCartItemId] = useState(null);
  const [pdvCodeFieldStatus, setPdvCodeFieldStatus] = useState('idle');
  const [pdvCodeFieldMessage, setPdvCodeFieldMessage] = useState('Bipe ou digite o código e pressione Enter.');
  const [showPdvSuggestions, setShowPdvSuggestions] = useState(false);
  const [activePdvSuggestionIndex, setActivePdvSuggestionIndex] = useState(0);
  const [pdvFavorites, setPdvFavorites] = useState({});
  const [highlightedFavoriteSlot, setHighlightedFavoriteSlot] = useState(null);
  
  // Tracking de cancelamentos em tela (para relatÃƒÆ’Ã‚Â³rio de fechamento)
  const [canceledInScreenCount, setCanceledInScreenCount] = useState(0);
  const [canceledInScreenTotal, setCanceledInScreenTotal] = useState(0);
  const saleClientRequestIdRef = useRef(null);
  const pdvCodeInputRef = useRef(null);
  const shouldRefocusPdvCodeRef = useRef(false);
  const pdvCodeFeedbackTimerRef = useRef(null);
  const pdvCodeRefocusTimerRef = useRef(null);
  const scannerSequenceRef = useRef({ startedAt: 0, lastAt: 0, count: 0 });
  const pdvCodeFocusBlockedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawFavorites = window.localStorage.getItem(pdvFavoritesStorageKey);
      const parsedFavorites = rawFavorites ? JSON.parse(rawFavorites) : {};
      setPdvFavorites(normalizePdvFavorites(parsedFavorites));
    } catch (error) {
      console.warn('[PDV] Nao foi possivel carregar favoritos rapidos:', error);
      setPdvFavorites({});
    }
  }, [pdvFavoritesStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const normalizedFavorites = normalizePdvFavorites(pdvFavorites);
    window.localStorage.setItem(pdvFavoritesStorageKey, JSON.stringify(normalizedFavorites));
  }, [pdvFavorites, pdvFavoritesStorageKey]);

  // Verificar autenticaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o e permissÃƒÆ’Ã‚Â£o
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
        
        console.log('[PDV] Verificando acesso para usuÃƒÆ’Ã‚Â¡rio:', {
          email: me.email,
          subscriber_email: me.subscriber_email,
          profile_role: me.profile_role,
          profile_roles: me.profile_roles,
          is_master: me.is_master
        });
        
        const hasAccessByHelper = canAccessOperationalRoute({
          subscriberId,
          subscriberEmail,
          inSlugContext,
          allowedRoles: ['pdv'],
        }, me);

        const tenantMatch = inSlugContext
          ? userMatchesTenant(me, { subscriberId, subscriberEmail })
          : true;
        const directRoleAccess = me?.is_master === true || hasRole('gerente', me) || hasRole('pdv', me);
        const ownerAccess = userIsTenantOwner(me);
        const subscriberAccess = tenantMatch
          && !hasRole('entregador', me)
          && !hasRole('cozinha', me)
          && !hasRole('garcom', me)
          && me?.role !== 'customer'
          && !!(me?.subscriber_email || me?.subscriber_id);
        const hasAccess = hasAccessByHelper || directRoleAccess || ownerAccess || subscriberAccess;

        console.log('[PDV] access result', {
          isGerente: hasRole('gerente', me),
          isPDV: hasRole('pdv', me),
          ownerAccess,
          tenantMatch,
          helperAccess: hasAccessByHelper,
          hasAccess
        });
        
        
        setAllowed(hasAccess);
      } catch (e) {
        console.error('[PDV] Erro ao verificar permissÃƒÆ’Ã‚Âµes:', e);
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
  }, [canonicalPdvPath, canAccessOperationalRoute, hasRole, inSlugContext, slugLoading, subscriberEmail, subscriberId]);
  
  // Define pÃƒÆ’Ã‚Â¡gina de volta baseado no tipo de usuÃƒÆ’Ã‚Â¡rio
  const isPdvOperatorOnly = hasRole('pdv', user) && !hasRole('gerente', user) && !isMaster;
  const backPage = isMaster ? 'Admin' : (isPdvOperatorOnly ? 'ColaboradorHome' : 'PainelAssinante');
  const backUrl = backPage === 'ColaboradorHome'
    ? createPageUrl('ColaboradorHome')
    : createPageUrl(backPage, isMaster ? undefined : slug || undefined);

  // master em contexto slug usa as_subscriber; demais usuÃƒÂ¡rios usam escopo do prÃƒÂ³prio token.
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

  const { data: beverageCategories = [] } = useQuery({
    queryKey: ['beverageCategories', tenantScope],
    queryFn: () => base44.entities.BeverageCategory.list('order', opts).catch(() => []),
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
  const operationalCutoffTime = normalizeOperationalDayCutoffTime(store?.operational_day_cutoff_time);

  const pdvTerminals = (Array.isArray(store?.pdv_terminals) && store.pdv_terminals.length > 0)
    ? store.pdv_terminals
    : ['PDV 1', 'PDV 2', 'PDV 3'];

  const { data: pdvSessionsRaw = [] } = useQuery({
    queryKey: ['pdvSessions', tenantScope],
    queryFn: () => base44.entities.PDVSession.list('-created_at', opts).catch(() => []),
    enabled: !!user && allowed,
  });
  // Filtrar sessÃƒÆ’Ã‚Âµes ativas no frontend (ended_at null/undefined)
  const safePdvSessions = Array.isArray(pdvSessionsRaw) ? pdvSessionsRaw.filter(Boolean) : [];
  const activePdvSessions = safePdvSessions.filter((session) => !session?.ended_at);
  const currentCaixaSummary = useMemo(
    () => buildCaixaShiftSummary({
      caixa: openCaixa,
      operations: caixaOperations,
      canceledCount: canceledInScreenCount,
      canceledAmount: canceledInScreenTotal,
      cutoffTime: operationalCutoffTime,
    }),
    [openCaixa, caixaOperations, canceledInScreenCount, canceledInScreenTotal, operationalCutoffTime]
  );

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

  const safePromotions = Array.isArray(promotions) ? promotions.filter(Boolean) : [];
  const { showUpsellModal, upsellPromotions, checkUpsell, resetUpsell, closeUpsell } = useUpsell(
    safePromotions,
    cart.reduce((s, i) => s + (i.totalPrice || 0) * (i.quantity || 1), 0)
  );

  useEffect(() => {
    // NÃƒÆ’Ã‚Â£o executar se jÃƒÆ’Ã‚Â¡ hÃƒÆ’Ã‚Â¡ um caixa no estado e nÃƒÆ’Ã‚Â£o estÃƒÆ’Ã‚Â¡ carregando
    if (caixasLoading) return;
    
    const activeCaixa = (caixas || []).find(c => c && c.status === 'open');
    
    // Se encontrou caixa aberto no backend, atualizar estado local
    if (activeCaixa) {
      setOpenCaixa(activeCaixa);
      setShowOpenCaixaModal(false);
    } 
    // Se nÃƒÆ’Ã‚Â£o hÃƒÆ’Ã‚Â¡ caixa aberto mas hÃƒÆ’Ã‚Â¡ caixas fechados, limpar estado e mostrar modal
    else if (Array.isArray(caixas) && caixas.length > 0 && !activeCaixa) {
      // SÃƒÆ’Ã‚Â³ limpar se realmente nÃƒÆ’Ã‚Â£o houver caixa aberto
      if (openCaixa && openCaixa.status === 'open') {
        setOpenCaixa(null);
      }
    }
    // Se nÃƒÆ’Ã‚Â£o hÃƒÆ’Ã‚Â¡ caixas na lista, mostrar modal
    else if (caixas.length === 0 && !openCaixa) {
      setShowOpenCaixaModal(true);
    }
  }, [caixas, caixasLoading]); // NÃƒÆ’Ã‚Â£o incluir openCaixa aqui para evitar loop

  const createPdvSessionMutation = useMutation({
    mutationFn: async (payload) => {
      if (!tenantIdentifier) {
        throw new Error('Assinante nÃ£o identificado para este PDV.');
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
    const mySession = activePdvSessions.find((session) => session?.operator_email === user.email);
    if (mySession) {
      setPdvSession(mySession);
      setPdvTerminalId(mySession.terminal_id ?? mySession.terminal_name ?? '');
      setPdvTerminalName(mySession.terminal_name ?? mySession.terminal_id ?? '');
      setShowTerminalModal(false);
    } else {
      setShowTerminalModal(true);
    }
  }, [user, allowed, activePdvSessions, pdvSession]);

  const refreshCaixaQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['caixas', subscriberIdentifier ?? 'none'] }),
      queryClient.invalidateQueries({ queryKey: ['caixaOperations', tenantScope] }),
      queryClient.invalidateQueries({ queryKey: ['pedidosPDV', tenantScope] }),
    ]);
  };

  const createOperationMutation = useMutation({
    mutationFn: async (data) => {
      if (!tenantIdentifier) {
        throw new Error('Assinante nao identificado para registrar operacao de caixa.');
      }
      return createCaixaShiftMovement({
        ...data,
        operator: user?.email || 'operador',
      }, opts);
    },
    onSuccess: async (result) => {
      if (result?.caixa) {
        setOpenCaixa(result.caixa);
      }
      await refreshCaixaQueries();
    },
  });

  const openCaixaMutation = useMutation({
    mutationFn: async (data) => {
      if (!tenantIdentifier) {
        throw new Error('Assinante nao identificado para abrir caixa.');
      }
      return openCaixaShift({
        ...data,
        opened_by: user?.email || tenantIdentifier,
        terminal_id: pdvTerminalId || null,
        terminal_name: pdvTerminalName || null,
      }, opts);
    },
    onSuccess: async (result) => {
      const newCaixa = result?.caixa || result;
      console.log('[PDV] Caixa criado com sucesso:', newCaixa);
      setOpenCaixa(newCaixa);
      await refreshCaixaQueries();
      setShowOpenCaixaModal(false);
      setOpeningAmount('');
      setLockThreshold('');
      toast.success('Caixa aberto com sucesso!');
    },
  });

  const closeCaixaMutation = useMutation({
    mutationFn: async ({ id, closingCash, closingNotes }) => closeCaixaShift(id, {
      closing_amount_cash: Number(closingCash) || 0,
      closing_balance: Number(closingCash) || 0,
      closing_notes: closingNotes || '',
      closing_source: 'pdv',
      canceled_count: canceledInScreenCount,
      canceled_amount: canceledInScreenTotal,
    }, opts),
    onSuccess: async () => {
      setOpenCaixa(null);
      setShowCloseCaixaDialog(false);
      setShowFechamentoModal(false);
      setClosingCashAmount('');
      setClosingNotes('');
      await refreshCaixaQueries();
      toast.success('Caixa fechado com sucesso!');
      setTimeout(() => {
        setShowOpenCaixaModal(true);
      }, 300);
    },
    onError: (error) => {
      const msg = error?.message || 'Erro ao fechar caixa';
      toast.error(`Erro ao fechar caixa: ${msg}`);
    },
  });

  const isCaixaLocked = !!(
    openCaixa?.lock_threshold != null &&
    currentCaixaSummary.expectedBalance >= (Number(openCaixa?.lock_threshold) || 0)
  );

  const handleSangriaFromPDV = async () => {
    if (!openCaixa || !sangriaData.amount || !sangriaData.reason) {
      toast.error('Preencha valor e motivo');
      return;
    }
    const amount = parseFloat(sangriaData.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Informe um valor valido para a sangria');
      return;
    }
    if (amount > currentCaixaSummary.expectedBalance) {
      toast.error('Saldo insuficiente no caixa');
      return;
    }
    await createOperationMutation.mutateAsync({
      caixa_id: openCaixa.id,
      type: 'sangria',
      description: `Sangria: ${sangriaData.reason}`,
      amount,
      payment_method: 'dinheiro',
      reason: sangriaData.reason,
    });
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
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Informe um valor valido para o suprimento');
      return;
    }
    await createOperationMutation.mutateAsync({
      caixa_id: openCaixa.id,
      type: 'suprimento',
      description: `Suprimento: ${suprimentoData.reason}`,
      amount,
      payment_method: 'dinheiro',
      reason: suprimentoData.reason,
    });
    setShowSuprimentoModal(false);
    setSuprimentoData({ amount: '', reason: '' });
    toast.success('Suprimento registrado');
  };

  const handleCloseCaixaFromPDV = async () => {
    if (!openCaixa || !closingCashAmount) {
      toast.error('Informe o valor em dinheiro ao fechar');
      return;
    }
    const closingCash = parseFloat(closingCashAmount);
    if (!Number.isFinite(closingCash) || closingCash < 0) {
      toast.error('Informe um valor de fechamento valido');
      return;
    }
    closeCaixaMutation.mutate({
      id: openCaixa.id,
      closingCash,
      closingNotes,
    });
  };

  const safeCaixas = Array.isArray(caixas) ? caixas.filter(Boolean) : [];
  const safeComplementGroups = Array.isArray(complementGroups) ? complementGroups.filter(Boolean) : [];
  const safeDishes = Array.isArray(dishes) ? dishes.filter(Boolean) : [];
  const normalizePdvCode = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim().toLowerCase();
  };
  const isDishEnabledInPdv = (dish) => dish?.is_active !== false && dish?.channels?.pdv?.enabled !== false;
  const pdvCodeIndex = useMemo(() => {
    const index = new Map();

    safeDishes.forEach((dish) => {
      const normalizedCode = normalizePdvCode(dish?.channels?.pdv?.code);
      if (!normalizedCode) return;
      const currentItems = index.get(normalizedCode) || [];
      currentItems.push(dish);
      index.set(normalizedCode, currentItems);
    });

    return index;
  }, [safeDishes]);
  const normalizedPdvCodeInput = normalizePdvCode(pdvCodeInput);
  const pdvCodeSuggestions = useMemo(() => {
    if (!normalizedPdvCodeInput) return [];

    return safeDishes
      .filter((dish) => {
        const code = normalizePdvCode(dish?.channels?.pdv?.code);
        return code && code.startsWith(normalizedPdvCodeInput);
      })
      .sort((a, b) => {
        const codeA = normalizePdvCode(a?.channels?.pdv?.code);
        const codeB = normalizePdvCode(b?.channels?.pdv?.code);
        const exactBoostA = codeA === normalizedPdvCodeInput ? 0 : 1;
        const exactBoostB = codeB === normalizedPdvCodeInput ? 0 : 1;
        if (exactBoostA !== exactBoostB) return exactBoostA - exactBoostB;
        if (codeA.length !== codeB.length) return codeA.length - codeB.length;
        return String(a?.name || '').localeCompare(String(b?.name || ''));
      })
      .slice(0, 8);
  }, [normalizedPdvCodeInput, safeDishes]);
  const exactPdvCodeMatches = pdvCodeIndex.get(normalizedPdvCodeInput) || [];
  const activePdvSuggestion = pdvCodeSuggestions[activePdvSuggestionIndex] || pdvCodeSuggestions[0] || null;
  const shouldShowPdvSuggestions = showPdvSuggestions
    && Boolean(normalizedPdvCodeInput)
    && exactPdvCodeMatches.length === 0
    && pdvCodeSuggestions.length > 0;
  const activeDishes = safeDishes.filter(d => d && d.is_active !== false);
  const dishById = useMemo(
    () => new Map(safeDishes.map((dish) => [String(dish.id), dish])),
    [safeDishes]
  );
  const favoriteSlotByDishId = useMemo(
    () => Object.entries(normalizePdvFavorites(pdvFavorites)).reduce((accumulator, [slot, dishId]) => {
      accumulator[String(dishId)] = slot;
      return accumulator;
    }, {}),
    [pdvFavorites]
  );
  const nextAvailableFavoriteSlot = useMemo(
    () => PDV_FAVORITE_SLOTS.find((slot) => !pdvFavorites?.[slot]) || null,
    [pdvFavorites]
  );
  const pdvFavoriteSlots = useMemo(
    () => PDV_FAVORITE_SLOTS.map((slot) => {
      const mappedDishId = pdvFavorites?.[slot] ? String(pdvFavorites[slot]) : null;
      const mappedDish = mappedDishId ? dishById.get(mappedDishId) || null : null;
      return {
        slot,
        dishId: mappedDishId,
        dish: mappedDish,
        isAssigned: Boolean(mappedDishId),
        hasDishRecord: Boolean(mappedDish),
        isEnabled: mappedDish ? isDishEnabledInPdv(mappedDish) : false,
      };
    }),
    [dishById, pdvFavorites]
  );
  const pdvTopSellingItems = useMemo(() => {
    const now = Date.now();

    return safeDishes
      .filter((dish) => dish && dish.name && isDishEnabledInPdv(dish))
      .map((dish) => {
        const stat = pdvStats?.[String(dish.id)];
        if (!stat?.count) return null;

        return {
          dish,
          count: stat.count,
          lastUsedAt: stat.lastUsedAt || 0,
          score: getPdvDishScore(stat, now),
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.count !== a.count) return b.count - a.count;
        if (b.lastUsedAt !== a.lastUsedAt) return b.lastUsedAt - a.lastUsedAt;
        return String(a?.dish?.name || '').localeCompare(String(b?.dish?.name || ''));
      })
      .slice(0, 5);
  }, [pdvStats, safeDishes]);
  const safeCategories = Array.isArray(categories) ? categories.filter((cat) => cat && cat.name && cat.is_active !== false) : [];
  const safeBeverageCategories = Array.isArray(beverageCategories)
    ? beverageCategories.filter((cat) => cat && cat.name && cat.is_active !== false)
    : [];
  const activeBeverages = activeDishes.filter((dish) => dish?.product_type === 'beverage');
  const visibleMenuCategories = safeCategories.filter((cat) =>
    activeDishes.some(
      (dish) => dish?.product_type !== 'beverage' && String(dish?.category_id) === String(cat.id)
    )
  );
  const visibleBeverageCategories = safeBeverageCategories.filter((cat) =>
    activeBeverages.some((dish) => String(dish?.category_id) === String(cat.id))
  );
  const hasPizzas = activeDishes.some(d => d.product_type === 'pizza');
  const filteredDishes = activeDishes.filter(d => {
    if (!d || !d.name) return false;
    const matchesSearch = !searchTerm || d.name.toLowerCase().includes(searchTerm.toLowerCase());
    let matchesCategory = true;
    if (selectedCategory === 'pizzas') matchesCategory = d.product_type === 'pizza';
    else if (selectedCategory === 'beverages') matchesCategory = d.product_type === 'beverage';
    else if (selectedCategory?.startsWith?.('bc_')) {
      const beverageCategoryId = selectedCategory.replace(/^bc_/, '');
      matchesCategory = d.product_type === 'beverage' && String(d.category_id) === String(beverageCategoryId);
    } else if (selectedCategory !== 'all') {
      matchesCategory = d.product_type !== 'beverage' && String(d.category_id) === String(selectedCategory);
    }
    return matchesSearch && matchesCategory;
  });

  const getDishComplementGroups = React.useCallback((dish) => {
    if (!dish) return [];
    return safeComplementGroups.filter((group) =>
      dish.complement_groups?.some((cg) => String(cg?.group_id) === String(group?.id))
    );
  }, [safeComplementGroups]);

  const dishRequiresConfiguration = React.useCallback((dish) => {
    if (!dish) return false;
    if (dish.product_type === 'pizza' && pizzaSizes?.length > 0 && pizzaFlavors?.length > 0) {
      return true;
    }
    return getDishComplementGroups(dish).length > 0;
  }, [getDishComplementGroups, pizzaFlavors, pizzaSizes]);

  const isPdvCodeFocusBlocked = !!(
    showTerminalModal
    || showPaymentModal
    || showMobileCart
    || !!selectedDish
    || !!selectedPizza
    || showOpenCaixaModal
    || showHistoryModal
    || showSuccessModal
    || showMenuVendas
    || showFechamentoModal
    || showSangriaModal
    || showSuprimentoModal
    || showCloseCaixaDialog
    || showAtalhosHelp
    || showReimpressaoModal
    || showUpsellModal
  );

  useEffect(() => {
    pdvCodeFocusBlockedRef.current = isPdvCodeFocusBlocked;
  }, [isPdvCodeFocusBlocked]);

  const resetScannerSequence = React.useCallback(() => {
    scannerSequenceRef.current = { startedAt: 0, lastAt: 0, count: 0 };
  }, []);

  const setPdvCodeFeedback = React.useCallback((status, message, resetDelay = 0) => {
    setPdvCodeFieldStatus(status);
    setPdvCodeFieldMessage(message);

    if (pdvCodeFeedbackTimerRef.current) {
      window.clearTimeout(pdvCodeFeedbackTimerRef.current);
      pdvCodeFeedbackTimerRef.current = null;
    }

    if (resetDelay > 0) {
      pdvCodeFeedbackTimerRef.current = window.setTimeout(() => {
        setPdvCodeFieldStatus('idle');
        setPdvCodeFieldMessage('Bipe ou digite o código e pressione Enter.');
        pdvCodeFeedbackTimerRef.current = null;
      }, resetDelay);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pdvCodeFeedbackTimerRef.current) {
        window.clearTimeout(pdvCodeFeedbackTimerRef.current);
      }
      if (pdvCodeRefocusTimerRef.current) {
        window.clearTimeout(pdvCodeRefocusTimerRef.current);
      }
    };
  }, []);

  const focusPdvCodeInput = React.useCallback(({ selectText = false, force = false } = {}) => {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      if (!pdvCodeInputRef.current || pdvCodeFocusBlockedRef.current) return;
      const activeElement = document.activeElement;
      const activeTag = activeElement?.tagName?.toLowerCase?.();
      const activeIsTextInput = !!(
        activeElement
        && activeElement !== document.body
        && activeElement !== pdvCodeInputRef.current
        && (
          ['input', 'textarea', 'select'].includes(activeTag)
          || activeElement.getAttribute?.('contenteditable') === 'true'
          || activeElement.getAttribute?.('role') === 'combobox'
        )
      );
      const activeInsideDialog = !!activeElement?.closest?.('[role="dialog"], [data-radix-popper-content-wrapper]');
      if (!force && (activeIsTextInput || activeInsideDialog)) return;
      pdvCodeInputRef.current.focus({ preventScroll: true });
      if (selectText && typeof pdvCodeInputRef.current.select === 'function') {
        pdvCodeInputRef.current.select();
      }
    });
  }, []);

  const schedulePdvCodeFocus = React.useCallback((options = {}, delay = 0) => {
    if (typeof window === 'undefined') return;
    if (pdvCodeRefocusTimerRef.current) {
      window.clearTimeout(pdvCodeRefocusTimerRef.current);
    }
    pdvCodeRefocusTimerRef.current = window.setTimeout(() => {
      pdvCodeRefocusTimerRef.current = null;
      focusPdvCodeInput(options);
    }, delay);
  }, [focusPdvCodeInput]);

  useEffect(() => {
    if (!allowed || !pdvSession || isPdvCodeFocusBlocked) {
      return;
    }
    focusPdvCodeInput();
  }, [allowed, pdvSession, isPdvCodeFocusBlocked, focusPdvCodeInput]);

  useEffect(() => {
    if (!showPdvSuggestions || pdvCodeSuggestions.length === 0) {
      setActivePdvSuggestionIndex(0);
      return;
    }
    setActivePdvSuggestionIndex((current) => Math.min(current, pdvCodeSuggestions.length - 1));
  }, [showPdvSuggestions, pdvCodeSuggestions.length]);

  useEffect(() => {
    if (pdvCodeFieldStatus !== 'idle') return;

    if (!normalizedPdvCodeInput) {
      setPdvCodeFieldMessage('Bipe ou digite o código e pressione Enter.');
      return;
    }

    const exactMatches = pdvCodeIndex.get(normalizedPdvCodeInput) || [];
    if (exactMatches.length > 0) {
      setPdvCodeFieldMessage('Código exato encontrado. Pressione Enter para adicionar.');
      return;
    }

    if (showPdvSuggestions && pdvCodeSuggestions.length === 1) {
      setPdvCodeFieldMessage('1 código encontrado por prefixo. Enter adiciona direto.');
      return;
    }

    if (showPdvSuggestions && pdvCodeSuggestions.length > 1) {
      setPdvCodeFieldMessage(`${pdvCodeSuggestions.length} sugestoes por prefixo. Use as setas e Enter.`);
      return;
    }

    setPdvCodeFieldMessage('Continue digitando ou pressione Enter para buscar o código.');
  }, [normalizedPdvCodeInput, pdvCodeFieldStatus, pdvCodeIndex, pdvCodeSuggestions.length, showPdvSuggestions]);

  useEffect(() => {
    if (!highlightedDishId && !highlightedCartItemId && !highlightedFavoriteSlot) return undefined;
    const timer = window.setTimeout(() => {
      setHighlightedDishId(null);
      setHighlightedCartItemId(null);
      setHighlightedFavoriteSlot(null);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [highlightedDishId, highlightedCartItemId, highlightedFavoriteSlot]);

  const registerScannerKeypress = React.useCallback((event) => {
    const now = Date.now();

    if (event.key === 'Enter') {
      const sequence = scannerSequenceRef.current;
      const scannerLike = sequence.count >= 4
        && sequence.startedAt > 0
        && (now - sequence.startedAt) <= 350
        && (now - sequence.lastAt) <= 100;
      resetScannerSequence();
      return scannerLike;
    }

    if (event.key === 'Escape') {
      resetScannerSequence();
      if (showPdvSuggestions) {
        setShowPdvSuggestions(false);
        setActivePdvSuggestionIndex(0);
        setPdvCodeFeedback('idle', 'Sugestoes fechadas. Digite mais ou confirme um codigo exato.');
        return false;
      }
      setPdvCodeInput('');
      setPdvCodeFeedback('idle', 'Bipe ou digite o codigo e pressione Enter.');
      return false;
    }

    const isPrintableKey = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
    if (!isPrintableKey) return false;

    const previous = scannerSequenceRef.current;
    const gap = previous.lastAt ? now - previous.lastAt : Number.POSITIVE_INFINITY;
    const shouldRestart = !previous.startedAt || gap > 180;
    const nextSequence = shouldRestart
      ? { startedAt: now, lastAt: now, count: 1 }
      : { startedAt: previous.startedAt, lastAt: now, count: previous.count + 1 };

    scannerSequenceRef.current = nextSequence;

    const isScannerLikeBurst = nextSequence.count >= 4
      && gap <= 45
      && (now - nextSequence.startedAt) <= 250;

    if (isScannerLikeBurst) {
      setPdvCodeFeedback('scanning', 'Leitura rapida detectada. Aguardando Enter...');
    }

    return false;
  }, [resetScannerSequence, setPdvCodeFeedback, showPdvSuggestions]);

  const handlePdvSuggestionNavigation = React.useCallback((direction) => {
    if (pdvCodeSuggestions.length === 0) return;
    setShowPdvSuggestions(true);
    setActivePdvSuggestionIndex((current) => {
      const nextIndex = direction === 'down' ? current + 1 : current - 1;
      if (nextIndex < 0) return pdvCodeSuggestions.length - 1;
      if (nextIndex >= pdvCodeSuggestions.length) return 0;
      return nextIndex;
    });
    setPdvCodeFeedback('idle', `${pdvCodeSuggestions.length} sugestoes encontradas. Use as setas e Enter.`);
  }, [pdvCodeSuggestions.length, setPdvCodeFeedback]);

  const handlePdvCodeFieldChange = React.useCallback((value) => {
    setPdvCodeInput(value);
    setActivePdvSuggestionIndex(0);
    setShowPdvSuggestions(Boolean(value));

    if (!value) {
      resetScannerSequence();
      setPdvCodeFeedback('idle', 'Bipe ou digite o codigo e pressione Enter.');
      return;
    }

    if (pdvCodeFieldStatus === 'error') {
      setPdvCodeFeedback('idle', 'Codigo ajustado. Pressione Enter para tentar novamente.');
      return;
    }

    if (pdvCodeFieldStatus === 'success') {
      setPdvCodeFeedback('idle', 'Pronto para a proxima leitura.');
    }
  }, [pdvCodeFieldStatus, resetScannerSequence, setPdvCodeFeedback]);

  const handlePdvCodeError = React.useCallback((message, { scannerLike = false } = {}) => {
    toast.error(message);
    setPdvCodeFeedback(
      'error',
      scannerLike ? `${message}. Pronto para uma nova leitura.` : `${message}. Revise o codigo e tente novamente.`,
      1800
    );

    if (scannerLike) {
      setPdvCodeInput('');
      schedulePdvCodeFocus({ force: true }, 40);
      return;
    }

    schedulePdvCodeFocus({ selectText: true, force: true }, 40);
  }, [schedulePdvCodeFocus, setPdvCodeFeedback]);

  function handleResolvedPdvDish(dish, { scannerLike = false, matchedBy = 'exact' } = {}) {
    if (!dish) {
      handlePdvCodeError('Produto nao encontrado', { scannerLike });
      return;
    }

    if (!isDishEnabledInPdv(dish)) {
      handlePdvCodeError('Produto desativado no PDV', { scannerLike });
      return;
    }

    if (!openCaixa) {
      handlePdvCodeError('Abra o caixa para iniciar as vendas', { scannerLike });
      setShowOpenCaixaModal(true);
      return;
    }

    if (isCaixaLocked) {
      handlePdvCodeError('Caixa travado. Faca uma retirada em Caixa para continuar', { scannerLike });
      return;
    }

    const opensSelectionFlow = dishRequiresConfiguration(dish);
    shouldRefocusPdvCodeRef.current = true;
    setPdvCodeInput('');
    setShowPdvSuggestions(false);
    setActivePdvSuggestionIndex(0);
    setPdvCodeFeedback(
      'success',
      opensSelectionFlow
        ? `${dish.name} localizado. Continue a selecao para concluir.`
        : matchedBy === 'prefix'
          ? `${dish.name} adicionado por prefixo. Pronto para a proxima leitura.`
          : `${dish.name} adicionado. Pronto para a proxima leitura.`,
      1400
    );
    handleDishClick(dish);
  }

  const handlePdvCodeSubmit = ({ scannerLike = false } = {}) => {
    if (!normalizedPdvCodeInput) {
      setPdvCodeFeedback('error', 'Digite um codigo para iniciar a leitura.', 1500);
      schedulePdvCodeFocus({ force: true }, 30);
      return;
    }

    const exactMatches = pdvCodeIndex.get(normalizedPdvCodeInput) || [];
    if (exactMatches.length > 0) {
      if (exactMatches.length > 1) {
        toast('Codigo duplicado. Usando o primeiro produto encontrado.', { icon: '!' });
      }
      handleResolvedPdvDish(exactMatches[0], { scannerLike, matchedBy: 'exact' });
      return;
    }

    if (pdvCodeSuggestions.length === 1) {
      handleResolvedPdvDish(pdvCodeSuggestions[0], { scannerLike, matchedBy: 'prefix' });
      return;
    }

    if (pdvCodeSuggestions.length > 1) {
      if (!showPdvSuggestions) {
        setShowPdvSuggestions(true);
        setActivePdvSuggestionIndex(0);
        setPdvCodeFeedback('idle', `${pdvCodeSuggestions.length} sugestoes encontradas. Use as setas e Enter.`);
        schedulePdvCodeFocus({ force: true }, 30);
        return;
      }

      const selectedSuggestion = activePdvSuggestion || pdvCodeSuggestions[0];
      if (!selectedSuggestion) {
        handlePdvCodeError('Produto nao encontrado', { scannerLike });
        return;
      }

      handleResolvedPdvDish(selectedSuggestion, { scannerLike, matchedBy: 'prefix' });
      return;
    }

    handlePdvCodeError('Produto nao encontrado', { scannerLike });
  };

  const handlePdvSurfacePointerDown = React.useCallback((event) => {
    if (!allowed || !pdvSession) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[role="dialog"], [data-radix-popper-content-wrapper], [data-pdv-code-input="true"]')) {
      return;
    }
    if (target.closest('input, textarea, select, [contenteditable="true"], [role="combobox"]')) {
      return;
    }
    if (showPdvSuggestions) {
      setShowPdvSuggestions(false);
      setActivePdvSuggestionIndex(0);
    }
    schedulePdvCodeFocus({ force: false }, 60);
  }, [allowed, pdvSession, schedulePdvCodeFocus, showPdvSuggestions]);

  const handleDishClick = (dish) => {
    if (!openCaixa) {
      toast.error('Abra o caixa para iniciar as vendas.');
      setShowOpenCaixaModal(true);
      return;
    }
    if (isCaixaLocked) {
      toast.error('Caixa travado. FaÃ§a uma retirada em Caixa para continuar.');
      return;
    }

    if (dish.product_type === 'pizza' && pizzaSizes?.length > 0 && pizzaFlavors?.length > 0) {
      setSelectedPizza(dish);
      return;
    }

    const dishGroups = getDishComplementGroups(dish);

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
      toast.error('Caixa travado. FaÃ§a uma retirada em Caixa para continuar.');
      return;
    }
    const newItem = { ...item, quantity: 1, id: Date.now() };
    setCart(prev => {
      const next = [...prev, newItem];
      const newTotal = next.reduce((s, i) => s + (i.totalPrice || 0) * (i.quantity || 1), 0);
      setTimeout(() => checkUpsell(newTotal), 100);
      return next;
    });
    setHighlightedDishId(String(item?.dish?.id || ''));
    setHighlightedCartItemId(String(newItem.id));
    recordDishUsage(item?.dish?.id);
    setSelectedDish(null);
    setSelectedPizza(null);
    toast.success(`${item.dish.name} adicionado!`);

    if (shouldRefocusPdvCodeRef.current) {
      shouldRefocusPdvCodeRef.current = false;
      schedulePdvCodeFocus({ force: true }, 50);
      return;
    }

    schedulePdvCodeFocus({ force: false }, 120);
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
      schedulePdvCodeFocus({ force: false }, 120);
    }
  };

  const removeItem = (id) => {
    setCart(cart.filter(item => item.id !== id));
    toast.success('Item removido');
    schedulePdvCodeFocus({ force: false }, 120);
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
      schedulePdvCodeFocus({ force: false }, 120);
      return;
    }

    if (cart.length > 0) {
      // Tracking de cancelamento em tela para relatÃƒÆ’Ã‚Â³rio
      const cartTotal = calculateTotal();
      setCanceledInScreenCount(prev => prev + 1);
      setCanceledInScreenTotal(prev => prev + cartTotal);
    }
    
    setCart([]);
    setDiscountReais('');
    setDiscountPercent('');
    setCustomerName('Cliente BalcÃ£o');
    setCustomerPhone('');
    setSelectedDish(null);
    setSelectedPizza(null);
    setShowPaymentModal(false);
    setShowMobileCart(false);
    saleClientRequestIdRef.current = null;
    resetUpsell();
    toast.success('Venda em andamento cancelada');
    schedulePdvCodeFocus({ force: false }, 120);
  };

  const toggleDishFavorite = React.useCallback((dish) => {
    if (!dish?.id) return;

    const normalizedDishId = String(dish.id);
    const existingSlot = favoriteSlotByDishId[normalizedDishId];

    if (existingSlot) {
      setPdvFavorites((current) => {
        const next = { ...normalizePdvFavorites(current) };
        delete next[existingSlot];
        return next;
      });
      toast.success(`Atalho ${existingSlot} liberado.`);
      schedulePdvCodeFocus({ force: false }, 60);
      return;
    }

    if (!nextAvailableFavoriteSlot) {
      toast.error('Todos os atalhos 1-9 ja estao ocupados.');
      schedulePdvCodeFocus({ force: false }, 60);
      return;
    }

    setPdvFavorites((current) => normalizePdvFavorites({
      ...current,
      [nextAvailableFavoriteSlot]: normalizedDishId,
    }));
    setHighlightedFavoriteSlot(nextAvailableFavoriteSlot);
    toast.success(`${dish.name} salvo no atalho ${nextAvailableFavoriteSlot}.`);
    schedulePdvCodeFocus({ force: false }, 60);
  }, [favoriteSlotByDishId, nextAvailableFavoriteSlot, schedulePdvCodeFocus]);

  const removeFavoriteSlot = React.useCallback((slot) => {
    const normalizedSlot = String(slot);
    const mappedDishId = pdvFavorites?.[normalizedSlot];
    if (!mappedDishId) return;

    setPdvFavorites((current) => {
      const next = { ...normalizePdvFavorites(current) };
      delete next[normalizedSlot];
      return next;
    });

    const mappedDish = dishById.get(String(mappedDishId));
    toast.success(
      mappedDish?.name
        ? `${mappedDish.name} removido do atalho ${normalizedSlot}.`
        : `Atalho ${normalizedSlot} liberado.`
    );
    schedulePdvCodeFocus({ force: false }, 60);
  }, [dishById, pdvFavorites, schedulePdvCodeFocus]);

  const triggerFavoriteSlot = React.useCallback((slot) => {
    const normalizedSlot = String(slot);
    const mappedDishId = pdvFavorites?.[normalizedSlot];

    if (!mappedDishId) {
      toast('Atalho vazio. Defina um favorito primeiro.');
      schedulePdvCodeFocus({ force: false }, 60);
      return;
    }

    const dish = dishById.get(String(mappedDishId));
    if (!dish) {
      toast.error('Produto favorito nao encontrado.');
      schedulePdvCodeFocus({ force: false }, 60);
      return;
    }

    if (!isDishEnabledInPdv(dish)) {
      toast.error('Produto desativado no PDV.');
      schedulePdvCodeFocus({ force: false }, 60);
      return;
    }

    setHighlightedFavoriteSlot(normalizedSlot);
    setHighlightedDishId(String(dish.id));

    if (openCaixa && !isCaixaLocked) {
      shouldRefocusPdvCodeRef.current = true;
    }

    handleDishClick(dish);
  }, [dishById, isCaixaLocked, openCaixa, pdvFavorites, schedulePdvCodeFocus]);

  const resetPdvCodeShortcutState = React.useCallback(({ clearInput = false } = {}) => {
    resetScannerSequence();
    setShowPdvSuggestions(false);
    setActivePdvSuggestionIndex(0);
    if (clearInput) {
      setPdvCodeInput('');
    }
    setPdvCodeFeedback('idle', 'Bipe ou digite o codigo e pressione Enter.');
  }, [resetScannerSequence, setPdvCodeFeedback]);

  const focusPdvCodeFromShortcut = React.useCallback(() => {
    resetPdvCodeShortcutState({ clearInput: true });
    schedulePdvCodeFocus({ force: true }, 20);
  }, [resetPdvCodeShortcutState, schedulePdvCodeFocus]);

  const openPaymentFlow = React.useCallback(({ closeMobileCart = false } = {}) => {
    if (!openCaixa) {
      toast.error('Abra o caixa para iniciar as vendas.');
      if (closeMobileCart) {
        setShowMobileCart(false);
      }
      setShowOpenCaixaModal(true);
      return;
    }
    if (isCaixaLocked) {
      toast.error('Caixa travado. Faca uma retirada em Caixa para continuar.');
      return;
    }
    if (cart.length === 0) {
      toast.error('Adicione itens a comanda antes de finalizar.');
      return;
    }
    if (closeMobileCart) {
      setShowMobileCart(false);
    }
    setShowPaymentModal(true);
  }, [cart.length, isCaixaLocked, openCaixa]);

  const removeLastCartItem = React.useCallback(() => {
    const lastItem = cart[cart.length - 1];
    if (!lastItem) {
      toast('Nenhum item na comanda.');
      schedulePdvCodeFocus({ force: false }, 60);
      return;
    }
    setHighlightedCartItemId(String(lastItem.id));
    removeItem(lastItem.id);
  }, [cart, schedulePdvCodeFocus]);

  const adjustLastCartItemQuantity = React.useCallback((delta) => {
    const lastItem = cart[cart.length - 1];
    if (!lastItem) {
      toast('Nenhum item na comanda.');
      schedulePdvCodeFocus({ force: false }, 60);
      return;
    }
    setHighlightedCartItemId(String(lastItem.id));
    updateQuantity(lastItem.id, lastItem.quantity + delta);
  }, [cart, schedulePdvCodeFocus]);

  const toggleKeyboardCart = React.useCallback(() => {
    const isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;
    if (!isMobileViewport) {
      schedulePdvCodeFocus({ force: false }, 40);
      return;
    }
    setShowMobileCart((current) => !current);
  }, [schedulePdvCodeFocus]);

  const isKeyboardShortcutBlocked = !!(
    showTerminalModal
    || showPaymentModal
    || !!selectedDish
    || !!selectedPizza
    || showOpenCaixaModal
    || showHistoryModal
    || showSuccessModal
    || showMenuVendas
    || showFechamentoModal
    || showSangriaModal
    || showSuprimentoModal
    || showCloseCaixaDialog
    || showAtalhosHelp
    || showReimpressaoModal
    || showUpsellModal
  );

  usePDVKeyboardShortcuts({
    enabled: allowed && !!pdvSession,
    codeInputRef: pdvCodeInputRef,
    codeInputValue: pdvCodeInput,
    isModalOpen: isKeyboardShortcutBlocked,
    isCartOverlayOpen: showMobileCart,
    canToggleCart: !!pdvSession,
    onFocusCode: focusPdvCodeFromShortcut,
    onResetCodeState: () => {
      resetPdvCodeShortcutState({ clearInput: false });
      schedulePdvCodeFocus({ force: true }, 20);
    },
    onOpenPayment: () => openPaymentFlow(),
    onToggleCart: toggleKeyboardCart,
    onRemoveLastItem: removeLastCartItem,
    onAdjustLastItemQuantity: adjustLastCartItemQuantity,
    onFavoriteSlot: triggerFavoriteSlot,
    onOpenHelp: () => setShowAtalhosHelp(true),
  });
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
          <p className="text-muted-foreground mb-6">Esta tela Ã© apenas para o perfil PDV.</p>
          <Button onClick={() => base44.auth.logout()} className="bg-orange-600 hover:bg-orange-700 text-primary-foreground">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    );
  }

  const handleOpenCaixa = () => {
    const existingOpenCaixa = safeCaixas.find((c) => c?.status === 'open');
    if (existingOpenCaixa || openCaixa?.status === 'open') {
      if (existingOpenCaixa) {
        setOpenCaixa(existingOpenCaixa);
      }
      setShowOpenCaixaModal(false);
      return;
    }

    const amount = parseFloat(openingAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('Informe um valor vÃ¡lido de abertura');
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
      const settings = JSON.parse(localStorage.getItem(gestorSettingsStorageKey) || '{}');
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
      setCustomerName('Cliente BalcÃ£o');
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
          toast.error('Popup bloqueado. Permita popups para impressÃ£o automÃ¡tica.');
        }
      }

      if (result?.idempotent) {
        toast.success('Venda jÃ¡ registrada anteriormente.');
      }
    } catch (error) {
      toast.error(error?.message || 'Erro ao finalizar venda');
    }
  };

  const handlePrintReceipt = (saleData = null) => {
    const isClickEvent = !!(saleData && typeof saleData === 'object' && (saleData.nativeEvent || saleData.currentTarget));
    const sale = isClickEvent ? lastSale : (saleData || lastSale);
    if (!sale) {
      toast.error('Nenhuma venda disponÃ­vel para impressÃ£o');
      return;
    }

    // Usar funÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de impressÃƒÆ’Ã‚Â£o tÃƒÆ’Ã‚Â©rmica
    const printed = printReceipt(sale, store, 'css');
    if (!printed) {
      toast.error('Popup bloqueado. Permita popups para imprimir.');
    }
  };

  return (
    <div
      className="min-h-screen min-h-screen-mobile h-screen flex flex-col bg-muted/40"
      onPointerDownCapture={handlePdvSurfacePointerDown}
    >
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
              title="Menu de Vendas - Suprimento, Sangria, Fechamento"
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
              HistÃ³rico
            </Button>
            {pdvSession && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => endPdvSessionMutation.mutate(pdvSession.id)}
                disabled={endPdvSessionMutation.isPending}
                className="text-primary-foreground hover:bg-card h-10 hidden sm:flex"
                title="Sair deste PDV (encerra sua sessÃ£o)"
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
          <p className="text-sm text-muted-foreground">Em qual PDV vocÃª estÃ¡ operando?</p>
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
      {/* Modal Fechamento de Caixa (relatÃƒÆ’Ã‚Â³rio igual aos prints) */}
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
        operationalCutoffTime={operationalCutoffTime}
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

      {/* Modal de ReimpressÃƒÆ’Ã‚Â£o de Venda */}
      <ReimpressaoVendaModal
        open={showReimpressaoModal}
        onOpenChange={setShowReimpressaoModal}
        onPrintReceipt={handlePrintReceipt}
        asSubscriber={asSub}
      />

      {/* Dialog valor ao fechar caixa (apÃƒÆ’Ã‚Â³s autorizaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o) */}
      <Dialog open={showCloseCaixaDialog} onOpenChange={setShowCloseCaixaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fechar caixa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {openCaixa && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-1">
                <p><strong>Dia operacional:</strong> {formatOperationalDateLabel(currentCaixaSummary.operationalDate)}</p>
                <p><strong>Abertura:</strong> {getCaixaOpenedAt(openCaixa) ? new Date(getCaixaOpenedAt(openCaixa)).toLocaleString('pt-BR') : '-'}</p>
                {currentCaixaSummary.turnLabel && (
                  <p><strong>Turno:</strong> {currentCaixaSummary.turnLabel}</p>
                )}
                <p><strong>Saldo esperado:</strong> {formatCurrency(currentCaixaSummary.expectedBalance)}</p>
                {closingCashAmount && !Number.isNaN(Number(closingCashAmount)) && (
                  <p>
                    <strong>Diferença projetada:</strong>{' '}
                    {formatCurrency(Number(closingCashAmount) - currentCaixaSummary.expectedBalance)}
                  </p>
                )}
              </div>
            )}
            <Label>Valor em dinheiro ao fechar (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={closingCashAmount}
              onChange={(e) => setClosingCashAmount(e.target.value)}
              placeholder="0,00"
            />
            <Label>ObservaÃ§Ãµes (opcional)</Label>
            <Input
              value={closingNotes}
              onChange={(e) => setClosingNotes(e.target.value)}
              placeholder="ObservaÃ§Ãµes do fechamento"
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
                placeholder="Ex: DepÃ³sito bancÃ¡rio"
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
                placeholder="Ex: ReforÃ§o de caixa"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuprimentoModal(false)}>Cancelar</Button>
            <Button className="bg-orange-600" onClick={handleSuprimentoFromPDV}>Registrar Suprimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Layout Principal - Grid Fixo (sÃƒÆ’Ã‚Â³ apÃƒÆ’Ã‚Â³s selecionar terminal em multi-PDV) */}
      <div className="flex-1 overflow-hidden">
        {!pdvSession && allowed ? (
          <div className="flex items-center justify-center h-full p-8">
            <p className="text-muted-foreground">Selecione o terminal PDV acima para continuar.</p>
          </div>
        ) : (
        <div className="h-full max-w-[2000px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_480px]">
          
          {/* COLUNA ESQUERDA - PRODUTOS (70%) */}
          <div className="flex flex-col bg-card h-full overflow-hidden">
            <div className="flex-shrink-0 border-b border-border bg-card px-3 sm:px-4 py-3">
              <div
                className={`rounded-xl border p-3 transition-all ${
                  pdvCodeFieldStatus === 'success'
                    ? 'border-emerald-300 bg-emerald-50/80 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20'
                    : pdvCodeFieldStatus === 'error'
                      ? 'border-red-300 bg-red-50/80 shadow-sm dark:border-red-900 dark:bg-red-950/20'
                      : pdvCodeFieldStatus === 'scanning'
                        ? 'border-sky-300 bg-sky-50/80 shadow-sm dark:border-sky-800 dark:bg-sky-950/20'
                        : 'border-orange-200 bg-orange-50/60 dark:border-orange-900/60 dark:bg-orange-950/20'
                }`}
                data-pdv-code-input="true"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">Leitura por codigo</p>
                      <Badge
                        variant="outline"
                        className={`h-6 px-2 text-[11px] font-semibold ${
                          pdvCodeFieldStatus === 'success'
                            ? 'border-emerald-400 text-emerald-700 dark:text-emerald-300'
                            : pdvCodeFieldStatus === 'error'
                              ? 'border-red-400 text-red-700 dark:text-red-300'
                              : pdvCodeFieldStatus === 'scanning'
                                ? 'border-sky-400 text-sky-700 dark:text-sky-300'
                                : 'border-orange-300 text-orange-700 dark:text-orange-300'
                        }`}
                      >
                        {pdvCodeFieldStatus === 'success'
                          ? 'Leitura ok'
                          : pdvCodeFieldStatus === 'error'
                            ? 'Falha'
                            : pdvCodeFieldStatus === 'scanning'
                              ? 'Scanner'
                              : 'Pronto'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pdvCodeFieldMessage}
                    </p>
                  </div>
                  <div className="relative w-full md:max-w-sm">
                    <Receipt className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-500" />
                    <Input
                      ref={pdvCodeInputRef}
                      value={pdvCodeInput}
                      onChange={(e) => handlePdvCodeFieldChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          handlePdvSuggestionNavigation('down');
                          return;
                        }

                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          handlePdvSuggestionNavigation('up');
                          return;
                        }

                        const scannerLike = registerScannerKeypress(e);

                        if (e.key === 'Escape') {
                          e.preventDefault();
                          return;
                        }

                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handlePdvCodeSubmit({ scannerLike });
                        }
                      }}
                      onFocus={() => {
                        if (!pdvCodeInput) {
                          setPdvCodeFeedback('idle', 'Bipe ou digite o codigo e pressione Enter.');
                          return;
                        }
                        if (pdvCodeSuggestions.length > 0 && exactPdvCodeMatches.length === 0) {
                          setShowPdvSuggestions(true);
                        }
                      }}
                      placeholder="Bipe ou digite o codigo do produto..."
                      className={`h-11 bg-card pl-10 text-sm transition-all ${
                        pdvCodeFieldStatus === 'success'
                          ? 'border-emerald-300 ring-2 ring-emerald-200 dark:border-emerald-800 dark:ring-emerald-900/40'
                          : pdvCodeFieldStatus === 'error'
                            ? 'border-red-300 ring-2 ring-red-200 dark:border-red-900 dark:ring-red-900/40'
                            : pdvCodeFieldStatus === 'scanning'
                              ? 'border-sky-300 ring-2 ring-sky-200 dark:border-sky-800 dark:ring-sky-900/40'
                              : 'border-orange-200'
                      }`}
                      inputMode="text"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    {shouldShowPdvSuggestions && (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                        <div className="border-b border-border/70 bg-muted/30 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Sugestoes por codigo
                        </div>
                        <div className="max-h-80 overflow-y-auto py-1">
                          {pdvCodeSuggestions.map((dish, index) => {
                            const code = String(dish?.channels?.pdv?.code || '').trim();
                            const isActive = isDishEnabledInPdv(dish);
                            const isSelected = index === activePdvSuggestionIndex;

                            return (
                              <button
                                key={`pdv-code-suggestion-${dish.id}-${code || index}`}
                                type="button"
                                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors ${
                                  isSelected ? 'bg-orange-50 dark:bg-orange-950/20' : 'hover:bg-muted/50'
                                }`}
                                onMouseDown={(event) => event.preventDefault()}
                                onMouseEnter={() => setActivePdvSuggestionIndex(index)}
                                onClick={() => handleResolvedPdvDish(dish, { matchedBy: 'prefix' })}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                                      {code || 'Sem codigo'}
                                    </span>
                                    {!isActive && (
                                      <Badge variant="outline" className="border-red-300 text-[10px] text-red-600 dark:text-red-300">
                                        PDV desativado
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="mt-1 truncate text-sm font-semibold text-foreground">
                                    {dish?.name || 'Produto sem nome'}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-sm font-semibold text-foreground">
                                    {formatCurrency(Number(dish?.price || 0))}
                                  </span>
                                  <span className={`text-[11px] font-medium ${isActive ? 'text-emerald-600 dark:text-emerald-300' : 'text-muted-foreground'}`}>
                                    {isActive ? 'Disponivel' : 'Bloqueado'}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <PDVFavoritesPanel
              slots={pdvFavoriteSlots}
              highlightedSlot={highlightedFavoriteSlot}
              onUseFavorite={triggerFavoriteSlot}
              onRemoveFavorite={removeFavoriteSlot}
            />

            <PDVTopSellingPanel
              items={pdvTopSellingItems}
              highlightedDishId={highlightedDishId}
              onUseDish={handleDishClick}
            />
            
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
                {visibleMenuCategories.map(cat => (
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
                {activeBeverages.length > 0 && (
                  <>
                    {visibleBeverageCategories.length > 0 ? (
                      visibleBeverageCategories.map((cat) => {
                        const beverageCategoryKey = `bc_${cat.id}`;
                        return (
                          <button
                            key={beverageCategoryKey}
                            onClick={() => setSelectedCategory(beverageCategoryKey)}
                            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors min-h-touch ${
                              selectedCategory === beverageCategoryKey
                                ? 'bg-orange-500 text-primary-foreground'
                                : 'bg-card text-foreground hover:bg-muted border border-border'
                            }`}
                          >
                            {(cat.name || 'Bebidas').toUpperCase()}
                          </button>
                        );
                      })
                    ) : (
                      <button
                        onClick={() => setSelectedCategory('beverages')}
                        className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors min-h-touch ${
                          selectedCategory === 'beverages'
                            ? 'bg-orange-500 text-primary-foreground'
                            : 'bg-card text-foreground hover:bg-muted border border-border'
                        }`}
                      >
                        BEBIDAS
                      </button>
                    )}
                  </>
                )}
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
                {filteredDishes.map((dish) => {
                  const favoriteSlot = favoriteSlotByDishId[String(dish.id)];
                  const isFavorite = Boolean(favoriteSlot);
                  const favoriteButtonLabel = isFavorite
                    ? `Atalho ${favoriteSlot}`
                    : nextAvailableFavoriteSlot
                      ? `Salvar no ${nextAvailableFavoriteSlot}`
                      : 'Atalhos cheios';

                  return (
                    <div
                      key={dish.id}
                      className={`rounded-xl border-2 bg-card overflow-hidden transition-all ${
                        String(highlightedDishId || '') === String(dish.id)
                          ? 'border-emerald-400 ring-2 ring-emerald-200 shadow-lg'
                          : 'border-border hover:border-orange-400 hover:shadow-md'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleDishClick(dish)}
                        className="group block w-full text-left"
                      >
                        <div className="aspect-square bg-muted/50 overflow-hidden">
                          {dish.image ? (
                            <img
                              src={dish.image}
                              alt={dish.name}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-5xl">
                              ðŸ½ï¸
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
                      <div className="border-t border-border/70 bg-muted/20 p-2">
                        <button
                          type="button"
                          onClick={() => toggleDishFavorite(dish)}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold transition-colors ${
                            isFavorite
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-300'
                              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Star
                              className={`h-4 w-4 flex-shrink-0 ${
                                isFavorite ? 'fill-current text-amber-500' : 'text-muted-foreground'
                              }`}
                            />
                            <span className="truncate">
                              {favoriteButtonLabel}
                            </span>
                          </span>
                          {isFavorite && (
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                              Favorito
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
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
                  <div
                    key={item.id}
                    className={`rounded-lg p-3 border transition-all ${
                      String(highlightedCartItemId || '') === String(item.id)
                        ? 'border-emerald-400 bg-emerald-50/60 shadow-sm dark:bg-emerald-950/20'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 pr-2">
                        <h4 className="font-bold text-primary-foreground text-sm mb-1">
                          {item.dish.name}
                        </h4>
                        {(item.flavors?.length > 0 || (item.selections && Object.keys(item.selections).length > 0)) && (
                          <div className="mb-1">
                            {item.size && <p className="text-xs text-muted-foreground">â€¢ {item.size.name}</p>}
                            {item.flavors?.map((f, i) => <p key={i} className="text-xs text-muted-foreground">â€¢ {f.name}</p>)}
                            {item.edge && item.edge.id !== 'none' && <p className="text-xs text-muted-foreground">â€¢ Borda: {item.edge.name}</p>}
                            {!item.flavors?.length && Object.entries(item.selections || {}).map(([gId, sel]) => {
                              if (Array.isArray(sel)) return sel.map((s, i) => <p key={`${gId}-${i}`} className="text-xs text-muted-foreground">â€¢ {s?.name}</p>);
                              return sel ? <p key={gId} className="text-xs text-muted-foreground">â€¢ {sel?.name}</p> : null;
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

              {/* BotÃƒÆ’Ã‚Âµes */}
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
                    openPaymentFlow();
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
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded">?</kbd> Ajuda</span>
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded">F2</kbd> Codigo</span>
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded">1-9</kbd> Favoritos</span>
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded">F3</kbd> Comanda</span>
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded">F4</kbd> Pagamento</span>
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded">Backspace</kbd> Ultimo item</span>
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded">+</kbd>/<kbd className="px-1.5 py-0.5 bg-muted rounded">-</kbd> Qtde</span>
        </div>
      )}

      {/* BotÃƒÆ’Ã‚Â£o Flutuante Mobile (sÃƒÆ’Ã‚Â³ com sessÃƒÆ’Ã‚Â£o PDV) */}
      {pdvSession && (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] bg-card border-t border-border">
        <Button
          onClick={() => setShowMobileCart(true)}
          className="w-full min-h-[48px] h-14 bg-orange-500 hover:bg-orange-600 text-primary-foreground font-bold text-lg"
          disabled={cart.length === 0}
        >
          <ShoppingCart className="w-5 h-5 mr-2" />
          Ver Comanda ({cart.length})
          {cart.length > 0 && <span className="ml-2">â€¢ {formatCurrency(total)}</span>}
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
              <div
                key={item.id}
                className={`rounded-lg p-3 transition-all ${
                  String(highlightedCartItemId || '') === String(item.id)
                    ? 'bg-emerald-50/70 ring-2 ring-emerald-300 dark:bg-emerald-950/20'
                    : 'bg-card'
                }`}
              >
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
                openPaymentFlow({ closeMobileCart: true });
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

      {/* Modal HistÃƒÆ’Ã‚Â³rico de Vendas */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <History className="w-6 h-6 text-orange-500" />
              HistÃ³rico de Vendas PDV
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
                    // Verificar se a data ÃƒÆ’Ã‚Â© vÃƒÆ’Ã‚Â¡lida
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
                            <p className="text-sm text-muted-foreground">ðŸ“ž {sale.customer_phone}</p>
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

      {/* Modal Abertura de Caixa - OBRIGATÃƒÆ’Ã¢â‚¬Å“RIO */}
      <Dialog open={showOpenCaixaModal} onOpenChange={(open) => {
        if (!open && !openCaixa) {
          toast.error('Ã‰ obrigatÃ³rio abrir o caixa para usar o PDV.');
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
                  O PDV estÃ¡ bloqueado!
                </p>
                <p className="text-xs text-red-700">
                  Para realizar vendas no PDV, vocÃª deve abrir um caixa primeiro. Esta Ã© uma operaÃ§Ã£o obrigatÃ³ria para controle financeiro.
                </p>
              </div>
            )}

            {openCaixa && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium">
                  JÃ¡ existe um caixa aberto. Deseja abrir um novo?
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
              <p className="text-xs text-muted-foreground">Valor em dinheiro fÃ­sico disponÃ­vel no caixa ao abrir.</p>
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
              <p className="text-xs text-muted-foreground">Quando as vendas em dinheiro atingirem este valor, o PDV trava atÃ© ser feita uma retirada em Caixa.</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-800 font-medium">
                ApÃ³s abrir o caixa, vocÃª poderÃ¡ realizar vendas normalmente.
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

