import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Loader2, CheckCircle, Clock } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import toast from 'react-hot-toast';

export default function DefinirSenha() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const tokenCreatedAt = useRef(Date.now());

  // Temporizador de 5 minutos
  useEffect(() => {
    if (!token) {
      setError('Token não fornecido. Verifique o link de acesso.');
      return;
    }

    // Calcular tempo restante (5 minutos a partir do carregamento)
    const updateTimer = () => {
      const now = Date.now();
      const elapsed = now - tokenCreatedAt.current;
      const totalTime = 5 * 60 * 1000; // 5 minutos em milissegundos
      const remaining = Math.max(0, totalTime - elapsed);
      
      if (remaining === 0) {
        setTokenExpired(true);
        setError('Token expirado! O link é válido por apenas 5 minutos. Solicite um novo link.');
        setTimeRemaining(null);
      } else {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setTimeRemaining({ minutes, seconds, total: remaining });
      }
    };

    // Atualizar imediatamente
    updateTimer();

    // Atualizar a cada segundo
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!token) {
      setError('Token não fornecido.');
      setLoading(false);
      return;
    }

    if (!password || !confirmPassword) {
      setError('Por favor, preencha todos os campos');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    try {
      console.log('🔐 Enviando requisição para definir senha...', { token: token?.substring(0, 20) + '...' });
      
      const response = await apiClient.post('/auth/set-password', {
        token,
        password
      });

      console.log('📥 Resposta recebida:', response);

      // Verificar diferentes formatos de resposta
      if (response?.success || response?.data?.success) {
        setSuccess(true);
        toast.success('Senha definida com sucesso!');
        
        // Redirecionar para login após 2 segundos
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        const errorMsg = response?.error || response?.data?.error || response?.message || 'Erro ao definir senha';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('❌ Erro ao definir senha:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Erro ao definir senha. Verifique o token.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Senha Definida com Sucesso!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Sua senha foi definida. Você será redirecionado para a página de login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Se não tiver token, mostrar erro mais cedo
  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Link Inválido
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Token não fornecido. Verifique o link de acesso.
            </p>
            <a href="/login" className="text-blue-600 hover:underline dark:text-blue-400">
              Ir para login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Definir Senha
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Defina uma senha para acessar sua conta
          </p>
          
          {/* Temporizador */}
          {timeRemaining && !tokenExpired && (
            <div className="flex items-center justify-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md mb-2">
              <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                Tempo restante: {String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}
              </span>
            </div>
          )}
          
          {tokenExpired && (
            <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md mb-2">
              <p className="text-xs text-red-700 dark:text-red-300 text-center">
                ⏰ Este link expirou. Solicite um novo link de definição de senha.
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md dark:bg-red-900 dark:text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">Nova Senha</Label>
            <div className="relative mt-1">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
                minLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <div className="relative mt-1">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Digite a senha novamente"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="pr-10"
                minLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !token || tokenExpired}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Definindo...
              </>
            ) : tokenExpired ? (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Link Expirado
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Definir Senha
              </>
            )}
          </Button>
        </form>

        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Já tem uma senha?</p>
          <a href="/login" className="text-blue-600 hover:underline dark:text-blue-400">
            Fazer login
          </a>
        </div>
      </div>
    </div>
  );
}
