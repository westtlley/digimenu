import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Eye, Image as ImageIcon, LayoutGrid, Monitor, Palette, Save, ShieldCheck, Sparkles, Smartphone, Wand2 } from 'lucide-react';
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

function ColorField({ label, value, onChange, hint }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
      </div>
      <div className="flex items-center gap-3">
        <Input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-16 rounded-xl p-1" />
        <Input value={value} onChange={(event) => onChange(event.target.value)} className="h-11 font-mono text-sm" />
      </div>
    </div>
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

  useEffect(() => {
    setDraft(persistedTheme);
  }, [persistedSignature]);

  const normalizedDraft = useMemo(() => buildStorefrontThemePayload(draft), [draft]);
  const hasChanges = JSON.stringify(normalizedDraft) !== persistedSignature;
  const previewTheme = useMemo(
    () => resolveStorefrontTheme(normalizedDraft, { isDark: activeTheme?.mode === 'dark' }),
    [activeTheme?.mode, normalizedDraft],
  );

  const contrastChecks = useMemo(() => {
    const checks = [
      {
        id: 'cta',
        label: 'CTA principal',
        ratio: getContrastRatio(normalizedDraft.theme_cta_bg, normalizedDraft.theme_cta_text),
      },
      {
        id: 'hero',
        label: 'Hero',
        ratio: getContrastRatio(normalizedDraft.theme_hero_bg, normalizedDraft.theme_hero_text),
      },
      {
        id: 'footer',
        label: 'Footer',
        ratio: getContrastRatio(normalizedDraft.theme_footer_bg, normalizedDraft.theme_footer_text),
      },
      {
        id: 'badge',
        label: 'Badge',
        ratio: getContrastRatio(normalizedDraft.theme_badge_bg, normalizedDraft.theme_badge_text),
      },
    ];

    return checks.map((check) => ({
      ...check,
      ok: Number(check.ratio || 0) >= 4.5,
    }));
  }, [normalizedDraft]);

  const updateMutation = useMutation({
    mutationFn: async (payload) => {
      if (!store?.id) throw new Error('Loja nao encontrada');
      return base44.entities.Store.update(store.id, payload, scopedEntityOpts);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['store', ...menuContextQueryKey] });
      toast.success('Tema da loja salvo com sucesso.');
    },
    onError: (error) => {
      toast.error(error?.message || 'Nao foi possivel salvar o tema da loja.');
    },
  });

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
    updateMutation.mutate(normalizedDraft);
  };

  const inactiveControls = [
    'Gradiente do hero',
    'Estilo de botao generico',
    'Sombras globais',
    'Cores avancadas do painel',
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
    <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-6">
      <div
        className="rounded-3xl border p-5 sm:p-6"
        style={{
          background: `linear-gradient(135deg, ${withAlpha(activeTheme.colors.accent, 0.14)}, ${withAlpha(activeTheme.colors.bgSecondary, 0.96)})`,
          borderColor: activeTheme.colors.borderColor,
        }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: withAlpha(activeTheme.colors.accent, 0.18), color: activeTheme.colors.accent }}>
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Storefront Theme V2</h2>
                <p className="text-sm text-muted-foreground">Branding da loja publica, separado do tema do painel.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border">AppTheme continua no painel</Badge>
              <Badge variant="outline" className="border">StorefrontTheme agora tem contrato proprio</Badge>
              <Badge variant="outline" className="border">Preview mobile + desktop</Badge>
            </div>
          </div>

          <div className="rounded-2xl border px-4 py-3 max-w-md" style={{ backgroundColor: 'hsl(var(--card))', borderColor: activeTheme.colors.borderColor }}>
            <p className="text-sm font-semibold text-foreground mb-1">O que este modulo altera</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hero, categorias, cards, CTA, banners de destaque e footer da loja publica. O tema do admin continua separado e nao e editado aqui.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5" /> Presets comerciais</CardTitle>
              <CardDescription>
                Presets seguros para acelerar a criacao de uma loja bonita sem adivinhacao.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {STOREFRONT_THEME_PRESETS.map((preset) => {
                const isActive = normalizedDraft.storefront_theme_preset === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handlePresetApply(preset.key)}
                    className="text-left rounded-2xl border p-4 transition-all hover:-translate-y-0.5"
                    style={{
                      backgroundColor: isActive ? withAlpha(preset.primary, 0.08) : 'hsl(var(--card))',
                      borderColor: isActive ? preset.primary : 'hsl(var(--border))',
                      boxShadow: isActive ? `0 16px 30px ${withAlpha(preset.primary, 0.16)}` : 'none',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="font-semibold text-foreground">{preset.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
                      </div>
                      <Badge className="border-0" style={{ backgroundColor: withAlpha(preset.primary, 0.14), color: preset.primary }}>
                        {preset.badge}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      {[preset.primary, preset.secondary, preset.accent, preset.surfaceAlt].map((color) => (
                        <span key={color} className="w-10 h-10 rounded-xl border" style={{ backgroundColor: color, borderColor: withAlpha(color, 0.4) }} />
                      ))}
                    </div>
                    {isActive ? (
                      <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium" style={{ color: preset.primary }}>
                        <Check className="w-3.5 h-3.5" /> Preset aplicado
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wand2 className="w-5 h-5" /> Tokens oficiais do storefront</CardTitle>
              <CardDescription>
                So mostramos o que ja chega de verdade na vitrine publica.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4" style={{ backgroundColor: withAlpha(previewTheme.surfaceAlt, 0.7), borderColor: previewTheme.borderColor }}>
                <div>
                  <p className="text-sm font-semibold text-foreground">Extrair paleta da logo</p>
                  <p className="text-xs text-muted-foreground">Mantemos esse atalho porque ele ja ajuda bastante no onboarding visual.</p>
                </div>
                <Button type="button" variant="outline" onClick={extractColorsFromLogo} disabled={isExtractingColors || !store?.logo}>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {isExtractingColors ? 'Extraindo...' : 'Usar cores da logo'}
                </Button>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <ColorField label="Primaria" value={normalizedDraft.theme_primary_color} onChange={(value) => updateDraftField('theme_primary_color', value)} hint="Preco e destaque" />
                <ColorField label="Secundaria" value={normalizedDraft.theme_secondary_color} onChange={(value) => updateDraftField('theme_secondary_color', value)} hint="Hero e profundidade" />
                <ColorField label="Accent" value={normalizedDraft.theme_accent_color} onChange={(value) => updateDraftField('theme_accent_color', value)} hint="Badges e pontos de apoio" />
                <ColorField label="Surface" value={normalizedDraft.theme_surface_color} onChange={(value) => updateDraftField('theme_surface_color', value)} hint="Fundo principal do cardapio" />
                <ColorField label="Surface alt" value={normalizedDraft.theme_surface_alt_color} onChange={(value) => updateDraftField('theme_surface_alt_color', value)} hint="Pills, secoes e blocos auxiliares" />
                <ColorField label="Texto primario" value={normalizedDraft.theme_text_primary} onChange={(value) => updateDraftField('theme_text_primary', value)} hint="Titulos e blocos de leitura" />
                <ColorField label="Texto secundario" value={normalizedDraft.theme_text_secondary} onChange={(value) => updateDraftField('theme_text_secondary', value)} hint="Descricoes e suporte" />
                <ColorField label="CTA fundo" value={normalizedDraft.theme_cta_bg} onChange={(value) => updateDraftField('theme_cta_bg', value)} hint="Botao principal" />
                <ColorField label="CTA texto" value={normalizedDraft.theme_cta_text} onChange={(value) => updateDraftField('theme_cta_text', value)} hint="Legibilidade do CTA" />
                <ColorField label="Hero fundo" value={normalizedDraft.theme_hero_bg} onChange={(value) => updateDraftField('theme_hero_bg', value)} hint="Header e topo da vitrine" />
                <ColorField label="Hero texto" value={normalizedDraft.theme_hero_text} onChange={(value) => updateDraftField('theme_hero_text', value)} hint="Texto sobre o hero" />
                <ColorField label="Badge fundo" value={normalizedDraft.theme_badge_bg} onChange={(value) => updateDraftField('theme_badge_bg', value)} hint="Badges e microdestaques" />
                <ColorField label="Badge texto" value={normalizedDraft.theme_badge_text} onChange={(value) => updateDraftField('theme_badge_text', value)} hint="Legibilidade das badges" />
                <ColorField label="Footer fundo" value={normalizedDraft.theme_footer_bg} onChange={(value) => updateDraftField('theme_footer_bg', value)} hint="Rodape da loja" />
                <ColorField label="Footer texto" value={normalizedDraft.theme_footer_text} onChange={(value) => updateDraftField('theme_footer_text', value)} hint="Texto do rodape" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><LayoutGrid className="w-5 h-5" /> Layouts e comportamento</CardTitle>
              <CardDescription>
                Mobile e desktop com maturidade clara: recomendado, avancado ou experimental.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Smartphone className="w-4 h-4" /> Layout mobile</Label>
                  <Select value={normalizedDraft.menu_layout_mobile} onValueChange={(value) => updateDraftField('menu_layout_mobile', value)}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STOREFRONT_LAYOUT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} • {option.maturity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{getStorefrontLayoutMeta(normalizedDraft.menu_layout_mobile).description}</p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Monitor className="w-4 h-4" /> Layout desktop</Label>
                  <Select value={normalizedDraft.menu_layout_desktop} onValueChange={(value) => updateDraftField('menu_layout_desktop', value)}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STOREFRONT_LAYOUT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} • {option.maturity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{getStorefrontLayoutMeta(normalizedDraft.menu_layout_desktop).description}</p>
                </div>

                <div className="space-y-2">
                  <Label>Estilo de card</Label>
                  <Select value={normalizedDraft.theme_menu_card_style} onValueChange={(value) => updateDraftField('theme_menu_card_style', value)}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CARD_STYLE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {CARD_STYLE_OPTIONS.find((option) => option.value === normalizedDraft.theme_menu_card_style)?.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Colunas no desktop</Label>
                  <Select value={String(normalizedDraft.menu_grid_cols_desktop)} onValueChange={(value) => updateDraftField('menu_grid_cols_desktop', Number(value))}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GRID_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>{option} colunas</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Mantemos apenas densidades realmente usaveis.</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Autoplay do carrossel</Label>
                  <Select value={String(normalizedDraft.menu_autoplay_interval_ms)} onValueChange={(value) => updateDraftField('menu_autoplay_interval_ms', Number(value))}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AUTOPLAY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>{`${option / 1000}s`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">So tem efeito real quando o layout escolhido e carrossel.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Guardrails e transparencia</CardTitle>
              <CardDescription>
                Menos mentira, mais previsibilidade. Se um controle nao chega ao storefront, ele sai da UI principal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {contrastChecks.map((check) => (
                  <div
                    key={check.id}
                    className="rounded-2xl border p-4"
                    style={{
                      backgroundColor: check.ok ? withAlpha(previewTheme.primary, 0.06) : withAlpha('#ef4444', 0.08),
                      borderColor: check.ok ? withAlpha(previewTheme.primary, 0.18) : withAlpha('#ef4444', 0.25),
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-foreground">{check.label}</p>
                      <Badge className="border-0" style={{ backgroundColor: check.ok ? withAlpha(previewTheme.primary, 0.16) : withAlpha('#ef4444', 0.16), color: check.ok ? previewTheme.primary : '#b91c1c' }}>
                        {check.ok ? 'OK' : 'Ajustar'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Contraste atual: {check.ratio.toFixed(2)}:1</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border p-4" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                <p className="text-sm font-semibold text-foreground mb-3">Controles retirados deste lote</p>
                <div className="flex flex-wrap gap-2">
                  {inactiveControls.map((label) => (
                    <Badge key={label} variant="outline" className="border text-xs">{label}</Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Eles voltam quando tiverem efeito real no storefront. Por enquanto, preferimos uma UI honesta a um configurador que promete mais do que entrega.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-4 self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5" /> Preview real da vitrine</CardTitle>
              <CardDescription>
                O preview usa blocos reais do storefront e prioriza os dados atuais da sua loja quando eles existem.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StorefrontThemePreview store={{ ...store, ...normalizedDraft }} theme={previewTheme} dishes={dishes} categories={categories} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 rounded-3xl border bg-background/95 backdrop-blur p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'hsl(var(--border))' }}>
        <div>
          <p className="text-sm font-semibold text-foreground">Tema da loja publica</p>
          <p className="text-xs text-muted-foreground">
            AppTheme do painel segue separado. Aqui salvamos apenas o contrato oficial do storefront.
          </p>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={handleReset} disabled={!hasChanges || updateMutation.isPending}>
            Resetar edicao
          </Button>
          <Button type="button" onClick={handleSave} disabled={!hasChanges || updateMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? 'Salvando...' : 'Salvar tema'}
          </Button>
        </div>
      </div>
    </div>
  );
}
