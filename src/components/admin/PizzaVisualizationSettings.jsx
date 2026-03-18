import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, Zap, Star, Flame, Info, Image } from 'lucide-react';
import { apiClient as base44 } from '@/api/apiClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { usePermission } from '../permissions/usePermission';
import { getMenuContextEntityOpts, getMenuContextQueryKeyParts } from '@/utils/tenantScope';

/**
 * PAINEL DE CONFIGURAÇÃO DE VISUALIZAÇÃO DE PIZZA
 * 
 * - Modo premium com animações
 * - Tamanho da borda para cobrir a pizza
 */
export default function PizzaVisualizationSettings() {
  const queryClient = useQueryClient();
  const { menuContext } = usePermission();
  const menuContextQueryKey = getMenuContextQueryKeyParts(menuContext);
  const scopedEntityOpts = getMenuContextEntityOpts(menuContext);

  // ✅ CORREÇÃO: Buscar configuração atual da loja com contexto do slug
  const { data: store, isLoading: loadingStore } = useQuery({
    queryKey: ['store', ...menuContextQueryKey],
    queryFn: async () => {
      if (!menuContext) return null;
      const stores = await base44.entities.Store.list(null, scopedEntityOpts);
      return stores[0];
    },
    enabled: !!menuContext,
  });


  const [premiumMode, setPremiumMode] = useState(true);
  React.useEffect(() => {
    if (store !== undefined) setPremiumMode(store?.enable_premium_pizza_visualization !== false);
  }, [store?.enable_premium_pizza_visualization]);

  // ✅ CORREÇÃO: Mutation para salvar configuração com contexto
  const saveMutation = useMutation({
    mutationFn: async (enabled) => {
      if (!store?.id) {
        throw new Error('Loja não encontrada');
      }
      return await base44.entities.Store.update(store.id, {
        enable_premium_pizza_visualization: enabled
      }, scopedEntityOpts);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', ...menuContextQueryKey] });
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

        {/* Informação sobre Borda */}
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Image className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Imagem da Borda
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Para adicionar imagem à borda, vá em <strong>Pizza → Sabores e Bordas</strong> e edite a borda desejada. 
                Cada borda pode ter sua própria imagem que preencherá o círculo da borda na pizza.
              </p>
            </div>
          </div>
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
