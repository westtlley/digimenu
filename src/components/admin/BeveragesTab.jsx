import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Pencil,
  Wine,
  Search,
  Sparkles,
  TrendingUp,
  ShoppingCart,
  Eye,
  Link2,
  ArrowUpRight,
  Layers3,
  GlassWater,
  Pizza,
  UtensilsCrossed,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminMediaField from './media/AdminMediaField';
import { usePermission } from '@/components/permissions/usePermission';
import { useMenuCategories, useMenuDishes } from '@/hooks/useMenuData';
import { getMenuContextEntityOpts, getMenuContextQueryKeyParts, getMenuContextSubscriberEmail } from '@/utils/tenantScope';
import { cn } from '@/lib/utils';
import BeverageCard from '@/components/menu/BeverageCard';
import BeverageOverviewPanel from '@/components/admin/beverages/BeverageOverviewPanel';
import BeverageInsightsPanel from '@/components/admin/beverages/BeverageInsightsPanel';
import {
  getAdminBeverageIntelligence,
  mergeBeverageStrategySources,
  saveAdminBeverageMetrics,
  saveAdminBeverageStrategy,
} from '@/services/beverageIntelligenceService';
import {
  BEVERAGE_CONTEXT_OPTIONS,
  BEVERAGE_PACKAGING_OPTIONS,
  BEVERAGE_SECTIONS,
  BEVERAGE_TAG_OPTIONS,
  buildBeverageAutoPlan,
  buildBeverageModuleSummary,
  buildBeverageRecommendations,
  getBeverageCommercialProfile,
  inferBeveragePackaging,
  normalizeBeverageStrategy,
  suggestBeverageLinks,
} from '@/utils/beverageStrategy';

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const DEFAULT_BEVERAGE_OFFER = {
  enabled: true,
  trigger_product_types: ['pizza', 'dish', 'hamburger'],
  min_cart_value: 0,
  dish_id: null,
  title: '?? Que tal uma bebida?',
  message: 'Complete seu pedido com {product_name} por apenas {product_price}',
  discount_percent: 0,
};

const statusToneMap = {
  Fraca: 'border-rose-200 bg-rose-50 text-rose-700',
  Regular: 'border-amber-200 bg-amber-50 text-amber-700',
  Boa: 'border-sky-200 bg-sky-50 text-sky-700',
  Forte: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const previewContextMap = {
  menu: { label: 'Cardapio publico', title: 'Como a bebida aparece no catalogo', icon: GlassWater },
  pizza: { label: 'Sugestao para pizza', title: 'Upsell depois da pizza', icon: Pizza },
  dish: { label: 'Sugestao para prato', title: 'Upsell para restaurante', icon: UtensilsCrossed },
  combo: { label: 'Combo / promocao', title: 'Como ela entra numa oferta', icon: Layers3 },
};

const DIETARY_OPTIONS = [
  { id: 'vegano', label: 'Vegano' },
  { id: 'sem_lactose', label: 'Sem lactose' },
  { id: 'sem_gluten', label: 'Sem gluten' },
  { id: 'zero_acucar', label: 'Zero acucar' },
];

const normalizeTriggerTypes = (value) => {
  if (!Array.isArray(value) || value.length === 0) return ['pizza', 'dish', 'hamburger'];
  return Array.from(new Set(value.filter(Boolean)));
};

const BEVERAGE_SUBSECTION_NAV = {
  intelligence: [
    { id: 'overview', label: 'Resumo guiado', shortLabel: 'Resumo' },
    { id: 'insights', label: 'Oportunidades', shortLabel: 'Oportun.' },
  ],
};

export default function BeveragesTab() {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState('catalog');
  const [showBeverageModal, setShowBeverageModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingBeverage, setEditingBeverage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedBeverageId, setSelectedBeverageId] = useState(null);
  const [previewContext, setPreviewContext] = useState('menu');
  const [selectedCategoryLink, setSelectedCategoryLink] = useState('');
  const [selectedDishLink, setSelectedDishLink] = useState('');
  const [runningActionId, setRunningActionId] = useState(null);
  const [beverageStrategy, setBeverageStrategy] = useState({});
  const [beverageMetrics, setBeverageMetrics] = useState({});
  const [upsellDraft, setUpsellDraft] = useState(DEFAULT_BEVERAGE_OFFER);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    price: '',
    category_id: '',
    beverage_type: 'industrial',
    volume_ml: '',
    serving_temp: 'cold',
    ean: '',
    sugar_free: false,
    alcoholic: false,
    caffeine: false,
    dietary_tags: [],
    is_active: true,
    is_highlight: false,
    order: 0,
  });

  const queryClient = useQueryClient();
  const remoteHydratedTenantRef = useRef(null);
  const remoteMetricsHydratedTenantRef = useRef(null);
  const skipStrategySyncRef = useRef(false);
  const skipMetricsSyncRef = useRef(false);
  const [localStrategyLoaded, setLocalStrategyLoaded] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { menuContext, loading: permissionLoading } = usePermission();
  const menuContextQueryKey = getMenuContextQueryKeyParts(menuContext);
  const subscriberContextEmail = getMenuContextSubscriberEmail(menuContext);
  const entityContextOpts = getMenuContextEntityOpts(menuContext);
  const strategySyncContext = useMemo(() => ({
    ...(entityContextOpts?.as_subscriber ? { as_subscriber: entityContextOpts.as_subscriber } : {}),
    ...(entityContextOpts?.as_subscriber_id != null ? { as_subscriber_id: entityContextOpts.as_subscriber_id } : {}),
  }), [entityContextOpts?.as_subscriber, entityContextOpts?.as_subscriber_id]);
  const tenantScopeKey = useMemo(() => (menuContextQueryKey.length > 0 ? menuContextQueryKey.join(':') : 'default'), [menuContextQueryKey]);
  const strategyStorageKey = useMemo(() => `beverage-ai-v1:${tenantScopeKey}`, [tenantScopeKey]);

  const { data: dishesRaw = [], isLoading: dishesLoading } = useMenuDishes();
  const { data: categories = [], isLoading: menuCategoriesLoading } = useMenuCategories();
  const beverages = useMemo(() => (dishesRaw || []).filter((dish) => dish?.product_type === 'beverage'), [dishesRaw]);
  const nonBeverageDishes = useMemo(() => (dishesRaw || []).filter((dish) => dish?.product_type !== 'beverage'), [dishesRaw]);

  const { data: beverageCategories = [], isLoading: beverageCategoriesLoading } = useQuery({
    queryKey: ['beverageCategories', ...menuContextQueryKey],
    queryFn: async () => {
      if (!menuContext) return [];
      return base44.entities.BeverageCategory.list('order', entityContextOpts);
    },
    enabled: !!menuContext,
  });

  const { data: stores = [], isLoading: storeLoading } = useQuery({
    queryKey: ['store', ...menuContextQueryKey],
    queryFn: async () => {
      if (!menuContext) return [];
      return base44.entities.Store.list(null, entityContextOpts);
    },
    enabled: !!menuContext,
  });

  const { data: combos = [], isLoading: combosLoading } = useQuery({
    queryKey: ['combos', ...menuContextQueryKey],
    queryFn: async () => {
      if (!menuContext) return [];
      return base44.entities.Combo.list(null, entityContextOpts);
    },
    enabled: !!menuContext,
  });

  const {
    data: adminBeverageIntelligence = null,
    isFetched: adminBeverageIntelligenceFetched,
  } = useQuery({
    queryKey: ['admin-beverage-intelligence', ...menuContextQueryKey],
    queryFn: () => getAdminBeverageIntelligence(strategySyncContext, { days: 45 }),
    enabled: !!menuContext,
    staleTime: 1000 * 60 * 3,
    retry: 1,
  });

  const store = stores?.[0] || null;
  const crossSellConfig = store?.cross_sell_config || {};
  const realBeverageOffer = crossSellConfig?.beverage_offer || DEFAULT_BEVERAGE_OFFER;
  const activeUpsellDishId = realBeverageOffer?.dish_id || null;
  const performanceByBeverage = useMemo(
    () => adminBeverageIntelligence?.performance_by_beverage || {},
    [adminBeverageIntelligence?.performance_by_beverage]
  );
  const performanceSummary = useMemo(
    () => adminBeverageIntelligence?.performance_summary || {
      total_beverages_with_data: 0,
      total_suggested: 0,
      total_added: 0,
      total_revenue_generated: 0,
      module_acceptance_rate: 0,
      top_acceptance: [],
      top_revenue: [],
      underexposed_high_margin: [],
      real_margin_coverage: 0,
      learning_state: 'fallback_heuristico',
    },
    [adminBeverageIntelligence?.performance_summary]
  );
  const combinationPerformance = useMemo(
    () => adminBeverageIntelligence?.combination_performance || {},
    [adminBeverageIntelligence?.combination_performance]
  );
  const combinationSummary = useMemo(
    () => adminBeverageIntelligence?.combination_summary || {
      total_combinations_with_data: 0,
      top_combinations: [],
      underused_combinations: [],
      context_winners: {},
      main_combination_id: null,
      main_combination_label: null,
    },
    [adminBeverageIntelligence?.combination_summary]
  );
  const orderActionPerformance = useMemo(
    () => adminBeverageIntelligence?.order_action_performance || {},
    [adminBeverageIntelligence?.order_action_performance]
  );
  const orderOptimizationSummary = useMemo(
    () => adminBeverageIntelligence?.order_optimization_summary || {
      top_action_type: null,
      top_action_label: null,
      top_action_reason: null,
      top_action_score: 0,
      total_actions_with_data: 0,
      context_winners: {},
      top_actions: [],
      underused_actions: [],
      lost_opportunities: [],
      decision_log: [],
    },
    [adminBeverageIntelligence?.order_optimization_summary]
  );
  const decisionSummary = useMemo(
    () => adminBeverageIntelligence?.decision_summary || {
      primary_beverage_id: null,
      primary_beverage_name: null,
      primary_reason: null,
      secondary_beverage_id: null,
      secondary_beverage_name: null,
      active_ab_test: false,
      ab_candidate_ids: [],
      score_gap: 0,
      automated_count: 0,
      fixed_count: 0,
      automation_disabled_count: 0,
      decision_log: [],
    },
    [adminBeverageIntelligence?.decision_summary]
  );
  const dataDrivenOpportunities = useMemo(
    () => adminBeverageIntelligence?.opportunities || [],
    [adminBeverageIntelligence?.opportunities]
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(strategyStorageKey);
      setBeverageStrategy(normalizeBeverageStrategy(raw ? JSON.parse(raw) : {}));
    } catch (error) {
      console.error('Erro ao carregar estrategia de bebidas:', error);
      setBeverageStrategy({});
    }
    remoteHydratedTenantRef.current = null;
    setLocalStrategyLoaded(true);
  }, [strategyStorageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(strategyStorageKey, JSON.stringify(beverageStrategy));
    } catch (error) {
      console.error('Erro ao salvar estrategia de bebidas:', error);
    }
  }, [beverageStrategy, strategyStorageKey]);

  useEffect(() => {
    if (!localStrategyLoaded || !adminBeverageIntelligenceFetched) return;
    if (remoteHydratedTenantRef.current === tenantScopeKey) return;

    remoteHydratedTenantRef.current = tenantScopeKey;
    skipStrategySyncRef.current = true;
    setBeverageStrategy((current) =>
      mergeBeverageStrategySources(
        adminBeverageIntelligence?.strategy_data || {},
        current
      )
    );
  }, [
    adminBeverageIntelligence?.strategy_data,
    adminBeverageIntelligenceFetched,
    localStrategyLoaded,
    tenantScopeKey,
  ]);

  useEffect(() => {
    if (!adminBeverageIntelligenceFetched) return;
    if (remoteMetricsHydratedTenantRef.current === tenantScopeKey) return;

    remoteMetricsHydratedTenantRef.current = tenantScopeKey;
    skipMetricsSyncRef.current = true;
    setBeverageMetrics(adminBeverageIntelligence?.metrics_by_beverage || {});
  }, [
    adminBeverageIntelligence?.metrics_by_beverage,
    adminBeverageIntelligenceFetched,
    tenantScopeKey,
  ]);

  useEffect(() => {
    if (!localStrategyLoaded) return;
    if (remoteHydratedTenantRef.current !== tenantScopeKey) return;

    if (skipStrategySyncRef.current) {
      skipStrategySyncRef.current = false;
      return;
    }

    const syncTimer = window.setTimeout(() => {
      saveAdminBeverageStrategy(beverageStrategy, strategySyncContext)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['admin-beverage-intelligence', ...menuContextQueryKey] });
        })
        .catch((error) => {
          console.error('Erro ao sincronizar estrategia de bebidas:', error);
        });
    }, 900);

    return () => window.clearTimeout(syncTimer);
  }, [
    beverageStrategy,
    localStrategyLoaded,
    menuContextQueryKey,
    queryClient,
    strategySyncContext,
    tenantScopeKey,
  ]);

  useEffect(() => {
    if (remoteMetricsHydratedTenantRef.current !== tenantScopeKey) return;

    if (skipMetricsSyncRef.current) {
      skipMetricsSyncRef.current = false;
      return;
    }

    const syncTimer = window.setTimeout(() => {
      saveAdminBeverageMetrics(beverageMetrics, strategySyncContext)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['admin-beverage-intelligence', ...menuContextQueryKey] });
        })
        .catch((error) => {
          console.error('Erro ao sincronizar metricas de bebidas:', error);
        });
    }, 900);

    return () => window.clearTimeout(syncTimer);
  }, [beverageMetrics, menuContextQueryKey, queryClient, strategySyncContext, tenantScopeKey]);

  useEffect(() => {
    setUpsellDraft({
      ...DEFAULT_BEVERAGE_OFFER,
      ...realBeverageOffer,
      trigger_product_types: normalizeTriggerTypes(realBeverageOffer?.trigger_product_types),
    });
  }, [realBeverageOffer]);

  useEffect(() => {
    if (!selectedBeverageId && beverages.length > 0) {
      setSelectedBeverageId(beverages[0].id);
      return;
    }

    if (selectedBeverageId && !beverages.some((beverage) => String(beverage.id) === String(selectedBeverageId))) {
      setSelectedBeverageId(beverages[0]?.id || null);
    }
  }, [beverages, selectedBeverageId]);

  const isLoading = permissionLoading || dishesLoading || menuCategoriesLoading || beverageCategoriesLoading || storeLoading || combosLoading;

  const createBeverageMutation = useMutation({
    mutationFn: (data) => {
      const ownerEmail = subscriberContextEmail || user?.subscriber_email || user?.email;
      return base44.entities.Dish.create({
        ...data,
        product_type: 'beverage',
        ...(ownerEmail && { owner_email: ownerEmail }),
        ...entityContextOpts,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes', ...menuContextQueryKey] });
      toast.success('Bebida criada!');
      closeBeverageModal();
    },
  });

  const updateBeverageMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Dish.update(id, data, entityContextOpts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes', ...menuContextQueryKey] });
    },
  });

  const deleteBeverageMutation = useMutation({
    mutationFn: (id) => base44.entities.Dish.delete(id, entityContextOpts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes', ...menuContextQueryKey] });
      toast.success('Bebida excluida!');
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => {
      const ownerEmail = subscriberContextEmail || user?.subscriber_email || user?.email;
      return base44.entities.BeverageCategory.create({
        ...data,
        ...(ownerEmail && { owner_email: ownerEmail }),
        ...entityContextOpts,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beverageCategories', ...menuContextQueryKey] });
      setShowCategoryModal(false);
      setNewCategoryName('');
      toast.success('Categoria criada!');
    },
  });

  const updateStoreMutation = useMutation({
    mutationFn: async (data) => {
      if (!store?.id) throw new Error('Loja nao encontrada');
      return base44.entities.Store.update(store.id, data, entityContextOpts);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', ...menuContextQueryKey] });
      toast.success('Configuracao de upsell atualizada!');
    },
  });

  const filteredBeverages = useMemo(() => {
    let list = beverages;
    if (filterCategory !== 'all') {
      list = list.filter((beverage) => String(beverage?.category_id || '') === String(filterCategory));
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      list = list.filter((beverage) => `${beverage?.name || ''} ${beverage?.description || ''}`.toLowerCase().includes(search));
    }
    return list;
  }, [beverages, filterCategory, searchTerm]);

  const comboUsageMap = useMemo(() => {
    return (Array.isArray(combos) ? combos : []).reduce((acc, combo) => {
      const comboBeverages = Array.isArray(combo?.beverages) ? combo.beverages : [];
      comboBeverages.forEach((item) => {
        const beverageId = String(item?.dish_id || '');
        if (!beverageId) return;
        acc[beverageId] = (acc[beverageId] || 0) + 1;
      });
      return acc;
    }, {});
  }, [combos]);

  const categoriesWithProducts = useMemo(() => {
    return categories.filter((category) => nonBeverageDishes.some((dish) => String(dish?.category_id || '') === String(category?.id)));
  }, [categories, nonBeverageDishes]);

  const categoriesWithoutUpsell = useMemo(() => {
    return categoriesWithProducts.filter((category) => {
      const categoryId = String(category?.id || '');
      return !Object.values(beverageStrategy).some((strategy) => (strategy?.linkedCategoryIds || []).some((linkedId) => String(linkedId) === categoryId));
    });
  }, [beverageStrategy, categoriesWithProducts]);

  const beverageEntries = useMemo(() => {
    return beverages.map((beverage) => {
      const strategy = beverageStrategy?.[beverage.id] || {};
      const metrics = beverageMetrics?.[beverage.id] || {};
      const profile = getBeverageCommercialProfile({
        beverage,
        strategy,
        activeUpsellDishId,
        comboCount: comboUsageMap?.[beverage.id] || 0,
      });
      const performance = performanceByBeverage?.[String(beverage.id)] || null;
      const dataScore = Number(performance?.recommendation_score || 0);
      const confidence = Number(performance?.confidence || 0);
      const automaticScore = Number(performance?.final_score || 0);
      const blendedScore = automaticScore > 0
        ? automaticScore
        : confidence > 0
          ? Number((profile.score * 8 + dataScore + (confidence / 10)).toFixed(2))
          : profile.score;
      const categoryName = beverageCategories.find((category) => String(category?.id) === String(beverage?.category_id))?.name || 'Sem categoria';
      return {
        beverage,
        strategy,
        metrics,
        profile,
        performance,
        blendedScore,
        categoryName,
        linkedCategoryNames: (strategy.linkedCategoryIds || []).map((categoryId) => categories.find((category) => String(category?.id) === String(categoryId))?.name).filter(Boolean),
        linkedDishNames: (strategy.linkedDishIds || []).map((dishId) => nonBeverageDishes.find((dish) => String(dish?.id) === String(dishId))?.name).filter(Boolean),
        comboCount: comboUsageMap?.[beverage.id] || 0,
      };
    }).sort((left, right) => right.blendedScore - left.blendedScore || String(left.beverage?.name || '').localeCompare(String(right.beverage?.name || '')));
  }, [activeUpsellDishId, beverageCategories, beverageMetrics, beverageStrategy, beverages, categories, comboUsageMap, nonBeverageDishes, performanceByBeverage]);

  const packagingVariety = useMemo(() => {
    return new Set(beverageEntries.map((entry) => inferBeveragePackaging(entry.beverage, entry.strategy.packaging)).filter(Boolean)).size;
  }, [beverageEntries]);

  const moduleSummary = useMemo(() => buildBeverageModuleSummary({
    beverages,
    beverageStrategies: beverageStrategy,
    activeUpsellDishId,
    comboUsageMap,
    categoriesWithoutUpsell,
  }), [activeUpsellDishId, beverageStrategy, beverages, categoriesWithoutUpsell, comboUsageMap]);

  const recommendations = useMemo(() => buildBeverageRecommendations({
    beverages,
    beverageStrategies: beverageStrategy,
    activeUpsellDishId,
    categoriesWithoutUpsell,
    comboUsageMap,
  }), [activeUpsellDishId, beverageStrategy, beverages, categoriesWithoutUpsell, comboUsageMap]);

  const combinedRecommendations = useMemo(() => {
    const combined = [...dataDrivenOpportunities, ...recommendations];
    return combined.slice(0, 8);
  }, [dataDrivenOpportunities, recommendations]);

  const autoPlan = useMemo(() => buildBeverageAutoPlan({
    summary: moduleSummary,
    activeUpsellDishId,
    categoriesWithoutUpsell,
    packagingVariety,
  }), [activeUpsellDishId, categoriesWithoutUpsell, moduleSummary, packagingVariety]);

  const topBeverages = useMemo(() => {
    return beverageEntries.slice(0, 3).map((entry) => ({
      id: entry.beverage.id,
      name: entry.beverage.name,
      level: entry.profile.level,
      readout: entry.profile.readout,
      packaging: entry.profile.packaging,
      tags: entry.strategy.tags || [],
      performance: entry.performance,
    }));
  }, [beverageEntries]);

  const currentUpsellBeverage = useMemo(() => {
    return beverages.find((beverage) => String(beverage?.id) === String(activeUpsellDishId || '')) || null;
  }, [activeUpsellDishId, beverages]);

  const selectedEntry = useMemo(() => {
    return beverageEntries.find((entry) => String(entry?.beverage?.id) === String(selectedBeverageId || '')) || beverageEntries[0] || null;
  }, [beverageEntries, selectedBeverageId]);

  const selectedStrategy = selectedEntry?.strategy || {};
  const selectedMetrics = selectedEntry?.metrics || {};
  const previewBeverage = selectedEntry?.beverage || currentUpsellBeverage || beverages[0] || null;

  const quickActions = useMemo(() => ([
    { id: 'activate-basic-upsell', label: 'Ativar upsell basico', primary: true, disabled: runningActionId !== null || beverages.length === 0 },
    { id: 'prepare-beverages', label: 'Preparar bebidas para vender', disabled: runningActionId !== null || beverages.length === 0 },
    { id: 'link-suggested-beverages', label: 'Vincular bebidas sugeridas', disabled: runningActionId !== null || beverages.length === 0 },
    { id: 'improve-weak-beverages', label: 'Melhorar bebidas fracas', disabled: runningActionId !== null || moduleSummary.weak === 0 },
  ]), [beverages.length, moduleSummary.weak, runningActionId]);

  const previewSuggestion = useMemo(() => {
    if (!previewBeverage) return null;

    const entry = beverageEntries.find((item) => String(item?.beverage?.id) === String(previewBeverage?.id));
    const discount = Number(realBeverageOffer?.discount_percent || 0);
    const finalPrice = Number(previewBeverage?.price || 0) * (1 - discount / 100);
    const title = previewContext === 'pizza'
      ? 'Quer adicionar uma bebida?'
      : previewContext === 'dish'
        ? 'Complete o prato com uma bebida'
        : previewContext === 'combo'
          ? 'Essa bebida cabe numa oferta'
          : 'Como o cliente percebe a bebida';

    const message = String(realBeverageOffer?.dish_id || '') === String(previewBeverage?.id || '')
      ? String(realBeverageOffer?.message || DEFAULT_BEVERAGE_OFFER.message)
          .replace('{product_name}', previewBeverage?.name || 'a bebida')
          .replace('{product_price}', formatCurrency(finalPrice))
      : previewContext === 'combo'
        ? `${previewBeverage?.name} pode entrar como bebida de combo ou oferta de valor percebido.`
        : previewContext === 'pizza'
          ? `${previewBeverage?.name} aparece como sugestao para acompanhar pizzas e pedidos de delivery.`
          : previewContext === 'dish'
            ? `${previewBeverage?.name} reforca restaurante e prato do dia com ticket adicional.`
            : `${previewBeverage?.name} aparece como bebida com leitura comercial clara no cardapio.`;

    return {
      title,
      message,
      price: finalPrice,
      readout: entry?.profile?.readout || 'Boa para volume',
    };
  }, [beverageEntries, previewBeverage, previewContext, realBeverageOffer]);

  const openBeverageWorkspace = React.useCallback((target) => {
    switch (target) {
      case 'catalog':
      case 'products':
        setActiveSection('catalog');
        return;
      case 'links':
      case 'organization':
        setActiveSection('links');
        return;
      case 'overview':
        setActiveSection('overview');
        return;
      case 'insights':
      case 'intelligence':
        setActiveSection('insights');
        return;
      case 'preview':
      case 'settings':
        setActiveSection('preview');
        return;
      default:
        setActiveSection('catalog');
    }
  }, []);

  const activeMainSection = useMemo(
    () => BEVERAGE_SECTIONS.find((section) => section.sections.includes(activeSection))?.id || 'products',
    [activeSection]
  );
  const activeSubsections = BEVERAGE_SUBSECTION_NAV[activeMainSection] || [];

  const closeBeverageModal = () => {
    setShowBeverageModal(false);
    setEditingBeverage(null);
    setFormData({
      name: '',
      description: '',
      image: '',
      price: '',
      category_id: '',
      beverage_type: 'industrial',
      volume_ml: '',
      serving_temp: 'cold',
      ean: '',
      sugar_free: false,
      alcoholic: false,
      caffeine: false,
      dietary_tags: [],
      is_active: true,
      is_highlight: false,
      order: 0,
    });
  };

  const openBeverageModal = (beverage = null) => {
    if (beverage) {
      setEditingBeverage(beverage);
      setFormData({
        name: beverage.name || '',
        description: beverage.description || '',
        image: beverage.image || '',
        price: String(beverage.price ?? ''),
        category_id: beverage.category_id || '',
        beverage_type: beverage.beverage_type || 'industrial',
        volume_ml: String(beverage.volume_ml ?? ''),
        serving_temp: beverage.serving_temp || 'cold',
        ean: beverage.ean || '',
        sugar_free: !!beverage.sugar_free,
        alcoholic: !!beverage.alcoholic,
        caffeine: !!beverage.caffeine,
        dietary_tags: Array.isArray(beverage.dietary_tags) ? beverage.dietary_tags : [],
        is_active: beverage.is_active !== false,
        is_highlight: !!beverage.is_highlight,
        order: beverage.order ?? 0,
      });
    } else {
      setEditingBeverage(null);
      setFormData({
        name: '',
        description: '',
        image: '',
        price: '',
        category_id: beverageCategories[0]?.id || '',
        beverage_type: 'industrial',
        volume_ml: '',
        serving_temp: 'cold',
        ean: '',
        sugar_free: false,
        alcoholic: false,
        caffeine: false,
        dietary_tags: [],
        is_active: true,
        is_highlight: false,
        order: beverages.length,
      });
    }
    setShowBeverageModal(true);
  };

  const handleBeverageSubmit = (event) => {
    event.preventDefault();
    const payload = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      volume_ml: parseInt(formData.volume_ml, 10) || null,
    };

    if (editingBeverage) {
      updateBeverageMutation.mutate({ id: editingBeverage.id, data: payload }, {
        onSuccess: () => {
          toast.success('Bebida atualizada!');
          closeBeverageModal();
        },
      });
      return;
    }

    createBeverageMutation.mutate(payload);
  };

  const toggleDietaryTag = (tag) => {
    setFormData((prev) => ({
      ...prev,
      dietary_tags: prev.dietary_tags.includes(tag)
        ? prev.dietary_tags.filter((currentTag) => currentTag !== tag)
        : [...prev.dietary_tags, tag],
    }));
  };

  const updateStrategyForBeverage = (beverageId, updater) => {
    setBeverageStrategy((prev) => {
      const current = prev?.[beverageId] || {};
      const nextValue = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
      return {
        ...prev,
        [beverageId]: {
          tags: nextValue.tags || [],
          packaging: nextValue.packaging || '',
          contexts: nextValue.contexts || [],
          linkedCategoryIds: nextValue.linkedCategoryIds || [],
          linkedDishIds: nextValue.linkedDishIds || [],
          preparedForUpsell: nextValue.preparedForUpsell === true,
          moreOrdered: nextValue.moreOrdered === true,
          comboReady: nextValue.comboReady === true,
        },
      };
    });
  };

  const updateMetricsForBeverage = (beverageId, updater) => {
    setBeverageMetrics((prev) => {
      const current = prev?.[beverageId] || {};
      const nextValue = typeof updater === 'function' ? updater(current, prev) : { ...current, ...updater };
      return {
        ...prev,
        [beverageId]: {
          cost: nextValue?.cost == null || nextValue?.cost === '' ? null : Number(nextValue.cost),
          automation_disabled: nextValue?.automation_disabled === true,
          fixed_as_primary: nextValue?.fixed_as_primary === true,
          manual_priority: Number(nextValue?.manual_priority || 0) || 0,
        },
      };
    });
  };

  const toggleFixedPrimaryForBeverage = (beverageId, checked) => {
    setBeverageMetrics((prev) => {
      const next = { ...prev };
      if (checked) {
        Object.keys(next).forEach((currentId) => {
          next[currentId] = {
            ...(next[currentId] || {}),
            fixed_as_primary: String(currentId) === String(beverageId),
          };
        });
        next[beverageId] = {
          ...(next[beverageId] || {}),
          fixed_as_primary: true,
          automation_disabled: false,
        };
      } else {
        next[beverageId] = {
          ...(next[beverageId] || {}),
          fixed_as_primary: false,
        };
      }
      return next;
    });
  };

  const toggleStrategyTag = (tagId) => {
    if (!selectedEntry) return;
    updateStrategyForBeverage(selectedEntry.beverage.id, (current) => ({
      ...current,
      tags: current.tags?.includes(tagId)
        ? current.tags.filter((tag) => tag !== tagId)
        : [...(current.tags || []), tagId],
    }));
  };

  const toggleStrategyContext = (contextId) => {
    if (!selectedEntry) return;
    updateStrategyForBeverage(selectedEntry.beverage.id, (current) => ({
      ...current,
      contexts: current.contexts?.includes(contextId)
        ? current.contexts.filter((context) => context !== contextId)
        : [...(current.contexts || []), contextId],
    }));
  };

  const handleAddCategoryLink = () => {
    if (!selectedEntry || !selectedCategoryLink) return;
    updateStrategyForBeverage(selectedEntry.beverage.id, (current) => ({
      ...current,
      linkedCategoryIds: Array.from(new Set([...(current.linkedCategoryIds || []), selectedCategoryLink])),
    }));
    setSelectedCategoryLink('');
  };

  const handleRemoveCategoryLink = (categoryId) => {
    if (!selectedEntry) return;
    updateStrategyForBeverage(selectedEntry.beverage.id, (current) => ({
      ...current,
      linkedCategoryIds: (current.linkedCategoryIds || []).filter((linkedId) => String(linkedId) !== String(categoryId)),
    }));
  };

  const handleAddDishLink = () => {
    if (!selectedEntry || !selectedDishLink) return;
    updateStrategyForBeverage(selectedEntry.beverage.id, (current) => ({
      ...current,
      linkedDishIds: Array.from(new Set([...(current.linkedDishIds || []), selectedDishLink])),
    }));
    setSelectedDishLink('');
  };

  const handleRemoveDishLink = (dishId) => {
    if (!selectedEntry) return;
    updateStrategyForBeverage(selectedEntry.beverage.id, (current) => ({
      ...current,
      linkedDishIds: (current.linkedDishIds || []).filter((linkedId) => String(linkedId) !== String(dishId)),
    }));
  };

  const applySuggestionToSelectedBeverage = () => {
    if (!selectedEntry) return;
    updateStrategyForBeverage(selectedEntry.beverage.id, (current) => suggestBeverageLinks({
      beverage: selectedEntry.beverage,
      strategy: current,
      categories,
    }));
    toast.success('Posicionamento sugerido aplicado na bebida.');
  };

  const buildTriggerTypesFromStrategy = (beverageId) => {
    const strategy = beverageStrategy?.[beverageId] || {};
    const triggerTypes = [];
    if ((strategy.contexts || []).includes('pizza')) triggerTypes.push('pizza');
    if ((strategy.contexts || []).includes('dish') || (strategy.contexts || []).includes('massas') || (strategy.contexts || []).includes('sobremesas')) triggerTypes.push('dish');
    if ((strategy.contexts || []).includes('hamburger')) triggerTypes.push('hamburger');
    return normalizeTriggerTypes(triggerTypes.length > 0 ? triggerTypes : upsellDraft.trigger_product_types);
  };

  const saveCrossSellDraft = async () => {
    const nextCrossSellConfig = {
      ...crossSellConfig,
      enabled: true,
      beverage_offer: {
        ...DEFAULT_BEVERAGE_OFFER,
        ...realBeverageOffer,
        ...upsellDraft,
        trigger_product_types: normalizeTriggerTypes(upsellDraft.trigger_product_types),
      },
    };
    await updateStoreMutation.mutateAsync({ cross_sell_config: nextCrossSellConfig });
  };

  const pickBestUpsellCandidate = () => {
    const decisionCandidate = decisionSummary?.primary_beverage_id
      ? beverageEntries.find((entry) => String(entry?.beverage?.id) === String(decisionSummary.primary_beverage_id))
      : null;

    return decisionCandidate
      || beverageEntries.find((entry) => entry.beverage?.is_active !== false && !entry.beverage?.alcoholic)
      || beverageEntries.find((entry) => entry.beverage?.is_active !== false)
      || null;
  };

  const runAction = async (actionId) => {
    if (runningActionId) return;

    const bestCandidate = pickBestUpsellCandidate();
    const weakEntries = beverageEntries.filter((entry) => entry.profile.level === 'Fraca');

    try {
      setRunningActionId(actionId);

      if (actionId === 'activate-basic-upsell') {
        if (!bestCandidate) {
          toast.error('Cadastre ao menos uma bebida ativa primeiro.');
          return;
        }

        const nextOffer = {
          ...DEFAULT_BEVERAGE_OFFER,
          ...realBeverageOffer,
          enabled: true,
          dish_id: bestCandidate.beverage.id,
          trigger_product_types: buildTriggerTypesFromStrategy(bestCandidate.beverage.id),
        };

        await updateStoreMutation.mutateAsync({
          cross_sell_config: {
            ...crossSellConfig,
            enabled: true,
            beverage_offer: nextOffer,
          },
        });

        updateStrategyForBeverage(bestCandidate.beverage.id, (current) => ({
          ...current,
          preparedForUpsell: true,
        }));
        toast.success(`Upsell basico ativado com ${bestCandidate.beverage.name}.`);
        return;
      }

      if (actionId === 'link-suggested-beverages') {
        setBeverageStrategy((prev) => {
          const next = { ...prev };
          beverages.forEach((beverage) => {
            next[beverage.id] = suggestBeverageLinks({ beverage, strategy: next[beverage.id] || {}, categories });
          });
          return next;
        });
        toast.success('Vinculos sugeridos aplicados nas bebidas.');
        return;
      }

      if (actionId === 'improve-weak-beverages') {
        if (weakEntries.length === 0) {
          toast.success('Nao ha bebidas fracas para ajustar agora.');
          return;
        }

        setBeverageStrategy((prev) => {
          const next = { ...prev };
          weakEntries.forEach((entry) => {
            next[entry.beverage.id] = suggestBeverageLinks({ beverage: entry.beverage, strategy: next[entry.beverage.id] || {}, categories });
          });
          return next;
        });
        toast.success('Bebidas fracas receberam uma estrutura comercial melhor.');
        return;
      }

      if (actionId === 'apply-recommended-structure' || actionId === 'prepare-beverages') {
        const shouldProceed = window.confirm('Aplicar uma estrutura recomendada para destacar bebidas, preencher vinculos e ativar o upsell principal?');
        if (!shouldProceed) return;

        setBeverageStrategy((prev) => {
          const next = { ...prev };
          beverages.forEach((beverage) => {
            next[beverage.id] = suggestBeverageLinks({ beverage, strategy: next[beverage.id] || {}, categories });
          });

          const largeCandidate = beverageEntries.find((entry) => ['1l', '2l'].includes(inferBeveragePackaging(entry.beverage, next[entry.beverage.id]?.packaging)));
          const compactCandidate = beverageEntries.find((entry) => ['lata', '600ml', 'copo'].includes(inferBeveragePackaging(entry.beverage, next[entry.beverage.id]?.packaging)));

          if (largeCandidate) {
            next[largeCandidate.beverage.id] = {
              ...next[largeCandidate.beverage.id],
              comboReady: true,
              preparedForUpsell: true,
            };
          }

          if (compactCandidate) {
            next[compactCandidate.beverage.id] = {
              ...next[compactCandidate.beverage.id],
              moreOrdered: true,
            };
          }

          return next;
        });

        const highlightCandidates = beverageEntries.filter((entry) => entry.beverage?.is_active !== false).slice(0, 2);
        await Promise.allSettled(
          highlightCandidates
            .filter((entry) => !entry.beverage?.is_highlight)
            .map((entry) => updateBeverageMutation.mutateAsync({
              id: entry.beverage.id,
              data: { ...entry.beverage, is_highlight: true },
            }))
        );

        if (!activeUpsellDishId && bestCandidate) {
          const nextOffer = {
            ...DEFAULT_BEVERAGE_OFFER,
            ...realBeverageOffer,
            enabled: true,
            dish_id: bestCandidate.beverage.id,
            trigger_product_types: buildTriggerTypesFromStrategy(bestCandidate.beverage.id),
          };

          await updateStoreMutation.mutateAsync({
            cross_sell_config: {
              ...crossSellConfig,
              enabled: true,
              beverage_offer: nextOffer,
            },
          });
        }

        queryClient.invalidateQueries({ queryKey: ['dishes', ...menuContextQueryKey] });
        toast.success('Bebidas preparadas para vender melhor.');
      }
    } catch (error) {
      console.error('Erro ao executar acao de bebidas:', error);
      toast.error(error?.message || 'Nao foi possivel aplicar a acao.');
    } finally {
      setRunningActionId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Wine className="h-6 w-6 text-cyan-500" />
            Bebidas IA
          </h2>
          <p className="mt-1 text-sm text-gray-500">Carregando modulo estrategico de bebidas...</p>
        </div>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex animate-pulse items-center gap-4 rounded-2xl border bg-gray-50/70 p-4">
                  <div className="h-16 w-16 rounded-2xl bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 rounded bg-gray-200" />
                    <div className="h-3 w-1/2 rounded bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">Bebidas IA V1</Badge>
          <h2 className="mt-3 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Wine className="h-6 w-6 text-cyan-500" />
            Produtos primeiro, ticket por tras
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            A operacao agora entra direto no catalogo. Upsell, preview e inteligencia continuam no modulo,
            mas organizados como apoio para vender mais, nao como barreira para editar bebida.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCategoryModal(true)}>
            <Plus className="mr-1 h-4 w-4" /> Categoria
          </Button>
          <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => openBeverageModal()}>
            <Plus className="mr-2 h-4 w-4" /> Nova bebida
          </Button>
        </div>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-4">
        <div className="sticky top-2 z-10 rounded-3xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
          <div className="overflow-x-auto">
            <TabsList className="h-auto w-full justify-start gap-1 bg-transparent p-0">
              {BEVERAGE_SECTIONS.map((section) => (
                <TabsTrigger
                  key={section.id}
                  value={section.defaultSection}
                  onClick={() => openBeverageWorkspace(section.defaultSection)}
                  className={cn(
                    'min-h-10 rounded-2xl border border-transparent px-4',
                    activeMainSection === section.id
                      ? 'border-slate-200 bg-slate-50 shadow-sm text-slate-900'
                      : 'text-slate-600'
                  )}
                >
                  <span className="hidden sm:inline">{section.label}</span>
                  <span className="sm:hidden">{section.shortLabel}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        {activeSubsections.length > 0 ? (
          <div className="-mt-2 flex flex-wrap gap-2">
            {activeSubsections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                  activeSection === section.id
                    ? 'border-cyan-300 bg-cyan-50 text-cyan-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                )}
              >
                <span className="hidden sm:inline">{section.label}</span>
                <span className="sm:hidden">{section.shortLabel}</span>
              </button>
            ))}
          </div>
        ) : null}

        <TabsContent value="overview" className="mt-0">
          <BeverageOverviewPanel
            moduleSummary={moduleSummary}
            performanceSummary={performanceSummary}
            combinationSummary={combinationSummary}
            orderOptimizationSummary={orderOptimizationSummary}
            decisionSummary={decisionSummary}
            currentUpsellBeverage={currentUpsellBeverage}
            topBeverages={topBeverages}
            uncoveredCategories={categoriesWithoutUpsell}
            quickActions={quickActions}
            onQuickAction={runAction}
            onOpenSection={openBeverageWorkspace}
          />
        </TabsContent>

        <TabsContent value="catalog" className="mt-0 space-y-4">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Catalogo de bebidas</Badge>
                  <h3 className="mt-3 text-lg font-semibold text-slate-900">Cada bebida com leitura comercial, embalagem e papel no sistema</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Aqui o cadastro deixa de ser so nome e preco. Voce consegue entender posicionamento, uso em upsell e forca comercial de cada item.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={() => openBeverageWorkspace('links')}>
                  Abrir vinculos & upsell
                </Button>
              </div>

              <div className="mt-5 flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input placeholder="Buscar bebida por nome ou descricao..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="pl-9" />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full lg:w-[240px]">
                    <SelectValue placeholder="Filtrar categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {beverageCategories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3">
            {filteredBeverages.map((beverage) => {
              const entry = beverageEntries.find((item) => String(item?.beverage?.id) === String(beverage?.id));
              if (!entry) return null;
              const isSelected = String(selectedBeverageId || '') === String(beverage.id);
              const packaging = inferBeveragePackaging(beverage, entry.strategy.packaging);
              const isRealUpsell = String(activeUpsellDishId || '') === String(beverage.id);

              return (
                <Card key={beverage.id} className={cn('rounded-3xl border-slate-200 shadow-sm transition-all', isSelected && 'ring-2 ring-cyan-100')}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        {beverage.image ? (
                          <img src={beverage.image} alt={beverage.name} className="h-20 w-20 rounded-2xl object-cover" />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <Wine className="h-8 w-8" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-slate-900">{beverage.name}</p>
                            <Badge variant="outline" className={statusToneMap[entry.profile.level]}>{entry.profile.level}</Badge>
                            {packaging ? <Badge variant="outline">{packaging.toUpperCase()}</Badge> : null}
                            {beverage.volume_ml ? <Badge variant="outline">{beverage.volume_ml}ml</Badge> : null}
                            {beverage.beverage_type === 'natural' ? <Badge className="bg-green-100 text-green-700">Natural</Badge> : null}
                            {isRealUpsell ? <Badge className="bg-cyan-100 text-cyan-700">Upsell real</Badge> : null}
                            {entry.strategy.moreOrdered ? <Badge className="bg-amber-100 text-amber-700">Mais pedido junto</Badge> : null}
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{entry.categoryName} - {formatCurrency(beverage.price)} - {entry.profile.readout}</p>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1"><Link2 className="h-3.5 w-3.5" /> {entry.profile.usage.totalLinks} vinculo(s)</span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1"><Layers3 className="h-3.5 w-3.5" /> {entry.comboCount} combo(s)</span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1"><TrendingUp className="h-3.5 w-3.5" /> score {entry.profile.score}</span>
                            {entry.performance ? (
                              <>
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                                  <Sparkles className="h-3.5 w-3.5" /> {Number(entry.performance.acceptance_rate || 0).toFixed(0)}% aceita
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-cyan-700">
                                  <ShoppingCart className="h-3.5 w-3.5" /> {formatCurrency(entry.performance.revenue_generated || 0)} receita
                                </span>
                              </>
                            ) : null}
                          </div>
                          {(entry.strategy.tags || []).length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {entry.strategy.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="bg-white text-slate-700">{tag.replace('_', ' ')}</Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 xl:min-w-[260px]">
                        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                          <span className="text-sm font-medium text-slate-700">Ativa</span>
                          <Switch
                            checked={beverage.is_active !== false}
                            onCheckedChange={(checked) => updateBeverageMutation.mutate({ id: beverage.id, data: { ...beverage, is_active: checked } }, { onSuccess: () => toast.success(`Bebida ${checked ? 'ativada' : 'desativada'}.`) })}
                          />
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                          <Button type="button" variant="outline" className="justify-start" onClick={() => { setSelectedBeverageId(beverage.id); openBeverageWorkspace('links'); }}>
                            <ArrowUpRight className="mr-2 h-4 w-4" /> Editar posicionamento
                          </Button>
                          <Button type="button" variant="outline" className="justify-start" onClick={() => openBeverageModal(beverage)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar bebida
                          </Button>
                          <Button type="button" variant="outline" className="justify-start" onClick={() => { setSelectedBeverageId(beverage.id); openBeverageWorkspace('preview'); }}>
                            <Eye className="mr-2 h-4 w-4" /> Ver preview
                          </Button>
                          <Button type="button" variant="outline" className="justify-start text-rose-600 hover:text-rose-700" onClick={() => window.confirm('Excluir essa bebida?') && deleteBeverageMutation.mutate(beverage.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredBeverages.length === 0 ? (
            <Card className="rounded-3xl border-dashed border-slate-300 shadow-none">
              <CardContent className="py-12 text-center">
                <Wine className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                <p className="text-sm font-medium text-slate-700">Nenhuma bebida encontrada</p>
                <p className="mt-2 text-sm text-slate-500">Ajuste o filtro ou cadastre a primeira bebida estrategica do modulo.</p>
                <Button variant="outline" className="mt-4" onClick={() => openBeverageModal()}>Cadastrar bebida</Button>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="links" className="mt-0 space-y-4">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Vinculos & upsell</Badge>
                  <h3 className="mt-3 text-lg font-semibold text-slate-900">Onde a bebida aparece e como ela ajuda a vender</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Aqui fica a ponte entre bebida, prato, pizza, categoria e cross-sell real do cardapio. E o ponto mais importante do lote.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => openBeverageWorkspace('preview')}>Abrir preview</Button>
                  <Button type="button" className="bg-cyan-600 hover:bg-cyan-700" onClick={() => runAction('activate-basic-upsell')} disabled={runningActionId !== null}>Ativar upsell basico</Button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <Card className="rounded-3xl border-slate-200 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">Cross-sell real</Badge>
                        <h4 className="mt-3 text-base font-semibold text-slate-900">Bebida que conversa com o motor atual</h4>
                      </div>
                      <Switch checked={upsellDraft.enabled !== false} onCheckedChange={(checked) => setUpsellDraft((prev) => ({ ...prev, enabled: checked }))} />
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <Label>Bebida sugerida</Label>
                        <Select value={String(upsellDraft.dish_id || '')} onValueChange={(value) => setUpsellDraft((prev) => ({ ...prev, dish_id: value }))}>
                          <SelectTrigger><SelectValue placeholder="Escolha uma bebida" /></SelectTrigger>
                          <SelectContent>
                            {beverageEntries.filter((entry) => entry.beverage?.is_active !== false).map((entry) => (
                              <SelectItem key={entry.beverage.id} value={String(entry.beverage.id)}>{entry.beverage.name} - {formatCurrency(entry.beverage.price)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Minimo de carrinho</Label>
                        <Input type="number" min="0" step="0.01" value={upsellDraft.min_cart_value ?? 0} onChange={(event) => setUpsellDraft((prev) => ({ ...prev, min_cart_value: Number(event.target.value || 0) }))} />
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label>Quando a sugestao aparece</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {[
                          { id: 'pizza', label: 'Pizza' },
                          { id: 'dish', label: 'Prato' },
                          { id: 'hamburger', label: 'Hamburguer' },
                        ].map((item) => {
                          const active = normalizeTriggerTypes(upsellDraft.trigger_product_types).includes(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setUpsellDraft((prev) => {
                                const current = normalizeTriggerTypes(prev.trigger_product_types);
                                return {
                                  ...prev,
                                  trigger_product_types: current.includes(item.id) ? current.filter((value) => value !== item.id) : [...current, item.id],
                                };
                              })}
                              className={cn('rounded-full border px-3 py-2 text-sm transition-colors', active ? 'border-cyan-300 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Button type="button" variant="outline" onClick={saveCrossSellDraft} disabled={updateStoreMutation.isPending}>Salvar upsell</Button>
                      <Button type="button" className="bg-slate-900 hover:bg-slate-800" onClick={() => runAction('activate-basic-upsell')} disabled={runningActionId !== null}>Usar melhor bebida agora</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200 shadow-none">
                  <CardContent className="p-4">
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Prioridade comercial</Badge>
                    <h4 className="mt-3 text-base font-semibold text-slate-900">Categorias ainda sem bebida sugerida</h4>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {categoriesWithoutUpsell.length > 0 ? categoriesWithoutUpsell.slice(0, 8).map((category) => (
                        <Badge key={category.id} variant="outline" className="bg-white text-slate-700">{category.name}</Badge>
                      )) : <Badge className="bg-emerald-100 text-emerald-700">Cobertura boa</Badge>}
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">O foco aqui e decidir onde a bebida aparece de forma estrategica: prato, categoria, pizza, delivery e combo.</div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Escolha a bebida</Badge>
                    <h4 className="mt-3 text-base font-semibold text-slate-900">Posicionamento comercial</h4>
                  </div>
                  <Button type="button" variant="outline" onClick={() => selectedEntry && openBeverageModal(selectedEntry.beverage)} disabled={!selectedEntry}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  {beverageEntries.map((entry) => (
                    <button
                      key={entry.beverage.id}
                      type="button"
                      onClick={() => setSelectedBeverageId(entry.beverage.id)}
                      className={cn('w-full rounded-2xl border p-3 text-left transition-all', String(selectedBeverageId || '') === String(entry.beverage.id) ? 'border-cyan-300 bg-cyan-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{entry.beverage.name}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{entry.categoryName} - {formatCurrency(entry.beverage.price)}</p>
                        </div>
                        <Badge variant="outline" className={statusToneMap[entry.profile.level]}>{entry.profile.level}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {entry.performance?.auto_priority ? (
                          <Badge variant="outline" className="bg-white text-slate-700">
                            Auto #{entry.performance.auto_priority}
                          </Badge>
                        ) : null}
                        {entry.metrics?.fixed_as_primary ? (
                          <Badge className="bg-slate-900 text-white">Fixa</Badge>
                        ) : null}
                        {entry.metrics?.automation_disabled ? (
                          <Badge variant="outline" className="bg-white text-slate-600">Manual</Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-slate-600">{entry.profile.readout}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 shadow-sm">
              <CardContent className="p-4 sm:p-5">
                {selectedEntry ? (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">Bebida selecionada</Badge>
                        <h4 className="mt-3 text-xl font-semibold text-slate-900">{selectedEntry.beverage.name}</h4>
                        <p className="mt-2 text-sm text-slate-600">{selectedEntry.profile.readout} - {formatCurrency(selectedEntry.beverage.price)} - {selectedEntry.categoryName}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className={statusToneMap[selectedEntry.profile.level]}>{selectedEntry.profile.level}</Badge>
                        {String(activeUpsellDishId || '') === String(selectedEntry.beverage.id) ? <Badge className="bg-cyan-100 text-cyan-700">Upsell real</Badge> : null}
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="bg-white text-slate-700">Score final {Number(selectedEntry.performance?.final_score || selectedEntry.blendedScore || 0).toFixed(1)}</Badge>
                          {selectedEntry.performance?.decision_state ? (
                            <Badge variant="outline" className="bg-white text-slate-700">
                              {selectedEntry.performance.decision_state === 'fixed'
                                ? 'Fixada'
                                : selectedEntry.performance.decision_state === 'promoted'
                                  ? 'Promovida'
                                  : selectedEntry.performance.decision_state === 'cooldown'
                                    ? 'Menos exposta'
                                    : selectedEntry.performance.decision_state === 'manual_only'
                                      ? 'Somente manual'
                                      : 'Normal'}
                            </Badge>
                          ) : null}
                          {decisionSummary?.primary_beverage_id && String(decisionSummary.primary_beverage_id) === String(selectedEntry.beverage.id) ? (
                            <Badge className="bg-emerald-100 text-emerald-700">Principal automatica</Badge>
                          ) : null}
                          {selectedEntry.performance?.ab_test_candidate ? (
                            <Badge variant="outline" className="bg-white text-slate-700">Teste A/B leve</Badge>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-900">
                          {selectedEntry.performance?.decision_reasons?.[0] || 'O motor ainda esta usando fallback seguro para esta bebida.'}
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-xl border border-white/80 bg-white/90 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Aceitacao</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">{Number(selectedEntry.performance?.acceptance_rate || 0).toFixed(0)}%</p>
                          </div>
                          <div className="rounded-xl border border-white/80 bg-white/90 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Receita</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(selectedEntry.performance?.revenue_generated || 0)}</p>
                          </div>
                          <div className="rounded-xl border border-white/80 bg-white/90 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Margem</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                              {selectedEntry.performance?.margin_source === 'real'
                                ? `${Number(selectedEntry.performance?.margin_percentage || 0).toFixed(0)}%`
                                : `${Number(selectedEntry.performance?.profitability_signal || selectedEntry.performance?.margin_signal || 0).toFixed(0)}/100`}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <Label>Custo unitario</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={selectedMetrics.cost ?? ''}
                              onChange={(event) =>
                                updateMetricsForBeverage(selectedEntry.beverage.id, (current) => ({
                                  ...current,
                                  cost: event.target.value === '' ? null : Number(event.target.value),
                                }))
                              }
                              placeholder="Ex: 4.50"
                            />
                            <p className="mt-2 text-xs text-slate-500">
                              Sem custo, o sistema usa estimativa. Com custo, ele passa a priorizar margem real.
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Leitura financeira</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {selectedEntry.performance?.margin_source === 'real'
                                ? `Lucro estimado ${formatCurrency(selectedEntry.performance?.margin_value || 0)} por venda`
                                : 'Rentabilidade ainda em estimativa'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {selectedEntry.performance?.margin_source === 'real'
                                ? `Margem calculada com custo real em ${Number(selectedEntry.performance?.margin_percentage || 0).toFixed(1)}%.`
                                : 'Preencha o custo para liberar margem real e decisao mais agressiva.'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3">
                          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">Fixar como bebida principal</p>
                              <p className="text-xs text-slate-500">Override manual. O sistema respeita e para de trocar o topo.</p>
                            </div>
                            <Switch
                              checked={selectedMetrics.fixed_as_primary === true}
                              onCheckedChange={(checked) => toggleFixedPrimaryForBeverage(selectedEntry.beverage.id, checked)}
                            />
                          </div>
                          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">Desativar automacao para este item</p>
                              <p className="text-xs text-slate-500">Ele continua no catalogo, mas sai do ranking automatico.</p>
                            </div>
                            <Switch
                              checked={selectedMetrics.automation_disabled === true}
                              onCheckedChange={(checked) =>
                                updateMetricsForBeverage(selectedEntry.beverage.id, (current) => ({
                                  ...current,
                                  automation_disabled: checked,
                                  fixed_as_primary: checked ? false : current.fixed_as_primary,
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label>Embalagem / leitura de volume</Label>
                        <Select value={selectedStrategy.packaging || inferBeveragePackaging(selectedEntry.beverage, selectedStrategy.packaging) || ''} onValueChange={(value) => updateStrategyForBeverage(selectedEntry.beverage.id, (current) => ({ ...current, packaging: value }))}>
                          <SelectTrigger><SelectValue placeholder="Selecionar embalagem" /></SelectTrigger>
                          <SelectContent>
                            {BEVERAGE_PACKAGING_OPTIONS.map((option) => (
                              <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-sm font-semibold text-slate-900">Uso atual</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                          <Badge variant="outline">{selectedEntry.linkedCategoryNames.length} categoria(s)</Badge>
                          <Badge variant="outline">{selectedEntry.linkedDishNames.length} prato(s)</Badge>
                          <Badge variant="outline">{selectedEntry.comboCount} combo(s)</Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Tags comerciais</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {BEVERAGE_TAG_OPTIONS.map((tag) => {
                          const active = (selectedStrategy.tags || []).includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => toggleStrategyTag(tag.id)}
                              className={cn('rounded-full border px-3 py-2 text-sm transition-colors', active ? 'border-cyan-300 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}
                            >
                              {tag.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <Label>Contextos onde essa bebida faz sentido</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {BEVERAGE_CONTEXT_OPTIONS.map((context) => {
                          const active = (selectedStrategy.contexts || []).includes(context.id);
                          return (
                            <button
                              key={context.id}
                              type="button"
                              onClick={() => toggleStrategyContext(context.id)}
                              className={cn('rounded-full border px-3 py-2 text-sm transition-colors', active ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}
                            >
                              {context.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <Label>Vinculo por categoria</Label>
                        <div className="mt-2 flex gap-2">
                          <Select value={selectedCategoryLink} onValueChange={setSelectedCategoryLink}>
                            <SelectTrigger><SelectValue placeholder="Adicionar categoria" /></SelectTrigger>
                            <SelectContent>
                              {categoriesWithProducts.map((category) => (
                                <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" variant="outline" onClick={handleAddCategoryLink}>Adicionar</Button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(selectedStrategy.linkedCategoryIds || []).map((categoryId) => {
                            const category = categories.find((item) => String(item?.id) === String(categoryId));
                            if (!category) return null;
                            return (
                              <Badge key={categoryId} variant="outline" className="flex items-center gap-2 bg-white text-slate-700">
                                {category.name}
                                <button type="button" onClick={() => handleRemoveCategoryLink(categoryId)}>
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <Label>Vinculo por prato</Label>
                        <div className="mt-2 flex gap-2">
                          <Select value={selectedDishLink} onValueChange={setSelectedDishLink}>
                            <SelectTrigger><SelectValue placeholder="Adicionar prato" /></SelectTrigger>
                            <SelectContent>
                              {nonBeverageDishes.map((dish) => (
                                <SelectItem key={dish.id} value={String(dish.id)}>{dish.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" variant="outline" onClick={handleAddDishLink}>Adicionar</Button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(selectedStrategy.linkedDishIds || []).map((dishId) => {
                            const dish = nonBeverageDishes.find((item) => String(item?.id) === String(dishId));
                            if (!dish) return null;
                            return (
                              <Badge key={dishId} variant="outline" className="flex items-center gap-2 bg-white text-slate-700">
                                {dish.name}
                                <button type="button" onClick={() => handleRemoveDishLink(dishId)}>
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Preparada para upsell</p>
                          <p className="text-xs text-slate-500">Mesmo que ainda nao seja a bebida real do cross-sell.</p>
                        </div>
                        <Switch checked={selectedStrategy.preparedForUpsell === true} onCheckedChange={(checked) => updateStrategyForBeverage(selectedEntry.beverage.id, (current) => ({ ...current, preparedForUpsell: checked }))} />
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Mais pedido junto</p>
                          <p className="text-xs text-slate-500">Leitura comercial para cross-sell e cardapio.</p>
                        </div>
                        <Switch checked={selectedStrategy.moreOrdered === true} onCheckedChange={(checked) => updateStrategyForBeverage(selectedEntry.beverage.id, (current) => ({ ...current, moreOrdered: checked }))} />
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Pronta para combo</p>
                          <p className="text-xs text-slate-500">Ajuda a montar oferta leve com pizza e prato.</p>
                        </div>
                        <Switch checked={selectedStrategy.comboReady === true} onCheckedChange={(checked) => updateStrategyForBeverage(selectedEntry.beverage.id, (current) => ({ ...current, comboReady: checked }))} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" className="bg-cyan-600 hover:bg-cyan-700" onClick={applySuggestionToSelectedBeverage}>
                        <Sparkles className="mr-2 h-4 w-4" /> Aplicar sugestao automatica
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setUpsellDraft((prev) => ({ ...prev, enabled: true, dish_id: selectedEntry.beverage.id, trigger_product_types: buildTriggerTypesFromStrategy(selectedEntry.beverage.id) }))}>
                        <ShoppingCart className="mr-2 h-4 w-4" /> Usar como bebida do upsell
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                    Selecione uma bebida para editar seus vinculos e o posicionamento comercial.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-0 space-y-4">
          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Preview</Badge>
                  <h3 className="mt-3 text-lg font-semibold text-slate-900">Como a bebida vende no cardapio, no upsell e no combo</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">O objetivo aqui nao e reproduzir o fluxo inteiro. E deixar claro como essa bebida aparece e por que ela aumenta ticket.</p>
                </div>
                <Select value={String(previewBeverage?.id || '')} onValueChange={setSelectedBeverageId}>
                  <SelectTrigger className="w-full sm:w-[260px]"><SelectValue placeholder="Escolha a bebida" /></SelectTrigger>
                  <SelectContent>
                    {beverageEntries.map((entry) => (
                      <SelectItem key={entry.beverage.id} value={String(entry.beverage.id)}>{entry.beverage.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {Object.entries(previewContextMap).map(([contextId, context]) => {
                  const Icon = context.icon;
                  const active = previewContext === contextId;
                  return (
                    <button key={contextId} type="button" onClick={() => setPreviewContext(contextId)} className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors', active ? 'border-cyan-300 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
                      <Icon className="h-4 w-4" />
                      {context.label}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {previewBeverage ? (
            <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
              <Card className="rounded-3xl border-slate-200 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                  <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">Cartao publico</Badge>
                  <h4 className="mt-3 text-base font-semibold text-slate-900">{previewContextMap[previewContext]?.title}</h4>
                  <div className="mx-auto mt-4 max-w-[280px]">
                    <BeverageCard beverage={previewBeverage} onClick={() => {}} compact primaryColor="#0891b2" />
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="rounded-3xl border-slate-200 shadow-sm">
                  <CardContent className="p-4 sm:p-5">
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Sugestao contextual</Badge>
                    <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700"><Sparkles className="h-5 w-5" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">{previewSuggestion?.title}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{previewSuggestion?.message}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge className="bg-cyan-100 text-cyan-700">Leve por +{formatCurrency(previewSuggestion?.price || previewBeverage.price)}</Badge>
                            <Badge variant="outline">{previewSuggestion?.readout}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200 shadow-sm">
                  <CardContent className="p-4 sm:p-5">
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Como isso vende</Badge>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-semibold text-slate-900">Cardapio</p>
                        <p className="mt-2 text-sm text-slate-600">A bebida aparece com volume, tipo, temperatura e preco claro.</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-semibold text-slate-900">Upsell</p>
                        <p className="mt-2 text-sm text-slate-600">O cliente entende rapidamente que vale adicionar por mais {formatCurrency(previewBeverage.price)}.</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-semibold text-slate-900">PDV e combo</p>
                        <p className="mt-2 text-sm text-slate-600">A leitura comercial ja deixa a bebida pronta para venda rapida e oferta conjunta.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="rounded-3xl border-dashed border-slate-300 shadow-none">
              <CardContent className="py-12 text-center">
                <Eye className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                <p className="text-sm font-medium text-slate-700">Cadastre ou selecione uma bebida para ver o preview.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="insights" className="mt-0">
          <BeverageInsightsPanel
            recommendations={combinedRecommendations}
            autoPlan={autoPlan}
            uncoveredCategories={categoriesWithoutUpsell}
            currentUpsellBeverage={currentUpsellBeverage}
            performanceSummary={performanceSummary}
            combinationPerformance={combinationPerformance}
            combinationSummary={combinationSummary}
            orderActionPerformance={orderActionPerformance}
            orderOptimizationSummary={orderOptimizationSummary}
            decisionSummary={decisionSummary}
            onRecommendationAction={runAction}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={showBeverageModal} onOpenChange={(open) => !open && closeBeverageModal()}>
        <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editingBeverage ? 'Editar bebida' : 'Nova bebida'}</DialogTitle></DialogHeader>
          <form onSubmit={handleBeverageSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Nome *</Label>
                <Input value={formData.name} onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))} placeholder="Ex: Coca-Cola 2L" required />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={String(formData.category_id || '')} onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {beverageCategories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <Label>Tipo</Label>
                <Select value={formData.beverage_type} onValueChange={(value) => setFormData((prev) => ({ ...prev, beverage_type: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="industrial">Industrializado</SelectItem>
                    <SelectItem value="natural">Natural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Volume (ml)</Label>
                <Input type="number" min="1" value={formData.volume_ml} onChange={(event) => setFormData((prev) => ({ ...prev, volume_ml: event.target.value }))} placeholder="350" />
              </div>
              <div>
                <Label>Temperatura</Label>
                <Select value={formData.serving_temp} onValueChange={(value) => setFormData((prev) => ({ ...prev, serving_temp: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold">Gelado</SelectItem>
                    <SelectItem value="room">Ambiente</SelectItem>
                    <SelectItem value="hot">Quente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>EAN</Label>
                <Input value={formData.ean} onChange={(event) => setFormData((prev) => ({ ...prev, ean: event.target.value }))} placeholder="7891234567890" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Preco *</Label>
                <Input type="number" step="0.01" value={formData.price} onChange={(event) => setFormData((prev) => ({ ...prev, price: event.target.value }))} placeholder="5.00" required />
              </div>
              <div>
                <AdminMediaField
                  label="Imagem da bebida"
                  value={formData.image}
                  onChange={(url) => setFormData((prev) => ({ ...prev, image: url || '' }))}
                  imageType="product"
                  folder="dishes"
                  title="Adicionar foto da bebida"
                  description="Use uma imagem limpa para manter bebidas e produtos com o mesmo padrao visual."
                  existingImages={beverages
                    .filter((item) => item?.image)
                    .map((item) => ({ url: item.image, label: item.name, meta: formatCurrency(item.price) }))}
                />
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-3">
              <span className="text-sm font-medium">Caracteristicas</span>
              <div className="mt-3 flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.sugar_free} onChange={(event) => setFormData((prev) => ({ ...prev, sugar_free: event.target.checked }))} /> Sem acucar</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.alcoholic} onChange={(event) => setFormData((prev) => ({ ...prev, alcoholic: event.target.checked }))} /> Alcoolico</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={formData.caffeine} onChange={(event) => setFormData((prev) => ({ ...prev, caffeine: event.target.checked }))} /> Cafeina</label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map((option) => (
                  <Badge key={option.id} variant={formData.dietary_tags.includes(option.id) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleDietaryTag(option.id)}>{option.label}</Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Descricao</Label>
              <Textarea value={formData.description} onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))} rows={2} placeholder="Descricao opcional" />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Ativa</Label>
              <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Destacar no cardapio</Label>
              <Switch checked={formData.is_highlight} onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_highlight: checked }))} />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeBeverageModal} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-700">{editingBeverage ? 'Salvar' : 'Criar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova categoria de bebidas</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Ex: Refrigerantes, Sucos, Aguas" />
            </div>
            <Button onClick={() => newCategoryName.trim() && createCategoryMutation.mutate({ name: newCategoryName.trim(), order: beverageCategories.length })} className="w-full">Criar categoria</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}



