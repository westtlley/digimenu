/**
 * Página de Login para Clientes
 * Design moderno, minimalista, integrado ao cardápio
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { apiClient as base44 } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, LogIn, Loader2, User, Gift, Star, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginCliente() {
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
        if (me?.role === 'customer') {
          navigate(returnUrl || '/');
        }
      } catch (e) {
        // Não autenticado
      }
    };
    checkAuth();
  }, [navigate, returnUrl]);

  const handleGoogleLogin = async () => {
    try {
      // Obter URL base do backend (remover /api se existir)
      let backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      
      // Se a URL termina com /api, remover para obter a URL base
      if (backendUrl.endsWith('/api')) {
        backendUrl = backendUrl.replace(/\/api$/, '');
      }
      
      // Se não tem protocolo, adicionar http:// (desenvolvimento)
      if (!backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
        backendUrl = `http://${backendUrl}`;
      }
      
      console.log('🔵 Redirecionando para Google OAuth:', `${backendUrl}/api/auth/google`);
      
      // Redirecionar para rota de autenticação Google
      window.location.href = `${backendUrl}/api/auth/google`;
    } catch (error) {
      console.error('❌ Erro ao iniciar login Google:', error);
      toast.error('Erro ao iniciar login com Google. Verifique a configuração do backend.');
    }
  };

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
        
        // Cliente sempre volta ao cardápio
        const redirectUrl = returnUrl && returnUrl !== '/' ? returnUrl : '/Cardapio';
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full max-w-md">
        <div className="rounded-2xl shadow-2xl p-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Entrar como Cliente
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Acesse seu perfil, histórico de pedidos e benefícios
            </p>
          </div>

          {/* Benefícios do cadastro */}
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800">
            <p className="text-xs font-semibold text-orange-900 dark:text-orange-200 mb-2">
              ✨ Benefícios de ter uma conta:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-orange-800 dark:text-orange-300">
              <div className="flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5" />
                <span>Pontos fidelidade</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5" />
                <span>Promoções exclusivas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Endereços salvos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <LogIn className="w-3.5 h-3.5" />
                <span>Checkout rápido</span>
              </div>
            </div>
          </div>

          {/* Login com Google */}
          <div className="mb-6">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar com Google
            </Button>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  ou
                </span>
              </div>
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="mt-1.5 h-11"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                Senha
              </Label>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
              className="w-full h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Entrar
                </>
              )}
            </Button>
          </form>

          {/* Links */}
          <div className="mt-6 space-y-3">
            <div className="text-center">
              <Link
                to="/cadastro/cliente"
                className="text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
              >
                Não tem conta? Cadastre-se gratuitamente
              </Link>
            </div>
            <div className="text-center">
              <Link
                to="/esqueci-senha"
                className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Esqueci minha senha
              </Link>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
              <Link
                to={returnUrl || '/'}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ← Continuar sem cadastro
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
