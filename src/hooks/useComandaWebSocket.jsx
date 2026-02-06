import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Hook para gerenciar WebSocket de comandas em tempo real
 */
export function useComandaWebSocket({ 
  subscriberEmail = null, 
  customerEmail = null, 
  customerPhone = null,
  tableId = null,
  tableNumber = null,
  onComandaUpdate = null,
  onComandaCreated = null,
  enableNotifications = true
}) {
  const socketRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Só conectar se tiver pelo menos um identificador
    if (!subscriberEmail && !customerEmail && !customerPhone && !tableId && !tableNumber) return;

    // Conectar ao servidor WebSocket
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('✅ WebSocket Comandas conectado:', socket.id);
      
      // Inscrever em atualizações de comandas
      socket.emit('subscribe:comandas', {
        subscriberEmail,
        customerEmail,
        customerPhone,
        tableId,
        tableNumber
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket Comandas desconectado');
    });

    socket.on('connect_error', () => {
      console.warn('⚠️ WebSocket Comandas indisponível — usando polling como fallback.');
    });

    // Ouvir atualizações de comandas
    socket.on('comanda:updated', (comanda) => {
      console.log('📋 Comanda atualizada via WebSocket:', comanda);
      
      // Invalidar cache do React Query para forçar atualização
      queryClient.invalidateQueries({ queryKey: ['Comanda'] });
      
      // Chamar callback customizado
      if (onComandaUpdate) {
        onComandaUpdate(comanda);
      }

      // Notificação para cliente quando garçom adiciona item
      if (enableNotifications && customerEmail) {
        const itemsCount = Array.isArray(comanda.items) ? comanda.items.length : 0;
        toast.success(
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <div>
              <p className="font-bold">Comanda atualizada!</p>
              <p className="text-sm">Total de itens: {itemsCount}</p>
            </div>
          </div>,
          { duration: 3000 }
        );
      }
    });

    // Ouvir novas comandas
    socket.on('comanda:created', (comanda) => {
      console.log('📋 Nova comanda via WebSocket:', comanda);
      
      queryClient.invalidateQueries({ queryKey: ['Comanda'] });
      
      if (onComandaCreated) {
        onComandaCreated(comanda);
      }
    });

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('unsubscribe:comandas', {
          subscriberEmail,
          customerEmail,
          customerPhone,
          tableId,
          tableNumber
        });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [subscriberEmail, customerEmail, customerPhone, tableId, tableNumber, onComandaUpdate, onComandaCreated, enableNotifications, queryClient]);

  return socketRef.current;
}
