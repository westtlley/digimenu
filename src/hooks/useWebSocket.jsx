import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { orderNotifications, marketingNotifications } from '@/utils/pushService';
import { requestNotificationPermission } from '@/utils/pushService';
import { BACKEND_BASE_URL } from '@/api/apiClient';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_WS_URL || BACKEND_BASE_URL || 'http://localhost:3000';

/**
 * Hook para gerenciar conexão WebSocket e notificações em tempo real
 */
export function useWebSocket({ 
  subscriberEmail = null, 
  customerEmail = null, 
  customerPhone = null,
  onOrderUpdate = null,
  onOrderCreated = null,
  enableNotifications = true
}) {
  const socketRef = useRef(null);
  const notificationPermissionRef = useRef(false);

  // Solicitar permissão de notificação na primeira vez
  useEffect(() => {
    if (enableNotifications && !notificationPermissionRef.current) {
      requestNotificationPermission().then(granted => {
        notificationPermissionRef.current = granted;
      });
    }
  }, [enableNotifications]);

  useEffect(() => {
    // Só conectar se tiver pelo menos um identificador
    if (!subscriberEmail && !customerEmail && !customerPhone) return;

    // Conectar ao servidor WebSocket
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 2
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('✅ WebSocket conectado:', socket.id);
      
      // Inscrever em atualizações
      socket.emit('subscribe:orders', {
        subscriberEmail,
        customerEmail,
        customerPhone
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket desconectado');
    });

    socket.on('connect_error', () => {
      // Falha esperada quando o backend não expõe WebSocket (ex.: Render cold start). Cardápio/API continuam funcionando.
      console.warn('⚠️ WebSocket indisponível — notificações em tempo real desativadas. O restante do app funciona normalmente.');
    });

    // Ouvir atualizações de pedidos
    socket.on('order:updated', (order) => {
      console.log('📦 Pedido atualizado via WebSocket:', order);
      
      // Chamar callback customizado
      if (onOrderUpdate) {
        onOrderUpdate(order);
      }

      // Enviar notificação push baseada no status
      if (enableNotifications && notificationPermissionRef.current) {
        const status = order.status;
        const orderCode = order.order_code || order.id;

        if (status === 'accepted') {
          orderNotifications.accepted(orderCode);
          toast.success(`Pedido #${orderCode} foi aceito! 🎉`);
        } else if (status === 'preparing') {
          orderNotifications.preparing(orderCode);
          toast.info(`Pedido #${orderCode} está sendo preparado 👨‍🍳`);
        } else if (status === 'ready') {
          orderNotifications.ready(orderCode);
          toast.success(`Pedido #${orderCode} está pronto! ✅`);
        } else if (status === 'out_for_delivery') {
          orderNotifications.outForDelivery(orderCode);
          toast.info(`Pedido #${orderCode} saiu para entrega! 🚚`);
        } else if (status === 'delivered') {
          orderNotifications.delivered(orderCode);
          toast.success(`Pedido #${orderCode} foi entregue! 🎊`);
        }
      }
    });

    // Ouvir novos pedidos
    socket.on('order:created', (order) => {
      console.log('📦 Novo pedido via WebSocket:', order);
      
      if (onOrderCreated) {
        onOrderCreated(order);
      }
    });

    // Ouvir promoções de pratos favoritos
    socket.on('favorite:promotion', (dish) => {
      console.log('💝 Prato favorito em promoção:', dish);
      
      if (enableNotifications && notificationPermissionRef.current) {
        marketingNotifications.favoriteOnSale(dish.name);
        toast.custom((t) => (
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4 rounded-lg shadow-xl flex items-center gap-3">
            <span className="text-2xl">💝</span>
            <div>
              <p className="font-bold">Seu Favorito Está em Promoção!</p>
              <p className="text-sm opacity-90">{dish.name}</p>
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="ml-auto text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>
        ), { duration: 8000 });
      }
    });

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('unsubscribe:orders', {
          subscriberEmail,
          customerEmail,
          customerPhone
        });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [subscriberEmail, customerEmail, customerPhone, onOrderUpdate, onOrderCreated, enableNotifications]);

  return socketRef.current;
}
