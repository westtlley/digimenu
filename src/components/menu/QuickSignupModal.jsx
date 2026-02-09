/**
 * Modal de Cadastro Rápido no Cardápio
 * Design moderno, discreto, com benefícios claros
 */
import React, { useState } from 'react';
import { X, Gift, Star, MapPin, Zap, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { validateCPF } from '@/utils/cpfValidator';

export default function QuickSignupModal({ isOpen, onClose, onSuccess, returnUrl }) {
  const [step, setStep] = useState(1); // 1: benefícios, 2: formulário
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    cpf: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const formatPhone = (value) => {
    const phone = value.replace(/\D/g, '');
    if (phone.length <= 11) {
      return phone
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  const formatCPF = (value) => {
    const cpf = value.replace(/\D/g, '');
    if (cpf.length <= 11) {
      return cpf
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return value;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validações
    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      setLoading(false);
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Email válido é obrigatório');
      setLoading(false);
      return;
    }
    if (!formData.phone.trim() || formData.phone.replace(/\D/g, '').length < 10) {
      setError('Telefone válido é obrigatório');
      setLoading(false);
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres');
      setLoading(false);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }
    if (formData.cpf && !validateCPF(formData.cpf.replace(/\D/g, ''))) {
      setError('CPF inválido');
      setLoading(false);
      return;
    }

    try {
      // Criar conta usando o mesmo método do CadastroCliente
      const response = await base44.functions.invoke('registerCustomer', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.replace(/\D/g, ''),
        password: formData.password,
        cpf: formData.cpf ? formData.cpf.replace(/\D/g, '') : null,
        address: '', // Endereço pode ser preenchido depois
        birth_date: null // Data de nascimento opcional no cadastro rápido
      });

      if (response?.data?.success) {
        toast.success('Cadastro realizado com sucesso!');
        
        // Fazer login automático
        try {
          const loginResponse = await base44.auth.login(formData.email.trim().toLowerCase(), formData.password);
          if (loginResponse.token) {
            if (onSuccess) {
              onSuccess(loginResponse.user || response.data?.user);
            }
            
            onClose();
            
            // Recarregar página para atualizar estado de autenticação
            setTimeout(() => {
              window.location.reload();
            }, 500);
          } else {
            // Se não conseguir fazer login automático, redirecionar para login
            onClose();
            setTimeout(() => {
              const path = returnUrl || window.location.pathname;
              const m = path.match(/^\/s\/([a-z0-9-]+)(?:\/|$)/i);
              const loginUrl = m ? `/s/${m[1]}/login/cliente?returnUrl=${encodeURIComponent(path)}` : `/?returnUrl=${encodeURIComponent(path)}`;
              window.location.href = loginUrl;
            }, 1000);
          }
        } catch (loginError) {
          console.error('Erro ao fazer login automático:', loginError);
          // Redirecionar para login mesmo assim
          onClose();
          setTimeout(() => {
            const path = returnUrl || window.location.pathname;
            const m = path.match(/^\/s\/([a-z0-9-]+)(?:\/|$)/i);
            const loginUrl = m ? `/s/${m[1]}/login/cliente?returnUrl=${encodeURIComponent(path)}` : `/?returnUrl=${encodeURIComponent(path)}`;
            window.location.href = loginUrl;
          }, 1000);
        }
      } else {
        const errorMsg = response?.data?.error || 'Erro ao criar conta. Tente novamente.';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Erro ao criar conta. Tente novamente.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {step === 1 ? 'Cadastre-se e Ganhe Benefícios!' : 'Criar Conta'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {step === 1 ? (
            /* Passo 1: Benefícios */
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Gift className="w-8 h-8 text-white" />
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Cadastre-se gratuitamente e aproveite:
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800">
                  <Gift className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Pontos Fidelidade</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Acumule pontos em cada pedido e troque por descontos</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800">
                  <Star className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Promoções Exclusivas</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Acesso a ofertas e cupons especiais</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800">
                  <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Endereços Salvos</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Salve seus endereços para checkout mais rápido</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                  <Zap className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Histórico de Pedidos</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Acompanhe todos os seus pedidos em um só lugar</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Continuar sem cadastro
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                >
                  Quero me cadastrar
                </Button>
              </div>
            </div>
          ) : (
            /* Passo 2: Formulário */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">
                  Nome Completo *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Seu nome"
                  className="mt-1.5"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="seu@email.com"
                  className="mt-1.5"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-gray-700 dark:text-gray-300">
                  Telefone *
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', formatPhone(e.target.value))}
                  placeholder="(86) 99999-9999"
                  className="mt-1.5"
                  required
                />
              </div>

              <div>
                <Label htmlFor="cpf" className="text-gray-700 dark:text-gray-300">
                  CPF (opcional)
                </Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => handleChange('cpf', formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className="mt-1.5"
                  maxLength={14}
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                  Senha *
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="mt-1.5"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-gray-700 dark:text-gray-300">
                  Confirmar Senha *
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="Digite a senha novamente"
                  className="mt-1.5"
                  required
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                  disabled={loading}
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Criar Conta
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
