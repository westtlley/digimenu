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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Check,
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
import { useLanguage } from '@/i18n/LanguageContext';
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
  { value: 'solid', label: 'Solido', description: 'Leitura direta e segura para menus densos.' },
  { value: 'aero', label: 'Aero', description: 'Mais atmosfera e acabamento premium.' },
];

const COLOR_GROUPS = [
  {
    id: 'branding',
    title: 'Cores principais',
    description: 'A base da identidade visual da loja.',
    fields: [
      { key: 'theme_primary_color', label: 'Cor principal', hint: 'Preco, destaque e decisao.' },
      { key: 'theme_secondary_color', label: 'Cor secundária', hint: 'Topo, profundidade e clima.' },
      { key: 'theme_accent_color', label: 'Cor de destaque', hint: 'Badges e pontos de apoio.' },
    ],
  },
  {
    id: 'actions',
    title: 'Botões e ações',
    description: 'Os pontos que puxam clique e conversão.',
    fields: [
      { key: 'theme_cta_bg', label: 'Cor dos botões', hint: 'CTA principal e chamadas fortes.' },
      { key: 'theme_cta_text', label: 'Texto do botão', hint: 'Legibilidade do CTA.' },
    ],
  },
  {
    id: 'reading',
    title: 'Fundo e leitura',
    description: 'Conforto visual e qualidade percebida.',
    fields: [
      { key: 'theme_surface_color', label: 'Fundo do cardápio', hint: 'Superfície principal da vitrine.' },
      { key: 'theme_surface_alt_color', label: 'Blocos de apoio', hint: 'Pills, faixas e seções auxiliares.' },
      { key: 'theme_text_primary', label: 'Texto principal', hint: 'Títulos e informações centrais.' },
      { key: 'theme_text_secondary', label: 'Texto secundário', hint: 'Descrições e apoio.' },
    ],
  },
  {
    id: 'extras',
    title: 'Extras avancados',
    description: 'Hero, badges e rodape.',
    fields: [
      { key: 'theme_hero_bg', label: 'Fundo do topo', hint: 'Header e hero neste lote.' },
      { key: 'theme_hero_text', label: 'Texto do topo', hint: 'Leitura sobre o hero.' },
      { key: 'theme_badge_bg', label: 'Fundo das badges', hint: 'Selos e microdestaques.' },
      { key: 'theme_badge_text', label: 'Texto das badges', hint: 'Legibilidade dos selos.' },
      { key: 'theme_footer_bg', label: 'Fundo do rodape', hint: 'Fechamento da vitrine.' },
      { key: 'theme_footer_text', label: 'Texto do rodape', hint: 'Leitura no rodape.' },
    ],
  },
];

function CompactHeader({ title, description, action }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">{description}</p>
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
      className="text-left rounded-[24px] border p-5 transition-all hover:-translate-y-0.5"
      style={{
        background: active
          ? `linear-gradient(145deg, ${withAlpha(preset.primary, 0.14)}, ${withAlpha(preset.surfaceAlt, 0.92)})`
          : `linear-gradient(145deg, ${withAlpha(preset.surface, 0.96)}, ${withAlpha(preset.surfaceAlt, 0.88)})`,
        borderColor: active ? withAlpha(preset.primary, 0.64) : withAlpha(preset.secondary, 0.18),
        boxShadow: active ? `0 18px 38px ${withAlpha(preset.primary, 0.18)}` : '0 10px 24px rgba(15, 23, 42, 0.08)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-semibold text-foreground">{preset.label}</p>
            <Badge className="border-0" style={{ backgroundColor: withAlpha(preset.primary, 0.16), color: preset.primary }}>
              {preset.badge}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{preset.description}</p>
        </div>
        {active ? (
          <div className="w-8 h-8 rounded-2xl flex items-center justify-center" style={{ backgroundColor: withAlpha(preset.primary, 0.16), color: preset.primary }}>
            <Check className="w-4 h-4" />
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex gap-2.5">
        {[preset.primary, preset.secondary, preset.accent, preset.surfaceAlt].map((color) => (
          <span key={color} className="h-11 flex-1 rounded-2xl border" style={{ backgroundColor: color, borderColor: withAlpha(color, 0.38) }} />
        ))}
      </div>
    </button>
  );
}

function CompactColorField({ label, hint, value, onChange, changed }) {
  return (
    <div className="rounded-2xl border p-4 bg-card/90 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground">{label}</p>
            {changed ? <Badge variant="outline" className="border text-[10px]">Novo</Badge> : null}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
        </div>
        <label className="relative shrink-0 cursor-pointer">
          <Input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
          <span className="block h-11 w-11 rounded-xl border shadow-inner" style={{ backgroundColor: value, borderColor: withAlpha(value, 0.35) }} />
        </label>
      </div>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="h-10 font-mono text-xs bg-background/70" />
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
            <div className="col-span-2 h-4 rounded-xl" style={{ backgroundColor: withAlpha(accent, 0.16) }} />
          ) : type === 'wide' ? (
            <div className="col-span-2 h-8 rounded-2xl" style={{ background: `linear-gradient(135deg, ${withAlpha(accent, 0.26)}, ${withAlpha(accent, 0.08)})` }} />
          ) : type === 'hero' ? (
            <div className="col-span-2 h-10 rounded-2xl" style={{ backgroundColor: withAlpha(accent, 0.14) }} />
          ) : type === 'split' ? (
            <>
              <div className="h-7 rounded-xl" style={{ backgroundColor: withAlpha(accent, 0.12) }} />
              <div className="h-7 rounded-xl" style={{ backgroundColor: withAlpha(accent, 0.08) }} />
            </>
          ) : type === 'masonry' ? (
            <>
              <div className="h-6 rounded-xl" style={{ backgroundColor: withAlpha(accent, 0.14) }} />
              <div className="h-9 rounded-xl" style={{ backgroundColor: withAlpha(accent, 0.09) }} />
            </>
          ) : (
            <>
              <div className="h-7 rounded-xl" style={{ backgroundColor: withAlpha(accent, 0.14) }} />
              <div className="h-7 rounded-xl" style={{ backgroundColor: withAlpha(accent, 0.09) }} />
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
      className="text-left rounded-2xl border p-4 transition-all hover:-translate-y-0.5"
      style={{
        backgroundColor: active ? withAlpha(accent, 0.08) : 'hsl(var(--card))',
        borderColor: active ? withAlpha(accent, 0.52) : 'hsl(var(--border))',
        boxShadow: active ? `0 14px 30px ${withAlpha(accent, 0.12)}` : 'none',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-medium text-foreground">{option.label}</p>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{option.description}</p>
        </div>
        <Badge variant="outline" className="border text-[10px] uppercase tracking-wide">{option.maturity}</Badge>
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
      className="text-left rounded-2xl border p-4 transition-all hover:-translate-y-0.5"
      style={{
        backgroundColor: active ? withAlpha(accent, 0.08) : 'hsl(var(--card))',
        borderColor: active ? withAlpha(accent, 0.52) : 'hsl(var(--border))',
        boxShadow: active ? `0 14px 30px ${withAlpha(accent, 0.12)}` : 'none',
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-medium text-foreground">{option.label}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{option.description}</p>
        </div>
        {active ? (
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: withAlpha(accent, 0.15), color: accent }}>
            <Check className="w-4 h-4" />
          </div>
        ) : null}
      </div>
      <div className="rounded-2xl border p-4 bg-background/60">
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
  const { t } = useLanguage();
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
  const [editorTab, setEditorTab] = useState('colors');
  const [layoutTarget, setLayoutTarget] = useState('mobile');

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
      { id: 'cta', label: 'Botao principal', ratio: getContrastRatio(normalizedDraft.theme_cta_bg, normalizedDraft.theme_cta_text) },
      { id: 'hero', label: 'Topo da loja', ratio: getContrastRatio(normalizedDraft.theme_hero_bg, normalizedDraft.theme_hero_text) },
      { id: 'footer', label: 'Rodape', ratio: getContrastRatio(normalizedDraft.theme_footer_bg, normalizedDraft.theme_footer_text) },
      { id: 'badge', label: 'Badges', ratio: getContrastRatio(normalizedDraft.theme_badge_bg, normalizedDraft.theme_badge_text) },
    ];

    return checks.map((check) => ({ ...check, ok: Number(check.ratio || 0) >= 4.5 }));
  }, [normalizedDraft]);

  const failingChecks = contrastChecks.filter((item) => !item.ok);
  const mainColorGroups = COLOR_GROUPS.filter((group) => group.id !== 'extras');
  const extrasGroup = COLOR_GROUPS.find((group) => group.id === 'extras');

  const updateMutation = useMutation({
    mutationFn: async ({ payload }) => {
      if (!store?.id) throw new Error('Loja não encontrada');
      return base44.entities.Store.update(store.id, payload, scopedEntityOpts);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['store', ...menuContextQueryKey] });
      if (!variables?.silent) {
        toast.success(t('theme.saveSuccess', 'Tema da loja salvo com sucesso.'));
      }
    },
    onError: (error) => {
      toast.error(error?.message || t('theme.saveError', 'Não foi possível salvar o tema da loja.'));
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
      toast.error(t('theme.logoRequired', 'A loja precisa ter uma logo para extrair a paleta.'));
      return;
    }

    try {
      setIsExtractingColors(true);
      const extracted = await extractColorsFromImage(store.logo);
      if (!extracted?.primary) {
        toast.error(t('theme.insufficientColors', 'Não foi possível extrair cores suficientes da logo.'));
        return;
      }

      setDraft((current) => ({
        ...current,
        storefront_theme_preset: current.storefront_theme_preset || 'amber',
        theme_primary_color: extracted.primary || current.theme_primary_color,
        theme_secondary_color: extracted.secondary || current.theme_secondary_color,
        theme_accent_color: extracted.accent || current.theme_accent_color,
        theme_cta_bg: extracted.primary || current.theme_cta_bg,
        theme_hero_bg: extracted.secondary || current.theme_hero_bg,
        theme_badge_bg: extracted.accent || current.theme_badge_bg,
        theme_footer_bg: extracted.secondary || current.theme_footer_bg,
      }));
      toast.success(t('theme.paletteApplied', 'Paleta aplicada com base na logo.'));
    } catch (error) {
      toast.error(error?.message || t('theme.extractError', 'Não foi possível extrair as cores da logo.'));
    } finally {
      setIsExtractingColors(false);
    }
  };

  const handleReset = () => {
    setDraft(persistedTheme);
    toast.success(t('theme.discarded', 'Alterações visuais descartadas.'));
  };

  const handleSave = () => {
    updateMutation.mutate({ payload: normalizedDraft, silent: false });
  };

  const saveStatusLabel = updateMutation.isPending
    ? 'Salvando...'
    : hasChanges
      ? autoApply
        ? 'Aplicação automática ligada'
        : 'Alterações prontas para salvar'
      : 'Tudo sincronizado';

  const currentLayoutValue = layoutTarget === 'mobile'
    ? normalizedDraft.menu_layout_mobile
    : normalizedDraft.menu_layout_desktop;

  const saveLayoutValue = (value) => {
    updateDraftField(layoutTarget === 'mobile' ? 'menu_layout_mobile' : 'menu_layout_desktop', value);
  };

  const inactiveControls = [
    'Gradientes e sombras globais',
    'Estilos de botao extras',
    'Variantes decorativas que não chegam à vitrine real',
  ];

  if (!store) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Card className="rounded-[28px] border-dashed">
          <CardHeader>
            <CardTitle>Nenhuma loja encontrada</CardTitle>
            <CardDescription>
              O studio de vitrine precisa de uma loja carregada para editar o tema público.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-5 sm:px-6 xl:px-8 2xl:px-10 space-y-6">
      <Card className="rounded-[30px] border bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="border text-[11px]">
                  Storefront Theme V2
                </Badge>
                <Badge className="border-0 bg-primary/10 text-primary">Vitrine da loja</Badge>
                {failingChecks.length > 0 ? (
                  <Badge variant="outline" className="border-amber-400/40 text-amber-600">
                    {failingChecks.length} contraste(s) pedem ajuste
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-emerald-400/40 text-emerald-600">
                    Contraste em dia
                  </Badge>
                )}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                  Estudio visual da sua loja
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
                  Escolha um preset, veja o preview real e ajuste so o que realmente chega na vitrine publica.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(210px,1fr)_auto] xl:min-w-[420px]">
              <div className="rounded-[22px] border bg-background/60 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Fluxo de edicao</p>
                    <p className="text-xs text-muted-foreground">Menos cliques e menos scroll desnecessario.</p>
                  </div>
                  <Switch checked={autoApply} onCheckedChange={setAutoApply} />
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="font-medium text-foreground">Aplicar automaticamente</p>
                    <p className="text-muted-foreground">
                      {autoApply ? 'Mudancas sao salvas apos uma pausa curta.' : 'Use o botao salvar quando terminar.'}
                    </p>
                  </div>
                  <Badge variant="outline" className="border text-[10px]">
                    {saveStatusLabel}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-2">
                <Button variant="outline" className="w-full sm:w-auto" onClick={handleReset} disabled={!hasChanges || updateMutation.isPending}>
                  {t('theme.discard', 'Descartar')}
                </Button>
                <Button className="w-full sm:w-auto gap-2" onClick={handleSave} disabled={!hasChanges || updateMutation.isPending}>
                  <Save className="w-4 h-4" />
                  {t('theme.saveTheme', 'Salvar tema')}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(520px,1fr)_minmax(460px,1.04fr)] 2xl:grid-cols-[minmax(560px,0.98fr)_minmax(540px,1.02fr)] items-start">
        <div className="space-y-5">
          <Card className="rounded-[28px] border">
            <CardHeader className="pb-4">
              <CompactHeader
                title="Presets comerciais"
                description="Comece por uma direcao segura. Os presets aplicam a base visual da vitrine de uma vez."
              />
            </CardHeader>
            <CardContent className="pt-0">
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
            </CardContent>
          </Card>

          <Tabs value={editorTab} onValueChange={setEditorTab} className="space-y-4">
            <TabsList className="grid h-auto grid-cols-3 rounded-[20px] p-1.5 bg-muted/70">
              <TabsTrigger value="colors" className="rounded-2xl py-2.5 text-xs sm:text-sm gap-2">
                <Palette className="w-4 h-4" />
                {t('theme.colors', 'Cores')}
              </TabsTrigger>
              <TabsTrigger value="layout" className="rounded-2xl py-2.5 text-xs sm:text-sm gap-2">
                <LayoutGrid className="w-4 h-4" />
                {t('theme.layout', 'Layout')}
              </TabsTrigger>
              <TabsTrigger value="advanced" className="rounded-2xl py-2.5 text-xs sm:text-sm gap-2">
                <ShieldCheck className="w-4 h-4" />
                {t('theme.extras', 'Extras')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="colors" className="mt-0">
              <Card className="rounded-[28px] border">
                <CardHeader className="pb-4">
                  <CompactHeader
                    title="Personalização principal"
                    description="As cores abaixo realmente aparecem no storefront. Você ajusta marca, leitura e conversão sem afundar a página em campos técnicos."
                    action={(
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={extractColorsFromLogo}
                        disabled={isExtractingColors || !store?.logo}
                      >
                        <ImageIcon className="w-4 h-4" />
                        {isExtractingColors ? t('theme.extracting', 'Extraindo...') : t('theme.useLogoColors', 'Usar cores da logo')}
                      </Button>
                    )}
                  />
                </CardHeader>
                <CardContent className="pt-0">
                  <Accordion type="multiple" defaultValue={['branding']} className="space-y-3">
                    {mainColorGroups.map((group) => (
                      <AccordionItem key={group.id} value={group.id} className="border rounded-[22px] px-4 bg-card/70">
                        <AccordionTrigger className="py-4 hover:no-underline">
                          <div className="text-left">
                            <p className="text-sm font-semibold text-foreground">{group.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{group.description}</p>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            {group.fields.map((field) => (
                              <CompactColorField
                                key={field.key}
                                label={field.label}
                                hint={field.hint}
                                value={normalizedDraft[field.key]}
                                changed={normalizedDraft[field.key] !== persistedTheme[field.key]}
                                onChange={(value) => updateDraftField(field.key, value)}
                              />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="layout" className="mt-0">
              <Card className="rounded-[28px] border">
                <CardHeader className="pb-4">
                  <CompactHeader
                    title="Layout e estilo"
                    description="Escolha como o cliente navega no mobile e no desktop. Mostramos um grupo por vez para a decisao ficar leve."
                  />
                </CardHeader>
                <CardContent className="pt-0 space-y-5">
                  <div className="inline-flex items-center gap-2 rounded-full border p-1 bg-muted/40">
                    {[
                      { key: 'mobile', label: 'Mobile', icon: Smartphone },
                      { key: 'desktop', label: 'Desktop', icon: Monitor },
                    ].map((item) => {
                      const Icon = item.icon;
                      const active = layoutTarget === item.key;
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setLayoutTarget(item.key)}
                          className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors"
                          style={active
                            ? { backgroundColor: previewTheme.ctaBg, color: previewTheme.ctaText }
                            : { color: previewTheme.textSecondary }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {STOREFRONT_LAYOUT_OPTIONS.map((option) => (
                      <LayoutOptionCard
                        key={`${layoutTarget}-${option.value}`}
                        option={option}
                        active={currentLayoutValue === option.value}
                        onSelect={saveLayoutValue}
                        accent={previewTheme.primary}
                      />
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Estilo do card</p>
                      <p className="text-xs text-muted-foreground mt-1">Muda o acabamento dos produtos sem trocar o layout.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {CARD_STYLE_OPTIONS.map((option) => (
                        <CardStyleOption
                          key={option.value}
                          option={option}
                          active={normalizedDraft.theme_menu_card_style === option.value}
                          onSelect={(value) => updateDraftField('theme_menu_card_style', value)}
                          accent={previewTheme.primary}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="rounded-[22px] border bg-card/70">
                      <CardContent className="p-4 space-y-2">
                        <Label className="text-sm font-medium">Colunas no desktop</Label>
                        <Select
                          value={String(normalizedDraft.menu_grid_cols_desktop)}
                          onValueChange={(value) => updateDraftField('menu_grid_cols_desktop', Number(value))}
                        >
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GRID_OPTIONS.map((value) => (
                              <SelectItem key={value} value={String(value)}>
                                {value} colunas
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    <Card className="rounded-[22px] border bg-card/70">
                      <CardContent className="p-4 space-y-2">
                        <Label className="text-sm font-medium">Ritmo do carrossel</Label>
                        <Select
                          value={String(normalizedDraft.menu_autoplay_interval_ms)}
                          onValueChange={(value) => updateDraftField('menu_autoplay_interval_ms', Number(value))}
                        >
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AUTOPLAY_OPTIONS.map((value) => (
                              <SelectItem key={value} value={String(value)}>
                                {(value / 1000).toFixed(1).replace('.', ',')} segundos
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="mt-0">
              <div className="space-y-4">
                <Card className="rounded-[28px] border">
                  <CardHeader className="pb-4">
                    <CompactHeader
                      title="Ajustes extras"
                      description="Hero, badge e rodapé ficam aqui para não competir com o básico. Só abra quando precisar lapidar o acabamento."
                    />
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Accordion type="single" collapsible defaultValue="">
                      <AccordionItem value="extras" className="border rounded-[22px] px-4 bg-card/70">
                        <AccordionTrigger className="py-4 hover:no-underline">
                          <div className="text-left">
                            <p className="text-sm font-semibold text-foreground">{extrasGroup?.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{extrasGroup?.description}</p>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            {extrasGroup?.fields.map((field) => (
                              <CompactColorField
                                key={field.key}
                                label={field.label}
                                hint={field.hint}
                                value={normalizedDraft[field.key]}
                                changed={normalizedDraft[field.key] !== persistedTheme[field.key]}
                                onChange={(value) => updateDraftField(field.key, value)}
                              />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>

                <div className="grid gap-4 xl:grid-cols-2">
                  <Card className="rounded-[24px] border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Saúde visual</CardTitle>
                      <CardDescription>Cheque rápido de contraste nos pontos que mais afetam leitura.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2">
                      {contrastChecks.map((check) => (
                        <div key={check.id} className="rounded-2xl border p-3 bg-card/70">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">{check.label}</p>
                            <Badge
                              variant="outline"
                              className={check.ok ? 'border-emerald-400/40 text-emerald-600' : 'border-amber-400/40 text-amber-600'}
                            >
                              {check.ok ? 'OK' : 'Ajustar'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Contraste {Number(check.ratio || 0).toFixed(2)}:1
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="rounded-[24px] border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">O que fica para depois</CardTitle>
                      <CardDescription>
                        Limpamos a tela e deixamos visível só o que hoje chega de verdade na vitrine.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="rounded-2xl border p-3 bg-card/70">
                        <p className="text-sm font-medium text-foreground">Controles pausados neste lote</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {inactiveControls.map((item) => (
                            <Badge key={item} variant="outline" className="border text-[11px]">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border p-3 bg-card/70 text-sm text-muted-foreground leading-relaxed">
                        O studio agora prioriza identidade, leitura e CTA. Itens decorativos ou inconsistentes saíram da rota principal para evitar promessa falsa.
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="xl:sticky xl:top-6 self-start">
          <Card className="rounded-[30px] border overflow-hidden">
            <CardHeader className="pb-4">
              <CompactHeader
                title="Preview da vitrine"
                description="O preview fica em destaque o tempo todo para o usuário decidir olhando o resultado, não uma lista de campos."
              />
            </CardHeader>
            <CardContent className="pt-0">
              <StorefrontThemePreview
                store={{ ...store, ...normalizedDraft }}
                theme={previewTheme}
                dishes={dishes}
                categories={categories}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}



