import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient as base44 } from '@/api/apiClient';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { logger } from '@/utils/logger';

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
        if (!isAuth) {
          base44.auth.redirectToLogin(location.pathname);
          return;
        }

        // Obter dados do usuário
        const userData = await base44.auth.me();
        setUser(userData);

        // Verificar se requer master
        if (requireMaster && !userData.is_master) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        // Verificar role específico
        if (requiredRole && userData.role !== requiredRole) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        // Se for master, tem acesso total
        if (userData.is_master) {
          setAuthorized(true);
          setLoading(false);
          return;
        }

        // Verificar se é assinante (acesso livre a todas as ferramentas)
        const isAssinante = userData?.subscriber_email && (userData?.email || '').toLowerCase().trim() === (userData?.subscriber_email || '').toLowerCase().trim();
        
        // Verificar se é gerente ou colaborador (podem acessar mesmo sem assinatura ativa)
        const roles = userData?.profile_roles?.length ? userData.profile_roles : userData?.profile_role ? [userData.profile_role] : [];
        const isGerente = roles.includes('gerente');
        const isColaborador = roles.length > 0; // Qualquer colaborador (entregador, cozinha, pdv, garcom, gerente)

        // Verificar assinatura ativa
        if (requireActiveSubscription) {
          // Assinante tem acesso livre a todas as ferramentas
          if (isAssinante) {
            setAuthorized(true);
            setLoading(false);
            return;
          }
          
          // Gerente pode acessar mesmo sem assinatura ativa (cargo de confiança)
          if (isGerente) {
            setAuthorized(true);
            setLoading(false);
            return;
          }

          // Colaboradores (entregador, cozinha, pdv, garcom) podem acessar seus apps mesmo sem assinatura ativa
          // Mas apenas se estiverem acessando a rota correta para seu perfil
          // NOTA: Gerente já foi verificado acima e pode acessar tudo
          if (isColaborador && !isGerente) {
            const path = location.pathname.toLowerCase();
            const role = roles[0]; // Pega o primeiro role
            
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
            if (isAccessingCorrectRoute) {
              setAuthorized(true);
              setLoading(false);
              return;
            }
          }

          try {
            const result = await base44.functions.invoke('checkSubscriptionStatus', {
              user_email: userData.email
            });

            const subscriber = result.data?.subscriber;
            
            // Se encontrou assinante e está ativo, permitir acesso
            if (subscriber && subscriber.status === 'active') {
              setSubscriberData(subscriber);
              setAuthorized(true);
            } 
            // Se encontrou assinante mas está inativo, bloquear
            else if (subscriber && subscriber.status !== 'active') {
              setAuthorized(false);
              setSubscriberData(subscriber);
            }
            // Se não encontrou assinante:
            // - Se o usuário tem subscriber_email, pode ser problema na busca - permitir e deixar PainelAssinante verificar
            // - Se não tem subscriber_email mas não é cliente (role !== 'customer'), pode ser assinante - permitir e deixar PainelAssinante verificar
            // - Se é cliente (role === 'customer'), bloquear (clientes não acessam PainelAssinante)
            else {
              // Verificar se o usuário tem subscriber_email (indica que deveria ter assinante)
              if (userData.subscriber_email) {
                // Tem subscriber_email mas não encontrou assinante - pode ser problema temporário
                // Permitir acesso e deixar PainelAssinante fazer verificação mais detalhada
                setAuthorized(true);
                setSubscriberData(null);
              } 
              // Se não tem subscriber_email mas não é cliente, pode ser assinante (subscriber_email pode ser null para assinantes)
              // Permitir acesso e deixar PainelAssinante verificar (ele usa usePermission que tem lógica mais robusta)
              else if (userData.role !== 'customer') {
                // Não é cliente - pode ser assinante sem subscriber_email preenchido
                // Permitir acesso e deixar PainelAssinante fazer verificação mais detalhada
                setAuthorized(true);
                setSubscriberData(null);
              } else {
                // É cliente - não deve acessar PainelAssinante
                setAuthorized(false);
                setSubscriberData(null);
              }
            }
          } catch (error) {
            logger.error('Error checking subscription:', error);
            // Em caso de erro na verificação, se tem subscriber_email, permitir acesso
            // (melhor UX - deixa PainelAssinante fazer verificação mais detalhada)
            if (userData.subscriber_email) {
              setAuthorized(true);
              setSubscriberData(null);
            } else {
              setAuthorized(false);
              setSubscriberData(null);
            }
          }
        } else {
          // Não requer assinatura ativa
          setAuthorized(true);
        }

      } catch (error) {
        logger.error('Error checking access:', error);
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
