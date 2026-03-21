import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, LayoutGrid, MapPin, Monitor, ShoppingCart, Smartphone, Store } from 'lucide-react';
import MenuLayoutWrapper from '@/components/menu/MenuLayoutWrapper';
import { formatCurrency } from '@/utils/formatters';
import { getStorefrontLayoutMeta, withAlpha } from '@/utils/storefrontTheme';

const FALLBACK_CATEGORIES = [
  { id: 'cat-burgers', name: 'Mais pedidos' },
  { id: 'cat-combos', name: 'Combos' },
  { id: 'cat-drinks', name: 'Bebidas' },
];

const FALLBACK_DISHES = [
  {
    id: 'preview-1',
    name: 'Burger da casa',
    description: 'Pao brioche, burger alto, cheddar e molho especial.',
    price: 32.9,
    original_price: 37.9,
    category_id: 'cat-burgers',
    is_popular: true,
    is_highlight: true,
  },
  {
    id: 'preview-2',
    name: 'Combo executivo',
    description: 'Prato principal, acompanhamento e bebida com leitura comercial forte.',
    price: 42.9,
    category_id: 'cat-combos',
    product_type: 'combo',
    is_new: true,
  },
  {
    id: 'preview-3',
    name: 'Limonada premium',
    description: 'Bebida gelada para testar contraste e CTA.',
    price: 11.9,
    category_id: 'cat-drinks',
    product_type: 'beverage',
  },
  {
    id: 'preview-4',
    name: 'Sobremesa assinatura',
    description: 'Finalizacao visual para testar cards e superficies.',
    price: 19.9,
    category_id: 'cat-combos',
    is_popular: true,
  },
];

const previewStockUtils = {
  isOutOfStock: () => false,
  isLowStock: () => false,
};

function getPreviewCategories(categories = [], dishes = []) {
  const safeCategories = Array.isArray(categories)
    ? categories.filter((category) => category?.is_active !== false)
    : [];

  if (safeCategories.length > 0) {
    return safeCategories.slice(0, 4).map((category) => ({
      id: String(category?.id || category?.name || Math.random()),
      name: category?.name || 'Categoria',
    }));
  }

  const discovered = [];
  const seen = new Set();
  (Array.isArray(dishes) ? dishes : []).forEach((dish) => {
    const categoryId = String(dish?.category_id || '');
    if (!categoryId || seen.has(categoryId)) return;
    seen.add(categoryId);
    discovered.push({ id: categoryId, name: `Categoria ${discovered.length + 1}` });
  });

  return discovered.length > 0 ? discovered.slice(0, 4) : FALLBACK_CATEGORIES;
}

function getPreviewDishes(dishes = [], categories = []) {
  const safeDishes = Array.isArray(dishes)
    ? dishes.filter((dish) => dish?.is_active !== false && dish?.name && dish?.price !== undefined)
    : [];

  if (safeDishes.length > 0) {
    const normalizedCategories = getPreviewCategories(categories, safeDishes);
    const categoryIds = new Set(normalizedCategories.map((category) => String(category.id)));
    const filtered = safeDishes.filter((dish) => {
      const categoryId = String(dish?.category_id || '');
      return !categoryId || categoryIds.has(categoryId);
    });
    return (filtered.length > 0 ? filtered : safeDishes).slice(0, 6).map((dish, index) => ({
      ...dish,
      id: String(dish?.id || `preview-real-${index}`),
      description: dish?.description || 'Descricao breve para ajudar no preview visual.',
    }));
  }

  return FALLBACK_DISHES;
}

function PreviewFrame({ label, icon: Icon, layout, theme, store, dishes, categories, compact = false }) {
  const layoutMeta = getStorefrontLayoutMeta(layout);
  const previewStoreName = store?.name || 'Sua loja';
  const previewSlogan = store?.slogan || 'Preview real do storefront com hero, categorias, cards e CTA.';

  return (
    <div
      className="rounded-[28px] border shadow-sm overflow-hidden"
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.borderColor,
        boxShadow: `0 24px 50px ${withAlpha(theme.primary, compact ? 0.12 : 0.16)}`,
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b" style={{ borderColor: theme.borderColor, backgroundColor: withAlpha(theme.surfaceAlt, 0.9) }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: withAlpha(theme.primary, 0.16), color: theme.primary }}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: theme.textPrimary }}>{label}</p>
            <p className="text-[11px] truncate" style={{ color: theme.textSecondary }}>{layoutMeta.label} • {layoutMeta.maturity}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border text-[10px] uppercase tracking-wide"
          style={{ borderColor: withAlpha(theme.badgeBg, 0.35), color: theme.badgeBg, backgroundColor: withAlpha(theme.badgeBg, 0.12) }}
        >
          Preview
        </Badge>
      </div>

      <div className="p-4 space-y-4" style={{ background: `linear-gradient(180deg, ${withAlpha(theme.surfaceAlt, 0.85)}, ${theme.surface})` }}>
        <section
          className="rounded-[24px] overflow-hidden border"
          style={{
            background: `linear-gradient(135deg, ${theme.heroOverlayStart}, ${theme.heroOverlayEnd})`,
            color: theme.heroText,
            borderColor: theme.heroChromeBorder,
          }}
        >
          <div className="p-4 md:p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {store?.logo ? (
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border" style={{ borderColor: theme.heroChromeBorder, backgroundColor: withAlpha(theme.surface, 0.92) }}>
                    <img src={store.logo} alt={previewStoreName} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center border" style={{ borderColor: theme.heroChromeBorder, backgroundColor: theme.heroChromeBg }}>
                    <Store className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-bold text-base truncate">{previewStoreName}</h3>
                  <p className="text-xs leading-relaxed line-clamp-2" style={{ color: withAlpha(theme.heroText, 0.8) }}>{previewSlogan}</p>
                </div>
              </div>
              <Badge className="border-0" style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}>
                Loja aberta
              </Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-2xl px-3 py-2 flex items-center gap-2 text-xs" style={{ backgroundColor: theme.heroChromeBg, border: `1px solid ${theme.heroChromeBorder}` }}>
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">Endereco da loja visivel com contraste real</span>
              </div>
              <div className="rounded-2xl px-3 py-2 flex items-center gap-2 text-xs" style={{ backgroundColor: theme.heroChromeBg, border: `1px solid ${theme.heroChromeBorder}` }}>
                <Clock className="w-3.5 h-3.5" />
                <span className="truncate">Hoje • 18:00 as 02:00</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold"
                style={{ backgroundColor: theme.ctaBg, color: theme.ctaText, boxShadow: `0 14px 28px ${withAlpha(theme.ctaBg, 0.26)}` }}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Pedir agora
              </button>
              <span className="text-xs" style={{ color: withAlpha(theme.heroText, 0.78) }}>
                CTA e badge ja respondem ao tema real
              </span>
            </div>
          </div>
        </section>

        <div className="flex gap-2 overflow-hidden">
          {categories.map((category, index) => {
            const active = index === 0;
            return (
              <div
                key={category.id}
                className="px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap border"
                style={active
                  ? {
                      backgroundColor: theme.ctaBg,
                      color: theme.ctaText,
                      borderColor: withAlpha(theme.ctaBg, 0.18),
                    }
                  : {
                      backgroundColor: withAlpha(theme.surfaceAlt, 0.96),
                      color: theme.textSecondary,
                      borderColor: theme.borderColor,
                    }}
              >
                {category.name}
              </div>
            );
          })}
        </div>

        <div className="rounded-[24px] border p-3 md:p-4 overflow-hidden" style={{ backgroundColor: withAlpha(theme.surface, 0.95), borderColor: theme.borderColor }}>
          <div className="pointer-events-none select-none">
            <MenuLayoutWrapper
              layout={layout}
              dishes={compact ? dishes.slice(0, 4) : dishes}
              onDishClick={() => {}}
              primaryColor={theme.primary}
              textPrimaryColor={theme.textPrimary}
              textSecondaryColor={theme.textSecondary}
              loading={false}
              stockUtils={previewStockUtils}
              formatCurrency={formatCurrency}
              slug={null}
              gridColsDesktop={theme.menu_grid_cols_desktop}
              autoplayIntervalMs={theme.menu_autoplay_interval_ms}
              menuCardStyle={theme.theme_menu_card_style}
              theme={theme}
            />
          </div>
        </div>

        <section className="rounded-[24px] border p-4" style={{ backgroundColor: withAlpha(theme.surfaceAlt, 0.92), borderColor: theme.borderColor }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Banner comercial</p>
              <p className="text-xs" style={{ color: theme.textSecondary }}>CTA, superficies e contraste respondendo ao storefront.</p>
            </div>
            <button
              type="button"
              className="rounded-2xl px-4 py-2 text-xs font-semibold"
              style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
            >
              Ver oferta
            </button>
          </div>
        </section>
      </div>

      <footer className="px-4 py-3 text-xs flex items-center justify-between gap-3" style={{ backgroundColor: theme.footerBg, color: theme.footerText }}>
        <span className="truncate">Footer da loja com identidade propria</span>
        <span className="font-semibold">{previewStoreName}</span>
      </footer>
    </div>
  );
}

export default function StorefrontThemePreview({ store, theme, dishes, categories }) {
  const previewCategories = useMemo(() => getPreviewCategories(categories, dishes), [categories, dishes]);
  const previewDishes = useMemo(() => getPreviewDishes(dishes, previewCategories), [dishes, previewCategories]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: theme.textPrimary }}>Preview fiel da vitrine</p>
          <p className="text-xs" style={{ color: theme.textSecondary }}>
            Hero, categorias, cards, CTA e footer usando o mesmo contrato do storefront.
          </p>
        </div>
        <Badge
          variant="outline"
          className="border text-[11px]"
          style={{ borderColor: withAlpha(theme.primary, 0.3), color: theme.primary, backgroundColor: withAlpha(theme.primary, 0.08) }}
        >
          Menos mock, mais produto real
        </Badge>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <PreviewFrame
          label="Mobile"
          icon={Smartphone}
          layout={theme.menu_layout_mobile}
          theme={theme}
          store={store}
          dishes={previewDishes}
          categories={previewCategories}
          compact
        />
        <PreviewFrame
          label="Desktop"
          icon={Monitor}
          layout={theme.menu_layout_desktop}
          theme={theme}
          store={store}
          dishes={previewDishes}
          categories={previewCategories}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border p-3" style={{ backgroundColor: theme.surface, borderColor: theme.borderColor }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: theme.primary }}>
            <LayoutGrid className="w-4 h-4" />
            <span className="text-sm font-semibold">Layout mobile</span>
          </div>
          <p className="text-xs" style={{ color: theme.textSecondary }}>{getStorefrontLayoutMeta(theme.menu_layout_mobile).description}</p>
        </div>
        <div className="rounded-2xl border p-3" style={{ backgroundColor: theme.surface, borderColor: theme.borderColor }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: theme.primary }}>
            <LayoutGrid className="w-4 h-4" />
            <span className="text-sm font-semibold">Layout desktop</span>
          </div>
          <p className="text-xs" style={{ color: theme.textSecondary }}>{getStorefrontLayoutMeta(theme.menu_layout_desktop).description}</p>
        </div>
        <div className="rounded-2xl border p-3" style={{ backgroundColor: theme.surface, borderColor: theme.borderColor }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: theme.primary }}>
            <ShoppingCart className="w-4 h-4" />
            <span className="text-sm font-semibold">Estilo de card</span>
          </div>
          <p className="text-xs" style={{ color: theme.textSecondary }}>
            {theme.theme_menu_card_style === 'aero'
              ? 'Aero: camada mais premium e atmosferica.'
              : 'Solido: leitura mais direta e segura para operacao.'}
          </p>
        </div>
      </div>
    </div>
  );
}
