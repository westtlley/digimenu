import React, { useState, useEffect, useMemo } from 'react';
import { apiClient as base44 } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChefHat, Loader2, LogOut, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSlugContext } from '@/hooks/useSlugContext';
import { usePermission } from '@/components/permissions/usePermission';
import toast from 'react-hot-toast';
import KitchenDisplay from '@/components/cozinha/KitchenDisplay';
import { printComanda } from '@/utils/gestorExport';
import { createPageUrl } from '@/utils';

export default function Cozinha() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const queryClient = useQueryClient();
  const { slug, subscriberEmail, inSlugContext, loading: slugLoading } = useSlugContext();
  const { hasModuleAccess, isMaster } = usePermission();
  const canonicalKitchenPath = useMemo(() => createPageUrl('Cozinha', slug || undefined), [slug]);
  const normalizedSlugSubscriber = useMemo(
    () => (inSlugContext && subscriberEmail ? String(subscriberEmail).toLowerCase().trim() : null),
    [inSlugContext, subscriberEmail]
  );
  const fallbackSubscriber = useMemo(() => {
    const candidate = user?.subscriber_email || user?.email;
    return candidate ? String(candidate).toLowerCase().trim() : null;
  }, [user?.subscriber_email, user?.email]);
  const tenantIdentifier = normalizedSlugSubscriber || fallbackSubscriber;
  const asSub = (inSlugContext && user?.is_master && normalizedSlugSubscriber) ? normalizedSlugSubscriber : undefined;
  const tenantScope = asSub || tenantIdentifier || 'none';
  const scopedEntityOpts = asSub ? { as_subscriber: asSub } : {};
  const cozinhaOrdersKey = useMemo(() => ['cozinhaOrders', tenantScope], [tenantScope]);
  const gestorOrdersKey = useMemo(() => ['gestorOrders', asSub ?? 'me'], [asSub]);

  useEffect(() => {
    if (slugLoading) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const me = await base44.auth.me();
        if (cancelled) return;
        setUser(me);

        if (!me) {
          base44.auth.redirectToLogin(canonicalKitchenPath);
          return;
        }

        const isAssinante = me?.subscriber_email && (me?.email || '').toLowerCase().trim() === (me?.subscriber_email || '').toLowerCase().trim();
        const roles = me?.profile_roles?.length ? me.profile_roles : me?.profile_role ? [me.profile_role] : [];
        const isGerente = roles.includes('gerente');
        const isCozinha = me?.profile_role === 'cozinha' || roles.includes('cozinha');
        const isOwner = !me.subscriber_email || (me.email && me.subscriber_email && me.email.toLowerCase().trim() === me.subscriber_email.toLowerCase().trim());
        const slugSubscriberNormalized = (subscriberEmail || '').toLowerCase().trim();
        const userSubscriberNormalized = (me?.subscriber_email || me?.email || '').toLowerCase().trim();
        const tenantMatchesSlug =
          !inSlugContext ||
          !slugSubscriberNormalized ||
          me?.is_master === true ||
          userSubscriberNormalized === slugSubscriberNormalized;

        const hasProfileAccess = (isCozinha || me?.is_master === true || isAssinante || isGerente || isOwner) && tenantMatchesSlug;

        console.log('[Cozinha] Verificando acesso:', {
          email: me.email,
          subscriber_email: me.subscriber_email,
          profile_role: me.profile_role,
          profile_roles: me.profile_roles,
          is_master: me.is_master,
          isAssinante,
          isGerente,
          isCozinha,
          isOwner,
          hasProfileAccess,
          tenantMatchesSlug,
        });

        setAllowed(hasProfileAccess);
      } catch (e) {
        if (!cancelled) {
          base44.auth.redirectToLogin(canonicalKitchenPath);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canonicalKitchenPath, inSlugContext, slugLoading, subscriberEmail]);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: cozinhaOrdersKey,
    queryFn: () => base44.entities.Order.list('-created_date', scopedEntityOpts),
    enabled: allowed && !!user,
    refetchInterval: 8000,
  });

  const updateMu = useMutation({
    mutationFn: ({ id, updates }) => base44.entities.Order.update(id, updates, scopedEntityOpts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cozinhaOrdersKey });
      queryClient.invalidateQueries({ queryKey: gestorOrdersKey });
      queryClient.invalidateQueries({ queryKey: ['availableOrders', tenantScope] });
      toast.success('Status atualizado');
    },
    onError: (e) => toast.error(e?.message || 'Erro ao atualizar'),
  });

  const kitchenOrders = Array.isArray(orders)
    ? orders.filter(o => ['new', 'accepted', 'preparing', 'ready'].includes(o.status))
    : [];

  const defaultPrepTime = 30;

  const handlePrintOrder = (order) => {
    const jobRef = String(order?.id || order?.order_code || Date.now());
    const printed = printComanda(order, {
      jobId: `kitchen-comanda-${jobRef}`,
      dedupeKey: `kitchen:print:${jobRef}`,
      dedupeWindowMs: 12000,
    });
    if (!printed) {
      toast.error('Popup bloqueado. Permita popups para imprimir.');
      return;
    }
    toast.success('Comanda enviada para impressão');
  };

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
      updates,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const roles = user?.profile_roles?.length ? user.profile_roles : user?.profile_role ? [user.profile_role] : [];
  const isGerenteRole = roles.includes('gerente');
  const isCozinhaRole = user?.profile_role === 'cozinha' || roles.includes('cozinha');
  const isAssinante = user?.subscriber_email && (user?.email || '').toLowerCase().trim() === (user?.subscriber_email || '').toLowerCase().trim();
  const isOwner = !user?.subscriber_email || (user?.email && user?.subscriber_email && user?.email.toLowerCase().trim() === user?.subscriber_email.toLowerCase().trim());
  const canAccessKitchen = allowed && (isMaster || hasModuleAccess('cozinha') || isCozinhaRole || isGerenteRole || isAssinante || isOwner);

  if (!allowed || !canAccessKitchen) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md text-center">
          <ChefHat className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Acesso restrito</h2>
          <AlertCircle className="w-8 h-8 text-orange-500 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Esta tela está disponível apenas para perfis e planos com permissão de cozinha.
          </p>
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
        onPrintOrder={handlePrintOrder}
      />

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
