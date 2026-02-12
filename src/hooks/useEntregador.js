import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSlugContext } from './useSlugContext';

/**
 * Hook para gerenciar dados do entregador
 * ✅ SIMPLIFICADO: Removida lógica de negócio de verificação de permissões
 * Backend é responsável por validar acesso (retorna 403 se não autorizado)
 */
export function useEntregador() {
  const [user, setUser] = useState(null);
  const [entregador, setEntregador] = useState(null);
  const [loading, setLoading] = useState(true);
  const { slug, subscriberEmail, inSlugContext } = useSlugContext();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        const asSub = (inSlugContext && userData?.is_master && subscriberEmail) ? subscriberEmail : undefined;

        // ✅ SIMPLIFICADO: Tentar buscar entregador - backend valida permissões
        // Se não tiver acesso, backend retorna 403 e o erro será tratado pelo componente
        try {
          const allEntregadores = await base44.entities.Entregador.list(null, asSub ? { as_subscriber: asSub } : {});
          const matchedEntregador = allEntregadores.find(e => 
            e.email?.toLowerCase().trim() === userData.email?.toLowerCase().trim()
          );
          
          if (matchedEntregador) {
            setEntregador(matchedEntregador);
          } else if (userData.is_master || userData.profile_role === 'entregador') {
            // Criar entregador virtual para master/entregadores sem perfil cadastrado
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
        } catch (accessError) {
          // Backend retornou erro (403, 404, etc) - componente tratará
          // Não definir entregador, deixar componente mostrar erro de acesso
          console.warn('Erro ao buscar entregador (backend valida acesso):', accessError);
        }
      } catch (e) {
        // Erro de autenticação - redirecionar para login
        console.error('Erro de autenticação:', e);
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
    // ✅ REMOVIDO: hasAccess - backend valida acesso via 403
    asSubscriber: (inSlugContext && user?.is_master && subscriberEmail) ? subscriberEmail : undefined,
    isMaster: user?.is_master || false
  };
}
