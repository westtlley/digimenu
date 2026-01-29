import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PlanCard from './PlanCard';
import { Loader2 } from 'lucide-react';
import { getPlanPermissions } from '../permissions/PlanPresets';

/**
 * Seletor visual de planos com cards
 */
export default function PlanSelector({ selectedPlan, onPlanChange }) {
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      try {
        const allPlans = await base44.entities.Plan.list('order');
        const activePlans = allPlans.filter(p => p.is_active !== false);
        
        // Fallback para planos padrão
        if (activePlans.length === 0) {
          console.log('⚠️ Nenhum plano no banco, retornando planos padrão');
          return [
            { id: 'free', slug: 'free', name: 'Gratuito', description: 'Teste de 10 dias', is_active: true, order: 0 },
            { id: 'basic', slug: 'basic', name: 'Básico', description: 'Funcionalidades essenciais', is_active: true, order: 1 },
            { id: 'pro', slug: 'pro', name: 'Pro', description: 'Recursos avançados', is_active: true, order: 2 },
            { id: 'ultra', slug: 'ultra', name: 'Ultra', description: 'Todos os recursos', is_active: true, order: 3 }
          ];
        }
        
        return activePlans;
      } catch (error) {
        console.error('❌ Erro ao carregar planos, retornando padrão:', error);
        return [
          { id: 'free', slug: 'free', name: 'Gratuito', description: 'Teste de 10 dias', is_active: true, order: 0 },
          { id: 'basic', slug: 'basic', name: 'Básico', description: 'Funcionalidades essenciais', is_active: true, order: 1 },
          { id: 'pro', slug: 'pro', name: 'Pro', description: 'Recursos avançados', is_active: true, order: 2 },
          { id: 'ultra', slug: 'ultra', name: 'Ultra', description: 'Todos os recursos', is_active: true, order: 3 }
        ];
      }
    }
  });

  // Gerar features dos planos baseado nas permissões
  const plansWithFeatures = useMemo(() => {
    return plans.map(plan => {
      const permissions = getPlanPermissions(plan.slug);
      const features = [];

      // Contar módulos ativos
      const activeModules = Object.keys(permissions).filter(
        key => permissions[key] && Array.isArray(permissions[key]) && permissions[key].length > 0
      ).length;

      if (plan.slug === 'free') {
        features.push('10 dias de teste', 'Cardápio básico', 'Até 20 produtos', 'Pedidos via WhatsApp');
      } else if (plan.slug === 'basic') {
        features.push('Até 100 produtos', 'Cardápio completo', 'Dashboard', 'Personalização', 'Suporte por email');
      } else if (plan.slug === 'pro') {
        features.push('Tudo do Básico', 'App entregadores', 'Zonas de entrega', 'Cupons e promoções', 'Relatórios avançados');
      } else if (plan.slug === 'ultra') {
        features.push('Tudo do Pro', 'PDV completo', 'Comandas presenciais', 'Emissão fiscal', 'Multi-localização');
      } else {
        features.push(`${activeModules} módulos configurados`, 'Permissões personalizadas');
      }

      return { ...plan, features };
    });
  }, [plans]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {plansWithFeatures.map(plan => (
        <PlanCard
          key={plan.id || plan.slug}
          plan={plan}
          isSelected={selectedPlan === plan.slug}
          onClick={() => onPlanChange?.(plan.slug)}
          description={plan.description}
          features={plan.features}
        />
      ))}
      {/* Opção Custom */}
      <PlanCard
        plan={{ slug: 'custom', name: 'Personalizado', id: 'custom' }}
        isSelected={selectedPlan === 'custom'}
        onClick={() => onPlanChange?.('custom')}
        description="Configure manualmente as permissões"
        features={['Permissões customizadas', 'Configuração flexível']}
      />
    </div>
  );
}
