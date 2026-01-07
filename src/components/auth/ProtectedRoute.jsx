import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

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
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
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

        // Verificar assinatura ativa
        if (requireActiveSubscription) {
          try {
            const result = await base44.functions.invoke('checkSubscriptionStatus', {
              user_email: userData.email
            });

            const subscriber = result.data?.subscriber;
            
            if (subscriber && subscriber.status === 'active') {
              setSubscriberData(subscriber);
              setAuthorized(true);
            } else {
              setAuthorized(false);
              setSubscriberData(subscriber || null);
            }
          } catch (error) {
            console.error('Error checking subscription:', error);
            setAuthorized(false);
          }
        } else {
          // Não requer assinatura ativa
          setAuthorized(true);
        }

      } catch (error) {
        console.error('Error checking access:', error);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [requireMaster, requireActiveSubscription, requiredRole, location.pathname]);

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
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="rounded-2xl shadow-lg p-8 max-w-md text-center" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid var(--border-color)` }}>
          <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Acesso Não Autorizado
          </h2>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            {requireMaster 
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
            <Link to={createPageUrl('Cardapio')} className="block">
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
