import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSlugContext } from './useSlugContext';

/**
 * Hook para gerenciar dados do entregador
 */
export function useEntregador() {
  const [user, setUser] = useState(null);
  const [entregador, setEntregador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);
  const { slug, subscriberEmail, inSlugContext } = useSlugContext();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        const asSub = (inSlugContext && userData?.is_master && subscriberEmail) ? subscriberEmail : undefined;

        // Verificar se é assinante (acesso livre a todas as ferramentas)
        const isAssinante = userData?.subscriber_email && (userData?.email || '').toLowerCase().trim() === (userData?.subscriber_email || '').toLowerCase().trim();
        
        // Colaborador com perfil Entregador, master, ou assinante tem acesso direto
        if (userData.profile_role === 'entregador' || userData.is_master || isAssinante) {
          setHasAccess(true);
        } else {
          const subscribers = await base44.entities.Subscriber.list();
          const subscriber = subscribers.find(s => 
            s.email === userData.subscriber_email || s.email === userData.email
          );
          if (subscriber) {
            const hasPermission = subscriber.permissions?.gestor_pedidos?.length > 0;
            setHasAccess(hasPermission);
            if (!hasPermission) {
              setLoading(false);
              return;
            }
          }
        }
        
        // Master, is_entregador, perfil colaborador Entregador, ou assinante
        if (userData.is_master || userData.is_entregador || userData.profile_role === 'entregador' || isAssinante) {
          const allEntregadores = await base44.entities.Entregador.list(null, asSub ? { as_subscriber: asSub } : {});
          const matchedEntregador = allEntregadores.find(e => 
            e.email?.toLowerCase().trim() === userData.email?.toLowerCase().trim()
          );
          
          if (matchedEntregador) {
            setEntregador(matchedEntregador);
          } else {
            // Criar entregador virtual para master/usuários sem perfil
            const virtualEntregador = {
              id: userData.is_master ? 'master-' + userData.email : 'user-' + userData.email,
              name: userData.full_name || userData.email.split('@')[0],
              email: userData.email,
              phone: userData.phone || '(00) 00000-0000',
              photo: userData.photo || userData.google_photo,
              status: 'available',
              total_deliveries: 0,
              total_earnings: 0,
              rating: 5,
              dark_mode: false,
              sound_enabled: true,
              notifications_enabled: true,
              vibration_enabled: true,
              _isMaster: userData.is_master,
              _isVirtual: true,
              _subscriberEmail: userData.subscriber_email || userData.email
            };
            setEntregador(virtualEntregador);
          }
        }
      } catch (e) {
        // Redirecionar para login de colaboradores
        base44.auth.redirectToLogin('/Entregador');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [inSlugContext, subscriberEmail]);

  return {
    user,
    entregador,
    loading,
    hasAccess,
    asSubscriber: (inSlugContext && user?.is_master && subscriberEmail) ? subscriberEmail : undefined,
    isMaster: user?.is_master || false
  };
}
