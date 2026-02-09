import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowLeft, Loader2, Check, Sparkles } from 'lucide-react';
import { SYSTEM_LOGO_URL, SYSTEM_NAME } from '@/config/branding';

const PLAN_INFO = {
  free: { name: 'Gratuito', color: 'green', price: 'R$ 0/mês', trial: '' },
  basic: { name: 'Básico', color: 'blue', price: 'R$ 39,90/mês', trial: '10 dias grátis' },
  pro: { name: 'Pro', color: 'orange', price: 'R$ 79,90/mês', trial: '7 dias grátis' },
  ultra: { name: 'Ultra', color: 'purple', price: 'R$ 149,90/mês', trial: '7 dias grátis' },
};

export default function Cadastro() {
  const [searchParams] = useSearchParams();
  const { slug } = useParams();
  const planKey = searchParams.get('plan') || 'free';
  const interval = searchParams.get('interval') || 'monthly';
  const plan = PLAN_INFO[planKey] || PLAN_INFO.free;
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    storeName: '',
    whatsapp: '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações
    if (!formData.fullName || formData.fullName.trim().length < 3) {
      setError('Nome completo é obrigatório (mínimo 3 caracteres)');
      return;
    }
    
    if (!formData.email || !formData.email.includes('@')) {
      setError('Email válido é obrigatório');
      return;
    }
    
    if (!formData.password || formData.password.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Se for plano FREE, criar direto
      if (planKey === 'free') {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/mercadopago/create-free-subscriber`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formData.email, 
            name: formData.fullName 
          })
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Erro ao criar conta gratuita');
        }
        
        // Redirecionar para login (por slug quando disponível)
        alert('✅ Conta gratuita criada com sucesso!\n\nFaça login para acessar seu painel.');
        window.location.href = slug ? `/s/${slug}/login/cliente` : '/';
      } else {
        // Para planos pagos, criar assinatura no Mercado Pago
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/mercadopago/create-subscription`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formData.email, 
            name: formData.fullName,
            plan: planKey,
            interval: interval
          })
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Erro ao criar assinatura');
        }
        
        const data = await response.json();
        
        if (data.init_point) {
          // Redirecionar para checkout do Mercado Pago
          window.location.href = data.init_point;
        } else {
          throw new Error('Link de pagamento não recebido');
        }
      }
    } catch (err) {
      setError(err.message || 'Erro ao processar cadastro. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-100">
        
        {/* Header */}
        <div className="text-center mb-8">
          <img src={SYSTEM_LOGO_URL} alt={SYSTEM_NAME} className="h-14 w-auto mx-auto mb-3 drop-shadow-md" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{SYSTEM_NAME}</h1>
          <p className="text-gray-600">Crie sua conta e comece agora</p>
        </div>

        {/* Plano Selecionado */}
        <div className={`mb-6 p-4 rounded-xl border-2 ${
          plan.color === 'green' ? 'bg-green-50 border-green-200' :
          plan.color === 'blue' ? 'bg-blue-50 border-blue-200' :
          plan.color === 'orange' ? 'bg-orange-50 border-orange-200' :
          'bg-purple-50 border-purple-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Plano selecionado:</p>
              <p className="text-xl font-bold text-gray-900">{plan.name}</p>
              {plan.trial && (
                <p className="text-sm text-green-600 font-semibold mt-1">✨ {plan.trial}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{plan.price}</p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="fullName">Nome Completo *</Label>
            <Input
              id="fullName"
              placeholder="Seu nome completo"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="seuemail@exemplo.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="password">Senha *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Campos opcionais */}
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-medium">
              + Informações adicionais (opcional)
            </summary>
            <div className="mt-4 space-y-4 pl-4">
              <div>
                <Label htmlFor="storeName">Nome do Restaurante</Label>
                <Input
                  id="storeName"
                  placeholder="Nome do seu negócio"
                  value={formData.storeName}
                  onChange={(e) => handleChange('storeName', e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  placeholder="(00) 00000-0000"
                  value={formData.whatsapp}
                  onChange={(e) => handleChange('whatsapp', e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </details>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => window.location.href = '/assinar'}
              disabled={loading}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button 
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  {planKey === 'free' ? 'Criar Conta Grátis' : 'Continuar para Pagamento'}
                  <Sparkles className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500 mt-4">
            Ao criar uma conta, você concorda com nossos{' '}
            <a href="/termos" className="text-orange-600 hover:underline">Termos de Serviço</a>
            {' '}e{' '}
            <a href="/privacidade" className="text-orange-600 hover:underline">Política de Privacidade</a>.
          </p>
        </form>

        {/* Link para Login */}
        <div className="mt-6 pt-6 border-t text-center text-sm">
          <p className="text-gray-600">
            Já tem uma conta?{' '}
            <Link to={slug ? `/s/${slug}/login/cliente` : '/'} className="text-orange-600 hover:text-orange-700 font-semibold hover:underline">
              Fazer login
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-gray-400">
          {SYSTEM_NAME} © {new Date().getFullYear()} - Todos os direitos reservados
        </div>
      </div>
    </div>
  );
}
