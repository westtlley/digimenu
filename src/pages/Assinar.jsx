import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { 
  Check, 
  Smartphone, 
  BarChart3, 
  Users, 
  Bell, 
  Palette, 
  MessageSquare,
  Copy,
  ExternalLink,
  Loader2,
  LogOut,
  ArrowLeft,
  QrCode,
  CreditCard,
  Sparkles,
  Zap,
  Shield,
  Clock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import UserAuthButton from '../components/atoms/UserAuthButton';

const DEFAULT_FEATURES = [
  'Cardápio digital personalizado',
  'Gestão de pedidos em tempo real',
  'Notificações por WhatsApp',
  'Categorias e pratos ilimitados',
  'Cupons de desconto',
  'Promoções e upsell',
  'Relatórios de vendas',
  'Personalização de cores',
  'Suporte prioritário'
];

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
        // Não logado - ok, pode ver a página
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

  const config = paymentConfigs[0] || {};
  const features = config.features?.length > 0 ? config.features : DEFAULT_FEATURES;
  const monthlyPrice = config.monthly_price || 49.90;
  const yearlyPrice = config.yearly_price || 399.90;

  const handleCopyPix = () => {
    if (config.pix_key) {
      navigator.clipboard.writeText(config.pix_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePaymentLink = () => {
    if (config.payment_link) {
      window.open(config.payment_link, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to={createPageUrl('Cardapio')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Voltar</span>
          </Link>
          <UserAuthButton />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4 bg-orange-100 text-orange-700 hover:bg-orange-100">
            <Sparkles className="w-3 h-3 mr-1" />
            Cardápio Digital Profissional
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Transforme seu Negócio com um 
            <span className="text-orange-500"> Cardápio Digital</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Gerencie pedidos, aumente suas vendas e ofereça uma experiência incrível para seus clientes.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                  <Smartphone className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Cardápio Digital</h3>
                <p className="text-gray-600 text-sm">
                  Cardápio bonito e responsivo que funciona em qualquer dispositivo
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                  <Bell className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Gestão em Tempo Real</h3>
                <p className="text-gray-600 text-sm">
                  Receba notificações e gerencie pedidos instantaneamente
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Relatórios Detalhados</h3>
                <p className="text-gray-600 text-sm">
                  Acompanhe vendas, produtos mais pedidos e muito mais
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-12 px-4 bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-4">Planos e Preços</h2>
            <p className="text-gray-400">Escolha o plano ideal para o seu negócio</p>
          </div>

          <Tabs value={selectedPlan} onValueChange={setSelectedPlan} className="mb-8">
            <TabsList className="grid w-full max-w-xs mx-auto grid-cols-2 bg-gray-800">
              <TabsTrigger value="monthly" className="data-[state=active]:bg-orange-500">
                Mensal
              </TabsTrigger>
              <TabsTrigger value="yearly" className="data-[state=active]:bg-orange-500">
                Anual
                <Badge className="ml-2 bg-green-500 text-xs">-33%</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Card className="border-0 shadow-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Plano Profissional</h3>
                  <p className="text-orange-100">Tudo que você precisa para vender mais</p>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg">R$</span>
                    <span className="text-5xl font-bold">
                      {selectedPlan === 'monthly' 
                        ? monthlyPrice.toFixed(2).split('.')[0] 
                        : (yearlyPrice / 12).toFixed(2).split('.')[0]
                      }
                    </span>
                    <span className="text-lg">,{
                      selectedPlan === 'monthly' 
                        ? monthlyPrice.toFixed(2).split('.')[1] 
                        : (yearlyPrice / 12).toFixed(2).split('.')[1]
                    }</span>
                    <span className="text-orange-200">/mês</span>
                  </div>
                  {selectedPlan === 'yearly' && (
                    <p className="text-sm text-orange-200 mt-1">
                      R$ {yearlyPrice.toFixed(2)} cobrado anualmente
                    </p>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-8">
                {features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Payment Options */}
              <div className="bg-white/10 rounded-2xl p-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Formas de Pagamento
                </h4>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* PIX */}
                  {config.pix_key && (
                    <div className="bg-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <QrCode className="w-5 h-5" />
                        <span className="font-medium">PIX</span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-orange-200">
                          {config.pix_key_type?.toUpperCase()}: {config.pix_key}
                        </p>
                        {config.pix_beneficiary && (
                          <p className="text-xs text-orange-200">
                            Beneficiário: {config.pix_beneficiary}
                          </p>
                        )}
                        <Button 
                          onClick={handleCopyPix}
                          className="w-full bg-white text-orange-600 hover:bg-orange-50"
                          size="sm"
                        >
                          {copied ? (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-2" />
                              Copiar Chave PIX
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Payment Link */}
                  {config.payment_link && (
                    <div className="bg-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <ExternalLink className="w-5 h-5" />
                        <span className="font-medium">Link de Pagamento</span>
                      </div>
                      <p className="text-xs text-orange-200 mb-3">
                        Pague com cartão de crédito, boleto ou PIX
                      </p>
                      <Button 
                        onClick={handlePaymentLink}
                        className="w-full bg-white text-orange-600 hover:bg-orange-50"
                        size="sm"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Pagar Agora
                      </Button>
                    </div>
                  )}

                  {/* No payment configured */}
                  {!config.pix_key && !config.payment_link && (
                    <div className="sm:col-span-2 text-center py-4">
                      <p className="text-orange-200 mb-2">
                        Entre em contato para contratar
                      </p>
                      <Button 
                        className="bg-white text-orange-600 hover:bg-orange-50"
                        onClick={() => window.open('https://wa.me/', '_blank')}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Falar no WhatsApp
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-6 mt-10">
            <div className="flex items-center gap-2 text-gray-400">
              <Shield className="w-5 h-5" />
              <span className="text-sm">Pagamento Seguro</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Zap className="w-5 h-5" />
              <span className="text-sm">Ativação Imediata</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="w-5 h-5" />
              <span className="text-sm">Suporte 24h</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Pronto para começar?
          </h2>
          <p className="text-gray-600 mb-6">
            Após o pagamento, envie o comprovante e seu acesso será liberado em até 24 horas.
          </p>
          {!user && (
            <Button 
              onClick={() => base44.auth.redirectToLogin(window.location.href)}
              className="bg-orange-500 hover:bg-orange-600"
              size="lg"
            >
              Criar Conta Grátis
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}