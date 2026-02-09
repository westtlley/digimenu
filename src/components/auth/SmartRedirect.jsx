import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient as base44 } from '@/api/apiClient';
import { Loader2 } from 'lucide-react';

/**
 * Componente que redireciona inteligentemente baseado no perfil do usuário
 * 
 * GOVERNANÇA DE REDIRECIONAMENTOS:
 * 1. Cliente (customer) → Último cardápio visitado ou página inicial
 * 2. Assinante (autenticado, não master) → /PainelAssinante
 * 3. Admin Master → /Admin
 * 4. Colaborador → /colaborador
 * 5. NÃO autenticado → Página inicial (não /Assinar)
 */
export default function SmartRedirect() {
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAndRedirect = async () => {
      try {
        // Verificar se está autenticado
        const isAuth = await base44.auth.isAuthenticated();
        
        if (!isAuth) {
          // Não autenticado → Página inicial (não redirecionar para /Assinar)
          // Se houver último cardápio visitado, ir para lá
          const lastVisitedSlug = localStorage.getItem('lastVisitedSlug');
          if (lastVisitedSlug) {
            navigate(`/s/${lastVisitedSlug}`, { replace: true });
          } else {
            // Página inicial simples, sem forçar /Assinar
            navigate('/', { replace: true });
          }
          return;
        }

        // Obter dados do usuário
        const userData = await base44.auth.me();

        // Admin Master → Admin
        if (userData?.is_master) {
          navigate('/Admin', { replace: true });
          return;
        }

        // Cliente (customer) → Último cardápio visitado ou página inicial
        if (userData?.role === 'customer') {
          const lastVisitedSlug = localStorage.getItem('lastVisitedSlug');
          if (lastVisitedSlug) {
            navigate(`/s/${lastVisitedSlug}`, { replace: true });
          } else {
            // Não redirecionar para /Assinar, apenas ficar na página inicial
            navigate('/', { replace: true });
          }
          return;
        }

        // Colaborador (qualquer perfil) → Home do colaborador com botões
        if (userData?.profile_role || userData?.profile_roles?.length) {
          navigate('/colaborador', { replace: true });
          return;
        }

        // Assinante (não master) → Painel do Assinante
        navigate('/PainelAssinante', { replace: true });

      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        // Em caso de erro, não redirecionar para /Assinar, apenas página inicial
        const lastVisitedSlug = localStorage.getItem('lastVisitedSlug');
        if (lastVisitedSlug) {
          navigate(`/s/${lastVisitedSlug}`, { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } finally {
        setChecking(false);
      }
    };

    checkAndRedirect();
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return null;
}
