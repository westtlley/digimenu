import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient as base44 } from '@/api/apiClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn, Loader2, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/Admin';

  useEffect(() => {
    // Verificar se já está autenticado
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          navigate(returnUrl);
        }
      } catch (e) {
        // Não autenticado, continuar na página de login
      }
    };
    checkAuth();
  }, [navigate, returnUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      setLoading(false);
      return;
    }

    try {
      const response = await base44.auth.login(email, password);
      
      if (response.token) {
        toast.success('Login realizado com sucesso!');
        
        // Verificar se é master, assinante ou cliente para redirecionar corretamente
        const userData = response.user;
        let redirectUrl = returnUrl;
        
        // Clientes sempre vão para o Cardápio
        if (userData?.role === 'customer') {
          redirectUrl = createPageUrl('Cardapio');
        }
        // Se não for master e tentar acessar Admin, redirecionar para PainelAssinante
        else if (!userData?.is_master && (returnUrl.includes('/Admin') || returnUrl === '/Admin')) {
          redirectUrl = '/PainelAssinante';
        }
        // Se for master e tentar acessar PainelAssinante, redirecionar para Admin
        else if (userData?.is_master && (returnUrl.includes('/PainelAssinante') || returnUrl === '/PainelAssinante')) {
          redirectUrl = '/Admin';
        }
        // Se não especificar, redirecionar baseado no tipo de usuário
        else if (!returnUrl || returnUrl === '/' || returnUrl === '/login') {
          if (userData?.role === 'customer') {
            redirectUrl = createPageUrl('Cardapio');
          } else {
            redirectUrl = userData?.is_master ? '/Admin' : '/PainelAssinante';
          }
        }
        
        // Redirecionar
        setTimeout(() => {
          navigate(redirectUrl);
        }, 500);
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'Erro ao fazer login. Verifique suas credenciais.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md">
        <div className="rounded-2xl shadow-xl p-8" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid var(--border-color)` }}>
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Entrar
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Acesse sua conta para continuar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" style={{ color: 'var(--text-primary)' }}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full"
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" style={{ color: 'var(--text-primary)' }}>
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
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
          <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <p className="text-xs text-center mb-3" style={{ color: 'var(--text-secondary)' }}>
              Não tem uma conta?{' '}
              <Link 
                to="/cadastro-cliente" 
                className="text-orange-500 hover:text-orange-600 font-medium"
              >
                Cadastre-se como Cliente
              </Link>
            </p>
            <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
              É um restaurante?{' '}
              <Link 
                to={createPageUrl('Cadastro')} 
                className="text-orange-500 hover:text-orange-600 font-medium"
              >
                Cadastre-se como Assinante
              </Link>
            </p>
          </div>

          {/* Help */}
          <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
              <strong>Email não cadastrado?</strong> Entre em contato para solicitar acesso.
            </p>
            <a
              href="https://wa.me/5586988196114"
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2"
            >
              <Button variant="outline" size="sm" className="w-full bg-green-50 hover:bg-green-100 border-green-200">
                Falar no WhatsApp
              </Button>
            </a>
          </div>

          {/* Demo Credentials */}
          <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs font-semibold text-blue-800 mb-1">Credenciais de Teste:</p>
            <p className="text-xs text-blue-700">
              Email: <code className="bg-blue-100 px-1 rounded">admin@digimenu.com</code>
            </p>
            <p className="text-xs text-blue-700">
              Senha: <code className="bg-blue-100 px-1 rounded">admin123</code>
            </p>
          </div>
        </div>

        {/* Back to Menu */}
        <div className="mt-4 text-center">
          <Link 
            to={createPageUrl('Cardapio')} 
            className="text-sm" 
            style={{ color: 'var(--text-secondary)' }}
          >
            ← Voltar para o Cardápio
          </Link>
        </div>
      </div>
    </div>
  );
}
