import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useNotificationSound } from './useNotificationSound';

const STORAGE_KEY = 'pending_orders';

/**
 * Hook para gerenciar alertas de novos pedidos
 * Som contínuo + vibração até aceitar/rejeitar
 */
export function useOrderAlerts(entregadorId) {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { play, stop } = useNotificationSound();

  // Carregar pedidos pendentes do storage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const orders = JSON.parse(stored);
        setPendingOrders(orders);
        if (orders.length > 0) {
          play();
          startVibration();
        }
      } catch (e) {
        console.error('Erro ao carregar pedidos:', e);
      }
    }
  }, []);

  // Buscar novos pedidos disponíveis
  useEffect(() => {
    if (!entregadorId) return;

    const fetchOrders = async () => {
      try {
        const orders = await base44.entities.Order.filter({
          status: 'ready',
          entregador_id: null,
          delivery_method: 'delivery'
        }, '-created_date', 10);

        // Filtrar apenas os realmente novos
        const newOrders = orders.filter(
          order => !pendingOrders.find(p => p.id === order.id)
        );

        if (newOrders.length > 0) {
          const updated = [...pendingOrders, ...newOrders];
          setPendingOrders(updated);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          
          // Iniciar som e vibração
          play();
          startVibration();
        }
      } catch (e) {
        console.error('Erro ao buscar pedidos:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [entregadorId, pendingOrders, play]);

  const startVibration = useCallback(() => {
    if (navigator.vibrate) {
      // Vibração contínua
      const vibrateInterval = setInterval(() => {
        navigator.vibrate([200, 100, 200]);
      }, 1000);
      
      // Guardar referência para poder parar depois
      window.orderVibrateInterval = vibrateInterval;
    }
  }, []);

  const stopVibration = useCallback(() => {
    if (window.orderVibrateInterval) {
      clearInterval(window.orderVibrateInterval);
      window.orderVibrateInterval = null;
    }
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
  }, []);

  const acceptOrder = async (orderId, entregadorId) => {
    try {
      // Buscar coordenadas da loja
      const stores = await base44.entities.Store.list();
      const store = stores[0];

      await base44.entities.Order.update(orderId, {
        entregador_id: entregadorId,
        status: 'going_to_store',
        store_latitude: store?.store_latitude || -5.0892,
        store_longitude: store?.store_longitude || -42.8019
      });

      // Remover do storage
      const updated = pendingOrders.filter(o => o.id !== orderId);
      setPendingOrders(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Parar som e vibração se não houver mais pedidos
      if (updated.length === 0) {
        stop();
        stopVibration();
      }

      return true;
    } catch (e) {
      console.error('Erro ao aceitar pedido:', e);
      throw e;
    }
  };

  const rejectOrder = async (orderId, reason) => {
    try {
      // Registrar log da rejeição
      await base44.entities.OrderLog.create({
        order_id: orderId,
        action: 'delivery_rejected',
        details: `Entregador rejeitou: ${reason}`
      });

      // Remover do storage
      const updated = pendingOrders.filter(o => o.id !== orderId);
      setPendingOrders(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Parar som e vibração se não houver mais pedidos
      if (updated.length === 0) {
        stop();
        stopVibration();
      }

      return true;
    } catch (e) {
      console.error('Erro ao rejeitar pedido:', e);
      throw e;
    }
  };

  return {
    pendingOrders,
    acceptOrder,
    rejectOrder,
    loading
  };
}