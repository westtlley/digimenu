/**
 * Páginas de login por estabelecimento (slug): tema e logo do estabelecimento.
 * Rotas: /s/:slug/login (assinante), /s/:slug/login/cliente, /s/:slug/login/colaborador.
 * Evita conflito entre estabelecimentos: cada um tem sua URL e identidade visual.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { apiClient as base44 } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, LogIn, Loader2, Store, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLoginInfo } from '@/hooks/useLoginInfo';

const THEME_DEFAULT = {
  primary: '#ea580c',
  primaryHover: '#c2410c',
  secondary: '#f97316',
  accent: '#fb923c',
};

function getThemeStyles(data) {
  if (!data?.found) return THEME_DEFAULT;
  const p = data.theme_primary_color || THEME_DEFAULT.primary;
  const s = data.theme_secondary_color || data.theme_primary_color || THEME_DEFAULT.secondary;
  return {
    primary: p,
    primaryHover: p,
    secondary: s,
    accent: data.theme_accent_color || s,
  };
}

export default function LoginBySlug({ type: propType }) {
  const { slug, type: urlType } = useParams();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '';
  const loginType = propType ?? (urlType === 'cliente' || urlType === 'colaborador' ? urlType : 'assinante');
  const navigate = useNavigate();
  const { data: loginInfo, loading: loadingInfo } = useLoginInfo(slug);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const storeName = loginInfo?.found ? loginInfo.name : 'Estabelecimento';
  const theme = getThemeStyles(loginInfo);
  const basePath = slug ? `/s/${slug}` : '';

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const ok = await base44.auth.isAuthenticated();
        if (!ok) return;
        const me = await base44.auth.me();
        if (!me) return;
        
        if (loginType === 'cliente' && me?.role === 'customer') {
          navigate(slug ? `/s/${slug}` : '/', { replace: true });
          return;
        }
        if (loginType === 'colaborador' && (me?.profile_role || me?.profile_roles?.length)) {
          // Colaborador (incluindo gerente) → Home do colaborador com botões para escolher acesso
          navigate('/colaborador', { replace: true });
          return;
        }
        if (loginType === 'assinante' && me && !me.is_master) {
          navigate(slug ? `/s/${slug}/PainelAssinante` : '/PainelAssinante', { replace: true });
          return;
        }
      } catch (e) {
        // não autenticado - não fazer nada, deixar usuário fazer login
      }
    };
    checkAuth();
  }, [loginType, slug, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!email?.trim() || !password) {
      setError('Preencha email e senha');
      setLoading(false);
      return;
    }
    try {
      const response = await base44.auth.login(email.trim(), password);
      const userData = response.user || response;
      if (response.token) {
        toast.success('Login realizado com sucesso!');
        
        // Priorizar verificação do userData sobre loginType para determinar redirecionamento
        // Verificar se é colaborador (incluindo gerente) pelo userData
        const roles = userData?.profile_roles?.length ? userData.profile_roles : (userData?.profile_role ? [userData.profile_role] : []);
        const isColaborador = roles.length > 0;
        
        if (userData?.role === 'customer') {
          // Cliente → Cardápio
          const safeReturn = returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : (slug ? `/s/${slug}` : '/');
          navigate(safeReturn, { replace: true });
        } else if (isColaborador) {
          // Colaborador (incluindo gerente) → Home do colaborador com botões para escolher acesso
          navigate('/colaborador', { replace: true });
        } else if (userData?.is_master) {
          // Master → Admin
          navigate('/Admin', { replace: true });
        } else {
          // Assinante → PainelAssinante
          navigate(slug ? `/s/${slug}/PainelAssinante` : '/PainelAssinante', { replace: true });
        }
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

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">URL inválida.</p>
          <Link to="/" className="text-orange-600 hover:underline mt-2 inline-block">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  if (loadingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!loginInfo?.found) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
        <div className="max-w-sm w-full text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
          <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Estabelecimento não encontrado</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">O link de acesso não existe ou foi alterado.</p>
          <Link to="/" className="text-orange-600 hover:text-orange-700 font-medium">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  const isAssinante = loginType === 'assinante';
  const isCliente = loginType === 'cliente';
  const isColaborador = loginType === 'colaborador';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 transition-colors"
      style={{
        background: `linear-gradient(135deg, ${theme.primary}22 0%, ${theme.secondary}18 50%, ${theme.accent}22 100%)`,
      }}
    >
      <div className="w-full max-w-md">
        <div className="rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          {/* Header com tema do estabelecimento */}
          <div
            className="p-6 text-white text-center"
            style={{ background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)` }}
          >
            <Link to={basePath} className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm mb-4">
              <ArrowLeft className="w-4 h-4" /> Cardápio
            </Link>
            {loginInfo.logo ? (
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/30 mx-auto mb-3 shadow-lg bg-white">
                <img src={loginInfo.logo} alt={storeName} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-3 border-2 border-white/30 shadow-lg"
                style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
              >
                <Store className="w-10 h-10" />
              </div>
            )}
            <h1 className="text-xl font-bold truncate">{storeName}</h1>
            <p className="text-sm text-white/90 mt-1">
              {isAssinante && 'Acesso ao painel do estabelecimento'}
              {isCliente && 'Entrar na sua conta'}
              {isColaborador && 'Acesso colaborador'}
            </p>
          </div>

          <div className="p-6">
            {isColaborador && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">
                Entregador, Cozinha, PDV, Garçom ou Gerente
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={isCliente ? 'seu@email.com' : 'email@exemplo.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="mt-1.5 h-11"
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Senha</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pr-10 h-11"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
              <Button
                type="submit"
                className="w-full h-11 text-white font-semibold shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                }}
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando...</>
                ) : (
                  <><LogIn className="w-4 h-4 mr-2" /> Entrar</>
                )}
              </Button>
            </form>

            <div className="mt-6 space-y-3 text-center">
              <Link
                to="/esqueci-senha"
                className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Esqueci minha senha
              </Link>
              {isCliente && (
                <div>
                  <Link
                    to={`${basePath}/cadastro-cliente`}
                    className="text-sm font-medium"
                    style={{ color: theme.primary }}
                  >
                    Não tem conta? Cadastre-se
                  </Link>
                </div>
              )}
              {isAssinante && (
                <div>
                  <Link to="/Assinar" className="text-sm font-medium" style={{ color: theme.primary }}>
                    Não tem conta? Assine agora
                  </Link>
                </div>
              )}
              <div>
                <Link to={basePath || '/'} className="text-sm text-gray-500 hover:text-gray-700">
                  ← Voltar ao cardápio
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
