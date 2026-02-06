import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Hook para gerenciar WebSocket de chamadas de garçom
 */
export function useWaiterCallWebSocket({ 
  subscriberEmail = null, 
  waiterEmail = null,
  onWaiterCall = null,
  enableNotifications = true
}) {
  const socketRef = useRef(null);
  const queryClient = useQueryClient();
  const audioRef = useRef(null);

  // Criar/precarregar áudio para notificação
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKzn8LZjGwY4kdfyzHksBSR3x/DdkEAKFF606euoVRQKRp/g8r5sIQUrgc7y2Yk2CBtpvfDknE4MDlCs5/C2YxsGOJHX8sx5LAUkd8fw3ZBAC');
    audioRef.current.volume = 0.7;
    audioRef.current.load();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!subscriberEmail && !waiterEmail) return;

    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('✅ WebSocket Garçom conectado:', socket.id);
      
      socket.emit('subscribe:waiter', {
        subscriberEmail,
        waiterEmail
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket Garçom desconectado');
    });

    socket.on('connect_error', () => {
      console.warn('⚠️ WebSocket Garçom indisponível.');
    });

    // Ouvir chamadas de garçom
    socket.on('waiter:call', (call) => {
      console.log('🔔 Chamada de garçom via WebSocket:', call);
      
      queryClient.invalidateQueries({ queryKey: ['WaiterCall'] });
      
      if (onWaiterCall) {
        onWaiterCall(call);
      }

      // Notificação visual e sonora
      if (enableNotifications) {
        // Tocar som
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.log('Erro ao tocar som:', e));
        }

        // Vibrar (se disponível)
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 200]);
        }

        // Toast notification
        toast.success(
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-orange-500 animate-pulse" />
            <div>
              <p className="font-bold">Chamada de Garçom!</p>
              <p className="text-sm">Mesa {call.table_number || call.table_id}</p>
            </div>
          </div>,
          {
            duration: 5000,
            position: 'top-center',
            style: {
              background: '#fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }
          }
        );

        // Notificação do navegador
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🔔 Chamada de Garçom', {
            body: `Mesa ${call.table_number || call.table_id} está chamando`,
            icon: '/icon.png',
            badge: '/badge.png',
            tag: 'waiter-call',
            requireInteraction: true,
          });
        }
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [subscriberEmail, waiterEmail, onWaiterCall, enableNotifications, queryClient]);

  return socketRef.current;
}
