import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '@/api/apiClient';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

/**
 * Página de callback do Google OAuth
 * Recebe o token do backend e faz login automático
 */
export default function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const name = searchParams.get('name');
  const error = searchParams.get('error');
  
  useEffect(() => {
    const handleCallback = async () => {
      if (error) {
        console.error('Erro no callback Google:', error);
        toast.error('Erro ao fazer login com Google. Tente novamente.');
        navigate('/login');
        return;
      }
      
      if (!token) {
        console.error('Token não recebido do Google');
        toast.error('Erro ao fazer login. Token não recebido.');
        navigate('/login');
        return;
      }
      
      try {
        // Salvar token
        localStorage.setItem('token', token);
        
        // Buscar dados do usuário
        const user = await apiClient.auth.me();
        
        if (user) {
          // Salvar dados do usuário
          localStorage.setItem('user', JSON.stringify(user));
          
          toast.success(`Bem-vindo, ${user.full_name || name || 'Usuário'}!`);
          
          // Redirecionar conforme perfil
          if (user.role === 'customer') {
            // Cliente → Cardápio
            navigate('/Cardapio', { replace: true });
          } else if (user.profile_role === 'entregador') {
            navigate('/Entregador', { replace: true });
          } else if (user.profile_role === 'cozinha') {
            navigate('/Cozinha', { replace: true });
          } else if (user.profile_role === 'pdv') {
            navigate('/PDV', { replace: true });
          } else if (user.profile_role === 'garcom') {
            navigate('/Garcom', { replace: true });
          } else if (user.profile_role === 'gerente') {
            navigate('/PainelAssinante', { replace: true });
          } else if (user.is_master) {
            navigate('/Admin', { replace: true });
          } else {
            navigate('/PainelAssinante', { replace: true });
          }
        } else {
          throw new Error('Dados do usuário não encontrados');
        }
      } catch (err) {
        console.error('Erro ao processar callback:', err);
        toast.error('Erro ao fazer login. Tente novamente.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    };
    
    handleCallback();
  }, [token, error, email, name, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
        <p className="text-lg" style={{ color: 'var(--text-primary)' }}>
          Processando login...
        </p>
        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
          Aguarde enquanto finalizamos seu acesso
        </p>
      </div>
    </div>
  );
}
