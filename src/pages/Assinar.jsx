import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import {
  Check,
  Smartphone,
  BarChart3,
  ArrowLeft,
  Loader2,
  Sparkles,
  Zap,
  Shield,
  Users,
  TrendingUp,
  Building2,
  CreditCard,
  Crown,
  Truck,
  Monitor,
  ChefHat,
  Receipt,
  Webhook,
  MapPin,
  X,
  Gift,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import UserAuthButton from '../components/atoms/UserAuthButton';

const PLANS_DATA = {
  free: {
    name: 'Gratuito',
    tagline: 'Para testar sem compromisso',
    icon: Gift,
    color: 'green',
    gradient: 'from-green-500 to-green-600',
    monthly: 0,
    yearly: 0,
    badge: 'Grátis para sempre',
    features: [
      { text: 'Cardápio digital básico', included: true },
      { text: 'Até 20 produtos', included: true },
      { text: 'Pedidos via WhatsApp', included: true },
      { text: 'Gestor de pedidos simples', included: true },
      { text: 'Histórico 7 dias', included: true },
      { text: 'Até 10 pedidos/dia', included: true },
      { text: '1 usuário', included: true },
      { text: 'Personalização', included: false },
      { text: 'Dashboard avançado', included: false },
      { text: 'App entregadores', included: false },
      { text: 'Cupons e promoções', included: false },
      { text: 'Relatórios', included: false },
      { text: 'PDV + Caixa', included: false },
      { text: 'Emissão fiscal', included: false },
    ],
    cta: 'Começar Grátis',
  },
  basic: {
    name: 'Básico',
    tagline: 'Comece a vender online hoje',
    icon: Smartphone,
    color: 'blue',
    gradient: 'from-blue-500 to-blue-600',
    monthly: 39.90,
    yearly: 399.00,
    badge: '10 dias grátis',
    features: [
      { text: 'Cardápio digital ilimitado', included: true },
      { text: 'Até 100 produtos', included: true },
      { text: 'Pedidos via WhatsApp', included: true },
      { text: 'Gestor de pedidos básico', included: true },
      { text: 'Personalização (logo, cores)', included: true },
      { text: 'Dashboard básico', included: true },
      { text: 'Histórico 30 dias', included: true },
      { text: 'Até 50 pedidos/dia', included: true },
      { text: '1 usuário', included: true },
      { text: 'App entregadores', included: false },
      { text: 'Cupons e promoções', included: false },
      { text: 'Relatórios avançados', included: false },
      { text: 'PDV + Caixa', included: false },
      { text: 'Comandas presenciais', included: false },
      { text: 'Emissão fiscal', included: false },
    ],
    cta: 'Começar Grátis',
  },
  pro: {
    name: 'Pro',
    tagline: 'Expanda suas entregas',
    icon: TrendingUp,
    color: 'orange',
    gradient: 'from-orange-500 to-orange-600',
    monthly: 79.90,
    yearly: 799.00,
    badge: '7 dias grátis',
    popular: true,
    features: [
      { text: '✅ Tudo do Básico, mais:', included: true, bold: true },
      { text: 'Até 500 produtos', included: true },
      { text: 'App próprio para entregadores', included: true },
      { text: 'Zonas e taxas de entrega', included: true },
      { text: 'Rastreamento em tempo real', included: true },
      { text: 'Cupons e promoções', included: true },
      { text: 'Relatórios avançados', included: true },
      { text: 'Gestão de equipe (até 5)', included: true },
      { text: 'Histórico 1 ano', included: true },
      { text: 'Até 200 pedidos/dia', included: true },
      { text: 'Suporte prioritário', included: true },
      { text: 'PDV + Caixa', included: false },
      { text: 'Comandas presenciais', included: false },
      { text: 'Emissão fiscal', included: false },
    ],
    cta: 'Escolher Pro',
  },
  ultra: {
    name: 'Ultra',
    tagline: 'Gestão completa: online + presencial',
    icon: Crown,
    color: 'purple',
    gradient: 'from-purple-600 to-indigo-600',
    monthly: 149.90,
    yearly: 1499.00,
    badge: '7 dias grátis',
    features: [
      { text: '✅ Tudo do Pro, mais:', included: true, bold: true },
      { text: 'Produtos ilimitados', included: true },
      { text: 'PDV completo', included: true },
      { text: 'Controle de caixa', included: true },
      { text: 'Comandas presenciais', included: true },
      { text: 'App garçom', included: true },
      { text: 'Display cozinha (KDS)', included: true },
      { text: 'Emissão NFC-e / SAT', included: true },
      { text: 'API & Webhooks', included: true },
      { text: 'Até 5 localizações', included: true },
      { text: 'Analytics preditivo', included: true },
      { text: 'Pedidos ilimitados', included: true },
      { text: 'Até 20 usuários', included: true },
      { text: 'Suporte VIP (telefone + WhatsApp)', included: true },
    ],
    cta: 'Escolher Ultra',
  },
};

export default function Assinar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedInterval, setSelectedInterval] = useState('monthly');

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
          interval: selectedInterval
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

  const handleSubscribe = async (planKey) => {
    // Se for plano FREE, cria direto sem pagamento
    if (planKey === 'free') {
      if (!user) {
        const email = prompt('Digite seu email:');
        if (!email || !email.includes('@')) {
          alert('Email inválido!');
          return;
        }
        const name = prompt('Digite seu nome completo:');
        if (!name || name.trim().length < 3) {
          alert('Nome inválido!');
          return;
        }
        
        try {
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/mercadopago/create-free-subscriber`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name })
          });
          
          if (!response.ok) {
            throw new Error('Erro ao criar conta gratuita');
          }
          
          const data = await response.json();
          alert('Conta gratuita criada com sucesso! Faça login para acessar seu painel.');
          window.location.href = '/login/cliente';
        } catch (error) {
          alert(error.message || 'Erro ao criar conta. Tente novamente.');
        }
      } else {
        alert('Você já possui uma conta! Acesse o painel de administração.');
        window.location.href = '/Admin';
      }
      return;
    }
    
    // Para planos pagos, continua com Mercado Pago
    if (!user) {
      const email = prompt('Digite seu email:');
      if (!email || !email.includes('@')) {
        alert('Email inválido!');
        return;
      }
      const name = prompt('Digite seu nome completo:');
      if (!name || name.trim().length < 3) {
        alert('Nome inválido!');
        return;
      }
      createSubscriptionMutation.mutate({ email, name, plan: planKey });
    } else {
      createSubscriptionMutation.mutate({ 
        email: user.email, 
        name: user.full_name || user.email.split('@')[0],
        plan: planKey
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-amber-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

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

      {/* Hero */}
      <section className="relative py-16 sm:py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(249,115,22,0.12),transparent)]" />
        <div className="max-w-4xl mx-auto text-center relative">
          <Badge className="mb-6 px-4 py-1.5 text-sm font-medium bg-orange-100 text-orange-700 border border-orange-200/60">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 inline" />
            Cardápio Digital Profissional
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-6 leading-[1.1]">
            Escolha o plano ideal
            <span className="text-orange-500"> para seu negócio</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Do plano gratuito à gestão completa com PDV, caixa e fiscal. Comece grátis ou teste qualquer plano pago por até 10 dias.
          </p>
        </div>
      </section>

      {/* Toggle Mensal/Anual */}
      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Tabs value={selectedInterval} onValueChange={setSelectedInterval} className="mb-8">
            <TabsList className="grid w-full max-w-xs mx-auto grid-cols-2 bg-gray-200 p-1 rounded-xl">
              <TabsTrigger value="monthly" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow">
                Mensal
              </TabsTrigger>
              <TabsTrigger value="yearly" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow">
                Anual
                <Badge className="ml-2 bg-emerald-500/90 text-white text-[10px] px-1.5">Economize 33%</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Cards dos Planos */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-6 max-w-7xl mx-auto">
            {Object.entries(PLANS_DATA).map(([key, plan]) => {
              const Icon = plan.icon;
              const price = selectedInterval === 'monthly' ? plan.monthly : plan.yearly / 12;
              const totalYearly = selectedInterval === 'yearly' ? plan.yearly : plan.monthly * 12;
              
              return (
                <Card 
                  key={key} 
                  className={`relative border-2 shadow-xl ${
                    plan.popular 
                      ? 'border-orange-500 shadow-orange-200/50 scale-105' 
                      : 'border-gray-200/80 shadow-gray-200/50'
                  } bg-white overflow-hidden transition-transform hover:scale-105 hover:shadow-2xl`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-1.5 font-semibold shadow-lg">
                        <Sparkles className="w-3 h-3 inline mr-1" />
                        MAIS POPULAR
                      </Badge>
                    </div>
                  )}
                  
                  <CardContent className="pt-10 pb-8 px-6">
                    {/* Header do Plano */}
                    <div className="text-center mb-6">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-4 mx-auto text-white shadow-lg`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{plan.tagline}</p>
                      {plan.badge && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs font-semibold">
                          {plan.badge}
                        </Badge>
                      )}
                    </div>

                    {/* Preço */}
                    <div className="text-center mb-6 pb-6 border-b border-gray-200">
                      <div className="flex items-baseline justify-center gap-1 mb-2">
                        <span className="text-xl text-gray-600">R$</span>
                        <span className="text-5xl font-bold text-gray-900">
                          {price.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-gray-600">/mês</span>
                      </div>
                      {selectedInterval === 'yearly' && (
                        <p className="text-xs text-gray-600">
                          R$ {totalYearly.toFixed(2).replace('.', ',')} cobrado anualmente
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <div className="space-y-3 mb-6">
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          {feature.included ? (
                            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="w-3 h-3 text-green-600" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <X className="w-3 h-3 text-gray-400" />
                            </div>
                          )}
                          <span className={`text-sm ${feature.bold ? 'font-semibold text-gray-900' : 'text-gray-700'} ${!feature.included ? 'text-gray-400 line-through' : ''}`}>
                            {feature.text}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <Button 
                      onClick={() => handleSubscribe(key)}
                      disabled={createSubscriptionMutation.isLoading}
                      className={`w-full font-semibold shadow-lg ${
                        plan.popular 
                          ? `bg-gradient-to-r ${plan.gradient} hover:opacity-90 text-white` 
                          : `bg-gradient-to-r ${plan.gradient} hover:opacity-90 text-white`
                      }`}
                      size="lg"
                    >
                      {createSubscriptionMutation.isLoading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
                      ) : (
                        <>{plan.cta}</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparação Detalhada */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Compare os recursos</h2>
            <p className="text-gray-600">Veja tudo que está incluído em cada plano</p>
          </div>

          {/* Tabela Comparativa */}
          <div className="bg-white rounded-2xl shadow-xl overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Recurso</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-green-600">Gratuito</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-blue-600">Básico</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-orange-600">Pro</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-purple-600">Ultra</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <ComparisonRow label="Produtos" free="20" basic="100" pro="500" ultra="Ilimitado" />
                <ComparisonRow label="Pedidos/dia" free="10" basic="50" pro="200" ultra="Ilimitado" />
                <ComparisonRow label="Usuários" free="1" basic="1" pro="5" ultra="20" />
                <ComparisonRow label="Histórico" free="7 dias" basic="30 dias" pro="1 ano" ultra="Ilimitado" />
                <ComparisonRow label="WhatsApp" free={true} basic={true} pro={true} ultra={true} />
                <ComparisonRow label="Dashboard" free="Básico" basic="Básico" pro="Avançado" ultra="Preditivo" />
                <ComparisonRow label="Personalização" free={false} basic={true} pro={true} ultra={true} />
                <ComparisonRow label="App Entregadores" free={false} basic={false} pro={true} ultra={true} />
                <ComparisonRow label="Cupons/Promoções" free={false} basic={false} pro={true} ultra={true} />
                <ComparisonRow label="Relatórios Avançados" free={false} basic={false} pro={true} ultra={true} />
                <ComparisonRow label="PDV + Caixa" free={false} basic={false} pro={false} ultra={true} />
                <ComparisonRow label="Comandas Presenciais" free={false} basic={false} pro={false} ultra={true} />
                <ComparisonRow label="App Garçom" free={false} basic={false} pro={false} ultra={true} />
                <ComparisonRow label="Display Cozinha" free={false} basic={false} pro={false} ultra={true} />
                <ComparisonRow label="Emissão Fiscal (NFC-e)" free={false} basic={false} pro={false} ultra={true} />
                <ComparisonRow label="API & Webhooks" free={false} basic={false} pro={false} ultra={true} />
                <ComparisonRow label="Multi-localização" free={false} basic={false} pro={false} ultra="5 lojas" />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Incluído em todos os planos</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Seguro', desc: 'SSL e proteção de dados' },
              { icon: Zap, title: 'Rápido', desc: 'Carregamento instantâneo' },
              { icon: Smartphone, title: 'Responsivo', desc: 'Funciona em qualquer dispositivo' },
              { icon: BarChart3, title: 'Analytics', desc: 'Acompanhe suas métricas' },
            ].map((item, i) => (
              <Card key={i} className="border border-gray-200 shadow-lg bg-white text-center">
                <CardContent className="pt-6 pb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mb-4 mx-auto text-orange-600">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 bg-gray-900 text-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Perguntas Frequentes</h2>
          <div className="space-y-6">
            <FAQItem 
              question="Posso mudar de plano depois?"
              answer="Sim! Você pode fazer upgrade ou downgrade a qualquer momento. O ajuste de valor é proporcional."
            />
            <FAQItem 
              question="Como funciona a cobrança anual?"
              answer="Cobramos o valor total anualmente, com 33% de desconto. Você economiza e garante o serviço por 12 meses."
            />
            <FAQItem 
              question="Posso cancelar a qualquer momento?"
              answer="Sim, sem multas ou burocracia. Basta solicitar o cancelamento e ele será processado ao fim do período pago."
            />
            <FAQItem 
              question="Vocês oferecem período de teste?"
              answer="Sim! Todos os planos incluem 7 dias grátis para você testar sem compromisso."
            />
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Pronto para começar?</h2>
          <p className="text-gray-600 mb-8">
            Escolha seu plano e comece a vender mais hoje mesmo. Sem compromisso, cancele quando quiser.
          </p>
          {!user && (
            <Button onClick={() => base44.auth.redirectToLogin(window.location.href)} className="bg-orange-500 hover:bg-orange-600 px-8" size="lg">
              Criar Conta Grátis
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

// Componente auxiliar para linha de comparação
function ComparisonRow({ label, free, basic, pro, ultra }) {
  return (
    <tr>
      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{label}</td>
      <td className="px-6 py-4 text-center text-sm">
        {typeof free === 'boolean' ? (
          free ? <Check className="w-5 h-5 text-green-600 mx-auto" /> : <X className="w-5 h-5 text-gray-300 mx-auto" />
        ) : (
          <span className="text-gray-700">{free}</span>
        )}
      </td>
      <td className="px-6 py-4 text-center text-sm">
        {typeof basic === 'boolean' ? (
          basic ? <Check className="w-5 h-5 text-green-600 mx-auto" /> : <X className="w-5 h-5 text-gray-300 mx-auto" />
        ) : (
          <span className="text-gray-700">{basic}</span>
        )}
      </td>
      <td className="px-6 py-4 text-center text-sm">
        {typeof pro === 'boolean' ? (
          pro ? <Check className="w-5 h-5 text-green-600 mx-auto" /> : <X className="w-5 h-5 text-gray-300 mx-auto" />
        ) : (
          <span className="text-gray-700">{pro}</span>
        )}
      </td>
      <td className="px-6 py-4 text-center text-sm">
        {typeof ultra === 'boolean' ? (
          ultra ? <Check className="w-5 h-5 text-green-600 mx-auto" /> : <X className="w-5 h-5 text-gray-300 mx-auto" />
        ) : (
          <span className="text-gray-700">{ultra}</span>
        )}
      </td>
    </tr>
  );
}

// Componente auxiliar para FAQ
function FAQItem({ question, answer }) {
  return (
    <details className="group bg-gray-800 rounded-xl p-6 cursor-pointer">
      <summary className="font-semibold text-lg mb-2 list-none flex items-center justify-between">
        {question}
        <span className="text-orange-500 group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <p className="text-gray-400 mt-3">{answer}</p>
    </details>
  );
}
