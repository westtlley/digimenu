import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sparkles, Zap, Star, Flame, Info, Image } from 'lucide-react';
import { apiClient as base44 } from '@/api/apiClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

/**
 * PAINEL DE CONFIGURAÇÃO DE VISUALIZAÇÃO DE PIZZA
 * 
 * - Modo premium com animações
 * - Tamanho da borda para cobrir a pizza
 */
export default function PizzaVisualizationSettings() {
  const queryClient = useQueryClient();

  // Buscar configuração atual da loja
  const { data: store, isLoading: loadingStore } = useQuery({
    queryKey: ['store'],
    queryFn: () => base44.entities.Store.list().then(stores => stores[0])
  });

  // Config da visualização (borda, etc)
  const { data: vizConfigs = [], isLoading: loadingConfig } = useQuery({
    queryKey: ['pizzaVisualizationConfig'],
    queryFn: () => base44.entities.PizzaVisualizationConfig.list().catch(() => [])
  });
  const vizConfig = vizConfigs[0] || {};

  const [premiumMode, setPremiumMode] = useState(store?.enable_premium_pizza_visualization !== false);
  const [edgeStrokeWidth, setEdgeStrokeWidth] = useState(vizConfig.edgeStrokeWidth ?? 12);
  const [edgeRadius, setEdgeRadius] = useState(vizConfig.edgeRadius ?? 48);

  useEffect(() => {
    if (vizConfig.edgeStrokeWidth != null) setEdgeStrokeWidth(vizConfig.edgeStrokeWidth);
    if (vizConfig.edgeRadius != null) setEdgeRadius(vizConfig.edgeRadius);
  }, [vizConfig.edgeStrokeWidth, vizConfig.edgeRadius]);

  // Mutation para salvar configuração
  const saveMutation = useMutation({
    mutationFn: async (enabled) => {
      const storeToUpdate = await base44.entities.Store.list().then(stores => stores[0]);
      if (!storeToUpdate) {
        throw new Error('Loja não encontrada');
      }
      return await base44.entities.Store.update(storeToUpdate.id, {
        enable_premium_pizza_visualization: enabled
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store'] });
      toast.success('Configuração salva com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar configuração');
      console.error(error);
    }
  });

  const handleToggle = (enabled) => {
    setPremiumMode(enabled);
    saveMutation.mutate(enabled);
  };

  // Salvar config da borda
  const saveConfigMutation = useMutation({
    mutationFn: async (data) => {
      if (vizConfig.id) {
        return base44.entities.PizzaVisualizationConfig.update(vizConfig.id, data);
      }
      return base44.entities.PizzaVisualizationConfig.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pizzaVisualizationConfig'] });
      toast.success('Configuração da borda salva!');
    },
    onError: () => {
      toast.error('Erro ao salvar. Tente novamente.');
    }
  });

  const handleSaveBordaConfig = () => {
    const sw = parseInt(edgeStrokeWidth, 10);
    const er = parseInt(edgeRadius, 10);
    if (isNaN(sw) || sw < 6 || sw > 20) {
      toast.error('Espessura deve ser entre 6 e 20');
      return;
    }
    if (isNaN(er) || er < 40 || er > 55) {
      toast.error('Raio deve ser entre 40 e 55');
      return;
    }
    saveConfigMutation.mutate({
      ...vizConfig,
      edgeStrokeWidth: sw,
      edgeRadius: er
    });
  };

  if (loadingStore) {
    return (
      <Card className="border-2 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle>Carregando...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-orange-500/20 dark:border-orange-500/30 bg-gradient-to-br from-white to-orange-50/30 dark:from-gray-900 dark:to-orange-950/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              Visualização Premium de Pizza
              {premiumMode && (
                <motion.span
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  ✨
                </motion.span>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Ative animações épicas e efeitos especiais para impressionar seus clientes
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle Principal */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Label htmlFor="premium-mode" className="text-base font-semibold cursor-pointer">
              Modo Premium
            </Label>
            <Info className="w-4 h-4 text-gray-500" />
          </div>
          <Switch
            id="premium-mode"
            checked={premiumMode}
            onCheckedChange={handleToggle}
            disabled={saveMutation.isPending}
          />
        </div>

        {/* Config Tamanho da Borda */}
        <div className="p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-orange-500" />
            <h4 className="font-semibold">Tamanho da Borda na Pizza</h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ajuste para a borda recheada cobrir melhor a pizza na visualização.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Espessura da borda (6-20)</Label>
              <Input
                type="number"
                min={6}
                max={20}
                value={edgeStrokeWidth}
                onChange={(e) => setEdgeStrokeWidth(Number(e.target.value) || 12)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Raio da borda (40-55)</Label>
              <Input
                type="number"
                min={40}
                max={55}
                value={edgeRadius}
                onChange={(e) => setEdgeRadius(Number(e.target.value) || 48)}
                className="mt-1"
              />
            </div>
          </div>
          <Button
            onClick={handleSaveBordaConfig}
            disabled={saveConfigMutation.isPending}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {saveConfigMutation.isPending ? 'Salvando...' : 'Salvar ajuste da borda'}
          </Button>
        </div>

        {/* Comparação Visual */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Modo Normal */}
          <div className={`p-4 rounded-xl border-2 transition-all ${!premiumMode ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : 'border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50'}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gray-500 flex items-center justify-center text-white text-sm">
                🍕
              </div>
              <h4 className="font-semibold">Modo Normal</h4>
            </div>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>Animações básicas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>Carregamento mais rápido</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gray-400">•</span>
                <span>Funcional e limpo</span>
              </li>
            </ul>
          </div>

          {/* Modo Premium */}
          <div className={`p-4 rounded-xl border-2 transition-all ${premiumMode ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/20' : 'border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50'}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-sm shadow-lg">
                ✨
              </div>
              <h4 className="font-semibold flex items-center gap-2">
                Modo Premium
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
              </h4>
            </div>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <span><strong>Ingredientes caindo</strong> ao montar</span>
              </li>
              <li className="flex items-start gap-2">
                <Flame className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <span><strong>Fumaça e vapor</strong> na borda recheada</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <span><strong>Sparkles e brilhos</strong> animados</span>
              </li>
              <li className="flex items-start gap-2">
                <Star className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5 fill-current" />
                <span><strong>Efeito de forno</strong> com calor radiante</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500 font-bold">🎉</span>
                <span><strong>Experiência premium</strong> que vende mais</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Dica de Vendas */}
        <motion.div 
          className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-2 border-blue-200 dark:border-blue-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
              💡
            </div>
            <div>
              <h5 className="font-semibold text-gray-900 dark:text-white mb-1">
                Dica de Especialista SaaS
              </h5>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Restaurantes que usam o <strong>Modo Premium</strong> reportam até <strong className="text-orange-600 dark:text-orange-400">35% mais engajamento</strong> dos clientes e <strong className="text-orange-600 dark:text-orange-400">aumento de 20% no ticket médio</strong>. As animações épicas criam uma experiência memorável que faz o cliente voltar!
              </p>
            </div>
          </div>
        </motion.div>

        {/* Preview Button */}
        <div className="flex justify-center pt-2">
          <Button 
            onClick={() => window.open('/s/demo-pizzaria', '_blank')}
            variant="outline"
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Ver Demo Interativa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
