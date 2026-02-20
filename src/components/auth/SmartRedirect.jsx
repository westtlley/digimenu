import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient as base44 } from '@/api/apiClient';
import { Loader2, Package, ArrowRight } from 'lucide-react';
import { SYSTEM_NAME, SYSTEM_LOGO_URL } from '@/config/branding';

/**
 * Redireciona para o cardápio ou landing. Não redireciona por perfil.
 *
 * - lastVisitedSlug é gravado ao visitar /s/:slug (cardápio) ou /s/:slug/login.
 * - Autenticado ou não: com lastVisitedSlug → /s/:slug; sem → landing.
 * - Admin, Assinante e Colaborador acessam pelas URLs específicas (/Admin, /PainelAssinante, /colaborador).
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
        
        clearTimeout(safetyTimer);
        // Acesso à raiz / não redireciona por perfil — Admin, Assinante e Colaborador acessam pelas URLs específicas
        const lastVisitedSlug = localStorage.getItem('lastVisitedSlug');
        if (lastVisitedSlug) {
          navigate(`/s/${lastVisitedSlug}`, { replace: true });
        } else {
          setShowLanding(true);
        }
        setChecking(false);

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
          <div className="mt-4 flex flex-wrap gap-4 justify-center">
            <Link to="/login/admin" className="text-sm text-orange-600 dark:text-orange-400 hover:underline">
              Login Admin (master)
            </Link>
            <Link to="/assinar" className="text-sm text-orange-600 dark:text-orange-400 hover:underline">
              Restaurante? Cadastre-se e comece grátis
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (timedOut) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-white dark:from-gray-900 dark:to-gray-950 p-4">
        <div className="text-center max-w-lg">
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            O servidor demorou para responder. Se estiver em desenvolvimento local, verifique se o backend está rodando e se <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">VITE_API_BASE_URL</code> aponta para ele.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            <strong>Login:</strong> {baseUrl}/login/admin ou {baseUrl}/s/seu-slug/login<br />
            <strong>Cardápio:</strong> {baseUrl}/s/seu-slug
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => { setTimedOut(false); setChecking(true); window.location.reload(); }}
              className="px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600"
            >
              Tentar novamente
            </button>
            <a href="/login/admin" className="px-4 py-2 rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-medium hover:bg-orange-100 dark:hover:bg-orange-900/30 inline-block">
              Login Admin
            </a>
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
