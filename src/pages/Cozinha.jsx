import React, { useState, useEffect } from 'react';
import { apiClient as base44 } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChefHat, Loader2, LogOut, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSlugContext } from '@/hooks/useSlugContext';
import { usePermission } from '@/components/permissions/usePermission';
import toast from 'react-hot-toast';
import KitchenDisplay from '@/components/cozinha/KitchenDisplay';

export default function Cozinha() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [planCheck, setPlanCheck] = useState({ loading: true, hasAccess: false });
  const queryClient = useQueryClient();
  const { slug, subscriberEmail, inSlugContext, loading: slugLoading, error: slugError } = useSlugContext();
  const { subscriberData, isMaster } = usePermission();
  const asSub = (inSlugContext && user?.is_master && subscriberEmail) ? subscriberEmail : undefined;

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        if (!me) {
          base44.auth.redirectToLogin('/Cozinha');
          return;
        }
        // Verificar se tem perfil de cozinha ou é master
        const hasProfileAccess = me?.profile_role === 'cozinha' || me?.is_master === true;
        setAllowed(hasProfileAccess);
        
        if (!hasProfileAccess) {
          setLoading(false);
          return;
        }
        
        // Verificar plano (PRO ou Ultra)
        if (hasProfileAccess && !me?.is_master) {
          const plan = (subscriberData?.plan || '').toLowerCase();
          const hasPlanAccess = plan === 'pro' || plan === 'ultra';
          setPlanCheck({ loading: false, hasAccess: hasPlanAccess });
          if (!hasPlanAccess) {
            setAllowed(false);
          }
        } else if (me?.is_master) {
          setPlanCheck({ loading: false, hasAccess: true });
        } else {
          setPlanCheck({ loading: false, hasAccess: false });
        }
      } catch (e) {
        base44.auth.redirectToLogin('/Cozinha');
      } finally {
        setLoading(false);
      }
    })();
  }, [subscriberData]);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['cozinhaOrders', asSub ?? 'me'],
    queryFn: () => base44.entities.Order.list('-created_date', asSub ? { as_subscriber: asSub } : {}),
    enabled: allowed,
    refetchInterval: 8000,
  });

  const updateMu = useMutation({
    mutationFn: ({ id, updates }) => base44.entities.Order.update(id, updates, asSub ? { as_subscriber: asSub } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cozinhaOrders'] });
      toast.success('Status atualizado');
    },
    onError: (e) => toast.error(e?.message || 'Erro ao atualizar'),
  });

  const kitchenOrders = Array.isArray(orders)
    ? orders.filter(o => ['new', 'accepted', 'preparing', 'ready'].includes(o.status))
    : [];

  // Tempo de preparo padrão (pode vir de configurações)
  const defaultPrepTime = 30;

  const handleStatusChange = (order, newStatus) => {
    const updates = {};
    
    if (newStatus === 'accepted') {
      updates.status = 'accepted';
      updates.accepted_at = new Date().toISOString();
      updates.prep_time = order.prep_time || defaultPrepTime;
    } else if (newStatus === 'preparing') {
      updates.status = 'preparing';
      updates.preparing_at = new Date().toISOString();
    } else if (newStatus === 'ready') {
      updates.status = 'ready';
      updates.ready_at = new Date().toISOString();
    }
    
    updateMu.mutate({
      id: order.id,
      updates
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!allowed || (planCheck.loading === false && !planCheck.hasAccess && !isMaster)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md text-center">
          <ChefHat className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Acesso restrito</h2>
          {!planCheck.hasAccess && !isMaster ? (
            <>
              <AlertCircle className="w-8 h-8 text-orange-500 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                O Kitchen Display System está disponível apenas nos planos <strong>PRO</strong> e <strong>ULTRA</strong>.
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Seu plano atual: <strong>{(subscriberData?.plan || 'Básico').toUpperCase()}</strong>
              </p>
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 mt-2">Esta tela é apenas para o perfil Cozinha.</p>
          )}
          <Button onClick={() => base44.auth.logout()} className="mt-4" variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-screen-mobile">
      <KitchenDisplay
        orders={kitchenOrders}
        onStatusChange={handleStatusChange}
        prepTime={defaultPrepTime}
        isLoading={ordersLoading}
      />
      
      {/* Botão de logout fixo */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          className="bg-white dark:bg-gray-800 shadow-lg"
          onClick={() => base44.auth.logout()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );
}
