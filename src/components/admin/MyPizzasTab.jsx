import React, { useState } from 'react';
import { apiClient } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil, Star, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermission } from '../permissions/usePermission';
import { fetchAdminDishes } from '@/services/adminMenuService';
import { keepPreviousData } from '@tanstack/react-query';
import { buildTenantEntityOpts, getMenuContextEntityOpts, getMenuContextQueryKeyParts } from '@/utils/tenantScope';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

const getPizzaEntryStartingPrice = (pizza) => {
  const sizePrices = Array.isArray(pizza?.pizza_config?.sizes)
    ? pizza.pizza_config.sizes.flatMap((size) => [
        Number(size?.price_tradicional || 0),
        Number(size?.price_premium || 0)
      ])
    : [];

  const safePrices = [...sizePrices, Number(pizza?.price || 0)].filter(
    (price) => Number.isFinite(price) && price > 0
  );

  return safePrices.length > 0 ? Math.min(...safePrices) : 0;
};

const formatFlavorAllowance = (value) => {
  const count = Math.max(Number(value) || 1, 1);
  return count === 1 ? 'Ate 1 sabor' : `Ate ${count} sabores`;
};

const summarizeFlavorMix = (flavors = []) => {
  const categories = Array.from(new Set(flavors.map((flavor) => flavor?.category).filter(Boolean)));
  if (categories.length === 0) return 'Sabores liberados';
  return categories
    .map((category) => (category === 'premium' ? 'Premium' : 'Tradicional'))
    .join(' + ');
};

const getEntryStatusPresentation = (status) => {
  if (status === 'Completa') {
    return {
      badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      accentClass: 'border-emerald-200 bg-emerald-50/70',
      helper: 'Pronta para vender'
    };
  }
  if (status === 'Quase pronta') {
    return {
      badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
      accentClass: 'border-amber-200 bg-amber-50/70',
      helper: 'Falta pouco para ativar'
    };
  }
  return {
    badgeClass: 'bg-rose-100 text-rose-700 border-rose-200',
    accentClass: 'border-rose-200 bg-rose-50/70',
    helper: 'Precisa de ajuste'
  };
};

const getSalesStrengthPresentation = (strength) => {
  if (strength === 'Forte') {
    return {
      badgeClass: 'border-emerald-200 bg-emerald-100 text-emerald-700',
      cardClass: 'border-emerald-200 bg-emerald-50/80',
      helper: 'Alta chance de venda',
    };
  }
  if (strength === 'Boa') {
    return {
      badgeClass: 'border-sky-200 bg-sky-100 text-sky-700',
      cardClass: 'border-sky-200 bg-sky-50/80',
      helper: 'Boa para delivery',
    };
  }
  if (strength === 'Regular') {
    return {
      badgeClass: 'border-amber-200 bg-amber-100 text-amber-700',
      cardClass: 'border-amber-200 bg-amber-50/80',
      helper: 'Precisa melhorar',
    };
  }
  return {
    badgeClass: 'border-rose-200 bg-rose-100 text-rose-700',
    cardClass: 'border-rose-200 bg-rose-50/80',
    helper: 'Baixo potencial',
  };
};

const getCatalogLevelPresentation = (level) => {
  if (level === 'FORTE') {
    return {
      title: 'Seu cardapio esta em nivel FORTE',
      description: 'A base comercial esta consistente e o sistema entende que voce ja tem boas chances de venda.',
      cardClass: 'border-emerald-200 bg-emerald-50/80',
      badgeClass: 'border-emerald-200 bg-white text-emerald-700',
    };
  }
  if (level === 'BOM') {
    return {
      title: 'Seu cardapio esta em nivel BOM',
      description: 'A estrutura ja convence, mas ainda existe espaco claro para subir ticket e reduzir atrito.',
      cardClass: 'border-sky-200 bg-sky-50/80',
      badgeClass: 'border-sky-200 bg-white text-sky-700',
    };
  }
  if (level === 'REGULAR') {
    return {
      title: 'Seu cardapio esta em nivel REGULAR',
      description: 'A pizzaria ja funciona, mas algumas entradas ainda deixam dinheiro na mesa.',
      cardClass: 'border-amber-200 bg-amber-50/80',
      badgeClass: 'border-amber-200 bg-white text-amber-700',
    };
  }
  return {
    title: 'Seu cardapio esta em nivel FRACO',
    description: 'Ainda vale corrigir a base comercial para o cliente perceber mais valor e encontrar opcao real.',
    cardClass: 'border-rose-200 bg-rose-50/80',
    badgeClass: 'border-rose-200 bg-white text-rose-700',
  };
};

const buildPizzaEntryReadiness = ({ pizza, entryCategory, sizes, flavors }) => {
  const configuredSizes = Array.isArray(pizza?.pizza_config?.sizes) ? pizza.pizza_config.sizes.filter(Boolean) : [];
  const fallbackSize = sizes.find((size) => size.id === entryCategory?.size_id) || null;
  const effectiveSizes = configuredSizes.length > 0 ? configuredSizes : (fallbackSize ? [fallbackSize] : []);
  const activeSizes = effectiveSizes.filter((size) => size?.is_active !== false);
  const allowedFlavorIds = Array.isArray(pizza?.pizza_config?.flavor_ids) ? pizza.pizza_config.flavor_ids : [];
  const activeFlavors = flavors.filter((flavor) => allowedFlavorIds.includes(flavor.id) && flavor?.is_active !== false);
  const hasPremiumFlavor = activeFlavors.some((flavor) => flavor.category === 'premium');
  const hasPrice = activeSizes.some((size) => Number(size?.price_tradicional || 0) > 0 || Number(size?.price_premium || 0) > 0)
    || Number(pizza?.price || 0) > 0;
  const hasEdges = (pizza?.pizza_config?.edges || []).some((edge) => edge?.is_active !== false);
  const hasExtras = (pizza?.pizza_config?.extras || []).some((extra) => extra?.is_active !== false);
  const activeSizeCount = activeSizes.length;
  const activeFlavorCount = activeFlavors.length;
  const premiumDelta = activeSizes.reduce((maxValue, size) => {
    const delta = (Number(size?.price_premium || 0) - Number(size?.price_tradicional || 0));
    return Math.max(maxValue, delta);
  }, 0);

  const essentialChecks = [
    { label: 'Nome definido', done: Boolean(String(pizza?.name || '').trim()) },
    { label: 'Regra vinculada', done: Boolean(entryCategory) },
    { label: 'Tamanhos ativos', done: activeSizes.length > 0 },
    { label: 'Sabores vinculados', done: activeFlavors.length > 0 },
    { label: 'Preco coerente', done: hasPrice }
  ];

  const completedEssentials = essentialChecks.filter((check) => check.done).length;
  const isComplete = completedEssentials === essentialChecks.length && pizza?.is_active !== false;
  const isAlmostReady = completedEssentials >= essentialChecks.length - 1 && completedEssentials < essentialChecks.length;
  const status = isComplete ? 'Completa' : (isAlmostReady ? 'Quase pronta' : 'Incompleta');
  const commercialScore =
    (activeSizeCount >= 2 ? 1 : activeSizeCount === 1 ? 0.5 : 0)
    + (activeFlavorCount >= 6 ? 1 : activeFlavorCount >= 3 ? 0.5 : 0)
    + (hasPremiumFlavor ? 1 : 0)
    + (hasEdges ? 0.5 : 0)
    + (hasExtras ? 0.5 : 0)
    + (hasPrice ? 1 : 0)
    + ((Number(entryCategory?.max_flavors) || 1) >= 2 ? 0.5 : 0);
  const commercialScoreValue = Number(commercialScore.toFixed(1));
  const salesStrength = commercialScore >= 4.8 ? 'Forte' : (commercialScore >= 3.5 ? 'Boa' : (commercialScore >= 2.2 ? 'Regular' : 'Fraca'));
  const commercialPotential = commercialScore >= 4 ? 'Alto potencial' : (commercialScore >= 2.5 ? 'Medio potencial' : 'Baixo potencial');
  const upsellPotential = hasEdges && (hasExtras || hasPremiumFlavor)
    ? 'Upsell forte'
    : ((hasEdges || hasExtras || hasPremiumFlavor) ? 'Upsell moderado' : 'Upsell limitado');
  const confidenceLabel = salesStrength === 'Forte'
    ? (hasPremiumFlavor && premiumDelta >= 6 ? 'Forte para ticket medio' : 'Alta chance de venda')
    : (salesStrength === 'Boa'
      ? (activeSizeCount >= 2 ? 'Boa para delivery' : 'Boa estrutura comercial')
      : (salesStrength === 'Regular' ? 'Precisa melhorar' : 'Baixo potencial'));
  const directFeedback = salesStrength === 'Fraca'
    ? 'Essa entrada tem baixo potencial de venda.'
    : (!hasPremiumFlavor && activeFlavorCount > 0
      ? 'Premium pouco aproveitado.'
      : ((!hasEdges && !hasExtras)
        ? 'Upsell inexistente.'
        : (salesStrength === 'Forte' && hasPremiumFlavor && premiumDelta >= 6
          ? 'Forte para ticket medio.'
          : (activeSizeCount >= 2 ? 'Boa estrutura para delivery.' : 'Estrutura comercial consistente.'))));

  const suggestions = [];
  if (!entryCategory) suggestions.push('Vincule uma regra de montagem para definir o que o cliente realmente pode montar.');
  if (activeSizes.length === 0) suggestions.push('Ative ao menos um tamanho para evitar entrada sem preco ou sem opcao no builder.');
  if (activeFlavors.length === 0) suggestions.push('Vincule sabores ativos para a entrada aparecer com opcoes reais no builder.');
  if (!hasPrice) suggestions.push('Revise o preco base desta entrada para ela ficar pronta para venda.');
  if ((entryCategory?.max_flavors || 1) >= 2 && activeSizes.length <= 1) suggestions.push('Entradas com ate 2 sabores costumam performar melhor com tamanhos M e G ativos.');
  if (activeFlavors.length > 0 && !hasPremiumFlavor) suggestions.push('Considere liberar pelo menos um sabor premium para ampliar ticket medio.');
  if (!hasEdges) suggestions.push('Adicionar ao menos uma borda ajuda a transformar a entrada em oferta mais premium.');
  if (!hasExtras) suggestions.push('Adicionar extras opcionais pode aumentar conversao sem pesar no fluxo.');
  if (hasPremiumFlavor && premiumDelta > 0 && premiumDelta < 6) suggestions.push('A diferenca entre tradicional e premium pode estar baixa para destacar valor percebido.');

  const optionalChecks = [
    { label: 'Borda configurada', done: hasEdges, tone: 'Opcional' },
    { label: 'Adicionais configurados', done: hasExtras, tone: 'Opcional' }
  ];

  return {
    status,
    completedEssentials,
    totalEssentials: essentialChecks.length,
    essentialChecks,
    optionalChecks,
    suggestions: suggestions.slice(0, 3),
    hasPremiumFlavor,
    activeSizeCount,
    activeFlavorCount,
    premiumDelta,
    commercialScoreValue,
    salesStrength,
    confidenceLabel,
    directFeedback,
    commercialPotential,
    upsellPotential
  };
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

export default function MyPizzasTab() {
  const [user, setUser] = useState(null);
  const [showPizzaModal, setShowPizzaModal] = useState(false);
  const [editingPizza, setEditingPizza] = useState(null);
  
  const queryClient = useQueryClient();
  const { menuContext } = usePermission();

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

  const slug = menuContext?.type === 'slug' ? menuContext?.value : null;
  const subscriberContextEmail = menuContext?.type === 'subscriber' && menuContext?.value
    ? menuContext.value
    : null;
  // âœ… Para master (slug): buscar TUDO do cardÃ¡pio pÃºblico de uma vez (pizzas + complementos)
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
  const scopedSubscriberEmail = subscriberContextEmail || tenantSubscriberEmail || null;
  const scopedSubscriberId = menuContext?.type === 'subscriber'
    ? menuContext.subscriber_id ?? null
    : tenantSubscriberId;
  const fallbackOwnerEmail = slug ? null : (user?.subscriber_email || user?.email || null);
  const entityOwnerEmail = scopedSubscriberEmail || fallbackOwnerEmail; // Compatibilidade transitÃ³ria: o backend legado ainda persiste owner_email.
  const entityContextOpts = buildTenantEntityOpts({ subscriberId: scopedSubscriberId, subscriberEmail: scopedSubscriberEmail });

  // âœ… Admin API para pratos (com fallback interno); quando temos publicCardapio, usamos ele para exibir
  const { data: adminDishesRaw = [], refetch: refetchDishes, isLoading: dishesLoading } = useQuery({
    queryKey: ['dishes', ...getMenuContextQueryKeyParts(menuContext)],
    queryFn: async () => {
      if (!menuContext) return [];
      return await fetchAdminDishes(menuContext);
    },
    enabled: !!menuContext,
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    staleTime: 30000,
    gcTime: 60000,
  });
  
  React.useEffect(() => {
    if (menuContext && adminDishesRaw.length === 0 && !dishesLoading && !publicCardapio?.dishes?.length) {
      refetchDishes();
    }
  }, [menuContext?.type, menuContext?.value, menuContext?.subscriber_id]);
  
  // Fonte de pratos: pÃºblico (slug) ou admin
  const dishesRaw = (slug && publicCardapio?.dishes) ? publicCardapio.dishes : (adminDishesRaw || []);
  const pizzas = (dishesRaw || []).filter(d => d.product_type === 'pizza');

  // âœ… Tamanhos: pÃºblico (slug) ou admin
  const { data: adminSizes = [] } = useQuery({
    queryKey: ['pizzaSizes', ...getMenuContextQueryKeyParts(menuContext)],
    queryFn: async () => {
      if (!menuContext) return [];
      return apiClient.entities.PizzaSize.list('order', getMenuContextEntityOpts(menuContext));
    },
    enabled: !!menuContext && !slug,
  });
  const sizes = (slug && publicCardapio?.pizzaSizes?.length) ? publicCardapio.pizzaSizes : (adminSizes || []);

  // âœ… Sabores: pÃºblico (slug) ou admin
  const { data: adminFlavors = [] } = useQuery({
    queryKey: ['pizzaFlavors', ...getMenuContextQueryKeyParts(menuContext)],
    queryFn: async () => {
      if (!menuContext) return [];
      return apiClient.entities.PizzaFlavor.list('order', getMenuContextEntityOpts(menuContext));
    },
    enabled: !!menuContext && !slug,
  });
  const flavors = (slug && publicCardapio?.pizzaFlavors?.length) ? publicCardapio.pizzaFlavors : (adminFlavors || []);

  // âœ… Bordas: pÃºblico (slug) ou admin
  const { data: adminEdges = [] } = useQuery({
    queryKey: ['pizzaEdges', ...getMenuContextQueryKeyParts(menuContext)],
    queryFn: async () => {
      if (!menuContext) return [];
      return apiClient.entities.PizzaEdge.list('order', getMenuContextEntityOpts(menuContext));
    },
    enabled: !!menuContext && !slug,
  });
  const edges = (slug && publicCardapio?.pizzaEdges?.length) ? publicCardapio.pizzaEdges : (adminEdges || []);

  const { data: adminExtras = [] } = useQuery({
    queryKey: ['pizzaExtras', ...getMenuContextQueryKeyParts(menuContext)],
    queryFn: () => apiClient.entities.PizzaExtra.list('order', entityContextOpts),
    enabled: !!menuContext && !slug,
  });
  const extras = (slug && publicCardapio?.pizzaExtras?.length) ? publicCardapio.pizzaExtras : (adminExtras || []);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', ...getMenuContextQueryKeyParts(menuContext)],
    queryFn: () => apiClient.entities.Category.list('order', entityContextOpts),
    enabled: !!menuContext && !slug,
  });

  // âœ… Categorias de pizza: pÃºblico (slug) ou admin
  const { data: adminPizzaCategories = [] } = useQuery({
    queryKey: ['pizzaCategories', ...getMenuContextQueryKeyParts(menuContext)],
    queryFn: async () => {
      if (!menuContext) return [];
      return apiClient.entities.PizzaCategory.list('order', getMenuContextEntityOpts(menuContext));
    },
    enabled: !!menuContext && !slug,
  });
  const pizzaCategories = (slug && publicCardapio?.pizzaCategories?.length) ? publicCardapio.pizzaCategories : (adminPizzaCategories || []);
  const pizzaReadinessById = React.useMemo(() => {
    return Object.fromEntries(
      pizzas.map((pizza) => {
        const entryCategory = pizzaCategories.find((item) => item.id === pizza.pizza_category_id) || null;
        return [String(pizza.id), buildPizzaEntryReadiness({ pizza, entryCategory, sizes, flavors })];
      })
    );
  }, [pizzas, pizzaCategories, sizes, flavors]);
  const readinessSummary = React.useMemo(() => {
    return pizzas.reduce((accumulator, pizza) => {
      const readiness = pizzaReadinessById[String(pizza.id)];
      if (pizza?.is_active === false) {
        accumulator.inactive += 1;
        return accumulator;
      }
      if (readiness?.salesStrength === 'Forte') accumulator.strong += 1;
      else if (readiness?.salesStrength === 'Boa') accumulator.good += 1;
      else if (readiness?.salesStrength === 'Regular') accumulator.regular += 1;
      else accumulator.weak += 1;
      if (readiness?.status === 'Completa') accumulator.complete += 1;
      else if (readiness?.status === 'Quase pronta') accumulator.almost += 1;
      else accumulator.incomplete += 1;
      return accumulator;
    }, { complete: 0, almost: 0, incomplete: 0, inactive: 0, strong: 0, good: 0, regular: 0, weak: 0 });
  }, [pizzas, pizzaReadinessById]);
  const overallCatalogLevel = React.useMemo(() => {
    const activeEntries = readinessSummary.strong + readinessSummary.good + readinessSummary.regular + readinessSummary.weak;
    if (activeEntries === 0) return 'REGULAR';
    if (readinessSummary.strong >= Math.max(readinessSummary.good, 1) && readinessSummary.weak === 0) return 'FORTE';
    if ((readinessSummary.strong + readinessSummary.good) >= (readinessSummary.regular + readinessSummary.weak)) return 'BOM';
    if (readinessSummary.weak > readinessSummary.strong) return 'FRACO';
    return 'REGULAR';
  }, [readinessSummary]);
  const catalogLevelPresentation = React.useMemo(
    () => getCatalogLevelPresentation(overallCatalogLevel),
    [overallCatalogLevel]
  );

  // Mutations
  const createPizzaMutation = useMutation({
    mutationFn: (data) => {
      return apiClient.entities.Dish.create({
        ...data,
        product_type: 'pizza',
        ...(entityOwnerEmail && { owner_email: entityOwnerEmail }),
        ...entityContextOpts
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzas'] });
      queryClient.invalidateQueries({ queryKey: ['dishes', ...getMenuContextQueryKeyParts(menuContext)] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Pizza criada!');
      setShowPizzaModal(false);
      setEditingPizza(null);
    },
  });

  const updatePizzaMutation = useMutation({
    mutationFn: ({ id, data }) => apiClient.entities.Dish.update(id, data, entityContextOpts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzas'] });
      queryClient.invalidateQueries({ queryKey: ['dishes', ...getMenuContextQueryKeyParts(menuContext)] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Pizza atualizada!');
      setShowPizzaModal(false);
      setEditingPizza(null);
    },
  });

  const deletePizzaMutation = useMutation({
    mutationFn: (id) => apiClient.entities.Dish.delete(id, entityContextOpts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzas'] });
      queryClient.invalidateQueries({ queryKey: ['dishes', ...getMenuContextQueryKeyParts(menuContext)] });
      if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
      toast.success('Pizza excluÃ­da!');
    },
  });

  // Verificar se tem os prÃ©-requisitos
  const canCreatePizza = sizes.length > 0 && flavors.length > 0;
  const canApplyAssistantActions = Boolean(menuContext) && !slug;

  const buildReadyToSellPlan = React.useCallback((pizza) => {
    const currentConfig = pizza?.pizza_config || {};
    const activeCatalogSizes = sizes.filter((size) => size?.is_active !== false);
    const activeCatalogFlavors = flavors.filter((flavor) => flavor?.is_active !== false);
    const activeCatalogEdges = edges.filter((edge) => edge?.is_active !== false);
    const activeCatalogExtras = extras.filter((extra) => extra?.is_active !== false);
    const defaultFoodCategory = categories.find((category) => String(category?.name || '').toLowerCase().includes('pizza')) || categories[0] || null;
    const fallbackPizzaCategory = pizzaCategories.find((category) => category?.is_active !== false) || pizzaCategories[0] || null;
    const selectedPizzaCategory = pizzaCategories.find((category) => category.id === pizza?.pizza_category_id) || fallbackPizzaCategory;
    const maxFlavors = Math.max(Number(selectedPizzaCategory?.max_flavors) || 1, 1);
    const recommendedSizes = [...activeCatalogSizes]
      .sort((left, right) => {
        const leftScore = (Number(left?.max_flavors) || 1) + (Number(left?.slices) || 0);
        const rightScore = (Number(right?.max_flavors) || 1) + (Number(right?.slices) || 0);
        return rightScore - leftScore;
      })
      .slice(0, maxFlavors >= 2 ? 2 : 1)
      .map(clonePizzaSize);
    const recommendedFlavorIds = activeCatalogFlavors
      .slice(0, Math.min(maxFlavors >= 2 ? 6 : 4, activeCatalogFlavors.length))
      .map((flavor) => flavor.id);
    const recommendedEdge = activeCatalogEdges[0] ? [clonePizzaEdge(activeCatalogEdges[0])] : [];
    const recommendedExtra = activeCatalogExtras[0] ? [clonePizzaExtra(activeCatalogExtras[0])] : [];

    const nextSizes = Array.isArray(currentConfig.sizes) && currentConfig.sizes.length > 0 ? currentConfig.sizes : recommendedSizes;
    const nextFlavorIds = Array.isArray(currentConfig.flavor_ids) && currentConfig.flavor_ids.length > 0 ? currentConfig.flavor_ids : recommendedFlavorIds;
    const nextEdges = Array.isArray(currentConfig.edges) && currentConfig.edges.length > 0 ? currentConfig.edges : recommendedEdge;
    const nextExtras = Array.isArray(currentConfig.extras) && currentConfig.extras.length > 0 ? currentConfig.extras : recommendedExtra;
    const nextDefaultFlavorId = pizza.default_flavor_id || nextFlavorIds[0] || '';

    const patch = {
      ...pizza,
      category_id: pizza.category_id || defaultFoodCategory?.id || '',
      pizza_category_id: pizza.pizza_category_id || selectedPizzaCategory?.id || '',
      default_flavor_id: nextDefaultFlavorId,
      is_active: true,
      pizza_config: {
        ...currentConfig,
        sizes: nextSizes,
        flavor_ids: nextFlavorIds,
        edges: nextEdges,
        extras: nextExtras,
      },
    };

    const changes = [];
    if (!pizza.pizza_category_id && patch.pizza_category_id) changes.push(`vincular regra ${selectedPizzaCategory?.name || 'principal'}`);
    if (!pizza.category_id && patch.category_id) changes.push('ligar categoria comercial de pizza');
    if (!(Array.isArray(currentConfig.sizes) && currentConfig.sizes.length > 0) && nextSizes.length > 0) changes.push(`${nextSizes.length} tamanho(s) ativo(s)`);
    if (!(Array.isArray(currentConfig.flavor_ids) && currentConfig.flavor_ids.length > 0) && nextFlavorIds.length > 0) changes.push(`${nextFlavorIds.length} sabor(es) ativo(s)`);
    if (!pizza.default_flavor_id && nextDefaultFlavorId) changes.push('definir sabor de referencia');
    if (!(Array.isArray(currentConfig.edges) && currentConfig.edges.length > 0) && nextEdges.length > 0) changes.push('ativar borda opcional');
    if (!(Array.isArray(currentConfig.extras) && currentConfig.extras.length > 0) && nextExtras.length > 0) changes.push('ativar adicional opcional');
    if (pizza.is_active === false) changes.push('reativar entrada para venda');

    return { patch, changes };
  }, [categories, edges, extras, flavors, pizzaCategories, sizes]);

  const handlePreparePizzaForSale = React.useCallback((pizza) => {
    if (!canApplyAssistantActions) {
      toast('As acoes automaticas ficam disponiveis no painel da loja.');
      return;
    }

    const plan = buildReadyToSellPlan(pizza);
    if (plan.changes.length === 0) {
      toast('Esta entrada ja esta pronta para vender.');
      return;
    }

    const accepted = window.confirm(`Vamos ${plan.changes.join(', ')} nesta entrada. Deseja continuar?`);
    if (!accepted) return;

    updatePizzaMutation.mutate({ id: pizza.id, data: plan.patch });
  }, [buildReadyToSellPlan, canApplyAssistantActions, updatePizzaMutation]);

  const handleActivateEntryUpsell = React.useCallback((pizza) => {
    if (!canApplyAssistantActions) {
      toast('As acoes automaticas ficam disponiveis no painel da loja.');
      return;
    }

    const currentConfig = pizza?.pizza_config || {};
    const activeEdge = edges.find((edge) => edge?.is_active !== false) || null;
    const activeExtra = extras.find((extra) => extra?.is_active !== false) || null;
    const nextEdges = Array.isArray(currentConfig.edges) && currentConfig.edges.length > 0
      ? currentConfig.edges
      : (activeEdge ? [clonePizzaEdge(activeEdge)] : []);
    const nextExtras = Array.isArray(currentConfig.extras) && currentConfig.extras.length > 0
      ? currentConfig.extras
      : (activeExtra ? [clonePizzaExtra(activeExtra)] : []);

    const changes = [];
    if (!(Array.isArray(currentConfig.edges) && currentConfig.edges.length > 0) && nextEdges.length > 0) changes.push('ligar uma borda');
    if (!(Array.isArray(currentConfig.extras) && currentConfig.extras.length > 0) && nextExtras.length > 0) changes.push('ligar um adicional');

    if (changes.length === 0) {
      toast('Esta entrada ja tem estrutura de upsell.');
      return;
    }

    const accepted = window.confirm(`Vamos ${changes.join(' e ')} nesta entrada. Deseja continuar?`);
    if (!accepted) return;

    updatePizzaMutation.mutate({
      id: pizza.id,
      data: {
        ...pizza,
        pizza_config: {
          ...currentConfig,
          edges: nextEdges,
          extras: nextExtras,
        },
      },
    });
  }, [canApplyAssistantActions, edges, extras, updatePizzaMutation]);
  const invalidatePizzaEntryQueries = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pizzas'] });
    queryClient.invalidateQueries({ queryKey: ['dishes', ...getMenuContextQueryKeyParts(menuContext)] });
    if (slug) queryClient.invalidateQueries({ queryKey: ['publicCardapio', slug] });
  }, [menuContext, queryClient, slug]);

  const handleImproveWeakEntries = React.useCallback(async () => {
    if (!canApplyAssistantActions) {
      toast('As automacoes ficam disponiveis no painel da loja.');
      return;
    }

    const targetEntries = pizzas.filter((pizza) => {
      if (pizza?.is_active === false) return false;
      const readiness = pizzaReadinessById[String(pizza.id)];
      return readiness?.salesStrength === 'Fraca' || readiness?.salesStrength === 'Regular';
    });

    if (targetEntries.length === 0) {
      toast('As entradas principais ja estao com boa estrutura comercial.');
      return;
    }

    const plans = targetEntries
      .map((pizza) => ({ pizza, plan: buildReadyToSellPlan(pizza) }))
      .filter(({ plan }) => plan.changes.length > 0);

    if (plans.length === 0) {
      toast('As entradas fracas ja estao no limite seguro de automacao.');
      return;
    }

    const accepted = window.confirm(
      `Vamos melhorar ${plans.length} entrada(s) com estrutura segura para venda. Isso pode ativar tamanhos, sabores, borda ou adicional quando a base ja existir. Deseja continuar?`
    );
    if (!accepted) return;

    try {
      await Promise.all(
        plans.map(({ pizza, plan }) => apiClient.entities.Dish.update(pizza.id, plan.patch, entityContextOpts))
      );
      invalidatePizzaEntryQueries();
      toast.success(`${plans.length} entrada(s) receberam melhoria automatica.`);
    } catch (error) {
      console.error('Erro ao melhorar entradas fracas:', error);
      toast.error('Nao foi possivel melhorar as entradas agora.');
    }
  }, [buildReadyToSellPlan, canApplyAssistantActions, entityContextOpts, invalidatePizzaEntryQueries, pizzaReadinessById, pizzas]);

  const handleQuickStartPizza = React.useCallback(async () => {
    if (!canApplyAssistantActions) {
      toast('A criacao rapida fica disponivel no painel da loja.');
      return;
    }

    const activeCatalogSizes = sizes.filter((size) => size?.is_active !== false);
    const activeCatalogFlavors = flavors.filter((flavor) => flavor?.is_active !== false);
    const activeCatalogEdges = edges.filter((edge) => edge?.is_active !== false);
    const activeCatalogExtras = extras.filter((extra) => extra?.is_active !== false);
    const defaultFoodCategory = categories.find((category) => String(category?.name || '').toLowerCase().includes('pizza')) || categories[0] || null;
    const suggestedPizzaCategory = pizzaCategories.find((category) => category?.is_active !== false && !pizzas.some((pizza) => String(pizza?.pizza_category_id) === String(category.id)))
      || pizzaCategories.find((category) => category?.is_active !== false)
      || pizzaCategories[0]
      || null;

    if (!suggestedPizzaCategory || activeCatalogSizes.length === 0 || activeCatalogFlavors.length === 0) {
      toast('Ative ao menos uma regra, um tamanho e um sabor para criar a pizzaria rapida.');
      return;
    }

    const maxFlavors = Math.max(Number(suggestedPizzaCategory?.max_flavors) || 1, 1);
    const recommendedSizes = [...activeCatalogSizes]
      .sort((left, right) => ((Number(right?.max_flavors) || 1) + (Number(right?.slices) || 0)) - ((Number(left?.max_flavors) || 1) + (Number(left?.slices) || 0)))
      .slice(0, maxFlavors >= 2 ? 2 : 1)
      .map(clonePizzaSize);
    const recommendedFlavors = activeCatalogFlavors
      .slice(0, Math.min(maxFlavors >= 2 ? 6 : 4, activeCatalogFlavors.length));
    const defaultFlavor = recommendedFlavors[0] || null;
    const payload = {
      name: `Pizza ${maxFlavors >= 2 ? `${maxFlavors} Sabores` : '1 Sabor'}`,
      description: 'Entrada pronta para vender criada com estrutura comercial segura.',
      category_id: defaultFoodCategory?.id || '',
      pizza_category_id: suggestedPizzaCategory?.id || '',
      default_flavor_id: defaultFlavor?.id || '',
      division_mode: 'slices',
      is_highlight: false,
      is_active: true,
      is_new: false,
      is_popular: true,
      pizza_config: {
        sizes: recommendedSizes,
        flavor_ids: recommendedFlavors.map((flavor) => flavor.id),
        edges: activeCatalogEdges[0] ? [clonePizzaEdge(activeCatalogEdges[0])] : [],
        extras: activeCatalogExtras[0] ? [clonePizzaExtra(activeCatalogExtras[0])] : [],
      },
    };

    const accepted = window.confirm(
      `Vamos criar uma entrada comercial pronta para vender usando a regra ${suggestedPizzaCategory.name}, ${recommendedSizes.length} tamanho(s) e ${recommendedFlavors.length} sabor(es). Deseja continuar?`
    );
    if (!accepted) return;

    try {
      await apiClient.entities.Dish.create({
        ...payload,
        product_type: 'pizza',
        ...(entityOwnerEmail && { owner_email: entityOwnerEmail }),
        ...entityContextOpts,
      });
      invalidatePizzaEntryQueries();
      toast.success('Entrada rapida criada. Agora voce ja tem uma base pronta para vender.');
    } catch (error) {
      console.error('Erro ao criar pizzaria rapida:', error);
      toast.error('Nao foi possivel criar a pizzaria rapida agora.');
    }
  }, [canApplyAssistantActions, categories, edges, entityContextOpts, entityOwnerEmail, extras, flavors, invalidatePizzaEntryQueries, pizzaCategories, pizzas, sizes]);

  const openPizzaModal = (pizza = null) => {
    if (pizza) {
      setEditingPizza(pizza);
    } else {
      setEditingPizza(null);
    }
    setShowPizzaModal(true);
  };

  return (
    <div className="space-y-4">
      {!canCreatePizza && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-orange-900">Configure os itens necessÃ¡rios primeiro</p>
            <p className="text-sm text-orange-700 mt-1">
              Para criar pizzas, vocÃª precisa cadastrar pelo menos:
            </p>
            <ul className="text-sm text-orange-700 mt-2 space-y-1">
              {sizes.length === 0 && <li>• 1 Tamanho na aba Tamanhos e Precos</li>}
              {flavors.length === 0 && <li>• 1 Sabor na aba Sabores</li>}
            </ul>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Entradas do cardapio</h3>
            <p className="text-sm text-gray-600">Aqui voce gerencia o que o cliente enxerga no cardapio. A regra de montagem vem da aba Regras de Montagem.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleImproveWeakEntries}
              disabled={!canApplyAssistantActions || readinessSummary.weak + readinessSummary.regular === 0}
            >
              Melhorar entradas fracas
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleQuickStartPizza}
              disabled={!canApplyAssistantActions || !canCreatePizza}
            >
              Criar pizzaria pronta
            </Button>
            <Button 
              onClick={() => openPizzaModal()} 
              className="bg-orange-500"
              disabled={!canCreatePizza}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova entrada
            </Button>
          </div>
        </div>

        <div className={`rounded-3xl border p-5 shadow-sm ${catalogLevelPresentation.cardClass}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={catalogLevelPresentation.badgeClass}>
                  Nivel {overallCatalogLevel}
                </Badge>
                <Badge variant="outline" className="border-white bg-white/70 text-slate-600">
                  {readinessSummary.strong} fortes • {readinessSummary.good} boas • {readinessSummary.regular} regulares • {readinessSummary.weak} fracas
                </Badge>
              </div>
              <h4 className="mt-3 text-xl font-semibold text-slate-900">{catalogLevelPresentation.title}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-700">{catalogLevelPresentation.description}</p>
            </div>
            <div className="grid min-w-[260px] gap-2 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-3">
                <span>Entradas fortes</span>
                <span className="font-semibold text-emerald-700">{readinessSummary.strong}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Entradas que pedem ajuste</span>
                <span className="font-semibold text-amber-700">{readinessSummary.regular + readinessSummary.weak}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Prontas para vender</span>
                <span className="font-semibold text-slate-900">{readinessSummary.complete}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Completas</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{readinessSummary.complete}</p>
            <p className="mt-1 text-xs text-slate-600">Entradas prontas para vender sem ajuste.</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Quase prontas</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{readinessSummary.almost}</p>
            <p className="mt-1 text-xs text-slate-600">Pedem detalhe fino antes de ficar premium.</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">Pedem ajuste</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{readinessSummary.incomplete}</p>
            <p className="mt-1 text-xs text-slate-600">Ainda faltam itens essenciais da montagem.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Inativas</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{readinessSummary.inactive}</p>
            <p className="mt-1 text-xs text-slate-600">Continuam no cadastro, mas fora do cardapio.</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {pizzas.length > 0 && (() => {
          const grouped = {};
          const sortedCategories = [...(pizzaCategories || [])].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
          sortedCategories.forEach(c => { grouped[c.id] = { category: c, pizzas: [] }; });
          grouped['_sem_categoria'] = { category: { name: 'Sem categoria', id: '_sem_categoria' }, pizzas: [] };
          pizzas.forEach(p => {
            const key = p.pizza_category_id || '_sem_categoria';
            if (!grouped[key]) grouped[key] = { category: { name: 'Outros', id: key }, pizzas: [] };
            grouped[key].pizzas.push(p);
          });
          const ordered = sortedCategories.map(c => grouped[c.id]).filter(Boolean).concat(
            grouped['_sem_categoria'].pizzas.length > 0 ? [grouped['_sem_categoria']] : []
          );
          return ordered.map(({ category, pizzas: list }) => (
            <div key={category.id}>
              <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                <span className="w-1 h-4 rounded bg-orange-500" />
                {category.name}
                <Badge variant="secondary" className="text-xs">{list.length}</Badge>
              </h4>
              {category.id !== '_sem_categoria' && (
                <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50/70 px-3 py-2 text-xs text-orange-900">
                  <p className="font-medium">Entrada publica: {category.name}</p>
                  <p className="mt-1 text-orange-800">
                    Esta categoria representa a entrada comercial que aparece no cardapio e abre o builder premium.
                    {list.length > 1 ? ' O modelo recomendado e manter uma entrada principal por categoria.' : ''}
                  </p>
                </div>
              )}
              <div className="grid gap-4">
                {list.map(pizza => {
                  const entryCategory = pizzaCategories.find((item) => item.id === pizza.pizza_category_id) || null;
                  const entrySize = sizes.find((size) => size.id === entryCategory?.size_id)
                    || pizza.pizza_config?.sizes?.[0]
                    || null;
                  const allowedFlavorIds = Array.isArray(pizza.pizza_config?.flavor_ids) ? pizza.pizza_config.flavor_ids : [];
                  const allowedFlavors = flavors.filter((flavor) => allowedFlavorIds.includes(flavor.id));
                  const allowedFlavorNames = allowedFlavors.map((flavor) => flavor.name).filter(Boolean);
                  const flavorMixLabel = summarizeFlavorMix(allowedFlavors);
                  const allowsBorders = (pizza.pizza_config?.edges?.length || 0) > 0;
                  const allowsExtras = (pizza.pizza_config?.extras?.length || 0) > 0;
                  const readiness = pizzaReadinessById[String(pizza.id)] || buildPizzaEntryReadiness({ pizza, entryCategory, sizes, flavors });
                  const statusPresentation = getEntryStatusPresentation(readiness.status);
                  const strengthPresentation = getSalesStrengthPresentation(readiness.salesStrength);
                  const improvementPlan = buildReadyToSellPlan(pizza);
                  const projectedReadiness = improvementPlan.changes.length > 0
                    ? buildPizzaEntryReadiness({ pizza: improvementPlan.patch, entryCategory, sizes, flavors })
                    : readiness;

                  return (
                  <div key={pizza.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-start gap-4">
                      {pizza.image && (
                        <img src={pizza.image} alt={pizza.name} className="w-24 h-24 rounded-lg object-cover" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-lg">{pizza.name}</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge variant="secondary" className="text-xs">Entrada comercial</Badge>
                              <Badge variant="outline" className={`text-xs ${statusPresentation.badgeClass}`}>{readiness.status}</Badge>
                              <Badge variant="outline" className="text-xs">{readiness.completedEssentials}/{readiness.totalEssentials} essenciais</Badge>
                              <Badge variant="outline" className="text-xs">
                                {readiness.status === 'Completa' ? 'Pronta para vender' : 'Acao recomendada'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {readiness.commercialPotential}
                              </Badge>
                              <Badge variant="outline" className={`text-xs ${strengthPresentation.badgeClass}`}>
                                {readiness.salesStrength}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {readiness.upsellPotential}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {readiness.confidenceLabel}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                A partir de {formatCurrency(getPizzaEntryStartingPrice(pizza))}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {pizza.pizza_config?.flavor_ids?.length || 0} sabores
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {pizza.pizza_config?.edges?.length || 0} bordas
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {pizza.pizza_config?.extras?.length || 0} extras
                              </Badge>
                            </div>
                            {pizza.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{pizza.description}</p>
                            )}
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/60">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Regra</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-gray-100">
                                  {formatFlavorAllowance(entryCategory?.max_flavors)}
                                </p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-gray-400">
                                  {entryCategory?.name || 'Sem regra vinculada'}
                                </p>
                              </div>

                              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/60">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tamanhos</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-gray-100">
                                  {pizza.pizza_config?.sizes?.length
                                    ? pizza.pizza_config.sizes.map((size) => size.name).join(' • ')
                                    : entrySize?.name || 'Sem tamanho'}
                                </p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-gray-400">
                                  {entrySize ? `${entrySize.slices || '-'} fatias` : 'Defina o tamanho base na regra'}
                                </p>
                              </div>

                              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/60">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sabores</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-gray-100">{flavorMixLabel}</p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-gray-400">
                                  {allowedFlavorNames.length > 0
                                    ? allowedFlavorNames.slice(0, 3).join(' • ')
                                    : 'Nenhum sabor liberado ainda'}
                                </p>
                              </div>

                              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/60">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Montagem</p>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  <Badge variant={allowsBorders ? 'secondary' : 'outline'} className="text-[11px]">
                                    {allowsBorders ? 'Borda liberada' : 'Sem borda'}
                                  </Badge>
                                  <Badge variant={allowsExtras ? 'secondary' : 'outline'} className="text-[11px]">
                                    {allowsExtras ? 'Adicionais liberados' : 'Sem adicionais'}
                                  </Badge>
                                  <Badge variant="outline" className="text-[11px]">
                                    Observacao livre
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/60">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Potencial de venda</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-gray-100">{readiness.commercialPotential}</p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-gray-400">{readiness.directFeedback}</p>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/60">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Estrutura ativa</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-gray-100">
                                  {readiness.activeSizeCount} tamanho(s) • {readiness.activeFlavorCount} sabor(es)
                                </p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-gray-400">Ajuda a entender variedade e profundidade da oferta.</p>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/60">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Premium</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-gray-100">
                                  {readiness.hasPremiumFlavor ? 'Premium ativo' : 'Sem premium'}
                                </p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-gray-400">
                                  {readiness.premiumDelta > 0
                                    ? `Premium agrega +${formatCurrency(readiness.premiumDelta)} no melhor tamanho.`
                                    : 'Ainda nao existe diferencial claro entre tradicional e premium.'}
                                </p>
                              </div>
                              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/60">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Upsell</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-gray-100">{readiness.upsellPotential}</p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-gray-400">
                                  {allowsBorders || allowsExtras
                                    ? 'Borda e adicionais ajudam a elevar ticket.'
                                    : 'Ativar borda ou extra deixa a oferta mais forte.'}
                                </p>
                              </div>
                              <div className={`rounded-xl border p-3 ${strengthPresentation.cardClass} dark:border-gray-700 dark:bg-gray-900/60`}>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Confianca do sistema</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-gray-100">{readiness.confidenceLabel}</p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-gray-400">Score comercial {readiness.commercialScoreValue}/5.5 para esta entrada.</p>
                              </div>
                            </div>
                            <div className={`mt-4 grid gap-3 xl:grid-cols-[1.15fr_0.85fr]`}>
                              <div className={`rounded-xl border p-4 ${statusPresentation.accentClass}`}>
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Checklist de prontidao</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900">{statusPresentation.helper}</p>
                                  </div>
                                  {!pizza.is_active ? (
                                    <Badge variant="outline" className="border-slate-300 text-slate-600">Inativa</Badge>
                                  ) : null}
                                </div>
                                <div className="mt-3 space-y-2">
                                  {readiness.essentialChecks.map((check) => (
                                    <div key={check.label} className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-3 py-2 text-sm">
                                      <span className="text-slate-700">{check.label}</span>
                                      <Badge variant="outline" className={check.done ? 'border-emerald-200 text-emerald-700' : 'border-rose-200 text-rose-700'}>
                                        {check.done ? 'OK' : 'Ajustar'}
                                      </Badge>
                                    </div>
                                  ))}
                                  {readiness.optionalChecks.map((check) => (
                                    <div key={check.label} className="flex items-center justify-between gap-3 rounded-lg bg-white/60 px-3 py-2 text-sm">
                                      <span className="text-slate-600">{check.label}</span>
                                      <Badge variant="outline" className={check.done ? 'border-sky-200 text-sky-700' : 'border-slate-200 text-slate-500'}>
                                        {check.done ? 'Opcional ativo' : 'Opcional'}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/60">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Decisao assistida</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-gray-100">O sistema sugere o proximo ajuste</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Badge variant="secondary" className="text-[11px]">
                                    {readiness.activeSizeCount >= 2 ? 'Boa variedade de tamanhos' : 'Faixa de tamanho enxuta'}
                                  </Badge>
                                  <Badge variant="outline" className="text-[11px]">
                                    {readiness.activeFlavorCount} sabor(es) ativo(s)
                                  </Badge>
                                  <Badge variant="outline" className="text-[11px]">
                                    {readiness.hasPremiumFlavor ? 'Premium ativo' : 'Sem premium'}
                                  </Badge>
                                </div>
                                <div className="mt-3 space-y-2">
                                  {readiness.suggestions.length > 0 ? readiness.suggestions.map((suggestion) => (
                                    <div key={suggestion} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                      {suggestion}
                                    </div>
                                  )) : (
                                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                      Entrada consistente. Agora vale lapidar foto, destaque e posicionamento comercial.
                                    </div>
                                  )}
                                </div>
                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Antes</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900">{readiness.confidenceLabel}</p>
                                    <p className="mt-1 text-xs text-slate-600">{readiness.directFeedback}</p>
                                  </div>
                                  <div className={`rounded-xl border p-3 ${projectedReadiness.salesStrength === readiness.salesStrength && improvementPlan.changes.length === 0 ? 'border-emerald-200 bg-emerald-50/70' : 'border-orange-200 bg-orange-50/70'}`}>
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Depois</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900">
                                      {improvementPlan.changes.length > 0 ? projectedReadiness.confidenceLabel : 'Ja esta no melhor ponto seguro'}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-600">
                                      {improvementPlan.changes.length > 0
                                        ? `Impacto esperado: ${improvementPlan.changes.slice(0, 2).join(' • ')}`
                                        : 'A entrada ja entrega uma base forte com a estrutura atual.'}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="bg-orange-500 hover:bg-orange-600"
                                    onClick={() => handlePreparePizzaForSale(pizza)}
                                    disabled={!canApplyAssistantActions}
                                  >
                                    Preparar para venda
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleActivateEntryUpsell(pizza)}
                                    disabled={!canApplyAssistantActions}
                                  >
                                    Ativar upsell sugerido
                                  </Button>
                                </div>
                              </div>
                            </div>
                            {pizza.default_flavor_id && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Sabor de referencia: {flavors.find((flavor) => flavor.id === pizza.default_flavor_id)?.name || 'Nao encontrado'}
                              </p>
                            )}
                            {pizza.pizza_config?.sizes && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {pizza.pizza_config.sizes.map(size => (
                                  <Badge key={size.id} variant="outline" className="text-xs">
                                    {size.name}: a partir de {formatCurrency(size.price_tradicional || size.price_premium)}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {pizza.is_highlight && <Badge className="mt-2 bg-yellow-100 text-yellow-700">Destaque</Badge>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={pizza.is_active !== false}
                              onCheckedChange={(checked) => 
                                updatePizzaMutation.mutate({ id: pizza.id, data: { is_active: checked } })
                              }
                            />
                            <Button variant="ghost" size="icon" onClick={() => openPizzaModal(pizza)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { if (confirm('Excluir esta pizza?')) deletePizzaMutation.mutate(pizza.id); }}
                              className="text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            </div>
          ));
        })()}

      {pizzas.length === 0 && canCreatePizza && (
          <div className="text-center py-12 text-gray-400">
            <p>Nenhuma entrada do cardapio cadastrada ainda</p>
            <p className="text-sm mt-1">Crie a primeira entrada comercial para abrir o builder premium no cardapio.</p>
          </div>
        )}
      </div>

      {/* Modal de Pizza */}
      <PizzaModal
        isOpen={showPizzaModal}
        onClose={() => {
          setShowPizzaModal(false);
          setEditingPizza(null);
        }}
        onSubmit={(data) => {
          if (editingPizza) {
            updatePizzaMutation.mutate({ id: editingPizza.id, data });
          } else {
            createPizzaMutation.mutate(data);
          }
        }}
        pizza={editingPizza}
        sizes={sizes}
        flavors={flavors}
        edges={edges}
        extras={extras}
        categories={categories}
        pizzaCategories={pizzaCategories}
      />
    </div>
  );
}

function PizzaModal({ isOpen, onClose, onSubmit, pizza, sizes, flavors, edges, extras, categories, pizzaCategories = [] }) {
  const [selectedDefaultFlavor, setSelectedDefaultFlavor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    category_id: '',
    pizza_category_id: '',
    default_flavor_id: '',
    division_mode: 'slices',
    is_highlight: false,
    is_active: true,
    is_new: false,
    is_popular: false,
    pizza_config: {
      sizes: [],
      flavor_ids: [],
      edges: [],
      extras: []
    }
  });

  const selectedPizzaCategory = pizzaCategories.find((category) => category.id === formData.pizza_category_id);
  const selectedCommercialSize = sizes.find((size) => size.id === selectedPizzaCategory?.size_id)
    || sizes.find((size) => formData.pizza_config?.sizes?.some((entry) => entry.id === size.id))
    || null;
  const commercialStartingPrice = selectedCommercialSize
    ? Number(selectedCommercialSize?.price_tradicional || selectedCommercialSize?.price_premium || 0)
    : Number(formData.pizza_config?.sizes?.[0]?.price_tradicional || formData.pizza_config?.sizes?.[0]?.price_premium || 0);
  const referenceFlavor = selectedDefaultFlavor || flavors.find((flavor) => flavor.id === formData.default_flavor_id) || null;
  const referenceFlavorName = referenceFlavor?.name || 'Nao definido';

  React.useEffect(() => {
    if (pizza) {
      const defaultFlavor = flavors.find(f => f.id === pizza.default_flavor_id);
      setSelectedDefaultFlavor(defaultFlavor);
      
      setFormData({
        name: pizza.name || '',
        description: pizza.description || '',
        image: pizza.image || '',
        category_id: pizza.category_id || '',
        pizza_category_id: pizza.pizza_category_id || '',
        default_flavor_id: pizza.default_flavor_id || '',
        division_mode: pizza.division_mode || 'slices',
        is_highlight: pizza.is_highlight || false,
        is_active: pizza.is_active !== false,
        is_new: pizza.is_new || false,
        is_popular: pizza.is_popular || false,
        pizza_config: pizza.pizza_config || {
          sizes: [],
          flavor_ids: [],
          edges: [],
          extras: []
        }
      });
    } else {
      setSelectedDefaultFlavor(null);
      setFormData({
        name: '',
        description: '',
        image: '',
        category_id: categories[0]?.id || '',
        pizza_category_id: pizzaCategories[0]?.id || '',
        default_flavor_id: '',
        division_mode: 'slices',
        is_highlight: false,
        is_active: true,
        is_new: false,
        is_popular: false,
        pizza_config: {
          sizes: sizes.map(s => ({
            id: s.id,
            name: s.name,
            slices: s.slices,
            max_flavors: s.max_flavors,
            price_tradicional: s.price_tradicional,
            price_premium: s.price_premium
          })),
          flavor_ids: flavors.filter(f => f.is_active !== false).map(f => f.id),
          edges: edges.filter(e => e.is_active !== false).map(e => ({
            id: e.id,
            name: e.name,
            price: e.price,
            is_active: e.is_active,
            is_popular: e.is_popular
          })),
          extras: extras.filter(e => e.is_active !== false).map(e => ({
            id: e.id,
            name: e.name,
            price: e.price,
            is_active: e.is_active
          }))
        }
      });
    }
  }, [pizza, isOpen, sizes, flavors, edges, extras, categories, pizzaCategories]);

  const handleDefaultFlavorSelect = (flavor) => {
    setSelectedDefaultFlavor(flavor);
    setFormData(prev => ({
      ...prev,
      name: prev.name || selectedPizzaCategory?.name || `Pizza ${flavor.name}`,
      default_flavor_id: flavor.id,
      image: prev.image || flavor.image || '',
      description: prev.description || flavor.description || ''
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
      const url = await uploadToCloudinary(file, 'dishes');

    if (!url) {
      toast.error('Erro ao obter URL da imagem');
      return;
    }

    setFormData(prev => ({ ...prev, image: url }));
  } catch (err) {
    console.error(err);
    toast.error('Falha ao enviar imagem');
  }
};


  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedDefaultFlavor && !pizza) {
      toast.error('Selecione um sabor de referencia para continuar');
      return;
    }

    if (!formData.pizza_config.sizes || formData.pizza_config.sizes.length === 0) {
      toast.error('Selecione pelo menos um tamanho');
      return;
    }

    if (!formData.pizza_config.flavor_ids || formData.pizza_config.flavor_ids.length === 0) {
      toast.error('Selecione pelo menos um sabor');
      return;
    }

    const toSubmit = { ...formData };
    if (pizzaCategories.length > 0 && toSubmit.pizza_category_id && !toSubmit.category_id) {
      const defaultCat = categories.find(c => c.name?.toLowerCase().includes('pizza')) || categories[0];
      toSubmit.category_id = defaultCat?.id || '';
    }
    onSubmit(toSubmit);
  };

  const toggleSize = (size) => {
    const currentSizes = formData.pizza_config.sizes || [];
    const exists = currentSizes.find(s => s.id === size.id);
    
    if (exists) {
      setFormData(prev => ({
        ...prev,
        pizza_config: {
          ...prev.pizza_config,
          sizes: currentSizes.filter(s => s.id !== size.id)
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        pizza_config: {
          ...prev.pizza_config,
          sizes: [...currentSizes, {
            id: size.id,
            name: size.name,
            slices: size.slices,
            max_flavors: size.max_flavors,
            price_tradicional: size.price_tradicional,
            price_premium: size.price_premium
          }]
        }
      }));
    }
  };

  const toggleFlavor = (flavorId) => {
    const currentFlavors = formData.pizza_config.flavor_ids || [];
    
    if (currentFlavors.includes(flavorId)) {
      setFormData(prev => ({
        ...prev,
        pizza_config: {
          ...prev.pizza_config,
          flavor_ids: currentFlavors.filter(id => id !== flavorId)
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        pizza_config: {
          ...prev.pizza_config,
          flavor_ids: [...currentFlavors, flavorId]
        }
      }));
    }
  };

  const toggleEdge = (edge) => {
    const currentEdges = formData.pizza_config.edges || [];
    const exists = currentEdges.find(e => e.id === edge.id);
    
    if (exists) {
      setFormData(prev => ({
        ...prev,
        pizza_config: {
          ...prev.pizza_config,
          edges: currentEdges.filter(e => e.id !== edge.id)
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        pizza_config: {
          ...prev.pizza_config,
          edges: [...currentEdges, {
            id: edge.id,
            name: edge.name,
            price: edge.price,
            is_active: edge.is_active,
            is_popular: edge.is_popular
          }]
        }
      }));
    }
  };

  const toggleExtra = (extra) => {
    const currentExtras = formData.pizza_config.extras || [];
    const exists = currentExtras.find(e => e.id === extra.id);
    
    if (exists) {
      setFormData(prev => ({
        ...prev,
        pizza_config: {
          ...prev.pizza_config,
          extras: currentExtras.filter(e => e.id !== extra.id)
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        pizza_config: {
          ...prev.pizza_config,
          extras: [...currentExtras, {
            id: extra.id,
            name: extra.name,
            price: extra.price,
            is_active: extra.is_active
          }]
        }
      }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pizza ? 'Editar' : 'Nova'} entrada do cardapio</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sabor de referencia */}
            {!pizza && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-1 text-gray-900 dark:text-gray-100">1. Sabor de referencia *</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Escolha um sabor inicial para representar a entrada do cardapio.</p>
                </div>
                
                <div className="space-y-3">
                  <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100">Sabores tradicionais</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {flavors.filter(f => f.category === 'tradicional' && f.is_active).map(flavor => (
                      <button
                        key={flavor.id}
                        type="button"
                        onClick={() => handleDefaultFlavorSelect(flavor)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          selectedDefaultFlavor?.id === flavor.id
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 dark:border-orange-400'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {flavor.image && (
                            <img src={flavor.image} alt={flavor.name} className="w-12 h-12 rounded object-cover" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{flavor.name}</p>
                            {selectedDefaultFlavor?.id === flavor.id && (
                              <Badge className="text-xs mt-1 bg-orange-500 dark:bg-orange-600">Selecionado</Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="font-medium text-sm text-gray-900 dark:text-gray-100">Sabores premium</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {flavors.filter(f => f.category === 'premium' && f.is_active).map(flavor => (
                      <button
                        key={flavor.id}
                        type="button"
                        onClick={() => handleDefaultFlavorSelect(flavor)}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          selectedDefaultFlavor?.id === flavor.id
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 dark:border-orange-400'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {flavor.image && (
                            <img src={flavor.image} alt={flavor.name} className="w-12 h-12 rounded object-cover" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{flavor.name}</p>
                            {selectedDefaultFlavor?.id === flavor.id && (
                              <Badge className="text-xs mt-1 bg-orange-500 dark:bg-orange-600">Selecionado</Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Informacoes basicas */}
            {(selectedDefaultFlavor || pizza) && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">2. Base comercial da entrada</h4>
                <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    Sabor de referencia: <strong>{referenceFlavorName}</strong>
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Entrada publica</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {selectedPizzaCategory?.name || 'Selecione uma entrada'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Preco inicial</p>
                    <p className="mt-1 text-sm font-semibold text-orange-600 dark:text-orange-400">
                      {commercialStartingPrice > 0 ? formatCurrency(commercialStartingPrice) : 'Defina um tamanho base'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Sabores liberados</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {formData.pizza_config?.flavor_ids?.length || 0} sabores
                    </p>
                  </div>
                </div>
                
                <div>
                  <Label>Nome da entrada *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Tradicional - 2 sabores"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Este nome representa a entrada generica exibida no cardapio publico.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>Regra da montagem *</Label>
                    <Select 
                      value={pizzaCategories.length > 0 ? (formData.pizza_category_id || '') : (formData.category_id || '')} 
                      onValueChange={(value) => setFormData(prev => 
                        pizzaCategories.length > 0 
                          ? { ...prev, pizza_category_id: value } 
                          : { ...prev, category_id: value }
                      )}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={pizzaCategories.length ? "Ex: Tradicional - 2 sabores" : "Selecione"} />
                      </SelectTrigger>
                      <SelectContent>
                        {pizzaCategories.length > 0 ? (
                          pizzaCategories.map(cat => {
                            const sz = sizes.find(s => s.id === cat.size_id);
                            const label = cat.name || (sz ? `${sz.name} â€¢ ${cat.max_flavors || 1} sabor(es)` : cat.id);
                            return (
                              <SelectItem key={cat.id} value={cat.id}>{label}</SelectItem>
                            );
                          })
                        ) : (
                          categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {pizzaCategories.length ? 'Defina tamanho base e quantidade de sabores na aba Regras de Montagem.' : 'Sem regras de pizza ainda. Crie em Regras de Montagem.'}
                    </p>
                  </div>

                  <div>
                    <Label>Modo de divisao *</Label>
                    <Select 
                      value={formData.division_mode} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, division_mode: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slices">Por fatias (livre)</SelectItem>
                        <SelectItem value="exact">Divisao exata (automatica)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formData.division_mode === 'slices' 
                        ? 'O cliente escolhe a composicao dos sabores livremente.'
                        : 'A montagem divide os sabores automaticamente de forma equilibrada.'
                      }
                    </p>
                  </div>
                </div>

                <div>
                  <Label>Descricao comercial (opcional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva a proposta desta entrada comercial."
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Imagem da entrada (opcional)</Label>
                  <Input type="file" accept="image/*" onChange={handleImageUpload} />
                  {formData.image && (
                    <img src={formData.image} alt="" className="mt-2 w-20 h-20 object-cover rounded" />
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Se nao enviar, sera usada a imagem do sabor de referencia.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <Label className="text-gray-900 dark:text-gray-100">Destaque</Label>
                    <Switch
                      checked={formData.is_highlight}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_highlight: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <Label className="text-gray-900 dark:text-gray-100">Novo</Label>
                    <Switch
                      checked={formData.is_new}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_new: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <Label className="text-gray-900 dark:text-gray-100">Popular</Label>
                    <Switch
                      checked={formData.is_popular}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_popular: checked }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tamanhos */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">Tamanhos disponiveis *</h4>
              <div className="grid gap-2">
                {sizes.map(size => {
                  const isSelected = formData.pizza_config.sizes?.some(s => s.id === size.id);
                  return (
                    <label
                      key={size.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 dark:border-orange-400' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                      }`}
                      onClick={() => toggleSize(size)}
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{size.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {size.slices} fatias â€¢ Ate {size.max_flavors} sabores
                        </p>
                      </div>
                      <div className="text-sm">
                        <p className="text-green-600 dark:text-green-400 font-semibold">{formatCurrency(size.price_tradicional)}</p>
                        <p className="text-orange-600 dark:text-orange-400 font-semibold">{formatCurrency(size.price_premium)}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Sabores */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">Sabores disponiveis *</h4>
              <div className="grid grid-cols-2 gap-2">
                {flavors.map(flavor => {
                  const isSelected = formData.pizza_config.flavor_ids?.includes(flavor.id);
                  return (
                    <label
                      key={flavor.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 dark:border-orange-400' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                      }`}
                      onClick={() => toggleFlavor(flavor.id)}
                    >
                      {flavor.image && (
                        <img src={flavor.image} alt={flavor.name} className="w-12 h-12 rounded object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{flavor.name}</p>
                        <Badge variant="outline" className="text-xs mt-1 dark:border-gray-600 dark:text-gray-300">
                          {flavor.category === 'premium' ? 'Premium' : 'Tradicional'}
                        </Badge>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Bordas */}
            {edges.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Bordas disponiveis (opcional)</h4>
                <div className="grid grid-cols-2 gap-2">
                  {edges.map(edge => {
                    const isSelected = formData.pizza_config.edges?.some(e => e.id === edge.id);
                    return (
                      <label
                        key={edge.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 dark:border-orange-400' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                        onClick={() => toggleEdge(edge)}
                      >
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{edge.name}</p>
                        <p className="text-sm text-orange-600 dark:text-orange-400 font-semibold">{formatCurrency(edge.price)}</p>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Extras */}
            {extras.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Extras disponiveis (opcional)</h4>
                <div className="grid grid-cols-2 gap-2">
                  {extras.map(extra => {
                    const isSelected = formData.pizza_config.extras?.some(e => e.id === extra.id);
                    return (
                      <label
                        key={extra.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 dark:border-orange-400' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                        }`}
                        onClick={() => toggleExtra(extra)}
                      >
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{extra.name}</p>
                        <p className="text-sm text-orange-600 dark:text-orange-400 font-semibold">{formatCurrency(extra.price)}</p>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                className="flex-1 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white">
                {pizza ? 'Salvar entrada' : 'Criar entrada'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
  );
}





