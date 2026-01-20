import React, { useState, useEffect } from 'react';
import { apiClient as base44 } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChefHat, Loader2, LogOut, Check, Clock, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import toast from 'react-hot-toast';

const STATUS_LABEL = {
  new: 'Novo',
  accepted: 'Aceito',
  preparing: 'Em preparo',
  ready: 'Pronto',
};

export default function Cozinha() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        setAllowed(me?.profile_role === 'cozinha' || me?.is_master === true);
        if (!me) base44.auth.redirectToLogin('/Cozinha');
      } catch (e) {
        base44.auth.redirectToLogin('/Cozinha');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['cozinhaOrders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
    enabled: allowed,
    refetchInterval: 8000,
  });

  const updateMu = useMutation({
    mutationFn: ({ id, updates }) => base44.entities.Order.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cozinhaOrders'] });
      toast.success('Status atualizado');
    },
    onError: (e) => toast.error(e?.message || 'Erro ao atualizar'),
  });

  const kitchenOrders = Array.isArray(orders)
    ? orders.filter(o => ['new', 'accepted', 'preparing', 'ready'].includes(o.status))
    : [];

  const handleAccept = (o) => {
    if (o.status !== 'new') return;
    updateMu.mutate({
      id: o.id,
      updates: { status: 'accepted', accepted_at: new Date().toISOString(), prep_time: 15 },
    });
  };

  const handleStartPrep = (o) => {
    if (o.status !== 'accepted') return;
    updateMu.mutate({ id: o.id, updates: { status: 'preparing' } });
  };

  const handleReady = (o) => {
    if (o.status !== 'preparing') return;
    updateMu.mutate({
      id: o.id,
      updates: { status: 'ready', ready_at: new Date().toISOString() },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md text-center">
          <ChefHat className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Acesso restrito</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Esta tela é apenas para o perfil Cozinha.</p>
          <Button onClick={() => base44.auth.logout()} className="mt-4" variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-orange-600 text-white sticky top-0 z-10 shadow">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="w-6 h-6" />
            <h1 className="font-bold text-lg">Cozinha</h1>
          </div>
          <Button variant="ghost" size="sm" className="text-white hover:bg-orange-500" onClick={() => base44.auth.logout()}>
            <LogOut className="w-4 h-4 mr-1" />
            Sair
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        {ordersLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
        ) : kitchenOrders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum pedido em preparo no momento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {kitchenOrders.map((o) => (
              <div
                key={o.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">#{o.order_code || o.id}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {o.items?.map(i => i.name || i.quantity + 'x').join(', ') || '—'}
                    </p>
                    <Badge className="mt-1" variant={o.status === 'ready' ? 'default' : 'secondary'}>
                      {STATUS_LABEL[o.status] || o.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {o.status === 'new' && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAccept(o)} disabled={updateMu.isPending}>
                        <Check className="w-4 h-4 mr-1" />
                        Aceitar
                      </Button>
                    )}
                    {o.status === 'accepted' && (
                      <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => handleStartPrep(o)} disabled={updateMu.isPending}>
                        <ChefHat className="w-4 h-4 mr-1" />
                        Em preparo
                      </Button>
                    )}
                    {o.status === 'preparing' && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleReady(o)} disabled={updateMu.isPending}>
                        <Package className="w-4 h-4 mr-1" />
                        Pronto
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
