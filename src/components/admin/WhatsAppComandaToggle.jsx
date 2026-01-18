import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { apiClient as base44 } from '@/api/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

/**
 * Toggle "Comanda WhatsApp": se ativado, ao finalizar pedido no cardápio
 * além de registrar no gestor também envia a comanda formatada para o WhatsApp da loja.
 * Se desativado, apenas registra no gestor (não envia para o WhatsApp).
 * Usa store.send_whatsapp_commands ou subscriber.whatsapp_auto_enabled (Subscriber).
 */
export default function WhatsAppComandaToggle({ store, subscriber }) {
  const queryClient = useQueryClient();
  const useStore = !!store?.id;
  const useSub = !!subscriber?.id && !useStore;

  const val = useStore ? (store?.send_whatsapp_commands !== false) : ((subscriber?.send_whatsapp_commands ?? subscriber?.whatsapp_auto_enabled) !== false);
  const [localValue, setLocalValue] = useState(val);

  useEffect(() => {
    const v = useStore ? (store?.send_whatsapp_commands !== false) : ((subscriber?.send_whatsapp_commands ?? subscriber?.whatsapp_auto_enabled) !== false);
    setLocalValue(v);
  }, [useStore, store?.send_whatsapp_commands, subscriber?.send_whatsapp_commands, subscriber?.whatsapp_auto_enabled]);

  const updateStore = useMutation({
    mutationFn: async (enabled) => {
      if (!store?.id) return Promise.reject(new Error('Loja não carregada.'));
      return await base44.entities.Store.update(store.id, { send_whatsapp_commands: enabled });
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['store'] });
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success(enabled ? 'Comanda WhatsApp ativada!' : 'Comanda WhatsApp desativada!');
    },
    onError: () => { setLocalValue((v) => !v); toast.error('Erro ao atualizar'); },
  });

  const updateSubscriber = useMutation({
    mutationFn: async (enabled) => {
      if (!subscriber?.id) return Promise.reject(new Error('Assinante não carregado.'));
      return await base44.entities.Subscriber.update(subscriber.id, { send_whatsapp_commands: enabled });
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['subscriber'] });
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['store'] });
      toast.success(enabled ? 'Comanda WhatsApp ativada!' : 'Comanda WhatsApp desativada!');
    },
    onError: () => { setLocalValue((v) => !v); toast.error('Erro ao atualizar'); },
  });

  const mutation = useStore ? updateStore : updateSubscriber;
  const handleChange = (checked) => { setLocalValue(checked); mutation.mutate(checked); };

  if (!useStore && !useSub) return null;

  return (
    <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white">Comanda WhatsApp</p>
        <p className="text-[10px] text-orange-100">Enviar pedidos via WhatsApp</p>
      </div>
      <Switch checked={localValue} onCheckedChange={handleChange} disabled={mutation.isPending} />
    </div>
  );
}
