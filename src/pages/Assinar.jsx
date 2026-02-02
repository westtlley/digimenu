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
  ChevronDown,
  Star,
  ArrowRight,
  Clock,
  CreditCard,
  Headphones,
  TrendingUp as ChartIcon,
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
    name: 'Teste Grátis',
    tagline: 'Teste sem cartão',
    subtitle: '10 dias de teste',
    icon: Gift,
    iconColor: 'text-emerald-500',
    bgGradient: 'from-emerald-500 to-green-600',
    monthly: 0,
    yearly: 0,
    badge: '10 dias grátis',
    popular: false,
    features: [
      'Cardápio digital básico',
      'Até 20 produtos',
      'Pedidos via WhatsApp',
      'Gestor de pedidos simples',
      'Histórico 7 dias',
      'Até 10 pedidos/dia',
      '1 usuário',
    ],
    limitations: [
      'Personalização',
      'Dashboard avançado',
      'App entregadores',
      'Cupons e promoções',
      'Relatórios',
    ],
    cta: 'Testar 10 Dias Grátis',
    trialDays: 10,
  },
  basic: {
    name: 'Básico',
    tagline: 'Comece a vender online hoje',
    subtitle: 'Primeiro mês: 40 dias',
    icon: Smartphone,
    iconColor: 'text-blue-500',
    bgGradient: 'from-blue-500 to-blue-600',
    monthly: 39.90,
    yearly: 399.00,
    badge: '1º mês: 40 dias',
    popular: false,
    bonusDays: 10,
    features: [
      'Cardápio digital ilimitado',
      'Até 100 produtos',
      'Pedidos via WhatsApp',
      'Gestor de pedidos básico',
      'Personalização completa',
      'Dashboard básico',
      'Histórico 30 dias',
      'Até 50 pedidos/dia',
      '1 usuário',
    ],
    limitations: [
      'App entregadores',
      'Cupons e promoções',
      'Relatórios avançados',
    ],
    cta: 'Começar Teste Grátis',
  },
  pro: {
    name: 'Pro',
    tagline: 'Expanda suas entregas',
    subtitle: 'Tudo do Básico +',
    icon: TrendingUp,
    iconColor: 'text-orange-500',
    bgGradient: 'from-orange-500 to-orange-600',
    monthly: 79.90,
    yearly: 799.00,
    badge: '1º mês: 40 dias',
    popular: true,
    bonusDays: 10,
    features: [
      'Tudo do Básico +',
      'Até 500 produtos',
      'App para entregadores',
      'Zonas e taxas de entrega',
      'Rastreamento tempo real',
      'Cupons e promoções',
      'Relatórios avançados',
      'Gestão de equipe (até 5)',
      'Histórico 1 ano',
      'Até 200 pedidos/dia',
      'Suporte prioritário',
    ],
    limitations: [],
    cta: 'Escolher Pro',
  },
  ultra: {
    name: 'Ultra',
    tagline: 'Gestão completa: online + presencial',
    subtitle: 'Completo',
    icon: Crown,
    iconColor: 'text-purple-500',
    bgGradient: 'from-purple-600 to-indigo-600',
    monthly: 149.90,
    yearly: 1499.00,
    badge: '1º mês: 40 dias',
    popular: false,
    bonusDays: 10,
    features: [
      'Tudo do Pro +',
      'Produtos ilimitados',
      'PDV completo',
      'Comandas presenciais',
      'App para garçons',
      'Display para cozinha',
      'Emissão fiscal (NFC-e)',
      'API & Webhooks',
      'Multi-localização (5 lojas)',
      'Pedidos ilimitados',
      'Até 20 usuários',
      'Suporte VIP',
    ],
    limitations: [],
    cta: 'Escolher Ultra',
  },
};

const TESTIMONIALS = [
  {
    name: 'Maria Silva',
    restaurant: 'Pizzaria do Bairro',
    plan: 'Pro',
    stars: 5,
    text: 'Aumentei minhas vendas em 40% no primeiro mês. O sistema é muito fácil de usar!',
    avatar: '👩‍🍳',
  },
  {
    name: 'João Santos',
    restaurant: 'Burger House',
    plan: 'Pro',
    stars: 5,
    text: 'O app de entregadores mudou completamente nossa operação. Recomendo demais!',
    avatar: '👨‍🍳',
  },
  {
    name: 'Ana Costa',
    restaurant: 'Restaurante Sabor & Arte',
    plan: 'Ultra',
    stars: 5,
    text: 'Com o plano Ultra, consegui unificar delivery e presencial. Perfeito!',
    avatar: '👩‍💼',
  },
];

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

  const handleSubscribe = (planKey) => {
    // Todos redirecionam para cadastro
    window.location.href = `/cadastro?plan=${planKey}&interval=${selectedInterval}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/95 backdrop-blur-lg shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to={createPageUrl('Cardapio')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Voltar</span>
          </Link>
          <UserAuthButton />
        </div>
      </header>

      {/* Badge de Social Proof */}
      <div className="pt-8 pb-4 px-4">
        <div className="max-w-7xl mx-auto flex justify-center">
          <Badge className="px-6 py-2.5 text-sm font-semibold bg-orange-100 text-orange-700 border border-orange-200 shadow-sm hover:shadow-md transition-shadow">
            <Sparkles className="w-4 h-4 mr-2 inline animate-pulse" />
            Mais de 2.000 restaurantes confiam em nós
          </Badge>
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-8 sm:py-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-4 leading-tight">
            O plano perfeito para
          </h1>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">
            <span className="text-orange-500">o seu negócio </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">crescer</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Do plano gratuito à gestão completa com PDV, fiscal e muito mais. Comece grátis e evolua conforme seu negócio cresce.
          </p>
        </div>
      </section>

      {/* Toggle Mensal/Anual */}
      <section className="py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <Tabs value={selectedInterval} onValueChange={setSelectedInterval} className="flex justify-center">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-200 p-1.5 rounded-2xl shadow-inner">
              <TabsTrigger 
                value="monthly" 
                className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-md font-semibold transition-all"
              >
                Mensal
              </TabsTrigger>
              <TabsTrigger 
                value="yearly" 
                className="rounded-xl data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-md font-semibold transition-all"
              >
                Anual
                <Badge className="ml-2 bg-emerald-500 text-white text-[10px] px-2 shadow-sm">-17%</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </section>

      {/* Cards dos Planos */}
      <section className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Object.entries(PLANS_DATA).map(([key, plan]) => {
              const Icon = plan.icon;
              const price = selectedInterval === 'monthly' ? plan.monthly : plan.yearly / 12;
              
              return (
                <Card 
                  key={key} 
                  className={`relative border-2 group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 ${
                    plan.popular 
                      ? 'border-orange-500 shadow-xl shadow-orange-100 lg:scale-105 bg-gradient-to-b from-orange-50/50 to-white' 
                      : 'border-gray-200 shadow-lg hover:border-orange-300 bg-white'
                  } overflow-hidden rounded-2xl`}
                >
                  {/* Badge "Mais Popular" */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-1.5 font-bold shadow-lg text-xs uppercase">
                        <Crown className="w-3 h-3 inline mr-1" />
                        Mais Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardContent className="pt-8 pb-7 px-6">
                    {/* Ícone e Nome */}
                    <div className="text-center mb-6">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.bgGradient} flex items-center justify-center mb-4 mx-auto text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                      <p className="text-xs text-gray-600">{plan.tagline}</p>
                      {plan.badge && (
                        <Badge className="mt-2 bg-emerald-100 text-emerald-700 border-emerald-200 text-xs font-semibold">
                          {plan.badge}
                        </Badge>
                      )}
                    </div>

              {/* Preço */}
              <div className="text-center mb-6 pb-6 border-b-2 border-gray-100">
                {key === 'free' ? (
                  <>
                    <div className="flex flex-col items-center justify-center gap-1 mb-1">
                      <span className="text-5xl font-extrabold text-emerald-600">
                        10 dias
                      </span>
                      <span className="text-2xl font-bold text-emerald-600">
                        GRÁTIS
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 font-medium mt-2">Sem cartão de crédito</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline justify-center gap-1 mb-1">
                      <span className="text-xl text-gray-600 font-medium">R$</span>
                      <span className="text-5xl font-extrabold text-gray-900">
                        {price.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">/mês</p>
                    {selectedInterval === 'yearly' && price > 0 && (
                      <p className="text-xs text-emerald-600 font-semibold mt-2">
                        💰 Economize R$ {(plan.monthly * 2).toFixed(2).replace('.', ',')} por ano
                      </p>
                    )}
                  </>
                )}
              </div>

                    {/* Features */}
                    <div className="space-y-3 mb-6 min-h-[280px]">
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2.5 group/item">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:bg-emerald-500 transition-colors">
                            <Check className="w-3 h-3 text-emerald-600 group-hover/item:text-white transition-colors" />
                          </div>
                          <span className="text-sm text-gray-700 leading-relaxed">
                            {feature}
                          </span>
                        </div>
                      ))}
                      {plan.limitations.length > 0 && (
                        <>
                          {plan.limitations.map((limitation, i) => (
                            <div key={`lim-${i}`} className="flex items-start gap-2.5">
                              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <X className="w-3 h-3 text-gray-400" />
                              </div>
                              <span className="text-sm text-gray-400 line-through leading-relaxed">
                                {limitation}
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>

                    {/* CTA Button */}
                    <Button 
                      onClick={() => handleSubscribe(key)}
                      className={`w-full font-bold shadow-lg text-base py-6 rounded-xl transition-all duration-300 ${
                        plan.popular 
                          ? `bg-gradient-to-r ${plan.bgGradient} hover:shadow-2xl hover:scale-105 text-white border-2 border-transparent` 
                          : `bg-gradient-to-r ${plan.bgGradient} hover:shadow-xl hover:scale-105 text-white`
                      }`}
                    >
                      {plan.cta}
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-16 px-4 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Quem usa, recomenda</h2>
            <p className="text-gray-600">Veja o que nossos clientes dizem sobre a plataforma</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, i) => (
              <Card key={i} className="border-2 border-gray-200 hover:border-orange-300 hover:shadow-xl transition-all duration-300 bg-white group">
                <CardContent className="pt-6 pb-6 px-6">
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.stars)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  
                  {/* Texto */}
                  <p className="text-gray-700 mb-6 leading-relaxed text-sm italic">
                    "{testimonial.text}"
                  </p>
                  
                  {/* Avatar e Nome */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                      {testimonial.avatar}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{testimonial.name}</p>
                      <p className="text-xs text-gray-600">{testimonial.restaurant}</p>
                    </div>
                    <Badge className="bg-orange-100 text-orange-700 text-xs font-semibold">
                      {testimonial.plan}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tudo que você precisa */}
      <section className="py-16 px-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Tudo que você precisa em um só lugar</h2>
            <p className="text-gray-300">Funcionalidades premium incluídas em todos os planos pagos</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Seguro', desc: 'SSL e proteção de dados LGPD' },
              { icon: Zap, title: 'Ultra Rápido', desc: 'Carregamento em milissegundos' },
              { icon: Smartphone, title: '100% Responsivo', desc: 'Perfeito em qualquer tela' },
              { icon: BarChart3, title: 'Analytics', desc: 'Métricas em tempo real' },
              { icon: Clock, title: 'Uptime 99.9%', desc: 'Sempre disponível' },
              { icon: CreditCard, title: 'Pagamentos', desc: 'PIX, cartão e mais' },
              { icon: Headphones, title: 'Suporte', desc: 'Ajuda quando precisar' },
              { icon: ChartIcon, title: 'Escalável', desc: 'Cresce com você' },
            ].map((item, i) => (
              <div key={i} className="text-center group hover:scale-105 transition-transform duration-300">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-4 mx-auto shadow-lg group-hover:shadow-2xl transition-shadow">
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Perguntas Frequentes</h2>
            <p className="text-gray-600">Tire suas dúvidas antes de começar</p>
          </div>
          
          <div className="space-y-4">
            {[
              {
                q: 'Posso mudar de plano depois?',
                a: 'Sim! Você pode fazer upgrade ou downgrade a qualquer momento pelo painel. As mudanças são aplicadas imediatamente e o valor é ajustado proporcionalmente.'
              },
              {
                q: 'Como funciona a cobrança anual?',
                a: 'Na cobrança anual você paga o valor completo do ano (com 17% de desconto) de uma vez. É uma ótima opção para economizar!'
              },
              {
                q: 'Posso cancelar a qualquer momento?',
                a: 'Sim! Sem multas, taxas ou burocracias. Você pode cancelar quando quiser pelo painel administrativo e manter acesso até o fim do período pago.'
              },
              {
                q: 'Vocês oferecem período de teste?',
                a: 'Sim! O plano Básico tem 10 dias grátis, e os planos Pro e Ultra têm 7 dias. O plano Gratuito é grátis para sempre e não precisa de cartão.'
              },
              {
                q: 'Preciso de cartão de crédito para testar?',
                a: 'Para o plano Gratuito não! É 100% grátis sem cartão. Para planos pagos, você precisa cadastrar um cartão, mas só será cobrado após o período de teste.'
              },
            ].map((faq, i) => (
              <details key={i} className="group bg-white border-2 border-gray-200 rounded-2xl p-5 hover:border-orange-300 hover:shadow-lg transition-all duration-300">
                <summary className="font-bold text-gray-900 cursor-pointer flex items-center justify-between text-lg">
                  {faq.q}
                  <ChevronDown className="w-5 h-5 text-orange-500 group-open:rotate-180 transition-transform flex-shrink-0 ml-4" />
                </summary>
                <p className="mt-4 text-gray-600 leading-relaxed pl-1">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTIgMi00IDJjLTIgMC00LTItNC0yczIgMiA0IDJjMiAwIDQgMiA0IDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-5xl font-extrabold mb-6">
            Pronto para transformar seu negócio?
          </h2>
          <p className="text-xl mb-10 text-white/90">
            Junte-se a milhares de restaurantes que já estão vendendo mais com nossa plataforma.
          </p>
          
          <Button 
            onClick={() => handleSubscribe('free')}
            size="lg"
            className="bg-white text-orange-600 hover:bg-gray-50 font-bold text-lg px-10 py-7 rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 group"
          >
            Começar Grátis
            <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" />
          </Button>
          
          <p className="text-sm mt-6 text-white/80">
            Sem cartão de crédito • Cancele quando quiser
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-600 mb-4">
            © {new Date().getFullYear()} DigiMenu - Todos os direitos reservados
          </p>
          <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
            <a href="/termos" className="hover:text-orange-600 transition-colors font-medium">Termos de Uso</a>
            <a href="/privacidade" className="hover:text-orange-600 transition-colors font-medium">Privacidade</a>
            <a href="/contato" className="hover:text-orange-600 transition-colors font-medium">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
