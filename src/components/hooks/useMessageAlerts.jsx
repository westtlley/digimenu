import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { buildTenantEntityOpts, getTenantScopeKey } from '@/utils/tenantScope';

const STORAGE_KEY_BASE = 'pending_messages';

/**
 * Hook para gerenciar alertas de mensagens administrativas
 * Garante que mensagens sejam confirmadas pelo entregador
 */
export function useMessageAlerts(entregadorId, options = {}) {
  const { asSubscriber = null, asSubscriberId = null, tenantScope = null } = options;
  const resolvedTenantScope = tenantScope ?? getTenantScopeKey(asSubscriberId, asSubscriber, 'self');
  const storageKey = `${STORAGE_KEY_BASE}:${resolvedTenantScope}`;
  const scopedEntityOpts = buildTenantEntityOpts({ subscriberId: asSubscriberId, subscriberEmail: asSubscriber });
  const [pendingMessages, setPendingMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carregar mensagens pendentes do storage
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setPendingMessages(JSON.parse(stored));
      } catch (e) {
        console.error('Erro ao carregar mensagens:', e);
      }
    }
  }, [storageKey]);

  // Buscar novas mensagens
  useEffect(() => {
    if (!entregadorId) return;

    const fetchMessages = async () => {
      try {
        const messages = await base44.entities.DeliveryMessage.filter({
          entregador_id: entregadorId,
          status: 'pending',
          ...scopedEntityOpts,
        }, '-created_date');

        // Adicionar novas mensagens às pendentes
        const newMessages = messages.filter(
          msg => !pendingMessages.find(p => p.id === msg.id)
        );

        if (newMessages.length > 0) {
          const updated = [...pendingMessages, ...newMessages];
          setPendingMessages(updated);
          localStorage.setItem(storageKey, JSON.stringify(updated));
        }
      } catch (e) {
        console.error('Erro ao buscar mensagens:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [entregadorId, pendingMessages, asSubscriber, asSubscriberId, storageKey]);

  const confirmMessage = async (message) => {
    try {
      const messageId = typeof message === 'string' ? message : message?.id;
      
      if (!messageId) {
        console.error('ID de mensagem inválido:', message);
        return;
      }

      // Atualizar no banco
      await base44.entities.DeliveryMessage.update(messageId, {
        status: 'read',
        read_at: new Date().toISOString()
      }, scopedEntityOpts);

      // Remover do storage local
      const updated = pendingMessages.filter(m => m.id !== messageId);
      setPendingMessages(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error('Erro ao confirmar mensagem:', e);
    }
  };

  return {
    pendingMessages,
    confirmMessage,
    loading
  };
}
