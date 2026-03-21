import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Check,
  Eye,
  Image as ImageIcon,
  LayoutGrid,
  Monitor,
  Palette,
  Save,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppTheme } from '@/components/theme/ThemeProvider';
import { extractColorsFromImage } from '@/utils/extractColorsFromImage';
import { getMenuContextEntityOpts, getMenuContextQueryKeyParts } from '@/utils/tenantScope';
import { usePermission } from '../permissions/usePermission';
import StorefrontThemePreview from './theme/StorefrontThemePreview';
import {
  buildStorefrontThemePayload,
  getContrastRatio,
  getStorefrontLayoutMeta,
  resolveStorefrontTheme,
  STOREFRONT_LAYOUT_OPTIONS,
  STOREFRONT_THEME_PRESETS,
  withAlpha,
} from '@/utils/storefrontTheme';

const GRID_OPTIONS = [2, 3, 4, 5];
const AUTOPLAY_OPTIONS = [3500, 4500, 6000, 8000];
const CARD_STYLE_OPTIONS = [
  { value: 'solid', label: 'Solido', description: 'Mais direto, seguro e legivel.' },
  { value: 'aero', label: 'Aero', description: 'Mais premium, com mais atmosfera visual.' },
];

const COLOR_GROUPS = [
  {
    id: 'branding',
    title: 'Cores principais',
    description: 'O nucleo da identidade da loja. Comece por aqui.',
    fields: [
      { key: 'theme_primary_color', label: 'Cor principal', hint: 'Preco, destaque e decisao.' },
      { key: 'theme_secondary_color', label: 'Cor secundaria', hint: 'Hero, profundidade e atmosfera.' },
      { key: 'theme_accent_color', label: 'Cor de destaque', hint: 'Badges e pontos de apoio.' },
    ],
  },
  {
    id: 'actions',
    title: 'Botoes e acoes',
    description: 'A parte que puxa clique e conversao.',
    fields: [
      { key: 'theme_cta_bg', label: 'Cor dos botoes', hint: 'Botao principal e pontos de acao.' },
      { key: 'theme_cta_text', label: 'Texto do botao', hint: 'Legibilidade do CTA.' },
    ],
  },
  {
    id: 'reading',
    title: 'Fundo e leitura',
    description: 'Conforto visual e qualidade percebida.',
    fields: [
      { key: 'theme_surface_color', label: 'Fundo do cardapio', hint: 'Superficie principal da vitrine.' },
      { key: 'theme_surface_alt_color', label: 'Blocos de apoio', hint: 'Pills, faixas e superficies auxiliares.' },
      { key: 'theme_text_primary', label: 'Texto principal', hint: 'Titulos e informacao central.' },
      { key: 'theme_text_secondary', label: 'Texto secundario', hint: 'Descricoes e suporte.' },
    ],
  },
  {
    id: 'extras',
    title: 'Extras avancados',
    description: 'Ajustes finos para hero, badges e rodape.',
    fields: [
      { key: 'theme_hero_bg', label: 'Fundo do topo', hint: 'Header e hero acompanham esta cor.' },
      { key: 'theme_hero_text', label: 'Texto do topo', hint: 'Leitura sobre o topo da loja.' },
      { key: 'theme_badge_bg', label: 'Fundo das badges', hint: 'Selos, status e microdestaques.' },
      { key: 'theme_badge_text', label: 'Texto das badges', hint: 'Legibilidade dos selos.' },
      { key: 'theme_footer_bg', label: 'Fundo do rodape', hint: 'Fechamento da vitrine publica.' },
      { key: 'theme_footer_text', label: 'Texto do rodape', hint: 'Leitura no rodape.' },
    ],
  },
];

function SectionIntro({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1.5">
        {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p> : null}
        <h3 className="text-xl sm:text-2xl font-semibold text-foreground">{title}</h3>
        {description ? <p className="text-sm leading-relaxed text-muted-foreground max-w-2xl">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function PresetCard({ preset, active, onApply }) {
  return (
    <button
      type="button"
      onClick={() => onApply(preset.key)}
      className="group text-left rounded-[28px] border p-5 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: active
          ? `linear-gradient(145deg, ${withAlpha(preset.primary, 0.16)}, ${withAlpha(preset.surfaceAlt, 0.92)})`
          : `linear-gradient(145deg, ${withAlpha(preset.surface, 0.96)}, ${withAlpha(preset.surfaceAlt, 0.9)})`,
        borderColor: active ? withAlpha(preset.primary, 0.72) : withAlpha(preset.secondary, 0.2),
        boxShadow: active ? `0 22px 44px ${withAlpha(preset.primary, 0.22)}` : '0 12px 30px rgba(15, 23, 42, 0.12)',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-foreground">{preset.label}</p>
            <Badge className="border-0" style={{ backgroundColor: withAlpha(preset.primary, 0.18), color: preset.primary }}>
              {preset.badge}
            </Badge>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground max-w-xs">{preset.description}</p>
        </div>
        {active ? (
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: withAlpha(preset.primary, 0.18), color: preset.primary }}>
            <Check className="w-5 h-5" />
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex items-center gap-3">
        {[preset.primary, preset.secondary, preset.accent, preset.surfaceAlt].map((color) => (
          <span
            key={color}
            className="h-12 flex-1 rounded-2xl border"
            style={{ backgroundColor: color, borderColor: withAlpha(color, 0.4) }}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">Aplicacao imediata no preview</span>
        <span className="font-medium" style={{ color: active ? preset.primary : 'hsl(var(--muted-foreground))' }}>
          {active ? 'Preset ativo' : 'Aplicar preset'}
        </span>
      </div>
    </button>
  );
}
function ColorTokenField({ label, hint, value, onChange, changed }) {
  return (
    <div className="rounded-3xl border p-4 space-y-4 bg-card/90">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            {changed ? (
              <Badge variant="outline" className="border text-[10px] uppercase tracking-wide">
                Ajustado
              </Badge>
            ) : null}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
        </div>
        <div className="px-2.5 py-1 rounded-full border text-[11px] font-mono text-muted-foreground bg-background/70">
          {String(value || '').toUpperCase()}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="relative shrink-0 cursor-pointer">
          <Input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <span
            className="block h-14 w-14 rounded-2xl border shadow-inner"
            style={{ backgroundColor: value, borderColor: withAlpha(value, 0.35) }}
          />
        </label>
        <div className="flex-1 rounded-2xl border p-3 bg-background/60">
          <div className="h-6 rounded-xl" style={{ background: `linear-gradient(135deg, ${withAlpha(value, 0.92)}, ${withAlpha(value, 0.42)})` }} />
        </div>
      </div>

      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 font-mono text-xs bg-background/70"
      />
    </div>
  );
}

function LayoutPreviewMini({ layout, accent }) {
  const patterns = {
    grid: ['grid', 'grid'],
    list: ['list'],
    carousel: ['wide'],
    magazine: ['hero', 'split'],
    masonry: ['masonry', 'masonry'],
  };
  const pattern = patterns[layout] || patterns.grid;

  return (
    <div className="rounded-2xl border p-3 space-y-2 bg-background/60">
      {pattern.map((type, index) => (
        <div key={`${layout}-${index}`} className="grid gap-2 grid-cols-2">
          {type === 'list' ? (
            <div className="col-span-2 h-5 rounded-xl" style={{ backgroundColor: withAlpha(accent, 0.18) }} />
          ) : type === 'wide' ? (
            <div className="col-span-2 h-10 rounded-2xl" style={{ background: `linear-gradient(135deg, ${withAlpha(accent, 0.28)}, ${withAlpha(accent, 0.08)})` }} />
          ) : type === 'hero' ? (
            <div className="col-span-2 h-12 rounded-2xl" style={{ backgroundColor: withAlpha(accent, 0.14) }} />
          ) : type === 'split' ? (
            <>
              <div className="h-8 rounded-xl" style={{ backgroundColor: withAlpha(accent, 0.12) }} />
              <div className="h-8 rounded-xl" style={{ backgroundColor: withAlpha(accent, 0.08) }} />
            </>
          ) : type === 'masonry' ? (
            <>
              <div className="h-7 rounded-xl" style={{ backgroundColor: withAlpha(accent, 0.14) }} />
              <div className="h-10 rounded-xl" style={{ backgroundColor: withAlpha(accent, 0.09) }} />
            </>
          ) : (
            <>
              <div className="h-8 rounded-xl" style={{ backgroundColor: withAlpha(accent, 0.14) }} />
              <div className="h-8 rounded-xl" style={{ backgroundColor: withAlpha(accent, 0.09) }} />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function LayoutOptionCard({ option, active, onSelect, accent }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      className="text-left rounded-3xl border p-4 transition-all hover:-translate-y-0.5"
      style={{
        backgroundColor: active ? withAlpha(accent, 0.08) : 'hsl(var(--card))',
        borderColor: active ? withAlpha(accent, 0.55) : 'hsl(var(--border))',
        boxShadow: active ? `0 16px 34px ${withAlpha(accent, 0.14)}` : 'none',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{option.label}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{option.description}</p>
        </div>
        <Badge variant="outline" className="border text-[10px] uppercase tracking-wide">
          {option.maturity}
        </Badge>
      </div>
      <LayoutPreviewMini layout={option.value} accent={accent} />
    </button>
  );
}

function CardStyleOption({ option, active, onSelect, accent }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      className="text-left rounded-3xl border p-4 transition-all hover:-translate-y-0.5"
      style={{
        backgroundColor: active ? withAlpha(accent, 0.08) : 'hsl(var(--card))',
        borderColor: active ? withAlpha(accent, 0.55) : 'hsl(var(--border))',
        boxShadow: active ? `0 16px 34px ${withAlpha(accent, 0.14)}` : 'none',
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-sm font-semibold text-foreground">{option.label}</p>
          <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
        </div>
        {active ? (
          <div className="w-8 h-8 rounded-2xl flex items-center justify-center" style={{ backgroundColor: withAlpha(accent, 0.15), color: accent }}>
            <Check className="w-4 h-4" />
          </div>
        ) : null}
      </div>
      <div className="rounded-2xl border p-3 bg-background/60 space-y-2">
        <div
          className="rounded-2xl border p-3"
          style={option.value === 'aero'
            ? {
                backgroundColor: withAlpha(accent, 0.12),
                borderColor: withAlpha(accent, 0.24),
                backdropFilter: 'blur(18px)',
              }
            : {
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderColor: 'hsl(var(--border))',
              }}
        >
          <div className="h-3 w-20 rounded-full mb-2" style={{ backgroundColor: withAlpha(accent, 0.18) }} />
          <div className="h-3 w-28 rounded-full" style={{ backgroundColor: withAlpha(accent, 0.08) }} />
        </div>
      </div>
    </button>
  );
}

export default function ThemeTab() {
  const { activeTheme } = useAppTheme();
  const { menuContext } = usePermission();
  const queryClient = useQueryClient();
  const menuContextQueryKey = getMenuContextQueryKeyParts(menuContext);
  const scopedEntityOpts = getMenuContextEntityOpts(menuContext);

  const { data: stores = [] } = useQuery({
    queryKey: ['store', ...menuContextQueryKey],
    queryFn: async () => {
      if (!menuContext) return [];
      return base44.entities.Store.list(null, scopedEntityOpts);
    },
    enabled: !!menuContext,
  });

  const { data: dishes = [] } = useQuery({
    queryKey: ['theme-preview-dishes', ...menuContextQueryKey],
    queryFn: async () => {
      if (!menuContext) return [];
      return base44.entities.Dish.list('order', scopedEntityOpts);
    },
    enabled: !!menuContext,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['theme-preview-categories', ...menuContextQueryKey],
    queryFn: async () => {
      if (!menuContext) return [];
      return base44.entities.Category.list('order', scopedEntityOpts);
    },
    enabled: !!menuContext,
  });

  const store = stores[0] || null;
  const persistedTheme = useMemo(() => buildStorefrontThemePayload(store || {}), [store]);
  const persistedSignature = useMemo(() => JSON.stringify(persistedTheme), [persistedTheme]);
  const [draft, setDraft] = useState(persistedTheme);
  const [isExtractingColors, setIsExtractingColors] = useState(false);
  const [autoApply, setAutoApply] = useState(false);

  useEffect(() => {
    setDraft(persistedTheme);
  }, [persistedSignature]);

  const normalizedDraft = useMemo(() => buildStorefrontThemePayload(draft), [draft]);
  const draftSignature = useMemo(() => JSON.stringify(normalizedDraft), [normalizedDraft]);
  const hasChanges = draftSignature !== persistedSignature;
  const previewTheme = useMemo(
    () => resolveStorefrontTheme(normalizedDraft, { isDark: activeTheme?.mode === 'dark' }),
    [activeTheme?.mode, normalizedDraft],
  );
  const contrastChecks = useMemo(() => {
    const checks = [
      {
        id: 'cta',
        label: 'Botao principal',
        ratio: getContrastRatio(normalizedDraft.theme_cta_bg, normalizedDraft.theme_cta_text),
      },
      {
        id: 'hero',
        label: 'Topo da loja',
        ratio: getContrastRatio(normalizedDraft.theme_hero_bg, normalizedDraft.theme_hero_text),
      },
      {
        id: 'footer',
        label: 'Rodape',
        ratio: getContrastRatio(normalizedDraft.theme_footer_bg, normalizedDraft.theme_footer_text),
      },
      {
        id: 'badge',
        label: 'Badges',
        ratio: getContrastRatio(normalizedDraft.theme_badge_bg, normalizedDraft.theme_badge_text),
      },
    ];

    return checks.map((check) => ({
      ...check,
      ok: Number(check.ratio || 0) >= 4.5,
    }));
  }, [normalizedDraft]);

  const failingChecks = contrastChecks.filter((item) => !item.ok);

  const updateMutation = useMutation({
    mutationFn: async ({ payload }) => {
      if (!store?.id) throw new Error('Loja nao encontrada');
      return base44.entities.Store.update(store.id, payload, scopedEntityOpts);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['store', ...menuContextQueryKey] });
      if (!variables?.silent) {
        toast.success('Tema da loja salvo com sucesso.');
      }
    },
    onError: (error) => {
      toast.error(error?.message || 'Nao foi possivel salvar o tema da loja.');
    },
  });

  useEffect(() => {
    if (!autoApply || !hasChanges || updateMutation.isPending || !store?.id) return undefined;
    const timeout = window.setTimeout(() => {
      updateMutation.mutate({ payload: normalizedDraft, silent: true });
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [autoApply, hasChanges, normalizedDraft, store?.id, updateMutation]);

  const updateDraftField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handlePresetApply = (presetKey) => {
    const preset = STOREFRONT_THEME_PRESETS.find((item) => item.key === presetKey) || STOREFRONT_THEME_PRESETS[0];
    setDraft((current) => ({
      ...current,
      storefront_theme_preset: preset.key,
      theme_primary_color: preset.primary,
      theme_secondary_color: preset.secondary,
      theme_accent_color: preset.accent,
      theme_surface_color: preset.surface,
      theme_surface_alt_color: preset.surfaceAlt,
      theme_cta_bg: preset.primary,
      theme_hero_bg: preset.secondary,
      theme_badge_bg: preset.accent,
      theme_footer_bg: preset.secondary,
    }));
  };

  const extractColorsFromLogo = async () => {
    if (!store?.logo) {
      toast.error('Adicione uma logo em Loja antes de extrair as cores.');
      return;
    }

    setIsExtractingColors(true);
    try {
      const extracted = await extractColorsFromImage(store.logo);
      setDraft((current) => ({
        ...current,
        theme_primary_color: extracted.primary,
        theme_secondary_color: extracted.secondary,
        theme_accent_color: extracted.accent,
        theme_cta_bg: extracted.primary,
        theme_hero_bg: extracted.secondary,
        theme_badge_bg: extracted.accent,
      }));
      toast.success('Cores extraidas da logo e aplicadas ao storefront.');
    } catch (error) {
      console.error('Erro ao extrair cores da logo:', error);
      toast.error('Nao foi possivel extrair as cores da logo.');
    } finally {
      setIsExtractingColors(false);
    }
  };

  const handleReset = () => {
    setDraft(persistedTheme);
    toast.success('Edicao resetada para o ultimo tema salvo.');
  };

  const handleSave = () => {
    updateMutation.mutate({ payload: normalizedDraft, silent: false });
  };

  const saveStatusLabel = updateMutation.isPending
    ? 'Aplicando alteracoes...'
    : autoApply
      ? hasChanges
        ? 'Ajustes aguardando aplicacao automatica'
        : 'Alteracoes sincronizadas automaticamente'
      : hasChanges
        ? 'Voce tem alteracoes prontas para salvar'
        : 'Nenhuma alteracao pendente';

  const inactiveControls = [
    'Gradiente generico do hero',
    'Estilo de botao abstrato',
    'Sombras globais do storefront',
    'Cores do painel administrativo',
  ];

  if (!store) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Tema da loja publica</CardTitle>
            <CardDescription>
              Crie uma loja antes de personalizar a vitrine publica.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8 space-y-8">
      <section
        className="rounded-[32px] border overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${withAlpha(previewTheme.secondary, 0.24)}, ${withAlpha(activeTheme.colors.bgSecondary, 0.94)})`,
          borderColor: withAlpha(previewTheme.primary, 0.16),
          boxShadow: `0 28px 70px ${withAlpha(previewTheme.primary, 0.1)}`,
        }}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_360px] p-6 sm:p-8">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground bg-background/60">
              <Palette className="w-3.5 h-3.5" />
              Storefront Theme V2
            </div>
            <div className="space-y-3 max-w-3xl">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                Estudio visual da loja publica
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-muted-foreground max-w-2xl">
                Aqui a gente cuida da vitrine que o cliente final ve. O tema do painel continua separado. Presets, preview real, guardrails e personalizacao agora seguem um fluxo mais comercial e menos tecnico.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border">AppTheme continua no painel</Badge>
              <Badge variant="outline" className="border">Preview mobile + desktop</Badge>
              <Badge variant="outline" className="border">Tokens oficiais do storefront</Badge>
            </div>
          </div>

          <div className="rounded-[28px] border bg-background/72 backdrop-blur p-5 space-y-4" style={{ borderColor: withAlpha(previewTheme.primary, 0.18) }}>
            <div>
              <p className="text-sm font-semibold text-foreground">Status da edicao</p>
              <p className="text-xs text-muted-foreground mt-1">{saveStatusLabel}</p>
            </div>

            <div className="rounded-2xl border p-4 bg-card/75 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Aplicar automaticamente</p>
                  <p className="text-xs text-muted-foreground">Opcional. Quando ligado, salvamos os ajustes apos pequenas pausas.</p>
                </div>
                <Switch checked={autoApply} onCheckedChange={setAutoApply} />
              </div>
            </div>

            <div className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: withAlpha(previewTheme.surfaceAlt, 0.7), borderColor: previewTheme.borderColor }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Saude visual</p>
                  <p className="text-xs text-muted-foreground">Checamos contraste nos pontos que mais impactam leitura e clique.</p>
                </div>
                <Badge className="border-0" style={{ backgroundColor: failingChecks.length === 0 ? withAlpha(previewTheme.primary, 0.16) : withAlpha('#ef4444', 0.14), color: failingChecks.length === 0 ? previewTheme.primary : '#b91c1c' }}>
                  {failingChecks.length === 0 ? 'Tudo OK' : `${failingChecks.length} ajuste${failingChecks.length > 1 ? 's' : ''}`}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {contrastChecks.map((check) => (
                  <div key={check.id} className="rounded-2xl border px-3 py-2.5" style={{ backgroundColor: check.ok ? withAlpha(previewTheme.primary, 0.06) : withAlpha('#ef4444', 0.08), borderColor: check.ok ? withAlpha(previewTheme.primary, 0.16) : withAlpha('#ef4444', 0.2) }}>
                    <p className="text-xs font-semibold text-foreground">{check.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{check.ratio.toFixed(2)}:1</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={handleReset} disabled={!hasChanges || updateMutation.isPending} className="flex-1">
                Resetar
              </Button>
              <Button type="button" onClick={handleSave} disabled={!hasChanges || updateMutation.isPending} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? 'Salvando...' : 'Salvar tema'}
              </Button>
            </div>
          </div>
        </div>
      </section>
      <section className="space-y-5">
        <SectionIntro
          eyebrow="01. Entrada rapida"
          title="Escolha um ponto de partida bonito"
          description="Os presets agora sao a porta de entrada da tela. Eles aceleram a configuracao e deixam o usuario vendo resultado logo de cara."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {STOREFRONT_THEME_PRESETS.map((preset) => (
            <PresetCard
              key={preset.key}
              preset={preset}
              active={normalizedDraft.storefront_theme_preset === preset.key}
              onApply={handlePresetApply}
            />
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <SectionIntro
          eyebrow="02. Preview principal"
          title="Como seu cliente vera"
          description="O preview agora ocupa o centro da experiencia. Ele usa blocos reais do storefront e prioriza a leitura da vitrine em mobile, sem esconder o desktop."
          action={(
            <Badge variant="outline" className="border px-3 py-1.5">
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Preview fiel
            </Badge>
          )}
        />
        <Card className="border-0 shadow-none bg-transparent">
          <CardContent className="p-0">
            <StorefrontThemePreview store={{ ...store, ...normalizedDraft }} theme={previewTheme} dishes={dishes} categories={categories} />
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <section className="space-y-5">
          <SectionIntro
            eyebrow="03. Personalizacao"
            title="Ajustes com linguagem de negocio"
            description="Organizamos os controles por intencao visual: identidade, conversao, leitura e detalhes finos."
            action={(
              <Button type="button" variant="outline" onClick={extractColorsFromLogo} disabled={isExtractingColors || !store?.logo}>
                <ImageIcon className="w-4 h-4 mr-2" />
                {isExtractingColors ? 'Extraindo...' : 'Usar cores da logo'}
              </Button>
            )}
          />

          <Card className="rounded-[32px] border-0 shadow-none" style={{ backgroundColor: withAlpha(previewTheme.surfaceAlt, 0.38) }}>
            <CardContent className="p-3 sm:p-4">
              <Accordion type="multiple" defaultValue={['branding', 'actions', 'reading']} className="space-y-3">
                {COLOR_GROUPS.map((group) => (
                  <AccordionItem key={group.id} value={group.id} className="rounded-[28px] border bg-card/88 px-5 py-1">
                    <AccordionTrigger className="hover:no-underline py-5">
                      <div className="text-left">
                        <p className="text-base font-semibold text-foreground">{group.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        {group.fields.map((field) => (
                          <ColorTokenField
                            key={field.key}
                            label={field.label}
                            hint={field.hint}
                            value={normalizedDraft[field.key]}
                            onChange={(value) => updateDraftField(field.key, value)}
                            changed={normalizedDraft[field.key] !== persistedTheme[field.key]}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-5">
          <SectionIntro
            eyebrow="04. Layout e estilo"
            title="Escolha a apresentacao da vitrine"
            description="Layout mobile, layout desktop e estilo de card agora aparecem como escolhas visuais, nao como selects soltos."
          />

          <Card className="rounded-[32px] border-0 shadow-none" style={{ backgroundColor: withAlpha(previewTheme.surfaceAlt, 0.38) }}>
            <CardContent className="p-5 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Smartphone className="w-4 h-4" /> Layout mobile</p>
                    <p className="text-xs text-muted-foreground mt-1">Melhor equilibrio entre vitrine, leitura e navegacao em telas pequenas.</p>
                  </div>
                  <Badge variant="outline" className="border">{getStorefrontLayoutMeta(normalizedDraft.menu_layout_mobile).maturity}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {STOREFRONT_LAYOUT_OPTIONS.map((option) => (
                    <LayoutOptionCard
                      key={`mobile-${option.value}`}
                      option={option}
                      active={normalizedDraft.menu_layout_mobile === option.value}
                      onSelect={(value) => updateDraftField('menu_layout_mobile', value)}
                      accent={previewTheme.primary}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Monitor className="w-4 h-4" /> Layout desktop</p>
                    <p className="text-xs text-muted-foreground mt-1">Mais area para catalogo, banners e densidade visual controlada.</p>
                  </div>
                  <Badge variant="outline" className="border">{getStorefrontLayoutMeta(normalizedDraft.menu_layout_desktop).maturity}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {STOREFRONT_LAYOUT_OPTIONS.map((option) => (
                    <LayoutOptionCard
                      key={`desktop-${option.value}`}
                      option={option}
                      active={normalizedDraft.menu_layout_desktop === option.value}
                      onSelect={(value) => updateDraftField('menu_layout_desktop', value)}
                      accent={previewTheme.secondary}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> Estilo de card</p>
                  <p className="text-xs text-muted-foreground mt-1">Defina se a leitura vai ser mais direta ou mais atmosferica.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {CARD_STYLE_OPTIONS.map((option) => (
                    <CardStyleOption
                      key={option.value}
                      option={option}
                      active={normalizedDraft.theme_menu_card_style === option.value}
                      onSelect={(value) => updateDraftField('theme_menu_card_style', value)}
                      accent={previewTheme.accent}
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Colunas no desktop</Label>
                  <Select value={String(normalizedDraft.menu_grid_cols_desktop)} onValueChange={(value) => updateDraftField('menu_grid_cols_desktop', Number(value))}>
                    <SelectTrigger className="h-12 rounded-2xl bg-background/70"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GRID_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>{option} colunas</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Velocidade do carrossel</Label>
                  <Select value={String(normalizedDraft.menu_autoplay_interval_ms)} onValueChange={(value) => updateDraftField('menu_autoplay_interval_ms', Number(value))}>
                    <SelectTrigger className="h-12 rounded-2xl bg-background/70"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AUTOPLAY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>{`${option / 1000}s`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-0 shadow-none" style={{ backgroundColor: withAlpha(previewTheme.surfaceAlt, 0.38) }}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: withAlpha(previewTheme.primary, 0.14), color: previewTheme.primary }}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Transparencia do modulo</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mantivemos fora da UI principal tudo o que ainda nao chega ao storefront de forma confiavel.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {inactiveControls.map((label) => (
                  <Badge key={label} variant="outline" className="border text-xs">{label}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
