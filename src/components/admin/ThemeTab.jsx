import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Palette, 
  Save, 
  Check, 
  Sparkles, 
  Zap, 
  Eye, 
  Sun, 
  Moon, 
  Monitor,
  Brush,
  Settings,
  Download,
  Upload,
  RotateCcw,
  Star,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme, THEME_PRESETS } from '@/components/theme/ThemeProvider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PRESET_COLORS = [
  { name: 'Laranja', primary: '#f97316', secondary: '#1f2937', accent: '#eab308' },
  { name: 'Verde', primary: '#22c55e', secondary: '#1f2937', accent: '#10b981' },
  { name: 'Azul', primary: '#3b82f6', secondary: '#1e293b', accent: '#0ea5e9' },
  { name: 'Vermelho', primary: '#ef4444', secondary: '#1f2937', accent: '#f97316' },
  { name: 'Roxo', primary: '#8b5cf6', secondary: '#1e1b4b', accent: '#a855f7' },
  { name: 'Rosa', primary: '#ec4899', secondary: '#1f2937', accent: '#f472b6' },
];

const GRADIENT_PRESETS = [
  { name: 'Sunset', start: '#ff6b6b', end: '#ffd93d', direction: 'to-br' },
  { name: 'Ocean', start: '#667eea', end: '#764ba2', direction: 'to-r' },
  { name: 'Fire', start: '#ff416c', end: '#ff4b2b', direction: 'to-r' },
  { name: 'Forest', start: '#134e5e', end: '#71b280', direction: 'to-br' },
  { name: 'Aurora', start: '#a8edea', end: '#fed6e3', direction: 'to-r' },
  { name: 'Royal', start: '#141e30', end: '#243b55', direction: 'to-br' },
];

const DIRECTION_LABELS = {
  'to-r': '→ Horizontal',
  'to-br': '↘ Diagonal SE',
  'to-b': '↓ Vertical',
  'to-bl': '↙ Diagonal SO',
  'to-l': '← Horizontal Inv.',
  'to-tl': '↖ Diagonal NO',
  'to-t': '↑ Vertical Inv.',
  'to-tr': '↗ Diagonal NE',
};

export default function ThemeTab() {
  const { 
    currentTheme, 
    activeTheme, 
    customTheme,
    setTheme, 
    setCustomThemeColors, 
    resetToPreset,
    themes 
  } = useTheme();

  const [colors, setColors] = useState({
    theme_primary_color: '#f97316',
    theme_secondary_color: '#1f2937',
    theme_accent_color: '#eab308',
    theme_gradient_enabled: false,
    theme_gradient_start: '#f97316',
    theme_gradient_end: '#ef4444',
    theme_gradient_direction: 'to-r',
    theme_button_style: 'rounded',
    theme_shadow_enabled: true,
  });

  const [customColors, setCustomColors] = useState({
    bgPrimary: activeTheme.colors.bgPrimary,
    bgSecondary: activeTheme.colors.bgSecondary,
    bgCard: activeTheme.colors.bgCard,
    textPrimary: activeTheme.colors.textPrimary,
    textSecondary: activeTheme.colors.textSecondary,
    borderColor: activeTheme.colors.borderColor,
    accent: activeTheme.colors.accent,
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({
    queryKey: ['store'],
    queryFn: () => base44.entities.Store.list(),
  });

  const store = stores[0];

  useEffect(() => {
    if (store) {
      setColors({
        theme_primary_color: store.theme_primary_color || '#f97316',
        theme_secondary_color: store.theme_secondary_color || '#1f2937',
        theme_accent_color: store.theme_accent_color || '#eab308',
        theme_gradient_enabled: store.theme_gradient_enabled || false,
        theme_gradient_start: store.theme_gradient_start || '#f97316',
        theme_gradient_end: store.theme_gradient_end || '#ef4444',
        theme_gradient_direction: store.theme_gradient_direction || 'to-r',
        theme_button_style: store.theme_button_style || 'rounded',
        theme_shadow_enabled: store.theme_shadow_enabled !== false,
      });
    }
  }, [store]);

  useEffect(() => {
    setCustomColors({
      bgPrimary: activeTheme.colors.bgPrimary,
      bgSecondary: activeTheme.colors.bgSecondary,
      bgCard: activeTheme.colors.bgCard,
      textPrimary: activeTheme.colors.textPrimary,
      textSecondary: activeTheme.colors.textSecondary,
      borderColor: activeTheme.colors.borderColor,
      accent: activeTheme.colors.accent,
    });
  }, [activeTheme]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Store.update(store.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store'] });
      setHasChanges(false);
      toast.success('Tema salvo com sucesso!');
    },
  });

  const handleColorChange = (key, value) => {
    setColors(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleCustomColorChange = (key, value) => {
    const newColors = { ...customColors, [key]: value };
    setCustomColors(newColors);
    setCustomThemeColors(newColors);
    setHasChanges(true);
  };

  const applyPreset = (preset) => {
    setColors(prev => ({
      ...prev,
      theme_primary_color: preset.primary,
      theme_secondary_color: preset.secondary,
      theme_accent_color: preset.accent,
    }));
    setHasChanges(true);
  };

  const applyGradientPreset = (preset) => {
    setColors(prev => ({
      ...prev,
      theme_gradient_start: preset.start,
      theme_gradient_end: preset.end,
      theme_gradient_direction: preset.direction,
      theme_gradient_enabled: true,
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    setShowConfirm(true);
  };

  const confirmSave = () => {
    updateMutation.mutate({ ...store, ...colors });
    setShowConfirm(false);
  };

  const getGradientStyle = () => {
    if (!colors.theme_gradient_enabled) {
      return { backgroundColor: colors.theme_primary_color };
    }
    const directionMap = {
      'to-r': 'to right',
      'to-br': 'to bottom right',
      'to-b': 'to bottom',
      'to-bl': 'to bottom left',
      'to-l': 'to left',
      'to-tl': 'to top left',
      'to-t': 'to top',
      'to-tr': 'to top right',
    };
    return {
      background: `linear-gradient(${directionMap[colors.theme_gradient_direction]}, ${colors.theme_gradient_start}, ${colors.theme_gradient_end})`
    };
  };

  const getButtonClass = () => {
    const base = 'px-4 py-2 text-white font-medium transition-all';
    const shadow = colors.theme_shadow_enabled ? 'shadow-lg hover:shadow-xl' : '';
    const style = {
      'rounded': 'rounded-lg',
      'square': 'rounded-none',
      'pill': 'rounded-full',
    }[colors.theme_button_style];
    return `${base} ${style} ${shadow}`;
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header com gradiente */}
      <div 
        className="relative rounded-2xl p-6 sm:p-8 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${activeTheme.colors.accent}15, ${activeTheme.colors.accent}05)`,
          border: `1px solid ${activeTheme.colors.borderColor}`
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${activeTheme.colors.accent}20` }}
            >
              <Palette className="w-6 h-6" style={{ color: activeTheme.colors.accent }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: activeTheme.colors.textPrimary }}>
                Personalização de Temas
              </h2>
              <p className="text-sm" style={{ color: activeTheme.colors.textSecondary }}>
                Configure a aparência do seu painel administrativo
              </p>
            </div>
          </div>
        </div>
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, ${activeTheme.colors.accent} 0%, transparent 50%)`
          }}
        />
      </div>

      <Tabs defaultValue="presets" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6" style={{ backgroundColor: activeTheme.colors.bgSecondary }}>
          <TabsTrigger value="presets" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
            <Star className="w-4 h-4 mr-2" />
            Temas
          </TabsTrigger>
          <TabsTrigger value="colors" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
            <Palette className="w-4 h-4 mr-2" />
            Cores
          </TabsTrigger>
          <TabsTrigger value="gradient" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
            <Sparkles className="w-4 h-4 mr-2" />
            Gradientes
          </TabsTrigger>
          <TabsTrigger value="advanced" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
            <Settings className="w-4 h-4 mr-2" />
            Avançado
          </TabsTrigger>
        </TabsList>

        {/* Presets Tab */}
        <TabsContent value="presets" className="space-y-6">
          <Card style={{ backgroundColor: activeTheme.colors.bgCard, borderColor: activeTheme.colors.borderColor }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Temas Pré-definidos
              </CardTitle>
              <CardDescription>
                Escolha um tema pronto ou personalize suas cores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(themes).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setTheme(key);
                      resetToPreset();
                    }}
                    className={`relative p-4 rounded-xl border-2 transition-all text-left group ${
                      currentTheme === key && !customTheme
                        ? 'ring-2 ring-offset-2'
                        : 'hover:border-opacity-60'
                    }`}
                    style={{
                      backgroundColor: theme.colors.bgCard,
                      borderColor: currentTheme === key && !customTheme 
                        ? activeTheme.colors.accent 
                        : activeTheme.colors.borderColor,
                      ringColor: activeTheme.colors.accent,
                    }}
                  >
                    {currentTheme === key && !customTheme && (
                      <div className="absolute top-2 right-2">
                        <Badge 
                          className="bg-green-500 text-white"
                          style={{ backgroundColor: activeTheme.colors.accent }}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Ativo
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-3">
                      {theme.mode === 'dark' ? (
                        <Moon className="w-5 h-5" style={{ color: theme.colors.accent }} />
                      ) : (
                        <Sun className="w-5 h-5" style={{ color: theme.colors.accent }} />
                      )}
                      <div>
                        <h3 className="font-semibold" style={{ color: theme.colors.textPrimary }}>
                          {theme.name}
                        </h3>
                        <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                          {theme.mode === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div 
                        className="w-8 h-8 rounded-lg"
                        style={{ backgroundColor: theme.colors.bgPrimary }}
                      />
                      <div 
                        className="w-8 h-8 rounded-lg"
                        style={{ backgroundColor: theme.colors.bgSecondary }}
                      />
                      <div 
                        className="w-8 h-8 rounded-lg"
                        style={{ backgroundColor: theme.colors.accent }}
                      />
                    </div>
                  </button>
                ))}
              </div>

              {customTheme && (
                <div className="mt-6 p-4 rounded-lg border-2 border-dashed" style={{ borderColor: activeTheme.colors.borderColor }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold" style={{ color: activeTheme.colors.textPrimary }}>
                        Tema Personalizado
                      </h3>
                      <p className="text-sm" style={{ color: activeTheme.colors.textSecondary }}>
                        Você está usando um tema customizado
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={resetToPreset}
                      size="sm"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Resetar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-6">
          {/* Preview */}
          <Card style={{ backgroundColor: activeTheme.colors.bgCard, borderColor: activeTheme.colors.borderColor }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Preview em Tempo Real
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3 items-center flex-wrap">
                  <div 
                    className={getButtonClass()}
                    style={getGradientStyle()}
                  >
                    Botão Primário
                  </div>
                  <div 
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: colors.theme_secondary_color }}
                  >
                    Secundário
                  </div>
                  <div 
                    className="px-4 py-2 rounded-lg text-white font-medium"
                    style={{ backgroundColor: colors.theme_accent_color }}
                  >
                    Destaque
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-4 rounded-lg" style={{ backgroundColor: colors.theme_primary_color }}>
                    <p className="text-white text-sm font-medium">Primária</p>
                    <p className="text-white text-xs opacity-80">{colors.theme_primary_color}</p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: colors.theme_secondary_color }}>
                    <p className="text-white text-sm font-medium">Secundária</p>
                    <p className="text-white text-xs opacity-80">{colors.theme_secondary_color}</p>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: colors.theme_accent_color }}>
                    <p className="text-white text-sm font-medium">Destaque</p>
                    <p className="text-white text-xs opacity-80">{colors.theme_accent_color}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Presets */}
          <Card style={{ backgroundColor: activeTheme.colors.bgCard, borderColor: activeTheme.colors.borderColor }}>
            <CardHeader>
              <CardTitle>Temas de Cores Prontos</CardTitle>
              <CardDescription>Escolha uma paleta de cores pré-definida</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {PRESET_COLORS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className={`p-3 rounded-xl border-2 hover:border-opacity-60 transition-all text-center group ${
                      colors.theme_primary_color === preset.primary 
                        ? 'ring-2 ring-offset-2' 
                        : ''
                    }`}
                    style={{
                      borderColor: colors.theme_primary_color === preset.primary 
                        ? activeTheme.colors.accent 
                        : activeTheme.colors.borderColor,
                      ringColor: activeTheme.colors.accent,
                    }}
                  >
                    <div className="flex gap-1 justify-center mb-2">
                      <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: preset.primary }} />
                      <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: preset.secondary }} />
                      <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: preset.accent }} />
                    </div>
                    <span className="text-xs font-medium">{preset.name}</span>
                    {colors.theme_primary_color === preset.primary && (
                      <Check className="w-3 h-3 mx-auto mt-1" style={{ color: activeTheme.colors.accent }} />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Custom Colors */}
          <Card style={{ backgroundColor: activeTheme.colors.bgCard, borderColor: activeTheme.colors.borderColor }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brush className="w-5 h-5" />
                Cores Personalizadas
              </CardTitle>
              <CardDescription>Ajuste cada cor individualmente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-6">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Cor Primária</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={colors.theme_primary_color}
                      onChange={(e) => handleColorChange('theme_primary_color', e.target.value)}
                      className="w-14 h-12 rounded-lg border-2 cursor-pointer"
                      style={{ borderColor: activeTheme.colors.borderColor }}
                    />
                    <Input
                      value={colors.theme_primary_color}
                      onChange={(e) => handleColorChange('theme_primary_color', e.target.value)}
                      className="font-mono uppercase text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Cor Secundária</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={colors.theme_secondary_color}
                      onChange={(e) => handleColorChange('theme_secondary_color', e.target.value)}
                      className="w-14 h-12 rounded-lg border-2 cursor-pointer"
                      style={{ borderColor: activeTheme.colors.borderColor }}
                    />
                    <Input
                      value={colors.theme_secondary_color}
                      onChange={(e) => handleColorChange('theme_secondary_color', e.target.value)}
                      className="font-mono uppercase text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Cor de Destaque</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={colors.theme_accent_color}
                      onChange={(e) => handleColorChange('theme_accent_color', e.target.value)}
                      className="w-14 h-12 rounded-lg border-2 cursor-pointer"
                      style={{ borderColor: activeTheme.colors.borderColor }}
                    />
                    <Input
                      value={colors.theme_accent_color}
                      onChange={(e) => handleColorChange('theme_accent_color', e.target.value)}
                      className="font-mono uppercase text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Theme Colors */}
          <Card style={{ backgroundColor: activeTheme.colors.bgCard, borderColor: activeTheme.colors.borderColor }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Cores Avançadas do Tema
              </CardTitle>
              <CardDescription>Personalize cores de fundo, texto e bordas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(customColors).map(([key, value]) => (
                  <div key={key}>
                    <Label className="text-xs font-medium mb-2 block capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={value}
                        onChange={(e) => handleCustomColorChange(key, e.target.value)}
                        className="w-12 h-10 rounded-lg border-2 cursor-pointer"
                        style={{ borderColor: activeTheme.colors.borderColor }}
                      />
                      <Input
                        value={value}
                        onChange={(e) => handleCustomColorChange(key, e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gradient Tab */}
        <TabsContent value="gradient" className="space-y-6">
          <Card style={{ backgroundColor: activeTheme.colors.bgCard, borderColor: activeTheme.colors.borderColor }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Habilitar Gradiente</CardTitle>
                  <CardDescription>Aplica efeito de gradiente nos botões primários</CardDescription>
                </div>
                <Switch
                  checked={colors.theme_gradient_enabled}
                  onCheckedChange={(checked) => handleColorChange('theme_gradient_enabled', checked)}
                />
              </div>
            </CardHeader>
          </Card>

          {colors.theme_gradient_enabled && (
            <>
              <Card style={{ backgroundColor: activeTheme.colors.bgCard, borderColor: activeTheme.colors.borderColor }}>
                <CardHeader>
                  <CardTitle>Preview do Gradiente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div 
                    className="w-full h-32 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg"
                    style={getGradientStyle()}
                  >
                    Gradiente Aplicado
                  </div>
                </CardContent>
              </Card>

              <Card style={{ backgroundColor: activeTheme.colors.bgCard, borderColor: activeTheme.colors.borderColor }}>
                <CardHeader>
                  <CardTitle>Gradientes Prontos</CardTitle>
                  <CardDescription>Escolha um gradiente pré-definido</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {GRADIENT_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        onClick={() => applyGradientPreset(preset)}
                        className="group relative overflow-hidden rounded-xl border-2 transition-all"
                        style={{
                          borderColor: colors.theme_gradient_start === preset.start && colors.theme_gradient_end === preset.end
                            ? activeTheme.colors.accent
                            : activeTheme.colors.borderColor
                        }}
                      >
                        <div 
                          className="h-20 flex items-center justify-center text-white font-medium"
                          style={{
                            background: `linear-gradient(${preset.direction === 'to-r' ? 'to right' : preset.direction === 'to-br' ? 'to bottom right' : 'to right'}, ${preset.start}, ${preset.end})`
                          }}
                        >
                          {preset.name}
                        </div>
                        {colors.theme_gradient_start === preset.start && colors.theme_gradient_end === preset.end && (
                          <div className="absolute top-2 right-2 bg-white rounded-full p-1">
                            <Check className="w-3 h-3" style={{ color: activeTheme.colors.accent }} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card style={{ backgroundColor: activeTheme.colors.bgCard, borderColor: activeTheme.colors.borderColor }}>
                <CardHeader>
                  <CardTitle>Gradiente Personalizado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Cor Inicial</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={colors.theme_gradient_start}
                            onChange={(e) => handleColorChange('theme_gradient_start', e.target.value)}
                            className="w-14 h-12 rounded-lg border-2 cursor-pointer"
                            style={{ borderColor: activeTheme.colors.borderColor }}
                          />
                          <Input
                            value={colors.theme_gradient_start}
                            onChange={(e) => handleColorChange('theme_gradient_start', e.target.value)}
                            className="font-mono uppercase text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Cor Final</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={colors.theme_gradient_end}
                            onChange={(e) => handleColorChange('theme_gradient_end', e.target.value)}
                            className="w-14 h-12 rounded-lg border-2 cursor-pointer"
                            style={{ borderColor: activeTheme.colors.borderColor }}
                          />
                          <Input
                            value={colors.theme_gradient_end}
                            onChange={(e) => handleColorChange('theme_gradient_end', e.target.value)}
                            className="font-mono uppercase text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Direção do Gradiente</Label>
                      <Select
                        value={colors.theme_gradient_direction}
                        onValueChange={(value) => handleColorChange('theme_gradient_direction', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DIRECTION_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced" className="space-y-6">
          <Card style={{ backgroundColor: activeTheme.colors.bgCard, borderColor: activeTheme.colors.borderColor }}>
            <CardHeader>
              <CardTitle>Estilo dos Botões</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'rounded', label: 'Arredondado', class: 'rounded-lg' },
                  { value: 'square', label: 'Quadrado', class: 'rounded-none' },
                  { value: 'pill', label: 'Pílula', class: 'rounded-full' },
                ].map(style => (
                  <button
                    key={style.value}
                    onClick={() => handleColorChange('theme_button_style', style.value)}
                    className={`p-4 border-2 transition-all ${
                      colors.theme_button_style === style.value 
                        ? 'ring-2 ring-offset-2' 
                        : ''
                    }`}
                    style={{
                      borderColor: colors.theme_button_style === style.value 
                        ? activeTheme.colors.accent 
                        : activeTheme.colors.borderColor,
                      ringColor: activeTheme.colors.accent,
                    }}
                  >
                    <div 
                      className={`w-full h-10 ${style.class} mb-2 flex items-center justify-center text-white text-xs font-medium`}
                      style={{ backgroundColor: activeTheme.colors.accent }}
                    >
                      Exemplo
                    </div>
                    <span className="text-xs font-medium">{style.label}</span>
                    {colors.theme_button_style === style.value && (
                      <Check className="w-3 h-3 mx-auto mt-1" style={{ color: activeTheme.colors.accent }} />
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: activeTheme.colors.bgCard, borderColor: activeTheme.colors.borderColor }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sombras nos Elementos</CardTitle>
                  <CardDescription>Adiciona profundidade visual aos botões e cards</CardDescription>
                </div>
                <Switch
                  checked={colors.theme_shadow_enabled}
                  onCheckedChange={(checked) => handleColorChange('theme_shadow_enabled', checked)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className={`p-4 text-white rounded-lg text-center font-medium ${
                    colors.theme_shadow_enabled ? 'shadow-lg' : ''
                  }`}
                  style={{ backgroundColor: activeTheme.colors.accent }}
                >
                  Com Sombra
                </div>
                <div 
                  className="p-4 text-white rounded-lg text-center font-medium"
                  style={{ backgroundColor: activeTheme.colors.accent }}
                >
                  Sem Sombra
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex gap-3 sticky bottom-0 bg-white dark:bg-gray-900 p-4 -mx-4 sm:-mx-6 border-t" style={{ backgroundColor: activeTheme.colors.bgPrimary, borderColor: activeTheme.colors.borderColor }}>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          className="flex-1"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Resetar
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges}
          className="flex-1"
          style={{ 
            backgroundColor: hasChanges ? activeTheme.colors.accent : undefined,
            opacity: hasChanges ? 1 : 0.5
          }}
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Alterações</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja salvar as novas configurações de tema? As alterações serão aplicadas imediatamente no cardápio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSave} style={{ backgroundColor: activeTheme.colors.accent }}>
              <Check className="w-4 h-4 mr-2" />
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
