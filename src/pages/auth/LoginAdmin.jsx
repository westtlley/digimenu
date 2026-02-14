/**
 * Página de Login para Admin Master
 * Design exclusivo, seguro e profissional
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { apiClient as base44 } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, LogIn, Loader2, Settings, Shield, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { SYSTEM_LOGO_URL, SYSTEM_NAME } from '@/config/branding';

export default function LoginAdmin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true); // Padrão: SIM
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/Admin';

  useEffect(() => {
    // Verificar se deve fazer auto-login
    const shouldAutoLogin = localStorage.getItem('auto_login_enabled') !== 'false';
    
    const checkAuth = async () => {
      if (!shouldAutoLogin) return; // Não fazer auto-login se desabilitado
      
      try {
        const ok = await base44.auth.isAuthenticated();
        if (!ok) return;
        const me = await base44.auth.me();
        if (me?.is_master) {
          navigate('/Admin');
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
        // Salvar preferência de auto-login
        localStorage.setItem('auto_login_enabled', rememberMe ? 'true' : 'false');
        
        if (userData?.is_master) {
          toast.success('Acesso autorizado');
          setTimeout(() => navigate('/Admin'), 400);
        } else {
          setError('Acesso restrito a administradores master');
          toast.error('Acesso não autorizado');
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md">
        <div className="rounded-2xl shadow-2xl p-8 bg-gray-800 dark:bg-gray-900 border border-gray-700">
          {/* Header - Logo DigiMenu + Admin Master */}
          <div className="text-center mb-8">
            <img src={SYSTEM_LOGO_URL} alt={SYSTEM_NAME} className="h-12 w-auto mx-auto mb-3 drop-shadow-lg" />
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <h1 className="text-3xl font-bold text-white">
                Admin Master
              </h1>
            </div>
            <p className="text-sm text-gray-400">
              Acesso exclusivo para administradores
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@digimenu.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="mt-1.5 h-11 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-gray-300">
                Senha
              </Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="pr-10 h-11 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {/* Checkbox Manter Conectado */}
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-amber-600 focus:ring-amber-500 focus:ring-offset-gray-800"
              />
              <label htmlFor="remember-me" className="ml-2 text-sm text-gray-300">
                Manter conectado (fazer login automaticamente)
              </label>
            </div>
            
            {error && (
              <div className="p-3 rounded-lg bg-red-900/30 border border-red-800">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold shadow-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Acessar
                </>
              )}
            </Button>
          </form>

          {/* Links */}
          <div className="mt-6 space-y-3">
            <div className="text-center">
              <Link
                to="/esqueci-senha"
                className="text-sm text-gray-400 hover:text-gray-200"
              >
                Esqueci minha senha
              </Link>
            </div>
            <div className="pt-4 border-t border-gray-700 text-center">
              <a
                href="https://wa.me/5586988196114"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-gray-200"
              >
                Solicitar acesso via WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
