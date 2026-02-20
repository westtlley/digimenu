/**
 * Página de vendas de planos — URL canônica: /assinar
 * Design: landing com hero, pricing, comparativo, add-ons, depoimentos, benefícios, FAQ e CTA.
 * Dados do sistema: SYSTEM_NAME, planos (merge com API), limites, add-ons.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  Smartphone,
  Sparkles,
  Crown,
  X,
  Zap,
  Shield,
  ChevronDown,
  Star,
  ArrowRight,
  CreditCard,
  Headphones,
  Truck,
  ArrowDown,
  Gift,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { SYSTEM_NAME, SYSTEM_LOGO_URL } from '@/config/branding';
import { PLAN_LIMITS, ADDONS_VOLUME, ADDON_COPY } from '@/constants/planLimits';
import { THEME_PRESETS } from '@/components/theme/ThemeProvider';

// Cores do tema claro para forçar na página (body e :root usam variáveis CSS do ThemeProvider)
const LIGHT_THEME_COLORS = THEME_PRESETS.light.colors;

const getApiBase = () => {
  const u = import.meta.env.VITE_API_BASE_URL || '';
  return u.endsWith('/api') ? u : u ? `${u.replace(/\/$/, '')}/api` : '';
};

// Estilos fixos por plano (evita Tailwind dinâmico). Popular sempre laranja.
const PLAN_STYLES = {
  free: { iconBg: 'from-emerald-100 to-emerald-50', iconColor: 'text-emerald-600', btn: 'bg-emerald-500 hover:bg-emerald-600' },
  basic: { iconBg: 'from-blue-100 to-blue-50', iconColor: 'text-blue-600', btn: 'bg-blue-500 hover:bg-blue-600' },
  pro: { iconBg: 'from-orange-100 to-amber-50', iconColor: 'text-orange-600', btn: 'bg-slate-900 hover:bg-slate-800' },
  ultra: { iconBg: 'from-violet-100 to-violet-50', iconColor: 'text-violet-600', btn: 'bg-violet-600 hover:bg-violet-700' },
};

const PLANS_DATA_BASE = {
  free: {
    name: 'Grátis',
    tagline: 'Ideal para testar',
    icon: Sparkles,
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
      'Suporte por email',
    ],
    limitations: ['App entregadores', 'Cupons e promoções', 'Relatórios avançados'],
    cta: 'Começar grátis',
    trialDays: 0,
  },
  basic: {
    name: 'Básico',
    tagline: 'Comece a vender online',
    icon: Smartphone,
    monthly: 39.9,
    yearly: 399,
    badge: '10 dias grátis',
    popular: false,
    features: [
      'Tudo do Grátis +',
      'Até 150 produtos',
      'Personalização visual',
      'Zonas e taxas de entrega',
      'Promoções e pontos de fidelidade',
      'Dashboard básico',
      'Histórico 30 dias',
      'Suporte prioritário',
    ],
    limitations: ['App entregadores', 'Cupons avançados'],
    cta: 'Testar grátis',
    trialDays: 10,
  },
  pro: {
    name: 'Pro',
    tagline: 'Escalando entregas',
    icon: Truck,
    monthly: 79.9,
    yearly: 799,
    badge: '7 dias grátis',
    popular: true,
    features: [
      'Tudo do Básico +',
      'Até 800 produtos',
      'App entregadores',
      'Cupons e promoções',
      'Relatórios avançados',
      'Gestão de equipe (até 5)',
      'Histórico 1 ano',
    ],
    limitations: [],
    cta: 'Escolher Pro',
    trialDays: 7,
  },
  ultra: {
    name: 'Ultra',
    tagline: 'Enterprise + PDV',
    icon: Crown,
    monthly: 149.9,
    yearly: 1499,
    badge: '7 dias grátis',
    popular: false,
    features: [
      'Tudo do Pro +',
      'Produtos ilimitados',
      'PDV completo',
      'App garçom & KDS',
      'NFC-e / SAT',
      'API e Webhooks',
      'Múltiplas unidades',
      'Suporte VIP',
    ],
    limitations: [],
    cta: 'Escolher Ultra',
    trialDays: 7,
  },
};

const TESTIMONIALS = [
  { name: 'Maria Silva', restaurant: 'Pizzaria do Bairro', plan: 'Pro', stars: 5, text: 'Aumentei minhas vendas em 40% no primeiro mês. O app de entregadores mudou completamente nossa operação!', avatar: '👩‍🍳' },
  { name: 'João Santos', restaurant: 'Burger House', plan: 'Ultra', stars: 5, text: 'Finalmente unificamos delivery e salão num sistema só. O PDV é sensacional.', avatar: '👨‍🍳' },
  { name: 'Ana Costa', restaurant: 'Sabor & Arte', plan: 'Pro', stars: 5, text: 'Suporte incrível, sistema intuitivo. Em 3 dias já estávamos operando com tudo funcionando.', avatar: '👩‍💼' },
];

const BENEFITS = [
  { icon: Shield, title: 'Segurança SSL', desc: 'Dados criptografados e certificação LGPD' },
  { icon: Zap, title: 'Alta Performance', desc: 'Resposta em tempo real, 99.9% uptime' },
  { icon: CreditCard, title: 'Pagamentos', desc: 'PIX, cartão e múltiplas formas' },
  { icon: Headphones, title: 'Suporte', desc: 'Especialistas quando precisar' },
];

const FAQ = [
  { q: 'Posso mudar de plano depois?', a: 'Sim! Você pode fazer upgrade ou downgrade a qualquer momento. O valor é ajustado proporcionalmente ao período restante.' },
  { q: 'Como funciona o período de teste?', a: 'Básico: 10 dias grátis. Pro e Ultra: 7 dias. O plano Grátis não exige cartão de crédito para começar.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim, sem multas ou taxas de cancelamento. Você mantém acesso até o fim do período já pago.' },
  { q: 'Preciso de equipamentos especiais?', a: 'Não. Funciona em qualquer smartphone, tablet ou computador. Para impressão de comandas, recomendamos impressoras térmicas padrão.' },
  { q: 'Como funciona o suporte?', a: 'Planos pagos têm suporte por chat e email com resposta em até 4h em horário comercial. Ultra tem suporte VIP com atendimento prioritário.' },
];

function mergePlansWithOverride(base, override) {
  if (!override || typeof override !== 'object') return base;
  const keys = ['free', 'basic', 'pro', 'ultra'];
  const next = { ...base };
  keys.forEach((key) => {
    if (!base[key] || !override[key]) return;
    const o = override[key];
    next[key] = {
      ...base[key],
      name: o.name !== undefined && o.name !== null ? String(o.name) : base[key].name,
      tagline: o.tagline !== undefined && o.tagline !== null ? String(o.tagline) : base[key].tagline,
      monthly: o.monthly !== undefined && o.monthly !== null ? Number(o.monthly) : base[key].monthly,
      yearly: o.yearly !== undefined && o.yearly !== null ? Number(o.yearly) : base[key].yearly,
      trialDays: o.trial_days !== undefined && o.trial_days !== null ? Number(o.trial_days) : base[key].trialDays,
      badge: o.badge !== undefined && o.badge !== null ? String(o.badge) : base[key].badge,
      cta: o.cta !== undefined && o.cta !== null ? String(o.cta) : base[key].cta,
      popular: !!o.popular,
    };
  });
  return next;
}

export default function Assinar() {
  const [selectedInterval, setSelectedInterval] = useState('monthly');
  const headerRef = useRef(null);
  const hadDarkRef = useRef(false);

  const { data: assinarConfig } = useQuery({
    queryKey: ['public', 'assinar-config'],
    queryFn: async () => {
      const base = getApiBase();
      if (!base) return { plans_override: null };
      const res = await fetch(`${base}/public/assinar-config`);
      if (!res.ok) return { plans_override: null };
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const PLANS_DATA = useMemo(
    () => mergePlansWithOverride(PLANS_DATA_BASE, assinarConfig?.plans_override),
    [assinarConfig?.plans_override]
  );

  // Página de vendas sempre em tema branco (forçar variáveis CSS + classe para não ser afetada pelo tema do sistema)
  useEffect(() => {
    const root = document.documentElement;
    hadDarkRef.current = root.classList.contains('dark');
    const savedTheme = localStorage.getItem('theme') || 'dark';

    // Forçar tema claro: classe e variáveis CSS (body usa var(--bg-primary) etc.)
    root.classList.remove('dark');
    root.classList.add('light');
    Object.entries(LIGHT_THEME_COLORS).forEach(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--${cssKey}`, value);
    });

    return () => {
      root.classList.remove('light');
      if (hadDarkRef.current) root.classList.add('dark');
      // Restaurar variáveis do tema que o usuário tinha
      const preset = THEME_PRESETS[savedTheme];
      if (preset?.colors) {
        Object.entries(preset.colors).forEach(([key, value]) => {
          const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
          root.style.setProperty(`--${cssKey}`, value);
        });
      }
    };
  }, []);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const onScroll = () => {
      if (window.scrollY > 50) header.classList.add('glass');
      else header.classList.remove('glass');
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSubscribe = (planKey) => {
    window.location.href = `/cadastro?plan=${planKey}&interval=${selectedInterval}`;
  };

  const yearlyDiscount = useMemo(() => {
    const p = PLANS_DATA.pro;
    if (!p?.monthly || p.monthly <= 0) return 17;
    return Math.round(((p.monthly * 12 - p.yearly) / (p.monthly * 12)) * 100);
  }, [PLANS_DATA]);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased">
      {/* Ambient background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDuration: '4s', animationDelay: '2s' }} />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDuration: '4s', animationDelay: '4s' }} />
      </div>

      {/* Header */}
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center gap-3 group focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 rounded-lg">
              <img src={SYSTEM_LOGO_URL} alt="" className="w-10 h-10 rounded-xl object-contain shadow-lg group-hover:opacity-90 transition-opacity" />
              <span className="font-bold text-xl text-slate-900">{SYSTEM_NAME}</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8" aria-label="Navegação principal">
              <a href="#planos" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Planos</a>
              <a href="#recursos" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Recursos</a>
              <a href="#depoimentos" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Depoimentos</a>
              <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">FAQ</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-100 text-orange-700 text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              <span>Milhares de restaurantes já transformaram seu negócio</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight text-slate-900">
              O plano certo para <br />
              <span className="bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 bg-clip-text text-transparent">escalar seu negócio</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Do cardápio digital ao PDV completo. Comece grátis e evolua conforme seu restaurante cresce. Sem burocracia, sem taxas ocultas.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#planos"
                className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white rounded-full font-semibold hover:bg-slate-800 transition-all hover:scale-105 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
              >
                Ver planos
                <ArrowDown className="w-4 h-4" />
              </a>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>7 dias de garantia</span>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute top-20 right-10 w-64 h-64 bg-gradient-to-br from-orange-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse" aria-hidden="true" />
        <div className="absolute bottom-20 left-10 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }} aria-hidden="true" />
      </section>

      {/* Pricing */}
      <section id="planos" className="py-24 bg-slate-50/50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center mb-16">
            <div className="bg-white p-1.5 rounded-full shadow-sm border border-slate-200 inline-flex" role="group" aria-label="Faturamento mensal ou anual">
              <button
                type="button"
                onClick={() => setSelectedInterval('monthly')}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
                  selectedInterval === 'monthly' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
                aria-pressed={selectedInterval === 'monthly'}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setSelectedInterval('yearly')}
                className={`relative px-6 py-2.5 rounded-full text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
                  selectedInterval === 'yearly' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
                aria-pressed={selectedInterval === 'yearly'}
              >
                Anual
                <span className="absolute -top-3 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">-{yearlyDiscount}%</span>
              </button>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              {selectedInterval === 'yearly' ? 'Cobrado anualmente • Economize no ano' : `Economize ${yearlyDiscount}% no plano anual`}
            </p>
          </div>

          <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 lg:gap-8">
            {Object.entries(PLANS_DATA).map(([key, plan]) => {
              const Icon = plan.icon;
              const style = PLAN_STYLES[key] || PLAN_STYLES.basic;
              const isPopular = plan.popular;
              const price = selectedInterval === 'monthly' ? plan.monthly : plan.yearly / 12;
              const limits = PLAN_LIMITS[key];

              return (
                <div
                  key={key}
                  className={`relative rounded-2xl bg-white border p-6 flex flex-col h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-orange-500/10 ${
                    isPopular ? 'border-orange-500 shadow-xl shadow-orange-500/10 scale-105 z-10' : 'border-slate-200'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                      Mais popular
                    </div>
                  )}
                  <div className="mb-6">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 ${isPopular ? 'from-orange-100 to-amber-50' : style.iconBg}`}>
                      <Icon className={`w-6 h-6 ${isPopular ? 'text-orange-600' : style.iconColor}`} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">{plan.tagline}</p>
                  </div>

                  <div className="mb-6">
                    {key === 'free' ? (
                      <>
                        <span className="text-3xl font-bold text-emerald-600">Grátis</span>
                        <p className="text-xs text-slate-400 mt-1">Sem cartão de crédito</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-medium text-slate-400">R$</span>
                          <span className="text-4xl font-bold text-slate-900">{price.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">
                          /mês {selectedInterval === 'yearly' && <span className="text-emerald-600 font-medium">(cobrado anualmente)</span>}
                        </p>
                        {plan.trialDays > 0 && (
                          <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
                            <Gift className="w-3 h-3" />
                            {plan.trialDays} dias grátis
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {limits && (
                    <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 space-y-1">
                      <div className="font-medium text-slate-700">Incluído no plano</div>
                      <div>Pedidos/mês: {limits.orders_per_month === -1 ? 'Ilimitado' : limits.orders_per_month.toLocaleString('pt-BR')}</div>
                      <div>Equipe: até {limits.collaborators}</div>
                      <div>Produtos: {limits.products === -1 ? 'Ilimitado' : limits.products}</div>
                      <div>Unidades: {limits.locations}</div>
                    </div>
                  )}

                  <ul className="space-y-3 mb-8 flex-grow">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                    {plan.limitations?.map((l, i) => (
                      <li key={`lim-${i}`} className="flex items-start gap-3 text-sm text-slate-400">
                        <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="line-through">{l}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSubscribe(key)}
                    className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${
                      isPopular ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="recursos" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Comparativo completo</h2>
            <p className="text-slate-600">Tudo que você precisa para decidir com segurança</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-6 text-left text-sm font-semibold text-slate-900">Recurso</th>
                    <th className="p-6 text-center text-sm font-semibold text-slate-900">Grátis</th>
                    <th className="p-6 text-center text-sm font-semibold text-slate-900">Básico</th>
                    <th className="p-6 text-center text-sm font-semibold text-orange-600 bg-orange-50/50">Pro</th>
                    <th className="p-6 text-center text-sm font-semibold text-slate-900">Ultra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PLAN_LIMITS.free && (
                    <>
                      <tr className="bg-white hover:bg-slate-50">
                        <td className="p-6 text-sm font-medium text-slate-900 border-r border-slate-100">Produtos</td>
                        <td className="p-6 text-center text-sm text-slate-600 border-r border-slate-100">{PLAN_LIMITS.free.products === -1 ? 'Ilimitado' : PLAN_LIMITS.free.products}</td>
                        <td className="p-6 text-center text-sm text-slate-600 border-r border-slate-100">{PLAN_LIMITS.basic?.products === -1 ? 'Ilimitado' : PLAN_LIMITS.basic?.products}</td>
                        <td className="p-6 text-center text-sm font-medium text-slate-900 border-r border-slate-100 bg-orange-50/30">{PLAN_LIMITS.pro?.products === -1 ? 'Ilimitado' : PLAN_LIMITS.pro?.products}</td>
                        <td className="p-6 text-center text-sm text-slate-900">{PLAN_LIMITS.ultra?.products === -1 ? 'Ilimitado' : PLAN_LIMITS.ultra?.products}</td>
                      </tr>
                      <tr className="bg-slate-50/50 hover:bg-slate-50">
                        <td className="p-6 text-sm font-medium text-slate-900 border-r border-slate-100">Pedidos/mês</td>
                        <td className="p-6 text-center text-sm text-slate-600 border-r border-slate-100">{PLAN_LIMITS.free.orders_per_month === -1 ? 'Ilimitado' : PLAN_LIMITS.free.orders_per_month}</td>
                        <td className="p-6 text-center text-sm text-slate-600 border-r border-slate-100">{PLAN_LIMITS.basic?.orders_per_month === -1 ? 'Ilimitado' : PLAN_LIMITS.basic?.orders_per_month}</td>
                        <td className="p-6 text-center text-sm font-medium text-slate-900 border-r border-slate-100 bg-orange-50/30">{PLAN_LIMITS.pro?.orders_per_month === -1 ? 'Ilimitado' : PLAN_LIMITS.pro?.orders_per_month}</td>
                        <td className="p-6 text-center text-sm text-slate-900">Ilimitado</td>
                      </tr>
                      <tr className="bg-white hover:bg-slate-50">
                        <td className="p-6 text-sm font-medium text-slate-900 border-r border-slate-100">Colaboradores</td>
                        <td className="p-6 text-center text-sm text-slate-600 border-r border-slate-100">{PLAN_LIMITS.free.collaborators}</td>
                        <td className="p-6 text-center text-sm text-slate-600 border-r border-slate-100">{PLAN_LIMITS.basic?.collaborators}</td>
                        <td className="p-6 text-center text-sm font-medium text-slate-900 border-r border-slate-100 bg-orange-50/30">{PLAN_LIMITS.pro?.collaborators}</td>
                        <td className="p-6 text-center text-sm text-slate-900">{PLAN_LIMITS.ultra?.collaborators}</td>
                      </tr>
                    </>
                  )}
                  <tr className="bg-white hover:bg-slate-50">
                    <td className="p-6 text-sm font-medium text-slate-900 border-r border-slate-100">Zonas e taxas de entrega</td>
                    <td className="p-6 text-center border-r border-slate-100"><X className="w-5 h-4 text-slate-300 mx-auto" /></td>
                    <td className="p-6 text-center border-r border-slate-100"><Check className="w-5 h-5 text-emerald-500 mx-auto" /></td>
                    <td className="p-6 text-center border-r border-slate-100 bg-orange-50/30"><Check className="w-5 h-5 text-emerald-500 mx-auto" /></td>
                    <td className="p-6 text-center"><Check className="w-5 h-5 text-emerald-500 mx-auto" /></td>
                  </tr>
                  <tr className="bg-slate-50/50 hover:bg-slate-50">
                    <td className="p-6 text-sm font-medium text-slate-900 border-r border-slate-100">App entregadores</td>
                    <td className="p-6 text-center border-r border-slate-100"><X className="w-5 h-4 text-slate-300 mx-auto" /></td>
                    <td className="p-6 text-center border-r border-slate-100"><X className="w-5 h-4 text-slate-300 mx-auto" /></td>
                    <td className="p-6 text-center border-r border-slate-100 bg-orange-50/30"><Check className="w-5 h-5 text-emerald-500 mx-auto" /></td>
                    <td className="p-6 text-center"><Check className="w-5 h-5 text-emerald-500 mx-auto" /></td>
                  </tr>
                  <tr className="bg-white hover:bg-slate-50">
                    <td className="p-6 text-sm font-medium text-slate-900 border-r border-slate-100">PDV</td>
                    <td className="p-6 text-center border-r border-slate-100"><X className="w-5 h-4 text-slate-300 mx-auto" /></td>
                    <td className="p-6 text-center border-r border-slate-100"><X className="w-5 h-4 text-slate-300 mx-auto" /></td>
                    <td className="p-6 text-center border-r border-slate-100 bg-orange-50/30"><X className="w-5 h-4 text-slate-300 mx-auto" /></td>
                    <td className="p-6 text-center"><Check className="w-5 h-5 text-emerald-500 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">{ADDON_COPY.title}</h2>
            <p className="text-slate-300">{ADDON_COPY.subtitle}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ADDONS_VOLUME.map((addon) => (
              <button
                key={addon.id}
                type="button"
                onClick={() => handleSubscribe('basic')}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 hover:bg-white/20 transition-all text-left group focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-white">{addon.label}</span>
                  <ArrowRight className="w-5 h-5 text-orange-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-2xl font-bold text-white mb-1">
                  R$ {typeof addon.price === 'number' ? addon.price.toFixed(2).replace('.', ',') : addon.price}
                  <span className="text-sm font-normal text-white/60">/mês</span>
                </p>
                <p className="text-xs text-white/60">{ADDON_COPY.cta}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Quem usa, recomenda</h2>
            <p className="text-slate-600">Histórias reais de restaurantes que transformaram seu atendimento</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <Card key={i} className="border border-slate-100 bg-white hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(t.stars)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 mb-6 leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-2xl">{t.avatar}</div>
                    <div>
                      <p className="font-semibold text-slate-900">{t.name}</p>
                      <p className="text-sm text-slate-500">{t.restaurant}</p>
                    </div>
                    <span className="ml-auto px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">{t.plan}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {BENEFITS.map((b, i) => (
              <div key={i} className="text-center group">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <b.icon className="w-7 h-7 text-orange-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{b.title}</h3>
                <p className="text-sm text-slate-500">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Perguntas frequentes</h2>
            <p className="text-slate-600">Tudo que você precisa saber antes de começar</p>
          </div>
          <div className="space-y-4">
            {FAQ.map((item, i) => (
              <details key={i} className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-orange-200 transition-colors">
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none font-semibold text-slate-900 hover:text-orange-600 transition-colors">
                  <span>{item.q}</span>
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-open:bg-orange-100 transition-colors shrink-0">
                    <ChevronDown className="w-5 h-5 text-slate-400 group-open:text-orange-600 group-open:rotate-180 transition-all" />
                  </div>
                </summary>
                <div className="px-6 pb-6 text-slate-600 leading-relaxed border-t border-slate-100 pt-4">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">Pronto para começar?</h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">Junte-se a milhares de restaurantes que já usam tecnologia para crescer.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => handleSubscribe('free')}
              className="w-full sm:w-auto px-10 py-5 bg-white text-orange-600 hover:bg-slate-50 rounded-full font-bold text-lg shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              Começar grátis
              <ArrowRight className="w-5 h-5" />
            </Button>
            <p className="text-white/80 text-sm">Sem cartão • Setup em 2 minutos</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900 text-slate-400 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={SYSTEM_LOGO_URL} alt="" className="w-5 h-5 object-contain opacity-90" />
              <span className="font-semibold text-slate-100">{SYSTEM_NAME}</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/termos" className="hover:text-white transition-colors">Termos</Link>
              <Link to="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
              <Link to="/contato" className="hover:text-white transition-colors">Contato</Link>
            </div>
            <p className="text-sm">© {new Date().getFullYear()} Todos os direitos reservados</p>
          </div>
        </div>
      </footer>

      {/* Glass style for header on scroll */}
      <style>{`
        header.glass {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}
