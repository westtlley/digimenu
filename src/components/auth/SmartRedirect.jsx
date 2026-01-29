import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient as base44 } from '@/api/apiClient';
import { Loader2 } from 'lucide-react';

/**
 * Componente que redireciona inteligentemente baseado no perfil do usuário
 * 
 * GOVERNANÇA DE REDIRECIONAMENTOS:
 * 1. Cliente (customer) → Último cardápio visitado ou /Assinar
 * 2. Assinante (autenticado, não master) → /PainelAssinante
 * 3. Admin Master → /Admin
 * 4. NÃO autenticado → /Assinar
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
          // Não autenticado → Página de vendas
          navigate('/Assinar', { replace: true });
          return;
        }

        // Obter dados do usuário
        const userData = await base44.auth.me();

        // Admin Master → Admin
        if (userData?.is_master) {
          navigate('/Admin', { replace: true });
          return;
        }

        // Cliente (customer) → Assinar (para escolher um cardápio)
        if (userData?.role === 'customer') {
          // Verificar se há um último cardápio visitado no localStorage
          const lastVisitedSlug = localStorage.getItem('lastVisitedSlug');
          if (lastVisitedSlug) {
            navigate(`/s/${lastVisitedSlug}`, { replace: true });
          } else {
            navigate('/Assinar', { replace: true });
          }
          return;
        }

        // Colaborador → Seu painel específico
        if (userData?.profile_role === 'entregador') {
          navigate('/Entregador', { replace: true });
          return;
        }
        if (userData?.profile_role === 'cozinha') {
          navigate('/Cozinha', { replace: true });
          return;
        }
        if (userData?.profile_role === 'pdv') {
          navigate('/PDV', { replace: true });
          return;
        }
        if (userData?.profile_role === 'garcom') {
          navigate('/Garcom', { replace: true });
          return;
        }

        // Assinante (não master) → Painel do Assinante
        navigate('/PainelAssinante', { replace: true });

      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        // Em caso de erro, redirecionar para /Assinar
        navigate('/Assinar', { replace: true });
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
