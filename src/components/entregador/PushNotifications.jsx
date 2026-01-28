import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';

export default function PushNotifications({ entregador, enabled }) {
  const prevCountRef = useRef(0);
  const audioRef = useRef(null);
  const hasRequestedPermissionRef = useRef(false);

  // Buscar pedidos disponíveis
  const { data: availableOrders = [] } = useQuery({
    queryKey: ['availableOrdersNotif'],
    queryFn: async () => {
      const orders = await base44.entities.Order.filter({
        status: 'ready',
        delivery_method: 'delivery'
      });
      return orders.filter(o => !o.entregador_id);
    },
    enabled: enabled && entregador?.status === 'available',
    refetchInterval: 3000,
  });

  // Solicitar permissão de notificação
  useEffect(() => {
    if (!enabled || hasRequestedPermissionRef.current) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          toast.success('Notificações ativadas! ✅');
        }
      });
      hasRequestedPermissionRef.current = true;
    }
  }, [enabled]);

  // Criar/precarregar áudio
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.8;
    audioRef.current.load();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Monitorar novos pedidos
  useEffect(() => {
    if (!enabled || !entregador) return;

    const currentCount = availableOrders.length;
    
    // Novo pedido detectado
    if (currentCount > prevCountRef.current && prevCountRef.current > 0) {
      const newOrders = currentCount - prevCountRef.current;
      
      // Tocar som
      if (entregador.sound_enabled !== false && audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }

      // Vibrar
      if (entregador.vibration_enabled !== false && navigator.vibrate) {
        navigator.vibrate([300, 100, 300, 100, 300]);
      }

      // Notificação do navegador
      if (Notification.permission === 'granted') {
        const notification = new Notification('🚴 Novo Pedido Disponível!', {
          body: `${newOrders} ${newOrders === 1 ? 'pedido pronto' : 'pedidos prontos'} para entrega`,
          icon: '/icon.png',
          badge: '/badge.png',
          tag: 'new-order',
          requireInteraction: true,
          vibrate: [300, 100, 300],
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Auto-fechar após 10 segundos
        setTimeout(() => notification.close(), 10000);
      }

      // Toast visual
      toast.success(
        `🚴 ${newOrders} ${newOrders === 1 ? 'Novo pedido' : 'Novos pedidos'} disponível para entrega!`,
        {
          duration: 5000,
          style: {
            background: '#10b981',
            color: 'white',
            fontWeight: 'bold',
          },
        }
      );
    }

    prevCountRef.current = currentCount;
  }, [availableOrders, enabled, entregador]);

  return null;
}