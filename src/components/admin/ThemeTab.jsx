import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Save, Check, Sparkles, Zap, Eye } from 'lucide-react';
import { toast } from 'sonner';
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

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Store.update(store.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store'] });
      setHasChanges(false);
      toast.success('Cores salvas com sucesso!');
    },
  });

  const handleColorChange = (key, value) => {
    setColors(prev => ({ ...prev, [key]: value }));
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
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Palette className="w-5 h-5 text-orange-500" />
        <h2 className="text-lg font-bold">Personalizar Cores</h2>
      </div>

      <Tabs defaultValue="colors" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="colors">
            <Palette className="w-4 h-4 mr-2" />
            Cores
          </TabsTrigger>
          <TabsTrigger value="gradient">
            <Sparkles className="w-4 h-4 mr-2" />
            Gradientes
          </TabsTrigger>
          <TabsTrigger value="effects">
            <Zap className="w-4 h-4 mr-2" />
            Efeitos
          </TabsTrigger>
        </TabsList>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-6">
          {/* Preview */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4 text-gray-600" />
              <h3 className="font-semibold text-sm">Preview em Tempo Real</h3>
            </div>
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
              <div className="flex gap-2">
                <div className="flex-1 p-4 rounded-lg" style={{ backgroundColor: colors.theme_primary_color }}>
                  <p className="text-white text-sm font-medium">Cor Primária</p>
                  <p className="text-white text-xs opacity-80">{colors.theme_primary_color}</p>
                </div>
                <div className="flex-1 p-4 rounded-lg" style={{ backgroundColor: colors.theme_secondary_color }}>
                  <p className="text-white text-sm font-medium">Cor Secundária</p>
                  <p className="text-white text-xs opacity-80">{colors.theme_secondary_color}</p>
                </div>
                <div className="flex-1 p-4 rounded-lg" style={{ backgroundColor: colors.theme_accent_color }}>
                  <p className="text-white text-sm font-medium">Cor de Destaque</p>
                  <p className="text-white text-xs opacity-80">{colors.theme_accent_color}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold mb-4 text-sm">Temas Prontos</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {PRESET_COLORS.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className={`p-3 rounded-xl border-2 hover:border-gray-300 transition-all text-center group ${
                    colors.theme_primary_color === preset.primary ? 'border-orange-500 bg-orange-50' : 'border-gray-100'
                  }`}
                >
                  <div className="flex gap-1 justify-center mb-2">
                    <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: preset.primary }} />
                    <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: preset.secondary }} />
                    <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: preset.accent }} />
                  </div>
                  <span className="text-xs font-medium group-hover:text-orange-600">{preset.name}</span>
                  {colors.theme_primary_color === preset.primary && (
                    <Check className="w-3 h-3 text-orange-500 mx-auto mt-1" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold mb-4 text-sm">Cores Personalizadas</h3>
            <div className="grid sm:grid-cols-3 gap-6">
              <div>
                <Label className="text-xs font-medium mb-2 block">Cor Primária</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={colors.theme_primary_color}
                    onChange={(e) => handleColorChange('theme_primary_color', e.target.value)}
                    className="w-14 h-12 rounded-lg border-2 cursor-pointer"
                  />
                  <Input
                    value={colors.theme_primary_color}
                    onChange={(e) => handleColorChange('theme_primary_color', e.target.value)}
                    className="font-mono uppercase text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium mb-2 block">Cor Secundária</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={colors.theme_secondary_color}
                    onChange={(e) => handleColorChange('theme_secondary_color', e.target.value)}
                    className="w-14 h-12 rounded-lg border-2 cursor-pointer"
                  />
                  <Input
                    value={colors.theme_secondary_color}
                    onChange={(e) => handleColorChange('theme_secondary_color', e.target.value)}
                    className="font-mono uppercase text-sm"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium mb-2 block">Cor de Destaque</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={colors.theme_accent_color}
                    onChange={(e) => handleColorChange('theme_accent_color', e.target.value)}
                    className="w-14 h-12 rounded-lg border-2 cursor-pointer"
                  />
                  <Input
                    value={colors.theme_accent_color}
                    onChange={(e) => handleColorChange('theme_accent_color', e.target.value)}
                    className="font-mono uppercase text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Gradient Tab */}
        <TabsContent value="gradient" className="space-y-6">
          {/* Enable Gradient */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-sm">Habilitar Gradiente</h3>
                <p className="text-xs text-gray-500 mt-1">Aplica efeito de gradiente nos botões primários</p>
              </div>
              <Switch
                checked={colors.theme_gradient_enabled}
                onCheckedChange={(checked) => handleColorChange('theme_gradient_enabled', checked)}
              />
            </div>
          </div>

          {/* Gradient Preview */}
          {colors.theme_gradient_enabled && (
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-semibold mb-4 text-sm">Preview do Gradiente</h3>
              <div 
                className="w-full h-32 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg"
                style={getGradientStyle()}
              >
                Gradiente Aplicado
              </div>
            </div>
          )}

          {/* Gradient Presets */}
          {colors.theme_gradient_enabled && (
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-semibold mb-4 text-sm">Gradientes Prontos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {GRADIENT_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => applyGradientPreset(preset)}
                    className="group relative overflow-hidden rounded-xl border-2 border-gray-100 hover:border-orange-300 transition-all"
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
                        <Check className="w-3 h-3 text-orange-500" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Gradient */}
          {colors.theme_gradient_enabled && (
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-semibold mb-4 text-sm">Gradiente Personalizado</h3>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium mb-2 block">Cor Inicial</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={colors.theme_gradient_start}
                        onChange={(e) => handleColorChange('theme_gradient_start', e.target.value)}
                        className="w-14 h-12 rounded-lg border-2 cursor-pointer"
                      />
                      <Input
                        value={colors.theme_gradient_start}
                        onChange={(e) => handleColorChange('theme_gradient_start', e.target.value)}
                        className="font-mono uppercase text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-2 block">Cor Final</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={colors.theme_gradient_end}
                        onChange={(e) => handleColorChange('theme_gradient_end', e.target.value)}
                        className="w-14 h-12 rounded-lg border-2 cursor-pointer"
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
                  <Label className="text-xs font-medium mb-2 block">Direção do Gradiente</Label>
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
            </div>
          )}
        </TabsContent>

        {/* Effects Tab */}
        <TabsContent value="effects" className="space-y-6">
          {/* Button Style */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold mb-4 text-sm">Estilo dos Botões</h3>
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
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div 
                    className={`w-full h-10 ${style.class} bg-orange-500 mb-2 flex items-center justify-center text-white text-xs font-medium`}
                  >
                    Exemplo
                  </div>
                  <span className="text-xs font-medium">{style.label}</span>
                  {colors.theme_button_style === style.value && (
                    <Check className="w-3 h-3 text-orange-500 mx-auto mt-1" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Shadows */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Sombras nos Elementos</h3>
                <p className="text-xs text-gray-500 mt-1">Adiciona profundidade visual aos botões e cards</p>
              </div>
              <Switch
                checked={colors.theme_shadow_enabled}
                onCheckedChange={(checked) => handleColorChange('theme_shadow_enabled', checked)}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className={`p-4 bg-orange-500 text-white rounded-lg text-center font-medium ${colors.theme_shadow_enabled ? 'shadow-lg' : ''}`}>
                Com Sombra
              </div>
              <div className="p-4 bg-orange-500 text-white rounded-lg text-center font-medium">
                Sem Sombra
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="mt-6 flex gap-3">
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          className="flex-1"
        >
          Resetar
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges}
          className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
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
            <AlertDialogAction onClick={confirmSave} className="bg-orange-500 hover:bg-orange-600">
              <Check className="w-4 h-4 mr-2" />
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}