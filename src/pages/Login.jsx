import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient as base44 } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, LogIn, Loader2, Lock, Store, Settings, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

/**
 * Página de Login única. O formulário é o mesmo para todos.
 * Após o login, o redirecionamento é feito conforme o perfil retornado pelo backend:
 * - Cliente (role customer): Cardápio — pedidos, dados e histórico
 * - Assinante: Painel do Restaurante (PainelAssinante)
 * - Admin Master: Admin
 * - returnUrl específico (ex. /Entregador) é respeitado quando o usuário tem permissão.
 */
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/';

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const ok = await base44.auth.isAuthenticated();
        if (!ok) return;
        const me = await base44.auth.me();
        let to = returnUrl;
        if (!returnUrl || returnUrl === '/' || returnUrl === '/login') {
          if (me?.role === 'customer') to = '/Cardapio';
          else if (me?.profile_role || me?.profile_roles?.length) to = '/colaborador';
          else to = me?.is_master ? '/Admin' : '/PainelAssinante';
        }
        navigate(to);
      } catch (e) {
        // Não autenticado ou falha em me()
      }
    };
    checkAuth();
  }, [navigate, returnUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Preencha email e senha');
      setLoading(false);
      return;
    }

    try {
      const response = await base44.auth.login(email, password);
      const userData = response.user || response;

      if (response.token) {
        toast.success('Login realizado com sucesso!');

        let redirectUrl = returnUrl;

        // Cliente → sempre Cardápio (acesso a pedidos, dados, histórico)
        if (userData?.role === 'customer') {
          redirectUrl = '/Cardapio';
        }
        // Colaborador (qualquer perfil) → Home do colaborador com botões
        else if (userData?.profile_role || userData?.profile_roles?.length) {
          redirectUrl = '/colaborador';
        }
        // Assinante tentando Admin → PainelAssinante
        else if (!userData?.is_master && (returnUrl.includes('/Admin') || returnUrl === '/Admin')) {
          redirectUrl = '/PainelAssinante';
        }
        // Master tentando PainelAssinante → Admin
        else if (userData?.is_master && (returnUrl.includes('PainelAssinante') || returnUrl.includes('/PainelAssinante'))) {
          redirectUrl = '/Admin';
        }
        // Sem destino definido (/, /login, vazio): decidir pelo perfil
        else if (!returnUrl || returnUrl === '/' || returnUrl === '/login') {
          if (userData?.role === 'customer') {
            redirectUrl = '/Cardapio';
          } else if (userData?.profile_role || userData?.profile_roles?.length) {
            redirectUrl = '/colaborador';
          } else {
            redirectUrl = userData?.is_master ? '/Admin' : '/PainelAssinante';
          }
        }

        setTimeout(() => navigate(redirectUrl), 400);
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    } catch (err) {
      const msg = err?.message || 'Credenciais inválidas. Tente novamente.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-screen-mobile flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="w-full max-w-md">
        <div
          className="rounded-2xl shadow-xl p-6 sm:p-8"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          {/* Cabeçalho */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Entrar
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Use o mesmo formulário; você será levado ao painel do seu perfil.
            </p>
          </div>

          {/* Blocos: quem pode entrar */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div
              className="p-3 rounded-xl border text-center"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
            >
              <User className="w-5 h-5 mx-auto mb-1 text-blue-600" />
              <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Cliente</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Cardápio, dados e histórico</p>
            </div>
            <div
              className="p-3 rounded-xl border text-center"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
            >
              <Store className="w-5 h-5 mx-auto mb-1 text-green-600" />
              <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Assinante</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Painel do restaurante</p>
            </div>
            <div
              className="p-3 rounded-xl border text-center"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
            >
              <Settings className="w-5 h-5 mx-auto mb-1 text-amber-600" />
              <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Admin</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Acesso master</p>
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" style={{ color: 'var(--text-primary)' }}>Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="mt-1"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password" style={{ color: 'var(--text-primary)' }}>Senha</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            <Button
              type="submit"
              className="w-full min-h-[48px] bg-orange-500 hover:bg-orange-600 text-white"
              disabled={loading}
            >
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando...</> : <><LogIn className="w-4 h-4 mr-2" /> Entrar</>}
            </Button>
          </form>

          {/* Cadastros e links */}
          <div className="mt-6 pt-5 border-t space-y-2" style={{ borderColor: 'var(--border-color)' }}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              <strong>Cliente:</strong>{' '}
              <Link to="/cadastro-cliente" className="text-orange-500 hover:text-orange-600 font-medium">Cadastre-se</Link>
              {' — '}Cardápio, pedidos e histórico.
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              <strong>Restaurante:</strong>{' '}
              <Link to="/Assinar" className="text-orange-500 hover:text-orange-600 font-medium">Assinar DigiMenu</Link>
              {' — '}Painel, PDV e gestão.
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              <strong>Admin / Master:</strong> acesso por convite.{' '}
              <a href="https://wa.me/5586988196114" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600 font-medium">Solicitar no WhatsApp</a>.
            </p>
          </div>

          {/* Esqueci minha senha */}
          <div className="mt-4 text-center">
            <Link to="/esqueci-senha" className="text-sm text-orange-500 hover:underline">
              Esqueci minha senha
            </Link>
          </div>

          {/* Ajuda e atalhos */}
          <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
              <strong>Colaborador</strong> (Entregador/Cozinha/PDV): use o mesmo login; você será direcionado ao seu painel.
            </p>
            <p className="text-xs text-center mt-2" style={{ color: 'var(--text-secondary)' }}>
              <Link to="/ajuda" className="text-orange-500 hover:underline">Ajuda</Link>
              {' · '}
              <a href="https://wa.me/5586988196114" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">WhatsApp</a>
            </p>
          </div>
        </div>

        {/* Voltar ao cardápio */}
        <div className="mt-4 text-center">
          <Link to="/Cardapio" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            ← Ver cardápio sem login
          </Link>
        </div>
      </div>
    </div>
  );
}
