import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { BACKEND_BASE_URL } from '@/api/apiClient';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_WS_URL || BACKEND_BASE_URL || 'http://localhost:3000';

/**
 * Hook para gerenciar WebSocket de chamadas de garçom
 */
export function useWaiterCallWebSocket(options = true) {
  const normalizedOptions =
    typeof options === 'object' && options !== null
      ? options
      : { enabled: Boolean(options) };
  const { enabled = true, subscriberEmailOverride = null } = normalizedOptions;
  const [waiterCalls, setWaiterCalls] = useState([]);
  const socketRef = useRef(null);
  const queryClient = useQueryClient();
  const audioRef = useRef(null);
  const scopedEntityOpts = subscriberEmailOverride ? { as_subscriber: subscriberEmailOverride } : {};

  // Buscar chamadas pendentes
  const { data: allWaiterCalls = [] } = useQuery({
    queryKey: ['WaiterCall', subscriberEmailOverride || 'self'],
    queryFn: async () => {
      try {
        return await base44.entities.WaiterCall.list('-created_at', { status: 'pending', ...scopedEntityOpts });
      } catch (e) {
        console.error('Erro ao buscar chamadas:', e);
        return [];
      }
    },
    enabled: enabled,
    refetchInterval: enabled ? 5000 : false,
  });

  // Atualizar chamadas pendentes quando os dados mudarem
  useEffect(() => {
    if (Array.isArray(allWaiterCalls)) {
      const pending = allWaiterCalls.filter(call => call.status === 'pending');
      setWaiterCalls(pending);
    }
  }, [allWaiterCalls]);

  // Criar/precarregar áudio para notificação
  useEffect(() => {
    if (!enabled) return;
    
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKzn8LZjGwY4kdfyzHksBSR3x/DdkEAKFF606euoVRQKRp/g8r5sIQUrgc7y2Yk2CBtpvfDknE4MDlCs5/C2YxsGOJHX8sx5LAUkd8fw3ZBAC');
    audioRef.current.volume = 0.7;
    audioRef.current.load();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [enabled]);

  // Conectar WebSocket
  useEffect(() => {
    if (!enabled) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Buscar dados do usuário para conectar ao socket
    const connectSocket = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) return;

        const subscriberEmail = subscriberEmailOverride || user.subscriber_email || user.email;
        const waiterEmail = user.email;
        if (!subscriberEmail) return;

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
          
          // Invalidar query para buscar novas chamadas
          queryClient.invalidateQueries({ queryKey: ['WaiterCall'] });
          
          // Adicionar à lista de chamadas pendentes
          setWaiterCalls(prev => {
            const exists = prev.some(c => c.id === call.id);
            if (exists) return prev;
            return [...prev, { ...call, status: 'pending' }];
          });

          // Notificação visual e sonora
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
        });
      } catch (e) {
        console.error('Erro ao conectar WebSocket:', e);
      }
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [enabled, queryClient, subscriberEmailOverride]);

  return {
    waiterCalls,
    allWaiterCalls: allWaiterCalls || [],
    setWaiterCalls
  };
}
