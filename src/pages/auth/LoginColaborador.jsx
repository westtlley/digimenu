/**
 * Página de Login para Colaboradores
 * Design simples e direto para entregadores, cozinha, PDV e garçons
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { apiClient as base44 } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, LogIn, Loader2, Users, ChefHat, Truck, CreditCard, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginColaborador() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const ok = await base44.auth.isAuthenticated();
        if (!ok) return;
        const me = await base44.auth.me();
        if (me?.profile_role) {
          // Redirecionar conforme perfil
          const roleRoutes = {
            entregador: '/Entregador',
            cozinha: '/Cozinha',
            pdv: '/PDV',
            garcom: '/Garcom'
          };
          const route = roleRoutes[me.profile_role];
          if (route) navigate(route);
        }
      } catch (e) {
        // Não autenticado
      }
    };
    checkAuth();
  }, [navigate]);

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

        // Redirecionar conforme perfil do colaborador
        if (userData?.profile_role === 'entregador') {
          redirectUrl = '/Entregador';
        } else if (userData?.profile_role === 'cozinha') {
          redirectUrl = '/Cozinha';
        } else if (userData?.profile_role === 'pdv') {
          redirectUrl = '/PDV';
        } else if (userData?.profile_role === 'garcom') {
          redirectUrl = '/Garcom';
        } else if (!redirectUrl) {
          redirectUrl = '/';
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full max-w-md">
        <div className="rounded-2xl shadow-2xl p-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Acesso Colaborador
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Entregador, Cozinha, PDV ou Garçom
            </p>
          </div>

          {/* Ícones dos perfis */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            <div className="flex flex-col items-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-1" />
              <span className="text-xs text-blue-700 dark:text-blue-300">Entregador</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
              <ChefHat className="w-5 h-5 text-orange-600 dark:text-orange-400 mb-1" />
              <span className="text-xs text-orange-700 dark:text-orange-300">Cozinha</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
              <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400 mb-1" />
              <span className="text-xs text-green-700 dark:text-green-300">PDV</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <Receipt className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-1" />
              <span className="text-xs text-purple-700 dark:text-purple-300">Garçom</span>
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
              className="w-full h-11 bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white font-semibold shadow-lg"
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
                to="/esqueci-senha"
                className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Esqueci minha senha
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
