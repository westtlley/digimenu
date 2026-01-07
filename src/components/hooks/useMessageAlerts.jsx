import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'pending_messages';

/**
 * Hook para gerenciar alertas de mensagens administrativas
 * Garante que mensagens sejam confirmadas pelo entregador
 */
export function useMessageAlerts(entregadorId) {
  const [pendingMessages, setPendingMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carregar mensagens pendentes do storage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPendingMessages(JSON.parse(stored));
      } catch (e) {
        console.error('Erro ao carregar mensagens:', e);
      }
    }
  }, []);

  // Buscar novas mensagens
  useEffect(() => {
    if (!entregadorId) return;

    const fetchMessages = async () => {
      try {
        const messages = await base44.entities.DeliveryMessage.filter({
          entregador_id: entregadorId,
          status: 'pending'
        }, '-created_date');

        // Adicionar novas mensagens às pendentes
        const newMessages = messages.filter(
          msg => !pendingMessages.find(p => p.id === msg.id)
        );

        if (newMessages.length > 0) {
          const updated = [...pendingMessages, ...newMessages];
          setPendingMessages(updated);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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
  }, [entregadorId, pendingMessages]);

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
      });

      // Remover do storage local
      const updated = pendingMessages.filter(m => m.id !== messageId);
      setPendingMessages(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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