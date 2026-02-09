import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient as base44 } from '@/api/apiClient';
import { Loader2, Package, ArrowRight } from 'lucide-react';
import { SYSTEM_NAME, SYSTEM_LOGO_URL } from '@/config/branding';

/**
 * Redireciona por perfil. A URL / só mostra a landing quando acessada diretamente (sem lastVisitedSlug).
 *
 * - lastVisitedSlug é gravado ao visitar /s/:slug (cardápio) ou /s/:slug/login.
 * - Não autenticado + lastVisitedSlug → redireciona para /s/:slug (cardápio do cliente).
 * - Não autenticado + sem lastVisitedSlug → mostra landing em / (só quem acessa a raiz diretamente).
 * - Autenticado: Master → /Admin; cliente → /s/slug ou landing; colaborador → /colaborador; assinante → /PainelAssinante.
 */
export default function SmartRedirect() {
  const [checking, setChecking] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const [showLanding, setShowLanding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setTimedOut(false);
    setShowLanding(false);
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
            setShowLanding(true);
          }
          setChecking(false);
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
            setShowLanding(true);
          }
          setChecking(false);
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
          setShowLanding(true);
        }
        setChecking(false);
      } finally {
        setChecking(false);
      }
    };

    checkAndRedirect();
    return () => clearTimeout(safetyTimer);
  }, [navigate]);

  if (showLanding) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-orange-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <img src={SYSTEM_LOGO_URL} alt={SYSTEM_NAME} className="h-12 w-auto" />
            <span className="font-bold text-xl text-slate-800 dark:text-white">{SYSTEM_NAME}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white text-center mb-2">
            Bem-vindo
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-center max-w-md mb-8">
            Cardápio digital, pedidos e gestão para seu restaurante. Acesse pelo link do seu estabelecimento ou conheça os planos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
            <Link
              to="/assinar"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-lg transition-colors"
            >
              Conhecer planos
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/rastrear-pedido"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border-2 border-slate-200 dark:border-gray-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Package className="w-4 h-4" />
              Rastrear pedido
            </Link>
          </div>
          <p className="mt-8 text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
            Já tem o link do seu restaurante? Acesse pelo endereço que você recebeu (ex.: {typeof window !== 'undefined' ? window.location.host + '/s/nome-do-restaurante' : 'seusite.com/s/nome-do-restaurante'}).
          </p>
          <Link to="/assinar" className="mt-6 text-sm text-orange-600 dark:text-orange-400 hover:underline">
            Restaurante? Cadastre-se e comece grátis
          </Link>
        </div>
      </div>
    );
  }

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
