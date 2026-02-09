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
  const [timedOut, setTimedOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setTimedOut(false);
    const SAFETY_TIMEOUT_MS = 18000;
    const safetyTimer = setTimeout(() => {
      setTimedOut(true);
      setChecking(false);
    }, SAFETY_TIMEOUT_MS);

    const checkAndRedirect = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        
        if (!isAuth) {
          clearTimeout(safetyTimer);
          const lastVisitedSlug = localStorage.getItem('lastVisitedSlug');
          if (lastVisitedSlug) {
            navigate(`/s/${lastVisitedSlug}`, { replace: true });
          } else {
            navigate('/', { replace: true });
          }
          return;
        }

        const userData = await base44.auth.me();
        clearTimeout(safetyTimer);

        if (userData?.is_master) {
          navigate('/Admin', { replace: true });
          return;
        }

        if (userData?.role === 'customer') {
          const lastVisitedSlug = localStorage.getItem('lastVisitedSlug');
          if (lastVisitedSlug) {
            navigate(`/s/${lastVisitedSlug}`, { replace: true });
          } else {
            navigate('/', { replace: true });
          }
          return;
        }

        if (userData?.profile_role || userData?.profile_roles?.length) {
          navigate('/colaborador', { replace: true });
          return;
        }

        navigate('/PainelAssinante', { replace: true });

      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        clearTimeout(safetyTimer);
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
    return () => clearTimeout(safetyTimer);
  }, [navigate]);

  if (timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white dark:from-gray-900 dark:to-gray-950 p-4">
        <div className="text-center max-w-md">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            O servidor demorou para responder. Acesse pelo link do seu restaurante (ex.: /s/seu-restaurante/login) ou tente novamente.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => { setTimedOut(false); setChecking(true); window.location.reload(); }}
              className="px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600"
            >
              Tentar novamente
            </button>
            <a href="/assinar" className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 inline-block">
              Ver planos
            </a>
          </div>
        </div>
      </div>
    );
  }

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
