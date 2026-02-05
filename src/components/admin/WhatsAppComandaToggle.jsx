import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Power, PowerOff } from 'lucide-react';
import WhatsAppIcon from '@/components/ui/WhatsAppIcon';
import { apiClient as base44 } from '@/api/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

/**
 * Botão liga/desliga "Comanda WhatsApp": se ativado, ao finalizar pedido no cardápio
 * além de registrar no gestor também envia a comanda formatada para o WhatsApp da loja.
 * Se desativado, apenas registra no gestor (não envia para o WhatsApp).
 * Usa store.send_whatsapp_commands ou subscriber.whatsapp_auto_enabled (Subscriber).
 */
export default function WhatsAppComandaToggle({ store, subscriber, compact = false }) {
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
  const handleClick = () => {
    const newValue = !localValue;
    setLocalValue(newValue);
    mutation.mutate(newValue);
  };

  if (!useStore && !useSub) return null;

  // Versão compacta (apenas ícone)
  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={mutation.isPending}
        className={`min-h-touch min-w-touch ${
          localValue 
            ? 'text-white bg-green-600/80 hover:bg-green-600' 
            : 'text-white bg-gray-600/80 hover:bg-gray-600'
        }`}
        title={localValue ? 'Comanda WhatsApp: Ligado' : 'Comanda WhatsApp: Desligado'}
      >
        {localValue ? (
          <WhatsAppIcon className="w-5 h-5" />
        ) : (
          <PowerOff className="w-4 h-4" />
        )}
      </Button>
    );
  }

  // Versão completa (com texto)
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={mutation.isPending}
      className={`min-h-touch ${
        localValue 
          ? 'text-white bg-green-600/80 hover:bg-green-600' 
          : 'text-white bg-gray-600/80 hover:bg-gray-600'
      }`}
      title={localValue ? 'Desativar Comanda WhatsApp' : 'Ativar Comanda WhatsApp'}
    >
      {localValue ? (
        <>
          <WhatsAppIcon className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">WhatsApp ON</span>
        </>
      ) : (
        <>
          <PowerOff className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">WhatsApp OFF</span>
        </>
      )}
    </Button>
  );
}
