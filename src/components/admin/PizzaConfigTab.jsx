import React, { useState, useMemo } from 'react';
import { apiClient } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Pencil, Search, ChevronUp, ChevronDown } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import PizzaVisualizationSettings from './PizzaVisualizationSettings';
import MyPizzasTab from './MyPizzasTab';
import PizzaOverviewPanel from './pizza/PizzaOverviewPanel';
import PizzaInsightsPanel from './pizza/PizzaInsightsPanel';
import { usePermission } from '../permissions/usePermission';
import { buildTenantEntityOpts, getMenuContextEntityOpts, getMenuContextQueryKeyParts } from '@/utils/tenantScope';
import { fetchAdminDishes } from '@/services/adminMenuService';
import {
  PIZZA_BUSINESS_PROFILES,
  buildPizzaEntryCommercialModel,
  buildPizzaStorageScopeKey,
  getPizzaBusinessProfile,
  summarizePizzaCommercialReadiness,
} from '@/utils/pizzaBusinessIntelligence';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

const formatFlavorAllowance = (value) => {
  const count = Math.max(Number(value) || 1, 1);
  return count === 1 ? 'Ate 1 sabor' : `Ate ${count} sabores`;
};

const formatPricePerSlice = (price, slices) => {
  const safePrice = Number(price || 0);
  const safeSlices = Number(slices || 0);
  if (safePrice <= 0 || safeSlices <= 0) return '—';
  return formatCurrency(safePrice / safeSlices);
};

const clonePizzaSize = (size) => ({
  id: size.id,
  name: size.name,
  slices: size.slices,
  max_flavors: size.max_flavors,
  price_tradicional: size.price_tradicional,
  price_premium: size.price_premium,
});

const clonePizzaEdge = (edge) => ({
  id: edge.id,
  name: edge.name,
  price: edge.price,
  is_active: edge.is_active,
  is_popular: edge.is_popular,
});

const clonePizzaExtra = (extra) => ({
  id: extra.id,
  name: extra.name,
  price: extra.price,
  is_active: extra.is_active,
});

const getRecommendedSizeRank = (size) => {
  const name = String(size?.name || '').toLowerCase();
  let score = Number(size?.slices || 0);
  if (name.includes('m')) score += 40;
  if (name.includes('g')) score += 35;
  if (name.includes('grande')) score += 30;
  if (name.includes('media')) score += 25;
  if ((Number(size?.max_flavors) || 1) >= 2) score += 20;
  return score;
};

const getRecommendedPizzaTemplateId = (profileId) => {
  if (profileId === 'premium') return 'premium';
  if (profileId === 'delivery' || profileId === 'dark-kitchen') return 'delivery';
  if (profileId === 'neighborhood') return 'traditional';
  return 'traditional';
};

const buildPizzaPricingInsights = (sizes = []) => {
  const metrics = (sizes || []).map((size) => {
    const tradPrice = Number(size?.price_tradicional || 0);
    const premiumPrice = Number(size?.price_premium || 0);
    const slices = Number(size?.slices || 0);
    const premiumDelta = Math.max(premiumPrice - tradPrice, 0);
    const pricePerSlice = tradPrice > 0 && slices > 0 ? tradPrice / slices : null;
    const premiumPerSlice = premiumPrice > 0 && slices > 0 ? premiumPrice / slices : null;

    return {
      id: String(size?.id),
      name: size?.name || 'Tamanho',
      isActive: size?.is_active !== false,
      tradPrice,
      premiumPrice,
      premiumDelta,
      slices,
      maxFlavors: Math.max(Number(size?.max_flavors) || 1, 1),
      pricePerSlice,
      premiumPerSlice,
      badges: [],
      classification: null,
    };
  });

  const activeMetrics = metrics.filter((metric) => metric.isActive);
  const validTradMetrics = activeMetrics.filter((metric) => metric.tradPrice > 0);
  const validSliceMetrics = activeMetrics.filter((metric) => metric.pricePerSlice && metric.pricePerSlice > 0);
  const validPremiumMetrics = activeMetrics.filter((metric) => metric.premiumDelta > 0);

  const cheapestMetric = validTradMetrics.reduce((selected, metric) => {
    if (!selected || metric.tradPrice < selected.tradPrice) return metric;
    return selected;
  }, null);

  const bestValueMetric = validSliceMetrics.reduce((selected, metric) => {
    if (!selected || metric.pricePerSlice < selected.pricePerSlice) return metric;
    if (selected && metric.pricePerSlice === selected.pricePerSlice && metric.slices > selected.slices) return metric;
    return selected;
  }, null);

  const highestTicketMetric = activeMetrics.reduce((selected, metric) => {
    const metricTicket = metric.premiumPrice || metric.tradPrice || 0;
    const selectedTicket = selected ? (selected.premiumPrice || selected.tradPrice || 0) : 0;
    if (!selected || metricTicket > selectedTicket) return metric;
    return selected;
  }, null);

  const strongestPremiumMetric = validPremiumMetrics.reduce((selected, metric) => {
    if (!selected || metric.premiumDelta > selected.premiumDelta) return metric;
    return selected;
  }, null);

  metrics.forEach((metric) => {
    if (cheapestMetric?.id === metric.id) {
      metric.badges.push('Entrada barata');
    }
    if (bestValueMetric?.id === metric.id) {
      metric.badges.push('Melhor custo-beneficio');
      metric.classification = 'Melhor custo-beneficio';
    }
    if (!metric.classification && highestTicketMetric?.id === metric.id) {
      metric.badges.push('Mais lucrativo');
      metric.classification = 'Mais lucrativo';
    }
    if (!metric.classification && cheapestMetric?.id === metric.id) {
      metric.classification = 'Mais barato';
    }
    if (strongestPremiumMetric?.id === metric.id) {
      metric.badges.push('Premium forte');
      if (!metric.classification) {
        metric.classification = 'Premium';
      }
    }
    if (!metric.classification) {
      metric.classification = metric.isActive ? 'Equilibrado' : 'Inativo';
    }
  });

  const alerts = [];
  const lowPremiumMetrics = validPremiumMetrics.filter((metric) => metric.tradPrice > 0 && (metric.premiumDelta / metric.tradPrice) < 0.12);
  if (lowPremiumMetrics.length > 0) {
    alerts.push({
      tone: 'amber',
      title: 'Diferenca entre tradicional e premium esta baixa',
      description: `Os tamanhos ${lowPremiumMetrics.map((metric) => metric.name).join(', ')} podem nao destacar valor premium com clareza.`
    });
  }

  if (validSliceMetrics.length >= 2) {
    const sliceValues = validSliceMetrics.map((metric) => metric.pricePerSlice);
    const minSlice = Math.min(...sliceValues);
    const maxSlice = Math.max(...sliceValues);
    if ((maxSlice - minSlice) >= 1.2) {
      alerts.push({
        tone: 'sky',
        title: 'Preco por fatia varia bastante entre tamanhos',
        description: 'Vale revisar a escada de valor para o cliente entender melhor a diferenca entre P, M e G.'
      });
    }
  }

  const largestMetric = activeMetrics.reduce((selected, metric) => {
    if (!selected || metric.slices > selected.slices) return metric;
    return selected;
  }, null);
  const smallestMetric = activeMetrics.reduce((selected, metric) => {
    if (!selected || (metric.slices > 0 && metric.slices < selected.slices)) return metric;
    return selected;
  }, null);
  if (
    largestMetric?.pricePerSlice
    && smallestMetric?.pricePerSlice
    && largestMetric.pricePerSlice < (smallestMetric.pricePerSlice * 0.9)
  ) {
    alerts.push({
      tone: 'violet',
      title: `${largestMetric.name} pode estar subvalorizado`,
      description: `O maior tamanho esta com preco por fatia bem mais baixo que ${smallestMetric.name}. Isso ajuda conversao, mas pode reduzir margem.`
    });
  }

  const highlights = [
    cheapestMetric ? {
      tone: 'slate',
      label: 'Entrada barata',
      title: cheapestMetric.name,
      description: `${formatCurrency(cheapestMetric.tradPrice)} tradicional`
    } : null,
    bestValueMetric ? {
      tone: 'emerald',
      label: 'Melhor custo-beneficio',
      title: bestValueMetric.name,
      description: `${formatPricePerSlice(bestValueMetric.tradPrice, bestValueMetric.slices)} por fatia`
    } : null,
    highestTicketMetric ? {
      tone: 'orange',
      label: 'Mais lucrativo',
      title: highestTicketMetric.name,
      description: `${formatCurrency(highestTicketMetric.premiumPrice || highestTicketMetric.tradPrice)} de ticket base`
    } : null,
  ].filter(Boolean);

  const metricsById = metrics.reduce((accumulator, metric) => {
    accumulator[metric.id] = metric;
    return accumulator;
  }, {});

  return {
    metrics,
    metricsById,
    alerts: alerts.slice(0, 3),
    highlights,
  };
};

const PIZZA_SECTION_NAV_ITEMS = [
  { id: 'products', label: 'Produtos', mobileLabel: 'Produtos', defaultSection: 'menu', sections: ['menu'] },
  { id: 'organization', label: 'Organizacao', mobileLabel: 'Organiza', defaultSection: 'rules', sections: ['rules', 'flavors', 'sizes', 'addons'] },
  { id: 'intelligence', label: 'Inteligencia', mobileLabel: 'Insights', defaultSection: 'overview', sections: ['overview', 'intelligence'] },
  { id: 'settings', label: 'Configuracoes', mobileLabel: 'Config', defaultSection: 'preview', sections: ['preview'] },
];

const PIZZA_SUBSECTION_NAV = {
  organization: [
    { id: 'rules', label: 'Regras', mobileLabel: 'Regras' },
    { id: 'flavors', label: 'Sabores', mobileLabel: 'Sabores' },
    { id: 'sizes', label: 'Tamanhos', mobileLabel: 'Precos' },
    { id: 'addons', label: 'Extras', mobileLabel: 'Extras' },
  ],
  intelligence: [
    { id: 'overview', label: 'Resumo guiado', mobileLabel: 'Resumo' },
    { id: 'intelligence', label: 'Oportunidades', mobileLabel: 'Oportun.' },
  ],
};

export default function PizzaConfigTab() {
  const [user, setUser] = React.useState(null);
  const [activeTab, setActiveTab] = useState('menu');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(() => getRecommendedPizzaTemplateId('other'));
  const [runningAssistantActionId, setRunningAssistantActionId] = useState('');
  
  // Modals
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [showFlavorModal, setShowFlavorModal] = useState(false);
  const [showEdgeModal, setShowEdgeModal] = useState(false);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  // Editing
  const [editingSize, setEditingSize] = useState(null);
  const [editingFlavor, setEditingFlavor] = useState(null);
  const [editingEdge, setEditingEdge] = useState(null);
  const [editingExtra, setEditingExtra] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  const queryClient = useQueryClient();
  const { menuContext } = usePermission();
  const slug = menuContext?.type === 'slug' ? menuContext?.value : null;

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await apiClient.auth.me();
        setUser(userData);
      } catch (e) {
        console.error('Error loading user:', e);
      }
    };
    loadUser();
  }, []);

  // âœ… Para master (slug): buscar complementos do cardÃ¡pio pÃºblico (mesma fonte que MyPizzasTab)
  const { data: publicCardapio } = useQuery({
    queryKey: ['publicCardapio', slug],
    queryFn: async () => {
      if (!slug) return null;
      return await apiClient.get(`/public/cardapio/${slug}`);
    },
    enabled: !!slug,
    staleTime: 30000,
    gcTime: 60000,
  });

  const tenantSubscriberEmail = slug && publicCardapio?.subscriber_email && publicCardapio.subscriber_email !== 'master'
    ? publicCardapio.subscriber_email
    : null;
  const tenantSubscriberId = slug && publicCardapio?.subscriber_id != null
    ? publicCardapio.subscriber_id
    : null;
  const scopedSubscriberEmail = menuContext?.type === 'subscriber' && menuContext?.value
    ? menuContext.value
    : tenantSubscriberEmail;
  const scopedSubscriberId = menuContext?.type === 'subscriber'
    ? menuContext.subscriber_id ?? null
    : tenantSubscriberId;
  const fallbackOwnerEmail = slug ? null : (user?.subscriber_email || user?.email || null);
  const entityOwnerEmail = scopedSubscriberEmail || fallbackOwnerEmail; // Compatibilidade transitÃ³ria: o backend legado ainda persiste owner_email.
  const entityContextOpts = buildTenantEntityOpts({ subscriberId: scopedSubscriberId, subscriberEmail: scopedSubscriberEmail });
  const profileStorageKey = useMemo(
    () => buildPizzaStorageScopeKey({
      slug,
      subscriberEmail: scopedSubscriberEmail,
      subscriberId: scopedSubscriberId,
      ownerEmail: entityOwnerEmail,
      suffix: 'profile',
    }),
    [entityOwnerEmail, scopedSubscriberEmail, scopedSubscriberId, slug]
  );
  const evolutionModeStorageKey = useMemo(
    () => buildPizzaStorageScopeKey({
      slug,
      subscriberEmail: scopedSubscriberEmail,
      subscriberId: scopedSubscriberId,
      ownerEmail: entityOwnerEmail,
      suffix: 'evolution-mode',
    }),
    [entityOwnerEmail, scopedSubscriberEmail, scopedSubscriberId, slug]
  );
  const evolutionSnapshotStorageKey = useMemo(
    () => buildPizzaStorageScopeKey({
      slug,
      subscriberEmail: scopedSubscriberEmail,
      subscriberId: scopedSubscriberId,
      ownerEmail: entityOwnerEmail,
      suffix: 'evolution-snapshot',
    }),
    [entityOwnerEmail, scopedSubscriberEmail, scopedSubscriberId, slug]
  );
  const [businessProfileId, setBusinessProfileId] = useState('other');
  const [evolutionModeEnabled, setEvolutionModeEnabled] = useState(true);
  const [evolutionDelta, setEvolutionDelta] = useState(null);

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const matchesSearch = useMemo(() => {
    if (!normalizedSearchTerm) return () => true;
    return (item) =>
      String(item?.name || '').toLowerCase().includes(normalizedSearchTerm)
      || String(item?.description || '').toLowerCase().includes(normalizedSearchTerm);
  }, [normalizedSearchTerm]);

  const { data: adminDishesRaw = [] } = useQuery({
    queryKey: ['dishes', ...getMenuContextQueryKeyParts(menuContext)],
    queryFn: async () => {
      if (!menuContext) return [];
      return await fetchAdminDishes(menuContext);
    },
    enabled: !!menuContext && !slug,
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    staleTime: 30000,
    gcTime: 60000,
  });

  // âœ… Admin API (usada quando nÃ£o hÃ¡ slug); com slug usamos publicCardapio para exibir
  const { data: adminSizes = [] } = useQuery({
    queryKey: ['pizzaSizes', ...getMenuContextQueryKeyParts(menuContext)],
    queryFn: async () => {
      if (!menuContext) return [];
      return apiClient.entities.PizzaSize.list('order', getMenuContextEntityOpts(menuContext));
    },
    enabled: !!menuContext && !slug,
  });
  const sizes = (slug && Array.isArray(publicCardapio?.pizzaSizes)) ? publicCardapio.pizzaSizes : (adminSizes || []);

  const { data: adminFlavors = [] } = useQuery({
    queryKey: ['pizzaFlavors', ...getMenuContextQueryKeyParts(menuContext)],
    queryFn: async () => {
      if (!menuContext) return [];
      return apiClient.entities.PizzaFlavor.list('order', getMenuContextEntityOpts(menuContext));
    },
    enabled: !!menuContext && !slug,
  });
  const flavors = (slug && Array.isArray(publicCardapio?.pizzaFlavors)) ? publicCardapio.pizzaFlavors : (adminFlavors || []);

  const { data: adminEdges = [] } = useQuery({
    queryKey: ['pizzaEdges', ...getMenuContextQueryKeyParts(menuContext)],
    queryFn: async () => {
      if (!menuContext) return [];
      return apiClient.entities.PizzaEdge.list('order', getMenuContextEntityOpts(menuContext));
    },
    enabled: !!menuContext && !slug,
  });
  const edges = (slug && Array.isArray(publicCardapio?.pizzaEdges)) ? publicCardapio.pizzaEdges : (adminEdges || []);

  const { data: adminExtras = [] } = useQuery({
    queryKey: ['pizzaExtras', ...getMenuContextQueryKeyParts(menuContext)],
    queryFn: async () => {
      if (!menuContext) return [];
      return apiClient.entities.PizzaExtra.list('order', getMenuContextEntityOpts(menuContext));
    },
    enabled: !!menuContext && !slug,
  });
  const extras = (slug && Array.isArray(publicCardapio?.pizzaExtras)) ? publicCardapio.pizzaExtras : (adminExtras || []);

  const { data: adminPizzaCategories = [] } = useQuery({
    queryKey: ['pizzaCategories', ...getMenuContextQueryKeyParts(menuContext)],
    queryFn: async () => {
      if (!menuContext) return [];
      return apiClient.entities.PizzaCategory.list('order', getMenuContextEntityOpts(menuContext));
    },
    enabled: !!menuContext && !slug,
  });
  const pizzaCategories = (slug && Array.isArray(publicCardapio?.pizzaCategories)) ? publicCardapio.pizzaCategories : (adminPizzaCategories || []);
  const filteredPizzaCategories = useMemo(() => pizzaCategories.filter((item) => matchesSearch(item)), [pizzaCategories, matchesSearch]);
  const filteredSizes = useMemo(() => sizes.filter((item) => matchesSearch(item)), [sizes, matchesSearch]);
  const filteredFlavors = useMemo(() => flavors.filter((item) => matchesSearch(item)), [flavors, matchesSearch]);
  const filteredEdges = useMemo(() => edges.filter((item) => matchesSearch(item)), [edges, matchesSearch]);
  const filteredExtras = useMemo(() => extras.filter((item) => matchesSearch(item)), [extras, matchesSearch]);
  const dishesRaw = (slug && Array.isArray(publicCardapio?.dishes)) ? publicCardapio.dishes : (adminDishesRaw || []);
  const pizzaEntries = useMemo(
    () => (Array.isArray(dishesRaw) ? dishesRaw.filter((dish) => dish?.product_type === 'pizza') : []),
    [dishesRaw]
  );
  const activePizzaEntries = useMemo(
    () => pizzaEntries.filter((dish) => dish?.is_active !== false),
    [pizzaEntries]
  );
  const businessProfile = useMemo(
    () => getPizzaBusinessProfile(businessProfileId),
    [businessProfileId]
  );
  const entryReadinessById = useMemo(() => {
    return Object.fromEntries(
      pizzaEntries.map((pizza) => {
        const entryCategory = pizzaCategories.find((item) => item.id === pizza?.pizza_category_id) || null;
        return [String(pizza.id), buildPizzaEntryCommercialModel({
          pizza,
          entryCategory,
          sizes,
          flavors,
          profileId: businessProfileId,
        })];
      })
    );
  }, [businessProfileId, flavors, pizzaCategories, pizzaEntries, sizes]);
  const commercialSummary = useMemo(
    () => summarizePizzaCommercialReadiness(entryReadinessById, pizzaEntries),
    [entryReadinessById, pizzaEntries]
  );
  const flavorUsageById = useMemo(() => {
    return pizzaEntries.reduce((accumulator, dish) => {
      const flavorIds = Array.isArray(dish?.pizza_config?.flavor_ids) ? dish.pizza_config.flavor_ids : [];
      flavorIds.forEach((flavorId) => {
        const key = String(flavorId);
        accumulator[key] = (accumulator[key] || 0) + 1;
      });
      return accumulator;
    }, {});
  }, [pizzaEntries]);
  const entryCountByPizzaCategoryId = useMemo(() => {
    return pizzaEntries.reduce((accumulator, dish) => {
      const key = String(dish?.pizza_category_id || '_sem_categoria');
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});
  }, [pizzaEntries]);
  const sortedPizzaCategories = useMemo(
    () => [...pizzaCategories].sort((a, b) => (a?.order ?? 999) - (b?.order ?? 999)),
    [pizzaCategories]
  );
  const previewEntries = useMemo(() => activePizzaEntries.slice(0, 6), [activePizzaEntries]);
  const flavorEntriesById = useMemo(() => {
    return pizzaEntries.reduce((accumulator, dish) => {
      const flavorIds = Array.isArray(dish?.pizza_config?.flavor_ids) ? dish.pizza_config.flavor_ids : [];
      flavorIds.forEach((flavorId) => {
        const key = String(flavorId);
        if (!accumulator[key]) accumulator[key] = [];
        if (!accumulator[key].includes(dish.name)) accumulator[key].push(dish.name);
      });
      return accumulator;
    }, {});
  }, [pizzaEntries]);

  const [previewEntryId, setPreviewEntryId] = useState('');
  const [previewSizeId, setPreviewSizeId] = useState('');
  const [previewFlavorIds, setPreviewFlavorIds] = useState([]);
  const [previewEdgeId, setPreviewEdgeId] = useState('none');
  const [previewExtraIds, setPreviewExtraIds] = useState([]);

  const previewEntry = useMemo(
    () => previewEntries.find((entry) => String(entry.id) === String(previewEntryId)) || previewEntries[0] || null,
    [previewEntries, previewEntryId]
  );
  const previewCategory = useMemo(
    () => pizzaCategories.find((category) => category.id === previewEntry?.pizza_category_id) || null,
    [pizzaCategories, previewEntry]
  );
  const previewSizes = useMemo(() => {
    if (!previewEntry) return [];
    const configuredSizes = Array.isArray(previewEntry?.pizza_config?.sizes)
      ? previewEntry.pizza_config.sizes.filter(Boolean)
      : [];
    if (configuredSizes.length > 0) return configuredSizes;
    if (previewCategory?.size_id) {
      const fallbackSize = sizes.find((size) => size.id === previewCategory.size_id);
      return fallbackSize ? [fallbackSize] : [];
    }
    return [];
  }, [previewEntry, previewCategory, sizes]);
  const previewSelectedSize = useMemo(
    () => previewSizes.find((size) => String(size.id) === String(previewSizeId)) || previewSizes[0] || null,
    [previewSizes, previewSizeId]
  );
  const previewFlavorOptions = useMemo(() => {
    if (!previewEntry) return [];
    const allowedIds = new Set(Array.isArray(previewEntry?.pizza_config?.flavor_ids) ? previewEntry.pizza_config.flavor_ids : []);
    return flavors.filter((flavor) => flavor?.is_active !== false && (allowedIds.size === 0 || allowedIds.has(flavor.id)));
  }, [previewEntry, flavors]);
  const previewSelectedFlavors = useMemo(
    () => previewFlavorOptions.filter((flavor) => previewFlavorIds.includes(flavor.id)),
    [previewFlavorOptions, previewFlavorIds]
  );
  const previewEdges = useMemo(
    () => Array.isArray(previewEntry?.pizza_config?.edges) ? previewEntry.pizza_config.edges.filter((edge) => edge?.is_active !== false) : [],
    [previewEntry]
  );
  const previewExtras = useMemo(
    () => Array.isArray(previewEntry?.pizza_config?.extras) ? previewEntry.pizza_config.extras.filter((extra) => extra?.is_active !== false) : [],
    [previewEntry]
  );
  const previewSelectedEdge = useMemo(
    () => previewEdges.find((edge) => String(edge.id) === String(previewEdgeId)) || null,
    [previewEdges, previewEdgeId]
  );
  const previewSelectedExtras = useMemo(
    () => previewExtras.filter((extra) => previewExtraIds.includes(extra.id)),
    [previewExtras, previewExtraIds]
  );
  const previewMaxFlavors = previewCategory?.max_flavors ?? previewSelectedSize?.max_flavors ?? 1;
  const previewHasPremium = previewSelectedFlavors.some((flavor) => flavor.category === 'premium');
  const previewPrice = useMemo(() => {
    if (!previewSelectedSize) return 0;
    const basePrice = Number(previewHasPremium ? previewSelectedSize.price_premium : previewSelectedSize.price_tradicional) || 0;
    const edgePrice = Number(previewSelectedEdge?.price || 0);
    const extrasPrice = previewSelectedExtras.reduce((sum, extra) => sum + (Number(extra?.price) || 0), 0);
    return basePrice + edgePrice + extrasPrice;
  }, [previewHasPremium, previewSelectedEdge, previewSelectedExtras, previewSelectedSize]);
  const pizzaGuideSteps = useMemo(() => ([
    {
      id: 'menu',
      step: '1',
      title: 'O que aparece no cardapio',
      description: 'Entradas comerciais que o cliente realmente escolhe.',
      metric: `${pizzaEntries.length} entrada(s)`
    },
    {
      id: 'rules',
      step: '2',
      title: 'Como o cliente monta',
      description: 'Regras que controlam sabores, tamanho base e montagem.',
      metric: `${pizzaCategories.length} regra(s)`
    },
    {
      id: 'flavors',
      step: '3',
      title: 'Quais sabores existem',
      description: 'Base comercial de tradicionais e premium.',
      metric: `${flavors.length} sabor(es)`
    },
    {
      id: 'sizes',
      step: '4',
      title: 'Quanto cada tamanho custa',
      description: 'Tabela para comparar preco, fatias e limite de sabores.',
      metric: `${sizes.length} tamanho(s)`
    },
    {
      id: 'addons',
      step: '5',
      title: 'O que e opcional',
      description: 'Bordas e extras que elevam ticket sem travar o fluxo.',
      metric: `${edges.length + extras.length} opcional(is)`
    },
    {
      id: 'preview',
      step: '6',
      title: 'Como isso fica no builder',
      description: 'Preview quase real para revisar a experiencia final.',
      metric: `${previewEntries.length} vitrine(s)`
    }
  ]), [pizzaEntries.length, pizzaCategories.length, flavors.length, sizes.length, edges.length, extras.length, previewEntries.length]);
  const pizzaGuideStepCards = useMemo(
    () => pizzaGuideSteps.map((step) => ({ ...step, onSelect: () => setActiveTab(step.id) })),
    [pizzaGuideSteps]
  );
  const pizzaGuidanceCards = useMemo(() => {
    const activePremiumFlavors = flavors.filter((flavor) => flavor?.is_active !== false && flavor?.category === 'premium').length;
    const activeEdges = edges.filter((edge) => edge?.is_active !== false).length;
    const activeExtras = extras.filter((extra) => extra?.is_active !== false).length;
    const activeRules = pizzaCategories.filter((category) => category?.is_active !== false).length;
    const rulesWithoutEntries = pizzaCategories.filter((category) => !entryCountByPizzaCategoryId[String(category.id)]).length;
    const multiFlavorRules = pizzaCategories.filter((category) => (Number(category?.max_flavors) || 1) >= 2).length;
    const suggestions = [];

    if (pizzaEntries.length === 0 && activeRules > 0 && sizes.length > 0 && flavors.length > 0) {
      suggestions.push({
        tone: 'emerald',
        title: 'Base pronta para vender',
        description: 'Voce ja tem regra, tamanhos e sabores suficientes para publicar sua primeira entrada comercial.'
      });
    }
    if (rulesWithoutEntries > 0) {
      suggestions.push({
        tone: 'amber',
        title: 'Existem regras sem entrada publica',
        description: `${rulesWithoutEntries} regra(s) ainda nao aparecem no cardapio. Vale conectar isso a uma entrada comercial.`
      });
    }
    if (multiFlavorRules > 0 && sizes.length <= 1) {
      suggestions.push({
        tone: 'rose',
        title: 'Entradas de 2 sabores pedem mais de um tamanho',
        description: 'Se voce vender 2 sabores, considere deixar M e G ativos para o cliente perceber opcao real.'
      });
    }
    if (pizzaEntries.length > 0 && activePremiumFlavors === 0) {
      suggestions.push({
        tone: 'sky',
        title: 'Premium ainda nao entrou no jogo',
        description: 'Adicionar ao menos um sabor premium aumenta o valor percebido e melhora a leitura comercial.'
      });
    }
    if (pizzaEntries.length > 0 && activeEdges === 0 && activeExtras === 0) {
      suggestions.push({
        tone: 'violet',
        title: 'Sem upgrades de ticket',
        description: 'Borda ou adicional opcional ajudam a pizzaria a vender mais sem deixar o builder pesado.'
      });
    }

    return suggestions.slice(0, 3);
  }, [pizzaEntries.length, pizzaCategories, entryCountByPizzaCategoryId, sizes.length, flavors, edges, extras]);
  const previewCommercialChecklist = useMemo(() => {
    return [
      { label: 'Entrada comercial ativa', done: Boolean(previewEntry) && previewEntry?.is_active !== false },
      { label: 'Tamanho pronto para venda', done: Boolean(previewSelectedSize) && ((Number(previewSelectedSize?.price_tradicional || 0) > 0) || (Number(previewSelectedSize?.price_premium || 0) > 0)) },
      { label: 'Sabores visiveis para o cliente', done: previewSelectedFlavors.length > 0 },
      { label: 'Preco final coerente', done: previewPrice > 0 },
      { label: 'Borda opcional configurada', done: previewEdges.length > 0, optional: true },
      { label: 'Adicionais opcionais configurados', done: previewExtras.length > 0, optional: true }
    ];
  }, [previewEntry, previewSelectedSize, previewSelectedFlavors.length, previewPrice, previewEdges.length, previewExtras.length]);
  const pricingInsights = useMemo(() => buildPizzaPricingInsights(sizes), [sizes]);
  const previewSizeInsight = useMemo(
    () => (previewSelectedSize ? pricingInsights.metricsById[String(previewSelectedSize.id)] || null : null),
    [pricingInsights.metricsById, previewSelectedSize]
  );
  const previewCommercialInsights = useMemo(() => {
    const premiumOptionsCount = previewFlavorOptions.filter((flavor) => flavor.category === 'premium').length;
    const activeUpgradeCount = (previewEdges.length > 0 ? 1 : 0) + (previewExtras.length > 0 ? 1 : 0) + (premiumOptionsCount > 0 ? 1 : 0);
    const potentialLabel = activeUpgradeCount >= 3
      ? 'Bom potencial de ticket'
      : (activeUpgradeCount >= 2 ? 'Potencial comercial equilibrado' : 'Potencial comercial basico');
    const insights = [
      previewSizeInsight?.classification
        ? `${previewSelectedSize?.name || 'Este tamanho'} aparece como ${previewSizeInsight.classification.toLowerCase()} na matriz comercial.`
        : 'Compare a matriz de tamanhos para encontrar o ponto ideal entre margem e conversao.',
      previewHasPremium && previewSizeInsight?.premiumDelta > 0
        ? `Premium aumenta ${formatCurrency(previewSizeInsight.premiumDelta)} nesta escolha.`
        : (premiumOptionsCount > 0
          ? 'Voce ja tem premium liberado para empurrar ticket medio nesta entrada.'
          : 'Sem sabores premium ativos nesta entrada.'),
      activeUpgradeCount >= 2
        ? 'Borda e adicionais deixam esta entrada com boa chance de upsell.'
        : 'Ativar borda ou adicional pode deixar esta entrada mais forte comercialmente.'
    ];

    return {
      potentialLabel,
      insights,
    };
  }, [previewEdges.length, previewExtras.length, previewFlavorOptions, previewHasPremium, previewSelectedSize, previewSizeInsight]);
  const activeSizes = useMemo(() => sizes.filter((size) => size?.is_active !== false), [sizes]);
  const inactivePremiumFlavors = useMemo(
    () => flavors.filter((flavor) => flavor?.category === 'premium' && flavor?.is_active === false),
    [flavors]
  );
  const activePremiumFlavors = useMemo(
    () => flavors.filter((flavor) => flavor?.category === 'premium' && flavor?.is_active !== false),
    [flavors]
  );
  const inactiveEdges = useMemo(() => edges.filter((edge) => edge?.is_active === false), [edges]);
  const inactiveExtras = useMemo(() => extras.filter((extra) => extra?.is_active === false), [extras]);
  const recommendedSizes = useMemo(() => {
    return [...sizes]
      .filter(Boolean)
      .sort((left, right) => getRecommendedSizeRank(right) - getRecommendedSizeRank(left))
      .slice(0, 2);
  }, [sizes]);
  const missingRecommendedSizes = useMemo(() => {
    const activeIds = new Set(activeSizes.map((size) => String(size.id)));
    return recommendedSizes.filter((size) => !activeIds.has(String(size.id)));
  }, [activeSizes, recommendedSizes]);
  const firstLowPremiumMetric = useMemo(() => {
    return pricingInsights.metrics.find((metric) => metric.isActive && metric.tradPrice > 0 && metric.premiumDelta > 0 && (metric.premiumDelta / metric.tradPrice) < 0.12)
      || pricingInsights.metrics.find((metric) => metric.isActive && metric.tradPrice > 0);
  }, [pricingInsights.metrics]);
  const canRunAdminActions = Boolean(menuContext) && !slug;
  const recommendedTemplateId = useMemo(
    () => getRecommendedPizzaTemplateId(businessProfileId),
    [businessProfileId]
  );
  const commercialSummaryPresentation = useMemo(() => {
    if (commercialSummary.level === 'FORTE') {
      return {
        title: 'Seu cardapio esta forte para vender',
        description: 'A base comercial esta consistente e o sistema entende que sua pizzaria ja transmite seguranca.',
        className: 'border-emerald-200 bg-emerald-50/80',
        badgeClass: 'border-emerald-200 bg-white text-emerald-700',
      };
    }
    if (commercialSummary.level === 'BOM') {
      return {
        title: 'Seu cardapio esta em bom nivel',
        description: 'A estrutura ja convence, mas ainda existem oportunidades claras para subir ticket e melhorar escolha.',
        className: 'border-sky-200 bg-sky-50/80',
        badgeClass: 'border-sky-200 bg-white text-sky-700',
      };
    }
    if (commercialSummary.level === 'FRACO') {
      return {
        title: 'Seu cardapio ainda esta fragil',
        description: 'Hoje o sistema ve entradas fracas demais. Vale agir nas recomendacoes para ganhar confianca de venda.',
        className: 'border-rose-200 bg-rose-50/80',
        badgeClass: 'border-rose-200 bg-white text-rose-700',
      };
    }
    return {
      title: 'Seu cardapio esta em evolucao',
      description: 'A base ja funciona, mas ainda existem ajustes importantes para deixar a pizzaria mais forte e vendavel.',
      className: 'border-amber-200 bg-amber-50/80',
      badgeClass: 'border-amber-200 bg-white text-amber-700',
    };
  }, [commercialSummary.level]);
  const pizzaTemplateCards = useMemo(() => ([
    {
      id: 'lean',
      name: 'Pizzaria enxuta',
      badge: 'Essencial',
      audience: 'Boa para operacao simples e cardapio direto.',
      description: 'Poucos tamanhos, leitura clara e baixa complexidade na montagem.',
      actionLabel: 'Ver caminho recomendado',
      actionMode: 'assist',
      accent: 'border-slate-200 bg-slate-50/80 text-slate-700',
      impact: [
        'Foco em 1 sabor e 2 sabores',
        'Mantem operacao mais simples',
        'Reduz excesso de opcao no inicio',
      ],
    },
    {
      id: 'traditional',
      name: 'Pizzaria tradicional',
      badge: 'Recomendado',
      audience: 'Boa para quem quer equilibrio entre clareza e variedade.',
      description: 'Ativa tamanhos recomendados e deixa a base pronta para vender sem exagero.',
      actionLabel: 'Aplicar estrutura recomendada',
      actionMode: 'apply',
      accent: 'border-orange-200 bg-orange-50/80 text-orange-700',
      impact: [
        missingRecommendedSizes.length > 0 ? `Ativa ${missingRecommendedSizes.length} tamanho(s) recomendado(s)` : 'Tamanhos recomendados ja estao ativos',
        activePremiumFlavors.length > 0 ? 'Premium ja esta disponivel' : 'Mantem foco comercial sem forcar premium',
        (activeSizes.length >= 2 ? 'Base de escolha equilibrada' : 'Amplia opcoes do cardapio'),
      ],
    },
    {
      id: 'delivery',
      name: 'Pizzaria delivery',
      badge: 'Delivery',
      audience: 'Boa para fluxo rapido e ticket com upsell leve.',
      description: 'Combina tamanhos fortes, borda opcional e extra simples para vender mais sem travar o pedido.',
      actionLabel: 'Aplicar pacote delivery',
      actionMode: 'apply',
      accent: 'border-sky-200 bg-sky-50/80 text-sky-700',
      impact: [
        missingRecommendedSizes.length > 0 ? 'Ativa tamanhos mais fortes para escolha rapida' : 'Mantem tamanhos fortes ja ativos',
        inactiveEdges.length > 0 ? 'Liga ao menos uma borda' : 'Borda ja esta pronta',
        inactiveExtras.length > 0 ? 'Liga ao menos um adicional' : 'Adicionais ja estao prontos',
      ],
    },
    {
      id: 'premium',
      name: 'Pizzaria premium',
      badge: 'Premium',
      audience: 'Boa para elevar valor percebido e ticket medio.',
      description: 'Ativa premium disponivel e leva voce direto para ajustar a escada de preco com clareza.',
      actionLabel: inactivePremiumFlavors.length > 0 ? 'Ativar premium e revisar preco' : 'Revisar escada premium',
      actionMode: 'hybrid',
      accent: 'border-amber-200 bg-amber-50/80 text-amber-700',
      impact: [
        inactivePremiumFlavors.length > 0 ? `Ativa ${inactivePremiumFlavors.length} sabor(es) premium` : 'Premium ja esta ativo',
        firstLowPremiumMetric ? `Leva para revisar ${firstLowPremiumMetric.name}` : 'Leva para revisar a matriz premium',
        'Melhora percepcao de valor no builder',
      ],
    },
    {
      id: 'upsell',
      name: 'Upsell forte',
      badge: 'Ticket',
      audience: 'Boa para quem quer empurrar borda, adicional e premium.',
      description: 'Fortalece extras opcionais e deixa a oferta mais preparada para elevar ticket.',
      actionLabel: 'Ativar upsell sugerido',
      actionMode: 'apply',
      accent: 'border-violet-200 bg-violet-50/80 text-violet-700',
      impact: [
        inactiveEdges.length > 0 ? 'Liga borda para oferta premium' : 'Borda ja esta ativa',
        inactiveExtras.length > 0 ? 'Liga adicional para upsell' : 'Adicional ja esta ativo',
        activePremiumFlavors.length > 0 ? 'Premium ajuda a sustentar ticket' : 'Premium ainda pode ser reforcado',
      ],
    },
  ]), [activePremiumFlavors.length, activeSizes.length, firstLowPremiumMetric, inactiveEdges.length, inactiveExtras.length, inactivePremiumFlavors.length, missingRecommendedSizes.length]);
  const assistantActions = useMemo(() => {
    const actions = [];
    if (missingRecommendedSizes.length > 0) {
      actions.push({
        id: 'recommended-sizes',
        tone: 'orange',
        title: 'Organizar tamanhos recomendados',
        description: `Ativa ${missingRecommendedSizes.map((size) => size.name).join(', ')} para deixar a vitrine mais forte.`,
        actionLabel: 'Aplicar agora',
      });
    }
    if (inactiveEdges.length > 0 || inactiveExtras.length > 0) {
      actions.push({
        id: 'upsell-activation',
        tone: 'violet',
        title: 'Ativar upsell sugerido',
        description: 'Liga ao menos uma borda e um adicional para melhorar ticket sem complicar o builder.',
        actionLabel: 'Ativar upsell',
      });
    }
    if (inactivePremiumFlavors.length > 0 || firstLowPremiumMetric) {
      actions.push({
        id: 'premium-improvement',
        tone: 'amber',
        title: 'Melhorar diferenca premium',
        description: inactivePremiumFlavors.length > 0
          ? 'Ative sabores premium e revise o tamanho com menor diferenca de valor.'
          : 'Abra o tamanho mais sensivel para revisar a escada premium.',
        actionLabel: inactivePremiumFlavors.length > 0 ? 'Preparar premium' : 'Abrir ajuste',
      });
    }
    return actions.slice(0, 3);
  }, [firstLowPremiumMetric, inactiveEdges.length, inactiveExtras.length, inactivePremiumFlavors.length, missingRecommendedSizes]);
  const autoImprovePlan = useMemo(() => {
    const activeUpsellReady = edges.some((edge) => edge?.is_active !== false) || extras.some((extra) => extra?.is_active !== false);
    const projectedSizeCount = activeSizes.length + missingRecommendedSizes.length;
    const projectedPremiumCount = activePremiumFlavors.length + inactivePremiumFlavors.length;
    const projectedUpsellReady = activeUpsellReady || inactiveEdges.length > 0 || inactiveExtras.length > 0;
    const actions = [];
    const impact = [];

    if (missingRecommendedSizes.length > 0) {
      actions.push(`Ativar ${missingRecommendedSizes.map((size) => size.name).join(', ')} para ampliar a vitrine.`);
      impact.push('Mais clareza de escolha entre tamanhos no cardapio.');
    }
    if (inactivePremiumFlavors.length > 0) {
      actions.push(`Ligar ${inactivePremiumFlavors.length} sabor(es) premium para reforcar ticket medio.`);
      impact.push('Premium passa a aparecer como decisao de valor, nao so opcao tecnica.');
    }
    if (inactiveEdges.length > 0 || inactiveExtras.length > 0) {
      actions.push('Abrir caminho de upsell com borda e adicional basicos.');
      impact.push('Upsell deixa de ser invisivel e passa a empurrar ticket final.');
    }
    if (firstLowPremiumMetric) {
      actions.push(`Levar voce para revisar a escada premium do tamanho ${firstLowPremiumMetric.name}.`);
      impact.push('A diferenca premium fica mais confiavel para vender sem parecer cara demais.');
    }

    const level = actions.length === 0 ? 'FORTE' : (actions.length === 1 ? 'BOM' : (actions.length === 2 ? 'REGULAR' : 'ATENCAO'));
    const summary = level === 'FORTE'
      ? 'Sua estrutura global ja esta forte para venda.'
      : level === 'BOM'
        ? 'A base esta boa, mas um ajuste automatico pode deixá-la mais confiavel.'
        : level === 'REGULAR'
          ? 'Ainda existe espaco real para melhorar venda e ticket com pouco esforco.'
          : 'A estrutura pede correcao guiada para ficar convincente no cardapio.';

    return {
      actions,
      before: [
        `${activeSizes.length} tamanho(s) ativo(s) hoje`,
        activePremiumFlavors.length > 0 ? `${activePremiumFlavors.length} sabor(es) premium ativo(s)` : 'Premium ainda fraco ou ausente',
        activeUpsellReady ? 'Upsell ja aparece para o cliente' : 'Upsell ainda nao aparece com clareza',
      ],
      after: [
        `${projectedSizeCount} tamanho(s) fortes depois da melhoria`,
        projectedPremiumCount > 0 ? `Premium presente em ${projectedPremiumCount} sabor(es)` : 'Premium continua neutro',
        projectedUpsellReady ? 'Ticket ganha caminho claro de borda/extras' : 'Upsell segue neutro',
      ],
      impact: impact.slice(0, 3),
      summary,
      level,
      canImprove: actions.length > 0,
    };
  }, [activePremiumFlavors.length, activeSizes.length, edges, extras, firstLowPremiumMetric, inactiveEdges.length, inactiveExtras.length, inactivePremiumFlavors.length, missingRecommendedSizes]);
  const previewTicketSimulation = useMemo(() => {
    const baseTicket = Number(previewSelectedSize?.price_tradicional || 0);
    const premiumTicket = previewFlavorOptions.some((flavor) => flavor.category === 'premium')
      ? (Number(previewSelectedSize?.price_premium || previewSelectedSize?.price_tradicional || 0))
      : baseTicket;
    const upsellEdgeValue = Number((previewSelectedEdge || previewEdges[0] || null)?.price || 0);
    const upsellExtraValue = previewSelectedExtras.length > 0
      ? previewSelectedExtras.reduce((sum, extra) => sum + (Number(extra?.price) || 0), 0)
      : Number(previewExtras[0]?.price || 0);
    const upsellTicket = premiumTicket + upsellEdgeValue + upsellExtraValue;

    return {
      baseTicket,
      premiumTicket,
      upsellTicket,
      premiumLift: Math.max(premiumTicket - baseTicket, 0),
      upsellLift: Math.max(upsellTicket - premiumTicket, 0),
    };
  }, [previewEdges, previewExtras, previewFlavorOptions, previewSelectedEdge, previewSelectedExtras, previewSelectedSize]);
  const adaptiveRecommendations = useMemo(() => {
    const recommendations = [];
    const upsellReady = edges.some((edge) => edge?.is_active !== false) || extras.some((extra) => extra?.is_active !== false);
    const premiumReadyEntries = Object.values(entryReadinessById).filter((entry) => entry?.hasPremiumFlavor).length;

    if (commercialSummary.weak > 0) {
      recommendations.push({
        id: 'weak-entries',
        severity: 'critical',
        title: 'Entradas fracas ainda travam seu cardapio',
        description: `${commercialSummary.weak} entrada(s) ainda tem baixo potencial de venda.`,
        impact: 'Resolver isso tende a melhorar conversao e confianca no cardapio.',
        actionLabel: 'Revisar entradas',
        action: 'menu',
      });
    }

    if ((businessProfileId === 'premium' || businessProfileId === 'delivery') && premiumReadyEntries === 0) {
      recommendations.push({
        id: 'premium-missing',
        severity: businessProfileId === 'premium' ? 'critical' : 'important',
        title: 'Premium ainda nao entrou no jogo',
        description: businessProfileId === 'premium'
          ? 'Seu perfil pede premium ativo para sustentar ticket.'
          : 'Delivery forte costuma vender melhor quando premium aparece com clareza.',
        impact: 'Ativar premium cria um passo extra de ticket medio sem mexer no fluxo base.',
        actionLabel: 'Ativar premium',
        action: 'premium-improvement',
      });
    }

    if (!upsellReady) {
      recommendations.push({
        id: 'upsell-off',
        severity: 'important',
        title: 'Voce nao esta aproveitando upsell',
        description: 'Borda e adicionais ainda nao aparecem com forca para o cliente.',
        impact: 'Ativar upsell deixa a entrada mais forte sem mudar o builder real.',
        actionLabel: 'Ativar upsell',
        action: 'upsell-activation',
      });
    }

    if ((businessProfileId === 'delivery' || businessProfileId === 'dark-kitchen') && activeSizes.length > 3) {
      recommendations.push({
        id: 'too-many-sizes',
        severity: 'opportunity',
        title: 'Sua estrutura esta ampla demais para delivery',
        description: 'Muitos tamanhos podem deixar a escolha mais lenta e cansativa.',
        impact: 'Revisar a matriz ajuda a deixar o pedido mais rapido.',
        actionLabel: 'Revisar tamanhos',
        action: 'sizes',
      });
    }

    if (businessProfileId === 'premium' && firstLowPremiumMetric) {
      recommendations.push({
        id: 'premium-gap',
        severity: 'important',
        title: 'Premium pouco valorizado no maior argumento de venda',
        description: `${firstLowPremiumMetric.name} ainda nao comunica bem a diferenca premium.`,
        impact: 'Ajustar essa escada deixa o premium mais confiavel para vender.',
        actionLabel: 'Abrir matriz',
        action: 'sizes',
      });
    }

    if (pizzaEntries.length === 0 && pizzaCategories.length > 0 && sizes.length > 0 && flavors.length > 0) {
      recommendations.push({
        id: 'first-entry',
        severity: 'opportunity',
        title: 'Voce ja pode montar sua primeira entrada',
        description: 'A base tecnica ja existe. Agora vale transformar isso em oferta vendavel.',
        impact: 'Uma primeira entrada pronta acelera o onboarding e o teste do builder.',
        actionLabel: 'Ir para entradas',
        action: 'menu',
      });
    }

    return recommendations.slice(0, 5);
  }, [activeSizes.length, businessProfileId, commercialSummary.weak, edges, entryReadinessById, extras, firstLowPremiumMetric, flavors.length, pizzaCategories.length, pizzaEntries.length, sizes.length]);
  const visibleAdaptiveRecommendations = useMemo(
    () => (evolutionModeEnabled
      ? adaptiveRecommendations
      : adaptiveRecommendations.filter((item) => item.severity !== 'opportunity')),
    [adaptiveRecommendations, evolutionModeEnabled]
  );
  const evolutionSummary = useMemo(() => {
    if (!evolutionDelta) {
      return {
        title: 'Acompanhando a evolucao da pizzaria',
        description: 'Quando a estrutura melhorar, o sistema mostra o que subiu e o que ficou mais forte.',
      };
    }

    const improvements = [];
    if (evolutionDelta.deltaStrong > 0) improvements.push(`+${evolutionDelta.deltaStrong} forte(s)`);
    if (evolutionDelta.deltaGood > 0) improvements.push(`+${evolutionDelta.deltaGood} boa(s)`);
    if (evolutionDelta.deltaWeak < 0) improvements.push(`${Math.abs(evolutionDelta.deltaWeak)} fraca(s) a menos`);

    return {
      title: 'Seu cardapio melhorou',
      description: improvements.length > 0
        ? `${improvements.join(' • ')} desde a ultima leitura.`
        : `O nivel mudou de ${evolutionDelta.previousLevel} para ${evolutionDelta.currentLevel}.`,
    };
  }, [evolutionDelta]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedProfile = window.localStorage.getItem(profileStorageKey);
    const savedMode = window.localStorage.getItem(evolutionModeStorageKey);
    if (savedProfile) {
      setBusinessProfileId(savedProfile);
      setSelectedTemplateId(getRecommendedPizzaTemplateId(savedProfile));
    }
    if (savedMode) {
      setEvolutionModeEnabled(savedMode === 'true');
    }
  }, [evolutionModeStorageKey, profileStorageKey]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(profileStorageKey, businessProfileId);
  }, [businessProfileId, profileStorageKey]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(evolutionModeStorageKey, String(evolutionModeEnabled));
  }, [evolutionModeEnabled, evolutionModeStorageKey]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const nextSnapshot = {
      strong: commercialSummary.strong,
      good: commercialSummary.good,
      regular: commercialSummary.regular,
      weak: commercialSummary.weak,
      level: commercialSummary.level,
      updatedAt: Date.now(),
    };

    try {
      const raw = window.localStorage.getItem(evolutionSnapshotStorageKey);
      if (raw) {
        const previousSnapshot = JSON.parse(raw);
        const deltaStrong = nextSnapshot.strong - Number(previousSnapshot?.strong || 0);
        const deltaWeak = nextSnapshot.weak - Number(previousSnapshot?.weak || 0);
        const deltaGood = nextSnapshot.good - Number(previousSnapshot?.good || 0);

        if (deltaStrong !== 0 || deltaWeak !== 0 || deltaGood !== 0 || nextSnapshot.level !== previousSnapshot?.level) {
          setEvolutionDelta({
            deltaStrong,
            deltaWeak,
            deltaGood,
            previousLevel: previousSnapshot?.level || 'REGULAR',
            currentLevel: nextSnapshot.level,
          });
        }
      }
      window.localStorage.setItem(evolutionSnapshotStorageKey, JSON.stringify(nextSnapshot));
    } catch (error) {
      console.error('Erro ao salvar snapshot evolutivo da pizzaria:', error);
    }
  }, [commercialSummary.good, commercialSummary.level, commercialSummary.strong, commercialSummary.weak, evolutionSnapshotStorageKey]);

  React.useEffect(() => {
    if (!previewEntries.length) return;
    setPreviewEntryId((current) => {
      if (current && previewEntries.some((entry) => String(entry.id) === String(current))) return current;
      return previewEntries[0].id;
    });
  }, [previewEntries]);

  React.useEffect(() => {
    setSelectedTemplateId((current) => current || recommendedTemplateId);
  }, [recommendedTemplateId]);

  React.useEffect(() => {
    if (!previewEntry) return;
    const firstSize = previewSizes[0]?.id || '';
    const allowedFlavorIds = Array.isArray(previewEntry?.pizza_config?.flavor_ids)
      ? previewEntry.pizza_config.flavor_ids
      : [];
    const firstFlavorId = previewEntry?.default_flavor_id || allowedFlavorIds[0] || '';
    setPreviewSizeId(firstSize);
    setPreviewFlavorIds(firstFlavorId ? [firstFlavorId] : []);
    setPreviewEdgeId('none');
    setPreviewExtraIds([]);
  }, [previewEntry, previewSizes]);

  // Mutations - Sizes
  const createSizeMutation = useMutation({
    mutationFn: (data) => apiClient.entities.PizzaSize.create({
      ...data,
      ...(entityOwnerEmail && { owner_email: entityOwnerEmail }),
      ...entityContextOpts
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaSizes'] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Tamanho criado!');
      setShowSizeModal(false);
      setEditingSize(null);
    },
  });

  const updateSizeMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.PizzaSize.update(id, data, entityContextOpts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaSizes'] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Tamanho atualizado!');
      setShowSizeModal(false);
      setEditingSize(null);
    },
  });

  const deleteSizeMutation = useMutation({
    mutationFn: (id) => apiClient.entities.PizzaSize.delete(id, entityContextOpts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaSizes'] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Tamanho excluÃ­do!');
    },
  });

  // Mutations - Flavors
  const createFlavorMutation = useMutation({
    mutationFn: (data) => apiClient.entities.PizzaFlavor.create({
      ...data,
      ...(entityOwnerEmail && { owner_email: entityOwnerEmail }),
      ...entityContextOpts
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaFlavors'] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Sabor criado!');
      setShowFlavorModal(false);
      setEditingFlavor(null);
    },
  });

  const updateFlavorMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.PizzaFlavor.update(id, data, entityContextOpts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaFlavors'] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Sabor atualizado!');
      setShowFlavorModal(false);
      setEditingFlavor(null);
    },
  });

  const deleteFlavorMutation = useMutation({
    mutationFn: (id) => apiClient.entities.PizzaFlavor.delete(id, entityContextOpts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaFlavors'] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Sabor excluÃ­do!');
    },
  });

  // Mutations - Edges
  const createEdgeMutation = useMutation({
    mutationFn: (data) => apiClient.entities.PizzaEdge.create({
      ...data,
      ...(entityOwnerEmail && { owner_email: entityOwnerEmail }),
      ...entityContextOpts
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaEdges'] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Borda criada!');
      setShowEdgeModal(false);
      setEditingEdge(null);
    },
  });

  const updateEdgeMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.PizzaEdge.update(id, data, entityContextOpts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaEdges'] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Borda atualizada!');
      setShowEdgeModal(false);
      setEditingEdge(null);
    },
  });

  const deleteEdgeMutation = useMutation({
    mutationFn: (id) => apiClient.entities.PizzaEdge.delete(id, entityContextOpts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaEdges'] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Borda excluÃ­da!');
    },
  });

  // Mutations - Extras
  const createExtraMutation = useMutation({
    mutationFn: (data) => apiClient.entities.PizzaExtra.create({
      ...data,
      ...(entityOwnerEmail && { owner_email: entityOwnerEmail }),
      ...entityContextOpts
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaExtras'] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Extra criado!');
      setShowExtraModal(false);
      setEditingExtra(null);
    },
  });

  const updateExtraMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.PizzaExtra.update(id, data, entityContextOpts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaExtras'] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Extra atualizado!');
      setShowExtraModal(false);
      setEditingExtra(null);
    },
  });

  const deleteExtraMutation = useMutation({
    mutationFn: (id) => apiClient.entities.PizzaExtra.delete(id, entityContextOpts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaExtras'] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Extra excluÃ­do!');
    },
  });

  // Mutations - Categorias
  const createCategoryMutation = useMutation({
    mutationFn: (data) => apiClient.entities.PizzaCategory.create({
      ...data,
      ...(entityOwnerEmail && { owner_email: entityOwnerEmail }),
      ...entityContextOpts
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaCategories'] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Categoria criada!');
      setShowCategoryModal(false);
      setEditingCategory(null);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.PizzaCategory.update(id, data, entityContextOpts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaCategories'] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Categoria atualizada!');
      setShowCategoryModal(false);
      setEditingCategory(null);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => apiClient.entities.PizzaCategory.delete(id, entityContextOpts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaCategories'] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Categoria excluÃ­da!');
    },
  });
  const invalidatePizzaConfigQueries = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pizzaSizes'] });
    queryClient.invalidateQueries({ queryKey: ['pizzaFlavors'] });
    queryClient.invalidateQueries({ queryKey: ['pizzaEdges'] });
    queryClient.invalidateQueries({ queryKey: ['pizzaExtras'] });
    queryClient.invalidateQueries({ queryKey: ['pizzaCategories'] });
    queryClient.invalidateQueries({ queryKey: ['dishes', ...getMenuContextQueryKeyParts(menuContext)] });
    if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
  }, [menuContext, queryClient, slug]);

  const applySafeUpdates = React.useCallback(async ({ sizes: nextSizes = [], flavors: nextFlavors = [], edges: nextEdges = [], extras: nextExtras = [] }) => {
    const requests = [
      ...nextSizes.map((size) => apiClient.entities.PizzaSize.update(size.id, size.data, entityContextOpts)),
      ...nextFlavors.map((flavor) => apiClient.entities.PizzaFlavor.update(flavor.id, flavor.data, entityContextOpts)),
      ...nextEdges.map((edge) => apiClient.entities.PizzaEdge.update(edge.id, edge.data, entityContextOpts)),
      ...nextExtras.map((extra) => apiClient.entities.PizzaExtra.update(extra.id, extra.data, entityContextOpts)),
    ];

    if (requests.length === 0) return false;

    await Promise.all(requests);
    invalidatePizzaConfigQueries();
    return true;
  }, [entityContextOpts, invalidatePizzaConfigQueries]);

  const openPizzaWorkspace = React.useCallback((target) => {
    switch (target) {
      case 'menu':
      case 'products':
        setActiveTab('menu');
        return;
      case 'rules':
      case 'flavors':
      case 'sizes':
      case 'addons':
      case 'organization':
        setActiveTab(['rules', 'flavors', 'sizes', 'addons'].includes(target) ? target : 'rules');
        return;
      case 'overview':
        setActiveTab('overview');
        return;
      case 'intelligence':
      case 'insights':
        setActiveTab('intelligence');
        return;
      case 'preview':
      case 'settings':
        setActiveTab('preview');
        return;
      default:
        setActiveTab('menu');
    }
  }, []);

  const handleAssistantAction = React.useCallback(async (actionId, options = {}) => {
    const { skipConfirm = false, silent = false, openPremiumEditor = true } = options;
    if (!canRunAdminActions) {
      toast('As acoes automaticas so ficam disponiveis no admin da loja.');
      return false;
    }

    try {
      setRunningAssistantActionId(actionId);

      if (actionId === 'recommended-sizes') {
        if (missingRecommendedSizes.length === 0) {
          if (!silent) toast('Os tamanhos recomendados ja estao ativos.');
          return false;
        }
        const accepted = skipConfirm ? true : window.confirm(
          `Vamos ativar ${missingRecommendedSizes.map((size) => size.name).join(', ')} para deixar a vitrine mais forte. Deseja continuar?`
        );
        if (!accepted) return false;

        const applied = await applySafeUpdates({
          sizes: missingRecommendedSizes.map((size) => ({
            id: size.id,
            data: { ...size, is_active: true },
          })),
        });
        if (applied) {
          if (!silent) toast.success('Tamanhos recomendados ativados.');
          openPizzaWorkspace('sizes');
        }
        return applied;
      }

      if (actionId === 'upsell-activation') {
        const edgeToActivate = inactiveEdges[0] || null;
        const extraToActivate = inactiveExtras[0] || null;
        if (!edgeToActivate && !extraToActivate) {
          if (!silent) toast('A estrutura de upsell ja esta pronta.');
          return false;
        }
        const accepted = skipConfirm ? true : window.confirm(
          `Vamos ligar ${edgeToActivate ? `borda ${edgeToActivate.name}` : 'a borda ja ativa'}${edgeToActivate && extraToActivate ? ' e ' : ''}${extraToActivate ? `adicional ${extraToActivate.name}` : ''}. Deseja continuar?`
        );
        if (!accepted) return false;

        const applied = await applySafeUpdates({
          edges: edgeToActivate ? [{ id: edgeToActivate.id, data: { ...edgeToActivate, is_active: true } }] : [],
          extras: extraToActivate ? [{ id: extraToActivate.id, data: { ...extraToActivate, is_active: true } }] : [],
        });
        if (applied) {
          if (!silent) toast.success('Upsell basico ativado.');
          openPizzaWorkspace('addons');
        }
        return applied;
      }

      if (actionId === 'premium-improvement') {
        let applied = false;
        if (inactivePremiumFlavors.length > 0) {
          const accepted = skipConfirm ? true : window.confirm(
            `Vamos ativar ${inactivePremiumFlavors.length} sabor(es) premium para reforcar ticket medio e, em seguida, abrir a matriz de precos. Deseja continuar?`
          );
          if (!accepted) return false;

          applied = await applySafeUpdates({
            flavors: inactivePremiumFlavors.map((flavor) => ({
              id: flavor.id,
              data: { ...flavor, is_active: true },
            })),
          });
          if (applied) {
            if (!silent) toast.success('Sabores premium ativados. Revise a escada de precos a seguir.');
          }
        }
        if (firstLowPremiumMetric) {
          const targetSize = sizes.find((size) => String(size.id) === String(firstLowPremiumMetric.id)) || null;
          openPizzaWorkspace('sizes');
          if (targetSize && openPremiumEditor) {
            setEditingSize(targetSize);
            setShowSizeModal(true);
            if (!silent) toast('Abrimos o tamanho mais sensivel para voce revisar a diferenca premium.');
          } else if (!silent) {
            toast('A matriz de precos foi destacada para voce revisar a diferenca premium.');
          }
        } else if (!applied) {
          openPizzaWorkspace('sizes');
        }
        return applied || Boolean(firstLowPremiumMetric);
      }
    } catch (error) {
      console.error('Erro ao aplicar assistente da pizzaria:', error);
      toast.error('Nao foi possivel aplicar a sugestao agora.');
      return false;
    } finally {
      setRunningAssistantActionId('');
    }

    return false;
  }, [applySafeUpdates, canRunAdminActions, firstLowPremiumMetric, inactiveEdges, inactiveExtras, inactivePremiumFlavors, missingRecommendedSizes, sizes]);

  const handleAutoImproveStructure = React.useCallback(async () => {
    if (!canRunAdminActions) {
      toast('A melhoria automatica so fica disponivel no admin da loja.');
      return;
    }
    if (!autoImprovePlan.canImprove) {
      toast('A estrutura global ja esta forte. Vale apenas revisar o preview final.');
      return;
    }

    const accepted = window.confirm(
      `Vamos melhorar a estrutura automaticamente.\n\nANTES:\n- ${autoImprovePlan.before.join('\n- ')}\n\nDEPOIS:\n- ${autoImprovePlan.after.join('\n- ')}\n\nDeseja continuar?`
    );
    if (!accepted) return;

    try {
      await handleAssistantAction('recommended-sizes', { skipConfirm: true, silent: true });
      await handleAssistantAction('upsell-activation', { skipConfirm: true, silent: true });
      await handleAssistantAction('premium-improvement', { skipConfirm: true, silent: true, openPremiumEditor: false });
      openPizzaWorkspace('preview');
      toast.success('Estrutura automatica aplicada. Revise o impacto no preview.');
    } catch (error) {
      console.error('Erro ao melhorar estrutura da pizzaria:', error);
      toast.error('Nao foi possivel aplicar a melhoria automatica agora.');
    }
  }, [autoImprovePlan, canRunAdminActions, handleAssistantAction]);
  const handleAdaptiveRecommendation = React.useCallback(async (recommendation) => {
    if (!recommendation) return;

    if (recommendation.action === 'menu') {
      openPizzaWorkspace('menu');
      toast('Levamos voce para as entradas do cardapio para agir no ponto certo.');
      return;
    }
    if (recommendation.action === 'sizes') {
      openPizzaWorkspace('sizes');
      toast('Abrimos a matriz de tamanhos para voce ajustar a decisao comercial.');
      return;
    }
    if (recommendation.action === 'premium-improvement') {
      await handleAssistantAction('premium-improvement');
      return;
    }
    if (recommendation.action === 'upsell-activation') {
      await handleAssistantAction('upsell-activation');
      return;
    }
    if (recommendation.action === 'recommended-sizes') {
      await handleAssistantAction('recommended-sizes');
      return;
    }
  }, [handleAssistantAction]);

  const handleTemplateAction = React.useCallback(async (templateId) => {
    setSelectedTemplateId(templateId);

    if (templateId === 'lean') {
      openPizzaWorkspace('menu');
      toast('Template enxuto selecionado. Foque em poucas entradas, leitura clara e baixa friccao.');
      return;
    }

    if (templateId === 'traditional') {
      await handleAssistantAction('recommended-sizes');
      return;
    }

    if (templateId === 'delivery') {
      await handleAssistantAction('recommended-sizes');
      await handleAssistantAction('upsell-activation');
      openPizzaWorkspace('preview');
      return;
    }

    if (templateId === 'premium') {
      await handleAssistantAction('premium-improvement');
      return;
    }

    if (templateId === 'upsell') {
      await handleAssistantAction('upsell-activation');
      openPizzaWorkspace('preview');
    }
  }, [handleAssistantAction, openPizzaWorkspace]);
  const handleBusinessProfileChange = React.useCallback((profileId) => {
    setBusinessProfileId(profileId);
    setSelectedTemplateId(getRecommendedPizzaTemplateId(profileId));
  }, []);

  const togglePreviewFlavor = (flavorId) => {
    const normalizedId = String(flavorId);
    const currentIds = previewFlavorIds.map(String);
    const alreadySelected = currentIds.includes(normalizedId);

    if (previewMaxFlavors <= 1) {
      setPreviewFlavorIds(alreadySelected ? [] : [flavorId]);
      return;
    }

    if (alreadySelected) {
      setPreviewFlavorIds(previewFlavorIds.filter((id) => String(id) !== normalizedId));
      return;
    }

    if (previewFlavorIds.length >= previewMaxFlavors) return;
    setPreviewFlavorIds([...previewFlavorIds, flavorId]);
  };

  const togglePreviewExtra = (extraId) => {
    const normalizedId = String(extraId);
    setPreviewExtraIds((current) =>
      current.map(String).includes(normalizedId)
        ? current.filter((id) => String(id) !== normalizedId)
        : [...current, extraId]
    );
  };

  const activeMainSection = useMemo(
    () => PIZZA_SECTION_NAV_ITEMS.find((section) => section.sections.includes(activeTab))?.id || 'products',
    [activeTab]
  );
  const activeSubsections = PIZZA_SUBSECTION_NAV[activeMainSection] || [];

  return (
    <div className="p-4 sm:p-5 lg:p-6">
      <Toaster position="top-center" />

      <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:mb-6 sm:p-6">
        <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">Pizzaria IA V2</Badge>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Produtos primeiro, inteligencia por tras</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          A entrada agora comeca pelas pizzas que voce vende. Organizacao, regras, preview e inteligencia continuam aqui,
          mas sem bloquear a operacao de quem entrou para editar produto rapido.
        </p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="sticky top-2 z-20 -mx-1 rounded-3xl bg-slate-100/80 px-1 py-1 backdrop-blur sm:top-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="-mx-2 overflow-x-auto px-2 md:hidden">
              <div className="flex w-max gap-2 pb-1">
                {PIZZA_SECTION_NAV_ITEMS.map((section) => {
                  const active = activeMainSection === section.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => openPizzaWorkspace(section.defaultSection)}
                      className={`rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                        active
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {section.mobileLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="hidden flex-wrap gap-2 md:flex">
              {PIZZA_SECTION_NAV_ITEMS.map((section) => {
                const active = activeMainSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => openPizzaWorkspace(section.defaultSection)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                      active
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {section.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {activeSubsections.length > 0 ? (
          <div className="-mt-3 flex flex-wrap gap-2">
            {activeSubsections.map((section) => {
              const active = activeTab === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveTab(section.id)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                    active
                      ? 'border-orange-300 bg-orange-50 text-orange-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="hidden sm:inline">{section.label}</span>
                  <span className="sm:hidden">{section.mobileLabel || section.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <TabsContent value="overview" className="space-y-4">
          <PizzaOverviewPanel
            profiles={PIZZA_BUSINESS_PROFILES}
            businessProfile={businessProfile}
            businessProfileId={businessProfileId}
            onBusinessProfileChange={handleBusinessProfileChange}
            pizzaTemplateCards={pizzaTemplateCards}
            recommendedTemplateId={recommendedTemplateId}
            commercialSummaryPresentation={commercialSummaryPresentation}
            commercialSummary={commercialSummary}
            evolutionModeEnabled={evolutionModeEnabled}
            onEvolutionModeChange={setEvolutionModeEnabled}
            evolutionSummary={evolutionSummary}
            canRunAdminActions={canRunAdminActions}
            autoImprovePlan={autoImprovePlan}
            onAutoImproveStructure={handleAutoImproveStructure}
            onOpenInsights={() => openPizzaWorkspace('intelligence')}
            onOpenPreview={() => openPizzaWorkspace('preview')}
            onOpenMenu={() => openPizzaWorkspace('menu')}
            pizzaGuideSteps={pizzaGuideStepCards}
          />
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-4">
          <PizzaInsightsPanel
            businessProfile={businessProfile}
            visibleAdaptiveRecommendations={visibleAdaptiveRecommendations}
            onAdaptiveRecommendation={handleAdaptiveRecommendation}
            pizzaGuidanceCards={pizzaGuidanceCards}
            autoImprovePlan={autoImprovePlan}
            onAutoImproveStructure={handleAutoImproveStructure}
            canRunAdminActions={canRunAdminActions}
            pizzaTemplateCards={pizzaTemplateCards.map((template) => ({
              ...template,
              recommended: recommendedTemplateId === template.id,
            }))}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplateId={setSelectedTemplateId}
            onTemplateAction={handleTemplateAction}
            assistantActions={assistantActions}
            runningAssistantActionId={runningAssistantActionId}
            onAssistantAction={handleAssistantAction}
          />
        </TabsContent>

        <TabsContent value="menu" className="space-y-4">
          <Card className="rounded-2xl border-slate-200 p-5 shadow-sm">
            <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">Entrada do cardapio</Badge>
            <h3 className="mt-3 text-xl font-semibold text-slate-900">O que o cliente realmente enxerga para pedir pizza</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Esta aba concentra as entradas comerciais do cardapio. E aqui que voce decide nome publico, preco inicial e qual regra de montagem cada entrada usa.
            </p>
          </Card>
          <MyPizzasTab businessProfileId={businessProfileId} />
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card className="rounded-2xl border-slate-200 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">Regra de montagem</Badge>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">Como cada entrada e montada no builder</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Aqui voce controla tamanho base e quantos sabores o cliente pode combinar.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="relative min-w-[260px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar regra ou tamanho..." className="pl-9" />
                </div>
                <Button onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }} className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="mr-2 h-4 w-4" />Nova regra
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            {sortedPizzaCategories.filter((category) => matchesSearch(category)).map((category) => {
              const size = sizes.find((item) => item.id === category.size_id);
              const entryCount = entryCountByPizzaCategoryId[String(category.id)] || 0;
              const index = sortedPizzaCategories.findIndex((item) => item.id === category.id);
              const moveCategory = (direction) => {
                const targetIndex = direction === 'up' ? index - 1 : index + 1;
                if (targetIndex < 0 || targetIndex >= sortedPizzaCategories.length) return;
                const current = sortedPizzaCategories[index];
                const target = sortedPizzaCategories[targetIndex];
                updateCategoryMutation.mutate({ id: current.id, data: { ...current, order: targetIndex } });
                updateCategoryMutation.mutate({ id: target.id, data: { ...target, order: index } });
              };

              return (
                <Card key={category.id} className="rounded-2xl border-slate-200 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Regra-base</Badge>
                      <h4 className="mt-3 text-lg font-semibold text-slate-900">{category.name || 'Regra sem nome'}</h4>
                      <p className="mt-1 text-sm text-slate-600">
                        {size ? `${size.name} • ${size.slices} fatias` : 'Sem tamanho'} • {category.max_flavors || 1} sabor(es)
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => moveCategory('up')} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => moveCategory('down')} disabled={index === sortedPizzaCategories.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setEditingCategory(category); setShowCategoryModal(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => { if (confirm('Excluir esta regra?')) deleteCategoryMutation.mutate(category.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="secondary">{entryCount} entrada(s)</Badge>
                    <Badge variant="outline">{size ? `A partir de ${formatCurrency(size.price_tradicional || size.price_premium)}` : 'Sem preco'}</Badge>
                    <Badge variant="outline">{formatFlavorAllowance(category.max_flavors)}</Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="flavors" className="space-y-4">
          <Card className="rounded-2xl border-slate-200 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Catalogo de sabores</Badge>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">Banco de sabores da pizzaria</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Sabores sao base tecnica do builder, nao entradas do cardapio.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="relative min-w-[260px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar sabor..." className="pl-9" />
                </div>
                <Button onClick={() => { setEditingFlavor(null); setShowFlavorModal(true); }} className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="mr-2 h-4 w-4" />Novo sabor
                </Button>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            {filteredFlavors.map((flavor) => {
              const usageCount = flavorUsageById[String(flavor.id)] || 0;
              return (
                <Card key={flavor.id} className="rounded-2xl border-slate-200 p-5 shadow-sm">
                  <div className="flex gap-4">
                    {flavor.image ? <img src={flavor.image} alt={flavor.name} className="h-20 w-20 rounded-xl object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-500">Sem foto</div>}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-lg font-semibold text-slate-900">{flavor.name}</h4>
                          <p className="mt-1 text-sm text-slate-600">{flavor.description || 'Sem descricao cadastrada.'}</p>
                        </div>
                        <Switch checked={flavor.is_active} onCheckedChange={(checked) => updateFlavorMutation.mutate({ id: flavor.id, data: { ...flavor, is_active: checked } })} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant={flavor.category === 'premium' ? 'default' : 'secondary'} className={flavor.category === 'premium' ? 'bg-amber-500 hover:bg-amber-500' : ''}>
                          {flavor.category === 'premium' ? 'Sabor premium' : 'Sabor tradicional'}
                        </Badge>
                        <Badge variant="outline">{usageCount} entrada(s)</Badge>
                        {flavor.prep_time ? <Badge variant="outline">{flavor.prep_time} min</Badge> : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(flavorEntriesById[String(flavor.id)] || []).slice(0, 3).map((entryName) => (
                          <Badge key={entryName} variant="outline" className="bg-white text-[11px] text-slate-600">
                            {entryName}
                          </Badge>
                        ))}
                        {usageCount > 3 ? (
                          <Badge variant="outline" className="bg-white text-[11px] text-slate-600">
                            +{usageCount - 3} entrada(s)
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setEditingFlavor(flavor); setShowFlavorModal(true); }}><Pencil className="mr-2 h-4 w-4" />Editar</Button>
                        <Button variant="outline" size="sm" className="text-red-500" onClick={() => { if (confirm('Excluir este sabor?')) deleteFlavorMutation.mutate(flavor.id); }}><Trash2 className="mr-2 h-4 w-4" />Excluir</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="sizes" className="space-y-4">
          <Card className="rounded-2xl border-slate-200 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">Tamanhos e precos</Badge>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">Tabela base de tamanhos e preco inicial</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Cada linha mostra tamanho, fatias, limite de sabores e valor base.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="relative min-w-[260px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar tamanho..." className="pl-9" />
                </div>
                <Button onClick={() => { setEditingSize(null); setShowSizeModal(true); }} className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="mr-2 h-4 w-4" />Novo tamanho
                </Button>
              </div>
            </div>
          </Card>

          {pricingInsights.highlights.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-3">
              {pricingInsights.highlights.map((highlight) => {
                const toneClass = highlight.tone === 'emerald'
                  ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700'
                  : highlight.tone === 'orange'
                    ? 'border-orange-200 bg-orange-50/80 text-orange-700'
                    : 'border-slate-200 bg-slate-50/80 text-slate-700';

                return (
                  <Card key={highlight.label} className={`rounded-2xl p-4 shadow-sm ${toneClass}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">{highlight.label}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{highlight.title}</p>
                    <p className="mt-1 text-sm text-slate-700">{highlight.description}</p>
                  </Card>
                );
              })}
            </div>
          ) : null}

          {pricingInsights.alerts.length > 0 ? (
            <div className="grid gap-3">
              {pricingInsights.alerts.map((alert) => {
                const toneClass = alert.tone === 'amber'
                  ? 'border-amber-200 bg-amber-50/80'
                  : alert.tone === 'sky'
                    ? 'border-sky-200 bg-sky-50/80'
                    : 'border-violet-200 bg-violet-50/80';

                return (
                  <Card key={alert.title} className={`rounded-2xl p-4 shadow-sm ${toneClass}`}>
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="bg-white">Insight comercial</Badge>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{alert.description}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : null}

          <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Tamanho</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Fatias</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Max. sabores</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Tradicional</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Premium</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Dif. premium</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Preco/fatia</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Leitura comercial</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-500">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredSizes.map((size, index) => (
                    <tr key={size.id}>
                      {(() => {
                        const sizeInsight = pricingInsights.metricsById[String(size.id)];
                        return (
                          <>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-slate-900">{size.name}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {index === 0 ? <Badge variant="outline" className="text-[11px]">Essencial</Badge> : null}
                            {(Number(size.max_flavors) || 1) >= 2 ? <Badge variant="secondary" className="text-[11px]">Recomendado</Badge> : null}
                            {(Number(size.price_premium) || 0) > (Number(size.price_tradicional) || 0) ? <Badge variant="outline" className="text-[11px]">Premium</Badge> : null}
                            {(sizeInsight?.badges || []).slice(0, 2).map((badge) => (
                              <Badge key={badge} variant="outline" className="text-[11px]">
                                {badge}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{size.slices || '-'}</td>
                      <td className="px-4 py-4 text-slate-600">{size.max_flavors || 1}</td>
                      <td className="px-4 py-4 font-medium text-slate-900">{formatCurrency(size.price_tradicional)}</td>
                      <td className="px-4 py-4 font-medium text-slate-900">{formatCurrency(size.price_premium)}</td>
                      <td className="px-4 py-4 text-slate-600">
                        {sizeInsight?.premiumDelta > 0 ? `+${formatCurrency(sizeInsight.premiumDelta)}` : '-'}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        <div>
                          <p>{formatPricePerSlice(size.price_tradicional, size.slices)}</p>
                          {(Number(size.price_premium) || 0) > 0 ? (
                            <p className="mt-1 text-xs text-slate-500">Premium {formatPricePerSlice(size.price_premium, size.slices)}</p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <Badge variant="outline" className="text-[11px]">
                            {sizeInsight?.classification || 'Sem leitura'}
                          </Badge>
                          <p className="text-xs text-slate-500">
                            {(sizeInsight?.maxFlavors || Number(size.max_flavors) || 1) >= 2
                              ? 'Boa leitura para 2 sabores'
                              : 'Entrada enxuta para 1 sabor'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4"><Badge variant={size.is_active ? 'secondary' : 'outline'}>{size.is_active ? 'Ativo' : 'Inativo'}</Badge></td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Switch checked={size.is_active} onCheckedChange={(checked) => updateSizeMutation.mutate({ id: size.id, data: { ...size, is_active: checked } })} />
                          <Button variant="ghost" size="icon" onClick={() => { setEditingSize(size); setShowSizeModal(true); }}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => { if (confirm('Excluir este tamanho?')) deleteSizeMutation.mutate(size.id); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                          </>
                        );
                      })()}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="addons" className="space-y-4">
          <Card className="rounded-2xl border-slate-200 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">Bordas e extras</Badge>
                <h3 className="mt-3 text-xl font-semibold text-slate-900">Adicionais da pizzaria</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Bordas e extras ficam separados dos sabores para reforcar a leitura comercial.</p>
              </div>
              <div className="relative min-w-[260px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar borda ou extra..." className="pl-9" />
              </div>
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="rounded-2xl border-slate-200 p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-900">Bordas</h4>
                <Button size="sm" onClick={() => { setEditingEdge(null); setShowEdgeModal(true); }} className="bg-orange-500 hover:bg-orange-600"><Plus className="mr-2 h-4 w-4" />Nova borda</Button>
              </div>
              <div className="space-y-3">
                {filteredEdges.map((edge) => (
                  <div key={edge.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{edge.name}</p>
                      <p className="text-sm text-slate-600">{formatCurrency(edge.price)}</p>
                    </div>
                    <Switch checked={edge.is_active} onCheckedChange={(checked) => updateEdgeMutation.mutate({ id: edge.id, data: { ...edge, is_active: checked } })} />
                    <Button variant="ghost" size="icon" onClick={() => { setEditingEdge(edge); setShowEdgeModal(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => { if (confirm('Excluir esta borda?')) deleteEdgeMutation.mutate(edge.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="rounded-2xl border-slate-200 p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-900">Extras</h4>
                <Button size="sm" onClick={() => { setEditingExtra(null); setShowExtraModal(true); }} className="bg-orange-500 hover:bg-orange-600"><Plus className="mr-2 h-4 w-4" />Novo extra</Button>
              </div>
              <div className="space-y-3">
                {filteredExtras.map((extra) => (
                  <div key={extra.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{extra.name}</p>
                      <p className="text-sm text-slate-600">{formatCurrency(extra.price)}</p>
                    </div>
                    <Switch checked={extra.is_active} onCheckedChange={(checked) => updateExtraMutation.mutate({ id: extra.id, data: { ...extra, is_active: checked } })} />
                    <Button variant="ghost" size="icon" onClick={() => { setEditingExtra(extra); setShowExtraModal(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => { if (confirm('Excluir este extra?')) deleteExtraMutation.mutate(extra.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="preview" className="space-y-4">
          <Card className="rounded-2xl border-slate-200 p-5 shadow-sm">
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Aparicao publica</Badge>
            <h3 className="mt-3 text-xl font-semibold text-slate-900">Como o cliente percebe a pizzaria</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Este resumo ajuda a conferir se a parte comercial, a regra de montagem e o catalogo tecnico continuam coerentes no builder publico.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">1. O que voce vende</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">Escolha a entrada comercial e confira como ela conversa com regra, tamanho e preco.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">2. Como o cliente monta</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">Simule tamanho, sabores, borda e adicionais sem sair do admin.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">3. Qual valor ele percebe</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">O preco muda em tempo real para mostrar a experiencia comercial do builder.</p>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
            <div className="space-y-4">
              <Card className="rounded-2xl border-slate-200 p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">Preview interativo</Badge>
                    <h4 className="mt-3 text-lg font-semibold text-slate-900">Simule a montagem como se fosse o cliente</h4>
                    <p className="mt-1 text-sm text-slate-600">Escolha entrada, tamanho, sabores e adicionais. O valor muda na hora.</p>
                  </div>
                  <Badge variant="secondary" className="w-fit">{previewEntries.length} entrada(s) ativa(s)</Badge>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {previewEntries.map((entry) => {
                    const category = pizzaCategories.find((item) => item.id === entry.pizza_category_id);
                    const entrySizes = Array.isArray(entry?.pizza_config?.sizes) ? entry.pizza_config.sizes : [];
                    const firstSize = sizes.find((item) => item.id === category?.size_id) || entrySizes[0];
                    const startingPrice = Number(firstSize?.price_tradicional || firstSize?.price_premium || entry.price || 0);
                    const active = String(previewEntry?.id) === String(entry.id);
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setPreviewEntryId(entry.id)}
                        className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                          active
                            ? 'border-orange-300 bg-orange-50 shadow-sm ring-2 ring-orange-100'
                            : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{entry.name}</p>
                            <p className="mt-1 text-xs text-slate-600">{category?.name || 'Sem regra vinculada'}</p>
                          </div>
                          <Badge variant={active ? 'default' : 'outline'} className={active ? 'bg-orange-500 hover:bg-orange-500' : ''}>
                            {formatCurrency(startingPrice)}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <Badge variant="secondary">{formatFlavorAllowance(category?.max_flavors)}</Badge>
                          <Badge variant="outline">{entrySizes.length || 1} tamanho(s)</Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {previewEntry ? (
                  <div className="mt-6 space-y-5">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Regra</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{formatFlavorAllowance(previewMaxFlavors)}</p>
                        <p className="mt-1 text-xs text-slate-600">{previewCategory?.name || 'Regra comercial nao definida'}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Sabores liberados</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {previewFlavorOptions.length > 0 ? `${previewFlavorOptions.length} opcao(oes)` : 'Sem sabores'}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {previewFlavorOptions.some((flavor) => flavor.category === 'premium')
                            ? 'Tradicional e premium liberados'
                            : 'Somente tradicionais ativos'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Montagem</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant={previewEdges.length > 0 ? 'secondary' : 'outline'}>{previewEdges.length > 0 ? 'Borda liberada' : 'Sem borda'}</Badge>
                          <Badge variant={previewExtras.length > 0 ? 'secondary' : 'outline'}>{previewExtras.length > 0 ? 'Adicionais liberados' : 'Sem adicionais'}</Badge>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Preco atual</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{formatCurrency(previewPrice)}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {previewHasPremium ? 'Preco premium aplicado' : 'Preco tradicional aplicado'}
                        </p>
                        {previewSizeInsight?.classification ? (
                          <Badge variant="outline" className="mt-3 text-[11px]">
                            {previewSizeInsight.classification}
                          </Badge>
                        ) : null}
                        <div className="mt-4 grid gap-2">
                          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ticket base</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(previewTicketSimulation.baseTicket)}</p>
                          </div>
                          <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Com premium</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(previewTicketSimulation.premiumTicket)}</p>
                            <p className="mt-1 text-xs text-slate-600">
                              {previewTicketSimulation.premiumLift > 0
                                ? `Premium eleva ${formatCurrency(previewTicketSimulation.premiumLift)}`
                                : 'Sem ganho premium nesta combinacao'}
                            </p>
                          </div>
                          <div className="rounded-xl border border-violet-200 bg-violet-50/70 px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Com upsell</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(previewTicketSimulation.upsellTicket)}</p>
                            <p className="mt-1 text-xs text-slate-600">
                              {previewTicketSimulation.upsellLift > 0
                                ? `Borda e adicionais somam ${formatCurrency(previewTicketSimulation.upsellLift)}`
                                : 'Sem impacto de upsell nesta simulacao'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5 rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">1. Tamanho escolhido</p>
                            <p className="mt-1 text-xs text-slate-600">Defina qual tamanho o cliente seleciona no builder.</p>
                          </div>
                          {previewSelectedSize ? (
                            <Badge variant="outline">{previewSelectedSize.slices || '-'} fatias</Badge>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {previewSizes.map((size) => {
                            const active = String(previewSelectedSize?.id) === String(size.id);
                            const currentPrice = Number(previewHasPremium ? size.price_premium : size.price_tradicional) || 0;
                            return (
                              <button
                                key={size.id}
                                type="button"
                                onClick={() => setPreviewSizeId(size.id)}
                                className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                                  active
                                    ? 'border-orange-300 bg-white shadow-sm ring-2 ring-orange-100'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <p className="text-sm font-semibold text-slate-900">{size.name}</p>
                                <p className="mt-1 text-xs text-slate-600">
                                  {size.max_flavors || previewMaxFlavors} sabor(es) • {formatCurrency(currentPrice)}
                                </p>
                                <p className="mt-1 text-[11px] text-slate-500">
                                  {formatPricePerSlice(currentPrice, size.slices)} por fatia
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">2. Sabores da montagem</p>
                            <p className="mt-1 text-xs text-slate-600">Escolha ate {previewMaxFlavors} sabor(es) para sentir a experiencia do cliente.</p>
                          </div>
                          <Badge variant="outline">{previewSelectedFlavors.length}/{previewMaxFlavors}</Badge>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {previewFlavorOptions.map((flavor) => {
                            const active = previewFlavorIds.map(String).includes(String(flavor.id));
                            const usageCount = flavorUsageById[String(flavor.id)] || 0;
                            return (
                              <button
                                key={flavor.id}
                                type="button"
                                onClick={() => togglePreviewFlavor(flavor.id)}
                                className={`rounded-2xl border p-4 text-left transition-all ${
                                  active
                                    ? 'border-orange-300 bg-white shadow-sm ring-2 ring-orange-100'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-slate-900">{flavor.name}</p>
                                    <p className="mt-1 text-xs text-slate-600">{flavor.description || 'Sem descricao cadastrada.'}</p>
                                  </div>
                                  <Badge variant={flavor.category === 'premium' ? 'default' : 'secondary'} className={flavor.category === 'premium' ? 'bg-amber-500 hover:bg-amber-500' : ''}>
                                    {flavor.category === 'premium' ? 'Premium' : 'Tradicional'}
                                  </Badge>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                  <Badge variant="outline">{usageCount} entrada(s)</Badge>
                                  {active ? <Badge variant="secondary">Selecionado</Badge> : null}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {previewEdges.length > 0 ? (
                        <div>
                          <p className="text-sm font-semibold text-slate-900">3. Borda</p>
                          <p className="mt-1 text-xs text-slate-600">Confirme como a borda aparece no builder.</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewEdgeId('none')}
                              className={`rounded-full border px-3 py-2 text-sm transition-all ${
                                previewEdgeId === 'none'
                                  ? 'border-orange-300 bg-white shadow-sm ring-2 ring-orange-100'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              Sem borda
                            </button>
                            {previewEdges.map((edge) => (
                              <button
                                key={edge.id}
                                type="button"
                                onClick={() => setPreviewEdgeId(edge.id)}
                                className={`rounded-full border px-3 py-2 text-sm transition-all ${
                                  String(previewSelectedEdge?.id) === String(edge.id)
                                    ? 'border-orange-300 bg-white shadow-sm ring-2 ring-orange-100'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                {edge.name} • {formatCurrency(edge.price)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {previewExtras.length > 0 ? (
                        <div>
                          <p className="text-sm font-semibold text-slate-900">4. Adicionais</p>
                          <p className="mt-1 text-xs text-slate-600">Veja como adicionais premium mudam o valor final.</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {previewExtras.map((extra) => {
                              const active = previewExtraIds.map(String).includes(String(extra.id));
                              return (
                                <button
                                  key={extra.id}
                                  type="button"
                                  onClick={() => togglePreviewExtra(extra.id)}
                                  className={`rounded-full border px-3 py-2 text-sm transition-all ${
                                    active
                                      ? 'border-orange-300 bg-white shadow-sm ring-2 ring-orange-100'
                                      : 'border-slate-200 bg-white hover:border-slate-300'
                                  }`}
                                >
                                  {extra.name} • {formatCurrency(extra.price)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <p className="font-medium text-slate-900">Ative pelo menos uma entrada de pizza para usar o preview.</p>
                    <p className="mt-2 text-sm text-slate-600">O simulador aparece automaticamente quando houver uma entrada publica ativa.</p>
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="rounded-3xl border-slate-200 p-6 shadow-sm">
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">Cliente montando</Badge>
                <h4 className="mt-3 text-lg font-semibold text-slate-900">Leitura comercial do builder</h4>
                <p className="mt-1 text-sm leading-6 text-slate-600">Este quadro traduz a configuracao tecnica para a linguagem que importa no cardapio.</p>

                {previewEntry ? (
                  <div className="mt-5 rounded-[28px] border border-slate-200 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-inner">
                    <div className="rounded-[24px] bg-white/8 p-5 backdrop-blur">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-200">Entrada do cardapio</p>
                          <h5 className="mt-2 text-2xl font-semibold">{previewEntry.name}</h5>
                          <p className="mt-2 text-sm text-slate-200">
                            {previewCategory?.name || 'Sem regra'} • {previewSelectedSize?.name || 'Escolha um tamanho'}
                          </p>
                        </div>
                        <Badge className="bg-orange-500 text-white hover:bg-orange-500">{formatCurrency(previewPrice)}</Badge>
                      </div>

                      <div className="mt-5 space-y-4">
                        <div className="rounded-2xl bg-white/10 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Como o cliente entende</p>
                          <ul className="mt-3 space-y-2 text-sm text-slate-100">
                            <li>• {formatFlavorAllowance(previewMaxFlavors)}</li>
                            <li>• {previewSelectedSize ? `${previewSelectedSize.name} com ${previewSelectedSize.slices || '-'} fatias` : 'Escolha um tamanho para ver o resumo'}</li>
                            <li>• {previewHasPremium ? 'Com sabor premium na composicao' : 'Somente sabores tradicionais selecionados'}</li>
                            <li>• {previewSelectedEdge ? `Borda ${previewSelectedEdge.name}` : 'Sem borda selecionada'}</li>
                          </ul>
                        </div>

                        <div className="rounded-2xl bg-white/10 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Checklist de prontidao comercial</p>
                          <div className="mt-3 space-y-2">
                            {previewCommercialChecklist.map((check) => (
                              <div key={check.label} className="flex items-center justify-between gap-3 rounded-xl bg-white/8 px-3 py-2 text-sm">
                                <span className="text-slate-100">{check.label}</span>
                                <Badge
                                  variant="outline"
                                  className={check.done
                                    ? 'border-emerald-300 bg-emerald-500/10 text-emerald-100'
                                    : (check.optional ? 'border-slate-400 bg-white/5 text-slate-200' : 'border-rose-300 bg-rose-500/10 text-rose-100')}
                                >
                                  {check.done ? 'OK' : (check.optional ? 'Opcional' : 'Ajustar')}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-white/10 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Insight comercial</p>
                              <p className="mt-2 text-sm font-semibold text-white">{previewCommercialInsights.potentialLabel}</p>
                            </div>
                            <Badge className="bg-white/15 text-white hover:bg-white/15">
                              {previewSizeInsight?.classification || 'Leitura viva'}
                            </Badge>
                          </div>
                          <div className="mt-3 space-y-2">
                            {previewCommercialInsights.insights.map((insight) => (
                              <div key={insight} className="rounded-xl bg-white/8 px-3 py-2 text-sm text-slate-100">
                                {insight}
                              </div>
                            ))}
                            <div className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                              Ticket base {formatCurrency(previewTicketSimulation.baseTicket)} • premium {formatCurrency(previewTicketSimulation.premiumTicket)} • com upsell {formatCurrency(previewTicketSimulation.upsellTicket)}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-white/10 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Sabores escolhidos</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {previewSelectedFlavors.length > 0 ? previewSelectedFlavors.map((flavor) => (
                              <Badge
                                key={flavor.id}
                                className={flavor.category === 'premium' ? 'bg-amber-500 text-white hover:bg-amber-500' : 'bg-white/20 text-white hover:bg-white/20'}
                              >
                                {flavor.name}
                              </Badge>
                            )) : (
                              <span className="text-sm text-slate-300">Selecione pelo menos um sabor para completar a simulacao.</span>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl bg-white/10 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Borda</p>
                            <p className="mt-2 text-sm font-medium text-white">
                              {previewSelectedEdge ? `${previewSelectedEdge.name} • ${formatCurrency(previewSelectedEdge.price)}` : 'Sem borda'}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-white/10 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Adicionais</p>
                            <p className="mt-2 text-sm font-medium text-white">
                              {previewSelectedExtras.length > 0
                                ? `${previewSelectedExtras.length} item(ns) • ${formatCurrency(previewSelectedExtras.reduce((sum, extra) => sum + (Number(extra?.price) || 0), 0))}`
                                : 'Nenhum adicional'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <p className="font-medium text-slate-900">Sem entrada ativa para simular.</p>
                    <p className="mt-2 text-sm text-slate-600">Ative uma entrada do cardapio para ver o preview premium.</p>
                  </div>
                )}
              </Card>

              <Card className="rounded-2xl border-slate-200 p-5 shadow-sm">
                <h4 className="text-lg font-semibold text-slate-900">Builder publico</h4>
                <p className="mt-1 text-sm text-slate-600">A logica do builder foi preservada. Aqui voce revisa a apresentacao publica enquanto monta a visao comercial.</p>
                <div className="mt-4">
                  <PizzaVisualizationSettings />
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <SizeModal
        isOpen={showSizeModal}
        onClose={() => {
          setShowSizeModal(false);
          setEditingSize(null);
        }}
        onSubmit={(data) => {
          if (editingSize) {
            updateSizeMutation.mutate({ id: editingSize.id, data });
          } else {
            createSizeMutation.mutate({ ...data, order: sizes.length });
          }
        }}
        size={editingSize}
      />

      <FlavorModal
        isOpen={showFlavorModal}
        onClose={() => {
          setShowFlavorModal(false);
          setEditingFlavor(null);
        }}
        onSubmit={(data) => {
          if (editingFlavor) {
            updateFlavorMutation.mutate({ id: editingFlavor.id, data });
          } else {
            createFlavorMutation.mutate({ ...data, order: flavors.length });
          }
        }}
        flavor={editingFlavor}
      />

      <EdgeModal
        isOpen={showEdgeModal}
        onClose={() => {
          setShowEdgeModal(false);
          setEditingEdge(null);
        }}
        onSubmit={(data) => {
          if (editingEdge) {
            updateEdgeMutation.mutate({ id: editingEdge.id, data });
          } else {
            createEdgeMutation.mutate({ ...data, order: edges.length });
          }
        }}
        edge={editingEdge}
      />

      <ExtraModal
        isOpen={showExtraModal}
        onClose={() => {
          setShowExtraModal(false);
          setEditingExtra(null);
        }}
        onSubmit={(data) => {
          if (editingExtra) {
            updateExtraMutation.mutate({ id: editingExtra.id, data });
          } else {
            createExtraMutation.mutate({ ...data, order: extras.length });
          }
        }}
        extra={editingExtra}
      />

      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setEditingCategory(null);
        }}
        onSubmit={(data) => {
          if (editingCategory) {
            updateCategoryMutation.mutate({ id: editingCategory.id, data });
          } else {
            createCategoryMutation.mutate({ ...data, order: pizzaCategories.length });
          }
        }}
        category={editingCategory}
        sizes={sizes}
      />
    </div>
  );
}

function SizeModal({ isOpen, onClose, onSubmit, size }) {
  const [formData, setFormData] = useState({
    name: '',
    slices: '',
    max_flavors: '',
    max_extras: '3',
    diameter_cm: '',
    price_tradicional: '',
    price_premium: '',
    is_active: true
  });

  React.useEffect(() => {
    if (size) {
      setFormData({
        name: size.name || '',
        slices: size.slices?.toString() || '',
        max_flavors: size.max_flavors?.toString() || '',
        max_extras: size.max_extras?.toString() || '3',
        diameter_cm: size.diameter_cm?.toString() || '',
        price_tradicional: size.price_tradicional?.toString() || '',
        price_premium: size.price_premium?.toString() || '',
        is_active: size.is_active !== false
      });
    } else {
      setFormData({
        name: '', slices: '', max_flavors: '', max_extras: '3', diameter_cm: '',
        price_tradicional: '', price_premium: '', is_active: true
      });
    }
  }, [size, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      slices: parseInt(formData.slices),
      max_flavors: parseInt(formData.max_flavors),
      max_extras: parseInt(formData.max_extras) || 3,
      diameter_cm: parseFloat(formData.diameter_cm),
      price_tradicional: parseFloat(formData.price_tradicional),
      price_premium: parseFloat(formData.price_premium)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>{size ? 'Editar' : 'Novo'} Tamanho</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Pequena, MÃ©dia, Grande"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fatias *</Label>
              <Input
                type="number"
                value={formData.slices}
                onChange={(e) => setFormData(prev => ({ ...prev, slices: e.target.value }))}
                placeholder="Ex: 4"
                required
              />
            </div>
            <div>
              <Label>MÃ¡x. Sabores (1-4) *</Label>
              <Input
                type="number"
                min={1}
                max={4}
                value={formData.max_flavors}
                onChange={(e) => setFormData(prev => ({ ...prev, max_flavors: e.target.value }))}
                placeholder="Ex: 2"
                required
              />
            </div>
          </div>
          <div>
            <Label>MÃ¡x. Extras</Label>
            <Input
              type="number"
              min={0}
              max={10}
              value={formData.max_extras}
              onChange={(e) => setFormData(prev => ({ ...prev, max_extras: e.target.value }))}
              placeholder="Ex: 3"
            />
          </div>
          <div>
            <Label>DiÃ¢metro (cm)</Label>
            <Input
              type="number"
              value={formData.diameter_cm}
              onChange={(e) => setFormData(prev => ({ ...prev, diameter_cm: e.target.value }))}
              placeholder="Ex: 35"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>PreÃ§o Tradicional *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.price_tradicional}
                onChange={(e) => setFormData(prev => ({ ...prev, price_tradicional: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label>PreÃ§o Premium *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.price_premium}
                onChange={(e) => setFormData(prev => ({ ...prev, price_premium: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-orange-500">
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FlavorModal({ isOpen, onClose, onSubmit, flavor }) {
  const [formData, setFormData] = useState({
    name: '', description: '', image: '', category: 'tradicional',
    prep_time: '', is_active: true, is_popular: false
  });

  React.useEffect(() => {
    if (flavor) {
      setFormData({
        name: flavor.name || '',
        description: flavor.description || '',
        image: flavor.image || '',
        category: flavor.category || 'tradicional',
        prep_time: flavor.prep_time?.toString() || '',
        is_active: flavor.is_active !== false,
        is_popular: flavor.is_popular || false
      });
    } else {
      setFormData({
        name: '', description: '', image: '', category: 'tradicional',
        prep_time: '', is_active: true, is_popular: false
      });
    }
  }, [flavor, isOpen]);

  const handleImageUpload = async (e) => {
    console.log('ðŸ–¼ï¸ [PizzaConfigTab] handleImageUpload chamado:', {
      event: e,
      target: e.target,
      files: e.target.files,
      filesLength: e.target.files?.length
    });

    const file = e.target.files?.[0];
    
    console.log('ðŸ–¼ï¸ [PizzaConfigTab] Arquivo extraÃ­do:', {
      file,
      isFile: file instanceof File,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    });

    if (!file) {
      console.error('âŒ [PizzaConfigTab] Nenhum arquivo encontrado no evento');
      alert('Nenhum arquivo selecionado');
      return;
    }

    if (!(file instanceof File)) {
      console.error('âŒ [PizzaConfigTab] Arquivo nÃ£o Ã© instÃ¢ncia de File:', typeof file);
      alert('Arquivo invÃ¡lido');
      return;
    }

    try {
      console.log('ðŸ“¤ [PizzaConfigTab] Iniciando upload...');
      const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
      const url = await uploadToCloudinary(file, 'pizza-config');
      console.log('âœ… [PizzaConfigTab] Upload concluÃ­do, URL:', url);
      setFormData(prev => ({ ...prev, image: url }));
    } catch (error) {
      console.error('âŒ [PizzaConfigTab] Erro ao fazer upload:', error);
      alert('Erro ao fazer upload da imagem: ' + error.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      prep_time: formData.prep_time ? parseInt(formData.prep_time) : null
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>{flavor ? 'Editar' : 'Novo'} Sabor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Calabresa, Marguerita"
              required
            />
          </div>
          <div>
            <Label>DescriÃ§Ã£o</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Ingredientes do sabor..."
              rows={2}
            />
          </div>
          <div>
            <Label>Categoria *</Label>
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, category: 'tradicional' }))}
                className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                  formData.category === 'tradicional'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                ðŸ• Tradicional
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, category: 'premium' }))}
                className={`flex-1 py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                  formData.category === 'premium'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                â­ Premium
              </button>
            </div>
          </div>
          <div>
            <Label>Tempo de Preparo (min)</Label>
            <Input
              type="number"
              value={formData.prep_time}
              onChange={(e) => setFormData(prev => ({ ...prev, prep_time: e.target.value }))}
              placeholder="Ex: 20"
            />
          </div>
          <div>
            <Label>Imagem</Label>
            <Input type="file" accept="image/*" onChange={handleImageUpload} />
            {formData.image && (
              <img src={formData.image} alt="" className="mt-2 w-20 h-20 object-cover rounded" />
            )}
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <Switch
                checked={formData.is_popular}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_popular: checked }))}
              />
              <span className="text-sm">â­ Popular</span>
            </label>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-orange-500">
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EdgeModal({ isOpen, onClose, onSubmit, edge }) {
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', image: '', is_active: true, is_popular: false
  });

  React.useEffect(() => {
    if (edge) {
      setFormData({
        name: edge.name || '',
        description: edge.description || '',
        price: edge.price?.toString() || '',
        image: edge.image || '',
        is_active: edge.is_active !== false,
        is_popular: edge.is_popular || false
      });
    } else {
      setFormData({
        name: '', description: '', price: '', image: '', is_active: true, is_popular: false
      });
    }
  }, [edge, isOpen]);

  const handleImageUpload = async (e) => {
    console.log('ðŸ–¼ï¸ [PizzaConfigTab] handleImageUpload chamado:', {
      event: e,
      target: e.target,
      files: e.target.files,
      filesLength: e.target.files?.length
    });

    const file = e.target.files?.[0];
    
    console.log('ðŸ–¼ï¸ [PizzaConfigTab] Arquivo extraÃ­do:', {
      file,
      isFile: file instanceof File,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    });

    if (!file) {
      console.error('âŒ [PizzaConfigTab] Nenhum arquivo encontrado no evento');
      alert('Nenhum arquivo selecionado');
      return;
    }

    if (!(file instanceof File)) {
      console.error('âŒ [PizzaConfigTab] Arquivo nÃ£o Ã© instÃ¢ncia de File:', typeof file);
      alert('Arquivo invÃ¡lido');
      return;
    }

    try {
      console.log('ðŸ“¤ [PizzaConfigTab] Iniciando upload...');
      const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
      const url = await uploadToCloudinary(file, 'pizza-config');
      console.log('âœ… [PizzaConfigTab] Upload concluÃ­do, URL:', url);
      setFormData(prev => ({ ...prev, image: url }));
    } catch (error) {
      console.error('âŒ [PizzaConfigTab] Erro ao fazer upload:', error);
      alert('Erro ao fazer upload da imagem: ' + error.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      price: parseFloat(formData.price)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>{edge ? 'Editar' : 'Nova'} Borda</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Catupiry, Cheddar"
              required
            />
          </div>
          <div>
            <Label>DescriÃ§Ã£o</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="DescriÃ§Ã£o da borda..."
              rows={2}
            />
          </div>
          <div>
            <Label>PreÃ§o *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <Label>Imagem</Label>
            <Input type="file" accept="image/*" onChange={handleImageUpload} />
            {formData.image && (
              <img src={formData.image} alt="" className="mt-2 w-20 h-20 object-cover rounded" />
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-orange-500">
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExtraModal({ isOpen, onClose, onSubmit, extra }) {
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', image: '', is_active: true
  });

  React.useEffect(() => {
    if (extra) {
      setFormData({
        name: extra.name || '',
        description: extra.description || '',
        price: extra.price?.toString() || '',
        image: extra.image || '',
        is_active: extra.is_active !== false
      });
    } else {
      setFormData({
        name: '', description: '', price: '', image: '', is_active: true
      });
    }
  }, [extra, isOpen]);

  const handleImageUpload = async (e) => {
    console.log('ðŸ–¼ï¸ [PizzaConfigTab] handleImageUpload chamado:', {
      event: e,
      target: e.target,
      files: e.target.files,
      filesLength: e.target.files?.length
    });

    const file = e.target.files?.[0];
    
    console.log('ðŸ–¼ï¸ [PizzaConfigTab] Arquivo extraÃ­do:', {
      file,
      isFile: file instanceof File,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    });

    if (!file) {
      console.error('âŒ [PizzaConfigTab] Nenhum arquivo encontrado no evento');
      alert('Nenhum arquivo selecionado');
      return;
    }

    if (!(file instanceof File)) {
      console.error('âŒ [PizzaConfigTab] Arquivo nÃ£o Ã© instÃ¢ncia de File:', typeof file);
      alert('Arquivo invÃ¡lido');
      return;
    }

    try {
      console.log('ðŸ“¤ [PizzaConfigTab] Iniciando upload...');
      const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
      const url = await uploadToCloudinary(file, 'pizza-config');
      console.log('âœ… [PizzaConfigTab] Upload concluÃ­do, URL:', url);
      setFormData(prev => ({ ...prev, image: url }));
    } catch (error) {
      console.error('âŒ [PizzaConfigTab] Erro ao fazer upload:', error);
      alert('Erro ao fazer upload da imagem: ' + error.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      price: parseFloat(formData.price)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>{extra ? 'Editar' : 'Novo'} Extra</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Azeitonas, Bacon"
              required
            />
          </div>
          <div>
            <Label>DescriÃ§Ã£o</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="DescriÃ§Ã£o do extra..."
              rows={2}
            />
          </div>
          <div>
            <Label>PreÃ§o *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <Label>Imagem</Label>
            <Input type="file" accept="image/*" onChange={handleImageUpload} />
            {formData.image && (
              <img src={formData.image} alt="" className="mt-2 w-20 h-20 object-cover rounded" />
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-orange-500">
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryModal({ isOpen, onClose, onSubmit, category, sizes = [] }) {
  const [formData, setFormData] = useState({
    name: '',
    size_id: '',
    max_flavors: '1'
  });

  React.useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        size_id: category.size_id || '',
        max_flavors: (category.max_flavors || 1).toString()
      });
    } else {
      setFormData({
        name: '',
        size_id: sizes[0]?.id || '',
        max_flavors: '1'
      });
    }
  }, [category, sizes, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      max_flavors: parseInt(formData.max_flavors) || 1
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>{category ? 'Editar' : 'Nova'} regra de montagem</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome da regra *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Tradicional - 2 sabores"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Use um nome comercial que conecte esta regra com a entrada exibida no cardapio.</p>
          </div>
          <div>
            <Label>Tamanho base *</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={formData.size_id}
              onChange={(e) => setFormData(prev => ({ ...prev, size_id: e.target.value }))}
              required
            >
              <option value="">Selecione...</option>
              {(sizes || []).filter(s => s && s.is_active !== false).map(s => (
                <option key={s.id} value={s.id}>{s.name} - {s.slices} fatias</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Quantos sabores aceita (1-4) *</Label>
            <Input
              type="number"
              min={1}
              max={4}
              value={formData.max_flavors}
              onChange={(e) => setFormData(prev => ({ ...prev, max_flavors: e.target.value }))}
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" className="flex-1 bg-orange-500">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}






