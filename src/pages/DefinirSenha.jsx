import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Loader2, CheckCircle } from 'lucide-react';
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Token não fornecido. Verifique o link de acesso.');
    }
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
      const response = await apiClient.post('/auth/set-password', {
        token,
        password
      });

      if (response.success) {
        setSuccess(true);
        toast.success('Senha definida com sucesso!');
        
        // Redirecionar para login após 2 segundos
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(response.error || 'Erro ao definir senha');
      }
    } catch (error) {
      console.error('Erro ao definir senha:', error);
      const errorMessage = error.message || 'Erro ao definir senha. Verifique o token.';
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Definir Senha
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Defina uma senha para acessar sua conta
          </p>
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

          <Button type="submit" className="w-full" disabled={loading || !token}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Definindo...
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
