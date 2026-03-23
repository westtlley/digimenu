import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient as base44 } from '@/api/apiClient';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { logger } from '@/utils/logger';
import { canAccessOperationalApp, canAccessTenantScope, getPrimaryUserRole, getUserRoles, hasUserRole, isCollaboratorUser } from '@/components/permissions/usePermission';

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
const trace = (...args) => {
  if (isDev) {
    console.info('[PROTECTED_ROUTE]', ...args);
  }
};

/**
 * Componente para proteger rotas que requerem email cadastrado
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Componente a ser renderizado se autorizado
 * @param {boolean} props.requireMaster - Se true, requer is_master = true
 * @param {boolean} props.requireActiveSubscription - Se true, requer assinatura ativa
 * @param {string} props.requiredRole - Role específico necessário (ex: 'admin')
 */
export default function ProtectedRoute({ 
  children, 
  requireMaster = false,
  requireActiveSubscription = true,
  requiredRole = null 
}) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState(null);
  const [subscriberData, setSubscriberData] = useState(null);
  const [accessTimeout, setAccessTimeout] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    trace('check start', {
      path: location.pathname,
      requireMaster,
      requireActiveSubscription,
      requiredRole,
    });
    setAccessTimeout(false);
    const CHECK_TIMEOUT_MS = 20000;
    const timeoutId = setTimeout(() => {
      setAccessTimeout(true);
      setLoading(false);
      setAuthorized(false);
    }, CHECK_TIMEOUT_MS);

    const checkAccess = async () => {
      try {
        // Verificar se está autenticado
        const isAuth = await base44.auth.isAuthenticated();
        trace('isAuthenticated result', { path: location.pathname, isAuth });
        if (!isAuth) {
          trace('redirect to login', { path: location.pathname });
          base44.auth.redirectToLogin(location.pathname);
          return;
        }

        // Obter dados do usuário e contexto canônico do backend
        const rawUserData = await base44.auth.me();
        let contextData = null;
        try {
          contextData = await base44.get('/user/context', { _t: Date.now() });
          trace('loaded canonical context', {
            path: location.pathname,
            email: contextData?.user?.email,
            isMaster: contextData?.user?.is_master,
            subscriberStatus: contextData?.subscriberData?.status ?? null,
          });
        } catch (contextError) {
          logger.warn('[ProtectedRoute] Falha ao carregar /user/context, usando auth.me()', contextError);
          trace('failed canonical context', {
            path: location.pathname,
            message: contextError?.message,
          });
        }

        const userData = contextData?.user || rawUserData;
        const canonicalSubscriberData = contextData?.subscriberData || null;
        setUser(userData);

        // Verificar se requer master
        if (requireMaster && !userData.is_master) {
          trace('deny requireMaster', { path: location.pathname, email: userData?.email });
          setAuthorized(false);
          setLoading(false);
          return;
        }

        // Verificar role específico
        if (requiredRole && userData.role !== requiredRole && !hasUserRole(userData, requiredRole)) {
          trace('deny requiredRole', { path: location.pathname, role: userData?.role, requiredRole });
          setAuthorized(false);
          setLoading(false);
          return;
        }

        // Se for master, tem acesso total
        if (userData.is_master) {
          trace('allow master', { path: location.pathname, email: userData?.email });
          setAuthorized(true);
          setLoading(false);
          return;
        }

        // Verificar se é assinante/dono (acesso livre a todas as ferramentas)
        const roles = getUserRoles(userData);
        const isGerente = hasUserRole(userData, 'gerente');
        const isColaborador = isCollaboratorUser(userData);
        const hasCanonicalTenantMatch = canAccessTenantScope(userData, {
          subscriberId: canonicalSubscriberData?.id ?? canonicalSubscriberData?.subscriber_id ?? null,
          subscriberEmail: canonicalSubscriberData?.email ?? canonicalSubscriberData?.subscriber_email ?? userData?.subscriber_email,
          inSlugContext: true,
        });
        // Dono do estabelecimento: tenant canonico OU (sem perfil de colaborador e nao e cliente)
        const isAssinante = hasCanonicalTenantMatch || (roles.length === 0 && userData?.role !== 'customer' && !userData?.is_master);

        // Verificar assinatura ativa
        if (requireActiveSubscription) {
          // Gerente que acessa PainelAssinante → redirecionar para /colaborador (evita loop e loading duplo)
          if (isGerente && !isAssinante && location.pathname.toLowerCase().includes('painelassinante')) {
            trace('redirect gerente to colaborador', { path: location.pathname, email: userData?.email });
            navigate('/colaborador', { replace: true });
            setLoading(false);
            return;
          }
          // Gerente em outras rotas protegidas (ex.: GestorPedidos) pode acessar
          if (isGerente) {
            trace('allow gerente', { path: location.pathname, email: userData?.email });
            setAuthorized(true);
            setLoading(false);
            return;
          }

          // Colaboradores (entregador, cozinha, pdv, garcom) podem acessar seus apps mesmo sem assinatura ativa
          // Mas apenas se estiverem acessando a rota correta para seu perfil
          // NOTA: Gerente já foi verificado acima e pode acessar tudo
          if (isColaborador && !isGerente) {
            const path = location.pathname.toLowerCase();
            const role = getPrimaryUserRole(userData);
            
            // Verificar se está acessando a rota correta para seu perfil
            // Suporta rotas com e sem slug (ex: /Entregador ou /s/slug/Entregador)
            const roleRouteMap = {
              'entregador': ['entregador', 'entregadorpanel'],
              'cozinha': ['cozinha'],
              'pdv': ['pdv'],
              'garcom': ['garcom']
            };
            
            const allowedRoutes = roleRouteMap[role] || [];
            const isAccessingCorrectRoute = allowedRoutes.some(route => 
              path.includes(`/${route}`) || path.endsWith(`/${route}`)
            );
            
            // Se for colaborador acessando sua rota específica, permitir
            if (isAccessingCorrectRoute && canAccessOperationalApp(userData, {
              subscriberId: canonicalSubscriberData?.id ?? canonicalSubscriberData?.subscriber_id ?? null,
              subscriberEmail: canonicalSubscriberData?.email ?? canonicalSubscriberData?.subscriber_email ?? userData?.subscriber_email,
              inSlugContext: false,
              allowedRoles: [role],
            })) {
              trace('allow collaborator route', { path: location.pathname, role });
              setAuthorized(true);
              setLoading(false);
              return;
            }

            trace('deny collaborator wrong route', { path: location.pathname, role });
            navigate('/colaborador', { replace: true });
            setAuthorized(false);
            setLoading(false);
            return;
          }

          try {
            if (canonicalSubscriberData) {
              setSubscriberData(canonicalSubscriberData);
              setAuthorized(canonicalSubscriberData.status === 'active');
              trace('subscriber decision', {
                path: location.pathname,
                email: userData?.email,
                subscriberEmail: canonicalSubscriberData?.email,
                status: canonicalSubscriberData?.status,
                authorized: canonicalSubscriberData.status === 'active',
              });
            } else if (userData.subscriber_email || userData.role !== 'customer') {
              trace('allow subscriber fallback without canonical subscriberData', {
                path: location.pathname,
                email: userData?.email,
              });
              setAuthorized(true);
              setSubscriberData(null);
            } else {
              trace('deny no subscriber identity', {
                path: location.pathname,
                email: userData?.email,
              });
              setAuthorized(false);
              setSubscriberData(null);
            }
          } catch (error) {
            logger.error('Error checking subscription:', error);
            // Em caso de erro na verificação, se tem subscriber_email, permitir acesso
            // (melhor UX - deixa PainelAssinante fazer verificação mais detalhada)
            if (userData.subscriber_email) {
              trace('allow subscription error fallback', {
                path: location.pathname,
                email: userData?.email,
                message: error?.message,
              });
              setAuthorized(true);
              setSubscriberData(null);
            } else {
              trace('deny subscription error without subscriber_email', {
                path: location.pathname,
                email: userData?.email,
                message: error?.message,
              });
              setAuthorized(false);
              setSubscriberData(null);
            }
          }
        } else {
          // Não requer assinatura ativa
          trace('allow no active subscription requirement', { path: location.pathname });
          setAuthorized(true);
        }

      } catch (error) {
        logger.error('Error checking access:', error);
        trace('deny exception', { path: location.pathname, message: error?.message });
        setAuthorized(false);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    checkAccess();
    return () => clearTimeout(timeoutId);
  }, [requireMaster, requireActiveSubscription, requiredRole, location.pathname, retryCount]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!authorized) {
    const isTimeout = accessTimeout;
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="rounded-2xl shadow-lg p-8 max-w-md text-center" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid var(--border-color)` }}>
          <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {isTimeout ? 'Verificação demorou demais' : 'Acesso Não Autorizado'}
          </h2>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            {isTimeout
              ? 'O servidor não respondeu a tempo. Verifique sua conexão ou tente acessar pelo link do seu restaurante (ex.: /s/seu-restaurante/login).'
              : requireMaster
              ? 'Apenas administradores master podem acessar esta página.'
              : requireActiveSubscription
              ? 'Você precisa de uma assinatura ativa para acessar esta página.'
              : 'Você não tem permissão para acessar esta página.'}
          </p>
          {subscriberData && subscriberData.status !== 'active' && (
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Status da assinatura: <strong>{subscriberData.status || 'inativo'}</strong>
              </p>
            </div>
          )}
          <div className="space-y-3">
            {isTimeout && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setAccessTimeout(false); setLoading(true); setRetryCount(c => c + 1); }}
              >
                Tentar novamente
              </Button>
            )}
            <a 
              href="https://wa.me/5586988196114" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full bg-green-600 hover:bg-green-700">
                Falar no WhatsApp
              </Button>
            </a>
            <Link to={(user?.slug || subscriberData?.slug) ? `/s/${user?.slug || subscriberData?.slug}` : createPageUrl('Cardapio')} className="block">
              <Button variant="outline" className="w-full">
                Ver Cardápio
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              onClick={() => base44.auth.logout()} 
              className="w-full"
            >
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}



