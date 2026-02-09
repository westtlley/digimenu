/**
 * Página de vendas de planos — URL canônica: /assinar
 * Apenas para divulgação e conversão; não é página de login.
 * Redirecionamentos para esta página: apenas links explícitos (ex.: afiliados no futuro).
 */
import React, { useState } from 'react';
import {
  Check,
  Smartphone,
  ArrowLeft,
  Sparkles,
  Crown,
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
  Truck,
  Store,
  Receipt,
  LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { SYSTEM_NAME } from '@/config/branding';

// Planos alinhados ao backend (backend/utils/plans.js)
const PLANS_DATA = {
  free: {
    name: 'Grátis',
    tagline: 'Para uso pessoal e testes',
    icon: Sparkles,
    iconColor: 'text-emerald-600',
    bgGradient: 'from-emerald-500 to-teal-600',
    monthly: 0,
    yearly: 0,
    badge: 'Sem cartão',
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
      'Personalização visual',
      'Dashboard avançado',
      'App entregadores',
      'Cupons e promoções',
      'Relatórios detalhados',
    ],
    cta: 'Começar grátis',
    trialDays: 0,
  },
  basic: {
    name: 'Básico',
    tagline: 'Comece a vender online hoje',
    icon: Smartphone,
    iconColor: 'text-blue-600',
    bgGradient: 'from-blue-500 to-indigo-600',
    monthly: 39.9,
    yearly: 399,
    badge: '10 dias grátis',
    popular: false,
    features: [
      'Cardápio digital',
      'Até 100 produtos',
      'Pedidos via WhatsApp',
      'Gestor de pedidos básico',
      'Personalização (logo, cores)',
      'Dashboard básico',
      'Histórico 30 dias',
      'Até 50 pedidos/dia',
      '1 usuário',
    ],
    limitations: ['App entregadores', 'Cupons e promoções', 'Relatórios avançados'],
    cta: 'Testar 10 dias grátis',
    trialDays: 10,
  },
  pro: {
    name: 'Pro',
    tagline: 'Expanda entregas e equipe',
    icon: Truck,
    iconColor: 'text-orange-600',
    bgGradient: 'from-orange-500 to-amber-600',
    monthly: 79.9,
    yearly: 799,
    badge: '7 dias grátis',
    popular: true,
    features: [
      'Tudo do Básico +',
      'Até 500 produtos',
      'App para entregadores',
      'Zonas e taxas de entrega',
      'Rastreamento em tempo real',
      'Cupons e promoções',
      'Relatórios avançados',
      'Gestão de equipe (até 5)',
      'Histórico 1 ano',
      'Até 200 pedidos/dia',
      'Suporte prioritário',
    ],
    limitations: [],
    cta: 'Escolher Pro',
    trialDays: 7,
  },
  ultra: {
    name: 'Ultra',
    tagline: 'Online + presencial + fiscal',
    icon: Crown,
    iconColor: 'text-violet-600',
    bgGradient: 'from-violet-600 to-purple-700',
    monthly: 149.9,
    yearly: 1499,
    badge: '7 dias grátis',
    popular: false,
    features: [
      'Tudo do Pro +',
      'Produtos ilimitados',
      'PDV completo',
      'Controle de caixa',
      'Comandas presenciais',
      'App garçom',
      'Display cozinha (KDS)',
      'Emissão NFC-e / SAT',
      'API e Webhooks',
      'Até 5 localizações',
      'Pedidos ilimitados',
      'Até 20 usuários',
      'Suporte VIP',
    ],
    limitations: [],
    cta: 'Escolher Ultra',
    trialDays: 7,
  },
};

const TESTIMONIALS = [
  { name: 'Maria Silva', restaurant: 'Pizzaria do Bairro', plan: 'Pro', stars: 5, text: 'Aumentei minhas vendas em 40% no primeiro mês. O sistema é muito fácil de usar!', avatar: '👩‍🍳' },
  { name: 'João Santos', restaurant: 'Burger House', plan: 'Pro', stars: 5, text: 'O app de entregadores mudou nossa operação. Recomendo!', avatar: '👨‍🍳' },
  { name: 'Ana Costa', restaurant: 'Sabor & Arte', plan: 'Ultra', stars: 5, text: 'Com o Ultra unifiquei delivery e presencial. Perfeito para nosso restaurante.', avatar: '👩‍💼' },
];

const BENEFITS = [
  { icon: Shield, title: 'Seguro', desc: 'SSL e LGPD' },
  { icon: Zap, title: 'Rápido', desc: 'Resposta em tempo real' },
  { icon: Smartphone, title: 'Responsivo', desc: 'Qualquer tela' },
  { icon: BarChart3, title: 'Relatórios', desc: 'Métricas em tempo real' },
  { icon: Clock, title: 'Disponível', desc: 'Uptime 99.9%' },
  { icon: CreditCard, title: 'Pagamentos', desc: 'PIX, cartão' },
  { icon: Headphones, title: 'Suporte', desc: 'Quando precisar' },
  { icon: Store, title: 'Escalável', desc: 'Cresce com você' },
];

const FAQ = [
  { q: 'Posso mudar de plano depois?', a: 'Sim! Upgrade ou downgrade a qualquer momento pelo painel. O valor é ajustado proporcionalmente.' },
  { q: 'Como funciona o plano anual?', a: 'Você paga o ano com cerca de 17% de desconto. Ótima opção para quem quer economizar.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim. Sem multas. Você mantém acesso até o fim do período já pago.' },
  { q: 'Há período de teste?', a: 'Básico: 10 dias grátis. Pro e Ultra: 7 dias grátis. O plano Grátis não exige cartão.' },
  { q: 'Preciso de cartão para testar?', a: 'No plano Grátis não. Nos planos pagos, o cartão só é cobrado após o fim do trial.' },
];

export default function Assinar() {
  const [selectedInterval, setSelectedInterval] = useState('monthly');

  const handleSubscribe = (planKey) => {
    window.location.href = `/cadastro?plan=${planKey}&interval=${selectedInterval}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header — sem botão de login */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium">Voltar ao início</span>
          </Link>
          <Link to="/" className="flex items-center gap-2 font-bold text-slate-800">
            <LayoutDashboard className="w-6 h-6 text-orange-500" />
            <span>{SYSTEM_NAME}</span>
          </Link>
        </div>
      </header>

      {/* Social proof */}
      <div className="pt-8 pb-2 px-4">
        <div className="max-w-6xl mx-auto flex justify-center">
          <Badge variant="secondary" className="px-5 py-2 text-sm font-medium bg-orange-50 text-orange-700 border border-orange-200">
            <Sparkles className="w-4 h-4 mr-2 inline" />
            Milhares de restaurantes já usam o {SYSTEM_NAME}
          </Badge>
        </div>
      </div>

      {/* Hero */}
      <section className="py-10 sm:py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            O plano certo para o seu negócio
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
            Do cardápio digital ao PDV completo. Comece grátis e evolua quando quiser.
          </p>
        </div>
      </section>

      {/* Toggle Mensal / Anual */}
      <section className="py-4 px-4">
        <div className="max-w-6xl mx-auto flex justify-center">
          <Tabs value={selectedInterval} onValueChange={setSelectedInterval} className="w-full max-w-xs">
            <TabsList className="grid grid-cols-2 bg-slate-200 p-1 rounded-xl">
              <TabsTrigger value="monthly" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow font-medium">
                Mensal
              </TabsTrigger>
              <TabsTrigger value="yearly" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow font-medium">
                Anual
                <Badge className="ml-1.5 bg-emerald-500 text-white text-[10px] px-1.5">-17%</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </section>

      {/* Cards dos planos */}
      <section className="py-8 sm:py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(PLANS_DATA).map(([key, plan]) => {
              const Icon = plan.icon;
              const price = selectedInterval === 'monthly' ? plan.monthly : (plan.yearly / 12);
              return (
                <Card
                  key={key}
                  className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:shadow-xl ${
                    plan.popular
                      ? 'border-orange-500 shadow-lg shadow-orange-100/50 bg-white'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 left-0 right-0 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-center text-xs font-bold">
                      Mais popular
                    </div>
                  )}
                  <CardContent className={`pt-6 pb-6 px-5 ${plan.popular ? 'pt-10' : ''}`}>
                    <div className="text-center mb-5">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.bgGradient} flex items-center justify-center mx-auto text-white shadow-md`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mt-3">{plan.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{plan.tagline}</p>
                      {plan.badge && (
                        <Badge className="mt-2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                          {plan.badge}
                        </Badge>
                      )}
                    </div>

                    <div className="text-center mb-5 pb-5 border-b border-slate-100">
                      {key === 'free' ? (
                        <>
                          <span className="text-3xl font-extrabold text-emerald-600">Grátis</span>
                          <p className="text-xs text-slate-500 mt-1">Sem cartão de crédito</p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-baseline justify-center gap-0.5">
                            <span className="text-lg text-slate-500">R$</span>
                            <span className="text-4xl font-extrabold text-slate-900">
                              {price.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">/mês</p>
                          {selectedInterval === 'yearly' && plan.monthly > 0 && (
                            <p className="text-xs text-emerald-600 font-medium mt-1">
                              Economia no ano
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <ul className="space-y-2.5 mb-6 min-h-[260px]">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                      {plan.limitations?.map((l, i) => (
                        <li key={`lim-${i}`} className="flex items-start gap-2 text-sm text-slate-400">
                          <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="line-through">{l}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => handleSubscribe(key)}
                      className={`w-full font-semibold py-6 rounded-xl bg-gradient-to-r ${plan.bgGradient} hover:opacity-95 text-white border-0 shadow-md`}
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="py-14 px-4 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center mb-2">Quem usa recomenda</h2>
          <p className="text-slate-600 text-center mb-10">O que nossos clientes dizem</p>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <Card key={i} className="border border-slate-200 bg-slate-50/50">
                <CardContent className="pt-5 pb-5 px-5">
                  <div className="flex gap-1 mb-3">
                    {[...Array(t.stars)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 text-sm italic mb-4">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-lg">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.restaurant}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs ml-auto">{t.plan}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-14 px-4 bg-slate-800 text-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Tudo que você precisa</h2>
          <p className="text-slate-300 text-center mb-10">Incluído nos planos pagos</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map((b, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3">
                  <b.icon className="w-6 h-6 text-orange-400" />
                </div>
                <h3 className="font-semibold text-sm">{b.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 px-4 bg-slate-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">Perguntas frequentes</h2>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <details key={i} className="group bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-slate-300">
                <summary className="font-semibold text-slate-900 cursor-pointer flex items-center justify-between list-none">
                  {item.q}
                  <ChevronDown className="w-5 h-5 text-orange-500 group-open:rotate-180 transition-transform flex-shrink-0 ml-2" />
                </summary>
                <p className="mt-3 text-slate-600 text-sm leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 px-4 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-white/90 mb-8">Cadastre-se em segundos e teste sem cartão.</p>
          <Button
            onClick={() => handleSubscribe('free')}
            size="lg"
            className="bg-white text-orange-600 hover:bg-slate-50 font-bold text-base px-8 py-6 rounded-xl shadow-xl"
          >
            Começar grátis
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-sm text-white/80 mt-4">Sem cartão • Cancele quando quiser</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-slate-500 mb-3">© {new Date().getFullYear()} {SYSTEM_NAME}</p>
          <div className="flex justify-center gap-6 text-sm text-slate-500">
            <a href="/termos" className="hover:text-orange-600">Termos</a>
            <a href="/privacidade" className="hover:text-orange-600">Privacidade</a>
            <a href="/contato" className="hover:text-orange-600">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
