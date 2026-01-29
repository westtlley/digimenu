import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import {
  Check,
  Smartphone,
  ArrowLeft,
  Sparkles,
  Users,
  TrendingUp,
  Crown,
  Gift,
  X,
  Zap,
  Shield,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import UserAuthButton from '../components/atoms/UserAuthButton';

const PLANS_DATA = {
  free: {
    name: 'Gratuito',
    tagline: 'Para testar sem compromisso',
    icon: Gift,
    color: 'green',
    gradient: 'from-green-500 to-emerald-600',
    price: 0,
    badge: 'Grátis para sempre',
    popular: false,
    features: [
      '20 produtos no cardápio',
      '10 pedidos por dia',
      'Pedidos via WhatsApp',
      'Histórico de 7 dias',
      '1 usuário',
    ],
    limitations: [
      'Sem personalização',
      'Sem relatórios',
      'Sem app de entregadores',
    ],
    cta: 'Começar Grátis',
  },
  basic: {
    name: 'Básico',
    tagline: 'Ideal para começar',
    icon: Smartphone,
    color: 'blue',
    gradient: 'from-blue-500 to-blue-600',
    price: 39.90,
    badge: '10 dias grátis',
    popular: false,
    features: [
      '100 produtos no cardápio',
      '50 pedidos por dia',
      'Pedidos via WhatsApp',
      'Personalização (logo, cores)',
      'Dashboard básico',
      'Histórico de 30 dias',
      '1 usuário',
    ],
    cta: 'Começar Teste Grátis',
  },
  pro: {
    name: 'Pro',
    tagline: 'Expanda suas entregas',
    icon: TrendingUp,
    color: 'orange',
    gradient: 'from-orange-500 to-orange-600',
    price: 79.90,
    badge: '7 dias grátis',
    popular: true,
    features: [
      'Tudo do Básico, mais:',
      '500 produtos',
      '200 pedidos por dia',
      'App para entregadores',
      'Zonas de entrega',
      'Cupons e promoções',
      'Relatórios avançados',
      'Até 5 usuários',
      'Histórico de 1 ano',
    ],
    cta: 'Começar Teste Grátis',
  },
  ultra: {
    name: 'Ultra',
    tagline: 'Gestão completa',
    icon: Crown,
    color: 'purple',
    gradient: 'from-purple-600 to-indigo-600',
    price: 149.90,
    badge: '7 dias grátis',
    popular: false,
    features: [
      'Tudo do Pro, mais:',
      'Produtos ilimitados',
      'Pedidos ilimitados',
      'PDV completo',
      'Comandas presenciais',
      'App para garçons',
      'Display para cozinha',
      'Emissão fiscal (NFC-e)',
      'API & Webhooks',
      'Multi-localização (5 lojas)',
      'Até 20 usuários',
    ],
    cta: 'Começar Teste Grátis',
  },
};

export default function Assinar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        /* não logado — ok */
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Mutation para criar ASSINATURA RECORRENTE no Mercado Pago
  const createSubscriptionMutation = useMutation({
    mutationFn: async ({ email, name, plan }) => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/mercadopago/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          name,
          plan,
          interval: 'monthly'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar assinatura');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      if (data.init_point) {
        window.location.href = data.init_point;
      }
    },
    onError: (error) => {
      alert(error.message || 'Erro ao criar assinatura. Tente novamente.');
    }
  });

  const handleSubscribe = (planKey) => {
    // Se usuário não está logado, redireciona para cadastro
    if (!user) {
      window.location.href = `/cadastro?plan=${planKey}`;
      return;
    }
    
    // Se usuário já está logado, vai direto para o pagamento
    createSubscriptionMutation.mutate({ 
      email: user.email, 
      name: user.full_name || user.email.split('@')[0],
      plan: planKey
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/40">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to={createPageUrl('Cardapio')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Voltar</span>
          </Link>
          <UserAuthButton />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <Badge className="mb-4 px-4 py-1.5 text-sm font-medium bg-orange-100 text-orange-700 border border-orange-200/60">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 inline" />
            Cardápio Digital Profissional
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4 leading-tight">
            Escolha o plano ideal para
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600"> seu negócio</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Comece grátis ou teste qualquer plano premium por até 10 dias sem compromisso
          </p>
        </div>
      </section>

      {/* Cards dos Planos */}
      <section className="pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5">
            {Object.entries(PLANS_DATA).map(([key, plan]) => {
              const Icon = plan.icon;
              
              return (
                <Card 
                  key={key} 
                  className={`relative border-2 hover:shadow-2xl transition-all duration-300 ${
                    plan.popular 
                      ? 'border-orange-500 shadow-xl shadow-orange-100 lg:scale-105' 
                      : 'border-gray-200 shadow-lg hover:border-orange-300'
                  } bg-white overflow-hidden`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1 font-semibold shadow-lg text-xs">
                        <Sparkles className="w-3 h-3 inline mr-1" />
                        MAIS POPULAR
                      </Badge>
                    </div>
                  )}
                  
                  <CardContent className="pt-8 pb-6 px-5">
                    {/* Header do Plano */}
                    <div className="text-center mb-5">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-3 mx-auto text-white shadow-lg`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                      <p className="text-xs text-gray-600 mb-2">{plan.tagline}</p>
                      {plan.badge && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                          {plan.badge}
                        </Badge>
                      )}
                    </div>

                    {/* Preço */}
                    <div className="text-center mb-5 pb-5 border-b border-gray-100">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-lg text-gray-600">R$</span>
                        <span className="text-4xl font-bold text-gray-900">
                          {plan.price.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">por mês</p>
                    </div>

                    {/* Features */}
                    <div className="space-y-2.5 mb-5">
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-2.5 h-2.5 text-green-600" />
                          </div>
                          <span className="text-xs text-gray-700 leading-relaxed">
                            {feature}
                          </span>
                        </div>
                      ))}
                      {plan.limitations?.map((limitation, i) => (
                        <div key={`lim-${i}`} className="flex items-start gap-2">
                          <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <X className="w-2.5 h-2.5 text-gray-400" />
                          </div>
                          <span className="text-xs text-gray-400 line-through leading-relaxed">
                            {limitation}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <Button 
                      onClick={() => handleSubscribe(key)}
                      disabled={createSubscriptionMutation.isLoading}
                      className={`w-full font-semibold shadow-lg transition-all ${
                        plan.popular 
                          ? `bg-gradient-to-r ${plan.gradient} hover:opacity-90 text-white` 
                          : `bg-gradient-to-r ${plan.gradient} hover:opacity-90 text-white`
                      }`}
                      size="sm"
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefícios Gerais */}
      <section className="py-12 px-4 bg-white/60 border-y border-gray-200">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Incluído em todos os planos pagos
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Seguro', desc: 'SSL e proteção de dados' },
              { icon: Zap, title: 'Rápido', desc: 'Carregamento instantâneo' },
              { icon: Smartphone, title: 'Responsivo', desc: 'Funciona em qualquer dispositivo' },
              { icon: BarChart3, title: 'Analytics', desc: 'Acompanhe suas métricas' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mb-3 mx-auto text-orange-600">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1 text-sm">{item.title}</h3>
                <p className="text-xs text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Simples */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Perguntas Frequentes
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'Posso cancelar a qualquer momento?',
                a: 'Sim! Sem multas ou taxas de cancelamento. Você pode cancelar quando quiser.'
              },
              {
                q: 'Como funciona o período de teste?',
                a: 'Você tem 7 a 10 dias (dependendo do plano) para testar gratuitamente. Após o trial, a cobrança é feita automaticamente.'
              },
              {
                q: 'Preciso de cartão para o plano gratuito?',
                a: 'Não! O plano gratuito não exige cartão de crédito. É 100% grátis para sempre.'
              },
              {
                q: 'Posso trocar de plano depois?',
                a: 'Sim! Você pode fazer upgrade ou downgrade a qualquer momento pelo painel administrativo.'
              },
            ].map((faq, i) => (
              <details key={i} className="group bg-white border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors">
                <summary className="font-semibold text-gray-900 cursor-pointer flex items-center justify-between">
                  {faq.q}
                  <span className="text-orange-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-200 bg-white/80">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-gray-600">
            © 2026 DigiMenu - Todos os direitos reservados
          </p>
          <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500">
            <a href="/termos" className="hover:text-orange-600 transition-colors">Termos de Uso</a>
            <a href="/privacidade" className="hover:text-orange-600 transition-colors">Privacidade</a>
            <a href="/contato" className="hover:text-orange-600 transition-colors">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
