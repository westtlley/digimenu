import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
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
                  Formas de Pagamento
                </h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  {c.pix_key && (
                    <div className="bg-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <QrCode className="w-5 h-5" />
                        <span className="font-medium">PIX</span>
                      </div>
                      <p className="text-xs text-orange-200 mb-2">
                        {String(c.pix_key_type || 'cpf').toUpperCase()}: {c.pix_key}
                      </p>
                      {c.pix_beneficiary && <p className="text-xs text-orange-200 mb-2">Beneficiário: {c.pix_beneficiary}</p>}
                      <Button onClick={handleCopyPix} className="w-full bg-white text-orange-600 hover:bg-orange-50" size="sm">
                        {copied ? <><Check className="w-4 h-4 mr-2" />Copiado!</> : <><Copy className="w-4 h-4 mr-2" />Copiar Chave PIX</>}
                      </Button>
                    </div>
                  )}
                  {c.payment_link && (
                    <div className="bg-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <ExternalLink className="w-5 h-5" />
                        <span className="font-medium">Link de Pagamento</span>
                      </div>
                      <p className="text-xs text-orange-200 mb-3">Cartão, boleto ou PIX</p>
                      <Button onClick={handlePaymentLink} className="w-full bg-white text-orange-600 hover:bg-orange-50" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" /> Pagar Agora
                      </Button>
                    </div>
                  )}
                  {!c.pix_key && !c.payment_link && (
                    <div className="sm:col-span-2 text-center py-4">
                      <p className="text-orange-200 mb-3">Entre em contato para contratar</p>
                      <Button className="bg-white text-orange-600 hover:bg-orange-50" onClick={() => window.open(whatsappUrl, '_blank')}>
                        <MessageSquare className="w-4 h-4 mr-2" /> Falar no WhatsApp
                      </Button>
                    </div>
                  )}
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
