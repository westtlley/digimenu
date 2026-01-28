import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Check,
  Smartphone,
  BarChart3,
  Bell,
  MessageSquare,
  Copy,
  ExternalLink,
  Loader2,
  ArrowLeft,
  QrCode,
  CreditCard,
  Sparkles,
  Zap,
  Shield,
  Clock,
  Users,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import UserAuthButton from '../components/atoms/UserAuthButton';

const ICON_MAP = {
  Smartphone,
  Bell,
  BarChart3,
  Zap,
  Shield,
  Clock,
  Users,
  Palette,
  MessageSquare,
};

const DEFAULT_FEATURES = [
  'Cardápio digital personalizado',
  'Gestão de pedidos em tempo real',
  'Notificações por WhatsApp',
  'Categorias e pratos ilimitados',
  'Cupons de desconto',
  'Promoções e upsell',
  'Relatórios de vendas',
  'Personalização de cores',
  'Suporte prioritário',
];

function FeatureIcon({ name }) {
  const Icon = ICON_MAP[name] || Smartphone;
  return <Icon className="w-6 h-6" />;
}

export default function Assinar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');

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

  const { data: paymentConfigs = [] } = useQuery({
    queryKey: ['paymentConfig'],
    queryFn: () => base44.entities.PaymentConfig.list(),
  });

  const c = paymentConfigs[0] || {};
  const features = c.features?.length > 0 ? c.features : DEFAULT_FEATURES;
  const monthlyPrice = Number(c.monthly_price) || 49.9;
  const yearlyPrice = Number(c.yearly_price) || 399.9;

  const heroBadge = c.hero_badge || 'Cardápio Digital Profissional';
  const heroTitle = c.hero_title || 'Transforme seu Negócio com um';
  const heroTitleHighlight = c.hero_title_highlight || ' Cardápio Digital';
  const heroSubtitle = c.hero_subtitle || 'Gerencie pedidos, aumente suas vendas e ofereça uma experiência incrível para seus clientes.';

  const f1 = { icon: c.feature_1_icon || 'Smartphone', title: c.feature_1_title || 'Cardápio Digital', desc: c.feature_1_desc || 'Cardápio bonito e responsivo que funciona em qualquer dispositivo' };
  const f2 = { icon: c.feature_2_icon || 'Bell', title: c.feature_2_title || 'Gestão em Tempo Real', desc: c.feature_2_desc || 'Receba notificações e gerencie pedidos instantaneamente' };
  const f3 = { icon: c.feature_3_icon || 'BarChart3', title: c.feature_3_title || 'Relatórios Detalhados', desc: c.feature_3_desc || 'Acompanhe vendas, produtos mais pedidos e muito mais' };

  const planName = c.plan_name || 'Plano Profissional';
  const planSubtitle = c.plan_subtitle || 'Tudo que você precisa para vender mais';
  const ctaTitle = c.cta_title || 'Pronto para começar?';
  const ctaSubtitle = c.cta_subtitle || 'Após o pagamento, envie o comprovante e seu acesso será liberado em até 24 horas.';
  const trust = [c.trust_1 || 'Pagamento Seguro', c.trust_2 || 'Ativação Imediata', c.trust_3 || 'Suporte 24h'].filter(Boolean);
  const whatsappNum = String(c.whatsapp_number || '').replace(/\D/g, '');
  const whatsappUrl = whatsappNum ? `https://wa.me/${whatsappNum}` : 'https://wa.me/';

  const handleCopyPix = () => {
    if (c.pix_key) {
      navigator.clipboard.writeText(c.pix_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePaymentLink = () => {
    if (c.payment_link) window.open(c.payment_link, '_blank');
  };

  // Mutation para criar ASSINATURA RECORRENTE no Mercado Pago
  const createSubscriptionMutation = useMutation({
    mutationFn: async ({ email, name }) => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/mercadopago/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          name: name,
          plan: 'pro',
          interval: selectedPlan // 'monthly' | 'yearly'
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
        // Redirecionar para página de assinatura do Mercado Pago
        window.location.href = data.init_point;
      }
    },
    onError: (error) => {
      alert(error.message || 'Erro ao criar assinatura. Tente novamente.');
    }
  });

  // Mutation para criar PAGAMENTO ÚNICO no Mercado Pago
  const createPaymentMutation = useMutation({
    mutationFn: async ({ email, name }) => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/mercadopago/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          name: name,
          plan: 'pro',
          interval: selectedPlan // 'monthly' | 'yearly'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar pagamento');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      if (data.init_point) {
        // Redirecionar para página de pagamento do Mercado Pago
        window.location.href = data.init_point;
      }
    },
    onError: (error) => {
      alert(error.message || 'Erro ao criar pagamento. Tente novamente.');
    }
  });

  const handleSubscribeWithCard = () => {
    if (!user) {
      // Pedir email e nome se não estiver logado
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
      createSubscriptionMutation.mutate({ email, name });
    } else {
      createSubscriptionMutation.mutate({ 
        email: user.email, 
        name: user.full_name || user.email.split('@')[0] 
      });
    }
  };

  const handlePayWithCard = () => {
    if (!user) {
      // Pedir email e nome se não estiver logado
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
      createPaymentMutation.mutate({ email, name });
    } else {
      createPaymentMutation.mutate({ 
        email: user.email, 
        name: user.full_name || user.email.split('@')[0] 
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to={createPageUrl('Cardapio')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Voltar</span>
          </Link>
          <UserAuthButton />
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-20 sm:py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(249,115,22,0.12),transparent)]" />
        <div className="max-w-4xl mx-auto text-center relative">
          <Badge className="mb-6 px-4 py-1.5 text-sm font-medium bg-orange-100 text-orange-700 border border-orange-200/60">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 inline" />
            {heroBadge}
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-6 leading-[1.1]">
            {heroTitle}
            <span className="text-orange-500">{heroTitleHighlight}</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {heroSubtitle}
          </p>
        </div>
      </section>

      {/* Destaques */}
      <section className="py-14 sm:py-18 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {[f1, f2, f3].map((f, i) => (
              <Card key={i} className="border border-gray-200/80 shadow-lg shadow-gray-200/50 bg-white">
                <CardContent className="pt-8 pb-8">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mb-5 text-orange-600">
                    <FeatureIcon name={f.icon} />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Preços */}
      <section className="py-14 sm:py-18 px-4 bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Planos e Preços</h2>
            <p className="text-gray-400">Escolha o plano ideal para o seu negócio</p>
          </div>

          <Tabs value={selectedPlan} onValueChange={setSelectedPlan} className="mb-8">
            <TabsList className="grid w-full max-w-xs mx-auto grid-cols-2 bg-gray-800 p-1 rounded-xl">
              <TabsTrigger value="monthly" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                Mensal
              </TabsTrigger>
              <TabsTrigger value="yearly" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                Anual
                <Badge className="ml-2 bg-emerald-500/90 text-white text-[10px] px-1.5">-33%</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Card className="border-0 shadow-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden">
            <CardContent className="p-8 sm:p-10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-8">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold mb-2">{planName}</h3>
                  <p className="text-orange-100">{planSubtitle}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-xl text-orange-100">R$</span>
                    <span className="text-5xl sm:text-6xl font-bold">
                      {selectedPlan === 'monthly'
                        ? monthlyPrice.toFixed(2).replace('.', ',')
                        : (yearlyPrice / 12).toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-orange-200 text-lg">/mês</span>
                  </div>
                  {selectedPlan === 'yearly' && (
                    <p className="text-sm text-orange-200 mt-2">R$ {yearlyPrice.toFixed(2).replace('.', ',')} cobrado anualmente</p>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-8">
                {features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Pagamento */}
              <div className="bg-white/10 rounded-2xl p-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Escolha sua Forma de Pagamento
                </h4>
                
                {/* ASSINATURA RECORRENTE - RECOMENDADO */}
                <div className="relative bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-400 rounded-xl p-4 mb-4">
                  <div className="absolute -top-3 left-4">
                    <Badge className="bg-green-500 text-white px-3 py-1 font-semibold">
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      RECOMENDADO
                    </Badge>
                  </div>
                  <div className="flex items-start gap-2 mb-3 mt-2">
                    <CreditCard className="w-5 h-5 text-green-300 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-white mb-1">Assinatura Automática (Cartão)</div>
                      <div className="space-y-1 mb-3">
                        <p className="text-xs text-green-200 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Cobrança automática - não precisa lembrar!
                        </p>
                        <p className="text-xs text-green-200 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Cancele quando quiser, sem multa
                        </p>
                        <p className="text-xs text-green-200 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Nunca perca acesso por esquecimento
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={handleSubscribeWithCard} 
                    disabled={createSubscriptionMutation.isLoading}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold shadow-lg" 
                  >
                    {createSubscriptionMutation.isLoading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
                    ) : (
                      <><Zap className="w-4 h-4 mr-2" /> Assinar com Cartão (Automático)</>
                    )}
                  </Button>
                </div>

                {/* OUTRAS OPÇÕES */}
                <details className="group mb-4">
                  <summary className="cursor-pointer text-sm text-orange-200 hover:text-white transition-colors mb-3 flex items-center gap-2 select-none">
                    <span>✋ Prefere pagar manualmente todo mês?</span>
                    <span className="text-xs opacity-70">(clique)</span>
                  </summary>
                  
                  <div className="grid sm:grid-cols-2 gap-3 pt-2 animate-in fade-in duration-200">
                    {/* Pagamento Único com Cartão */}
                    <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-4 h-4" />
                        <span className="font-medium text-sm">Cartão (Pagamento Único)</span>
                      </div>
                      <p className="text-xs text-orange-200 mb-3">Você renova manualmente</p>
                      <Button 
                        onClick={handlePayWithCard} 
                        disabled={createPaymentMutation.isLoading}
                        className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30" 
                        size="sm"
                      >
                        {createPaymentMutation.isLoading ? (
                          <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Processando...</>
                        ) : (
                          <><CreditCard className="w-3 h-3 mr-2" /> Pagar Uma Vez</>
                        )}
                      </Button>
                    </div>

                    {/* PIX */}
                    {c.pix_key && (
                      <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-2 mb-2">
                          <QrCode className="w-4 h-4" />
                          <span className="font-medium text-sm">PIX (Manual)</span>
                        </div>
                        <p className="text-xs text-orange-200 mb-2 truncate">
                          {String(c.pix_key_type || 'cpf').toUpperCase()}: {c.pix_key}
                        </p>
                        <Button onClick={handleCopyPix} className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30" size="sm">
                          {copied ? <><Check className="w-3 h-3 mr-2" />Copiado!</> : <><Copy className="w-3 h-3 mr-2" />Copiar</>}
                        </Button>
                      </div>
                    )}

                    {/* Link de Pagamento */}
                    {c.payment_link && (
                      <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-2 mb-2">
                          <ExternalLink className="w-4 h-4" />
                          <span className="font-medium text-sm">Boleto/Outros</span>
                        </div>
                        <p className="text-xs text-orange-200 mb-3">Pagamento manual</p>
                        <Button onClick={handlePaymentLink} className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30" size="sm">
                          <ExternalLink className="w-3 h-3 mr-2" /> Pagar
                        </Button>
                      </div>
                    )}
                  </div>
                </details>

                {/* Comparação de Métodos */}
                <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 text-xs">
                  <div className="font-semibold text-blue-200 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Por que escolher assinatura automática?
                  </div>
                  <div className="space-y-1 text-blue-100">
                    <p>• <strong>Nunca esqueça:</strong> Seu cardápio fica sempre ativo</p>
                    <p>• <strong>Economia de tempo:</strong> Não precisa pagar manualmente</p>
                    <p>• <strong>Cancele quando quiser:</strong> Sem multas ou burocracia</p>
                    <p>• <strong>90% dos clientes preferem</strong> renovação automática</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selos */}
          <div className="flex flex-wrap justify-center gap-8 mt-12">
            {trust.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-gray-400">
                {i === 0 && <Shield className="w-5 h-5" />}
                {i === 1 && <Zap className="w-5 h-5" />}
                {i === 2 && <Clock className="w-5 h-5" />}
                <span className="text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{ctaTitle}</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">{ctaSubtitle}</p>
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
