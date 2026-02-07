/**
 * Edição da Página Assinar (venda do DigiMenu) — apenas Admin Master.
 * Centraliza: hero, destaques, preços, benefícios, pagamento (PIX/link), CTA, selos e WhatsApp.
 * Persiste em PaymentConfig (campos adicionais para conteúdo da página).
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  Loader2,
  Layout,
  Type,
  DollarSign,
  CreditCard,
  QrCode,
  ExternalLink,
  MessageSquare,
  Plus,
  X,
  Eye,
  Shield,
  Zap,
  Clock,
  Smartphone,
  Bell,
  BarChart3,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePermission } from '../permissions/usePermission';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import toast from 'react-hot-toast';

const ICON_OPTS = [
  { value: 'Smartphone', label: 'Smartphone' },
  { value: 'Bell', label: 'Sino / Notificações' },
  { value: 'BarChart3', label: 'Gráficos' },
  { value: 'Zap', label: 'Raio / Velocidade' },
  { value: 'Shield', label: 'Escudo / Segurança' },
  { value: 'Clock', label: 'Relógio' },
  { value: 'Users', label: 'Usuários' },
  { value: 'Palette', label: 'Paleta' },
  { value: 'MessageSquare', label: 'Mensagem' },
];

const DEFAULTS = {
  hero_badge: 'Cardápio Digital Profissional',
  hero_title: 'Transforme seu Negócio com um',
  hero_title_highlight: ' Cardápio Digital',
  hero_subtitle: 'Gerencie pedidos, aumente suas vendas e ofereça uma experiência incrível para seus clientes.',
  feature_1_icon: 'Smartphone',
  feature_1_title: 'Cardápio Digital',
  feature_1_desc: 'Cardápio bonito e responsivo que funciona em qualquer dispositivo',
  feature_2_icon: 'Bell',
  feature_2_title: 'Gestão em Tempo Real',
  feature_2_desc: 'Receba notificações e gerencie pedidos instantaneamente',
  feature_3_icon: 'BarChart3',
  feature_3_title: 'Relatórios Detalhados',
  feature_3_desc: 'Acompanhe vendas, produtos mais pedidos e muito mais',
  plan_name: 'Plano Profissional',
  plan_subtitle: 'Tudo que você precisa para vender mais',
  cta_title: 'Pronto para começar?',
  cta_subtitle: 'Após o pagamento, envie o comprovante e seu acesso será liberado em até 24 horas.',
  trust_1: 'Pagamento Seguro',
  trust_2: 'Ativação Imediata',
  trust_3: 'Suporte 24h',
  whatsapp_number: '',
  monthly_price: 49.9,
  yearly_price: 399.9,
  features: [
    'Cardápio digital personalizado',
    'Gestão de pedidos em tempo real',
    'Notificações por WhatsApp',
    'Categorias e pratos ilimitados',
    'Cupons de desconto',
    'Promoções e upsell',
    'Relatórios de vendas',
    'Personalização de cores',
    'Suporte prioritário',
  ],
};

export default function AssinarPageEditorTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...DEFAULTS });
  const [newFeature, setNewFeature] = useState('');

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['paymentConfig'],
    queryFn: () => base44.entities.PaymentConfig.list(),
  });

  const config = list[0] || null;

  useEffect(() => {
    if (!config) return;
    setForm({
      hero_badge: config.hero_badge ?? DEFAULTS.hero_badge,
      hero_title: config.hero_title ?? DEFAULTS.hero_title,
      hero_title_highlight: config.hero_title_highlight ?? DEFAULTS.hero_title_highlight,
      hero_subtitle: config.hero_subtitle ?? DEFAULTS.hero_subtitle,
      feature_1_icon: config.feature_1_icon ?? DEFAULTS.feature_1_icon,
      feature_1_title: config.feature_1_title ?? DEFAULTS.feature_1_title,
      feature_1_desc: config.feature_1_desc ?? DEFAULTS.feature_1_desc,
      feature_2_icon: config.feature_2_icon ?? DEFAULTS.feature_2_icon,
      feature_2_title: config.feature_2_title ?? DEFAULTS.feature_2_title,
      feature_2_desc: config.feature_2_desc ?? DEFAULTS.feature_2_desc,
      feature_3_icon: config.feature_3_icon ?? DEFAULTS.feature_3_icon,
      feature_3_title: config.feature_3_title ?? DEFAULTS.feature_3_title,
      feature_3_desc: config.feature_3_desc ?? DEFAULTS.feature_3_desc,
      plan_name: config.plan_name ?? DEFAULTS.plan_name,
      plan_subtitle: config.plan_subtitle ?? DEFAULTS.plan_subtitle,
      cta_title: config.cta_title ?? DEFAULTS.cta_title,
      cta_subtitle: config.cta_subtitle ?? DEFAULTS.cta_subtitle,
      trust_1: config.trust_1 ?? DEFAULTS.trust_1,
      trust_2: config.trust_2 ?? DEFAULTS.trust_2,
      trust_3: config.trust_3 ?? DEFAULTS.trust_3,
      whatsapp_number: config.whatsapp_number ?? DEFAULTS.whatsapp_number,
      monthly_price: config.monthly_price ?? DEFAULTS.monthly_price,
      yearly_price: config.yearly_price ?? DEFAULTS.yearly_price,
      features: Array.isArray(config.features) && config.features.length ? config.features : DEFAULTS.features,
      pix_key: config.pix_key ?? '',
      pix_key_type: config.pix_key_type ?? 'cpf',
      pix_beneficiary: config.pix_beneficiary ?? '',
      payment_link: config.payment_link ?? '',
    });
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        monthly_price: Number(data.monthly_price) || 0,
        yearly_price: Number(data.yearly_price) || 0,
        features: data.features || [],
        pix_key: data.pix_key || '',
        pix_key_type: data.pix_key_type || 'cpf',
        pix_beneficiary: data.pix_beneficiary || '',
        payment_link: data.payment_link || '',
        hero_badge: data.hero_badge || '',
        hero_title: data.hero_title || '',
        hero_title_highlight: data.hero_title_highlight || '',
        hero_subtitle: data.hero_subtitle || '',
        feature_1_icon: data.feature_1_icon || '',
        feature_1_title: data.feature_1_title || '',
        feature_1_desc: data.feature_1_desc || '',
        feature_2_icon: data.feature_2_icon || '',
        feature_2_title: data.feature_2_title || '',
        feature_2_desc: data.feature_2_desc || '',
        feature_3_icon: data.feature_3_icon || '',
        feature_3_title: data.feature_3_title || '',
        feature_3_desc: data.feature_3_desc || '',
        plan_name: data.plan_name || '',
        plan_subtitle: data.plan_subtitle || '',
        cta_title: data.cta_title || '',
        cta_subtitle: data.cta_subtitle || '',
        trust_1: data.trust_1 || '',
        trust_2: data.trust_2 || '',
        trust_3: data.trust_3 || '',
        whatsapp_number: data.whatsapp_number || '',
      };
      if (config?.id) {
        return base44.entities.PaymentConfig.update(config.id, payload);
      }
      return base44.entities.PaymentConfig.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentConfig'] });
      toast.success('✅ Página Assinar salva com sucesso!');
    },
    onError: (e) => toast.error(e?.message || 'Erro ao salvar'),
  });

  const handleSave = () => saveMutation.mutate(form);

  const addFeature = () => {
    if (!newFeature.trim()) return;
    setForm((f) => ({ ...f, features: [...(f.features || []), newFeature.trim()] }));
    setNewFeature('');
  };

  const removeFeature = (i) => {
    setForm((f) => ({ ...f, features: (f.features || []).filter((_, idx) => idx !== i) }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Layout className="w-6 h-6 text-orange-500" />
            Página Assinar
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Edite textos, preços e formas de pagamento da página de venda do DigiMenu.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl('Assinar')} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              Visualizar
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-orange-500 hover:bg-orange-600">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* Hero */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Type className="w-5 h-5" />
            Hero (título e chamada)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Badge (etiqueta acima do título)</Label>
            <Input
              value={form.hero_badge || ''}
              onChange={(e) => setForm((f) => ({ ...f, hero_badge: e.target.value }))}
              placeholder="Ex: Cardápio Digital Profissional"
            />
          </div>
          <div>
            <Label>Título (parte normal)</Label>
            <Input
              value={form.hero_title || ''}
              onChange={(e) => setForm((f) => ({ ...f, hero_title: e.target.value }))}
              placeholder="Ex: Transforme seu Negócio com um"
            />
          </div>
          <div>
            <Label>Título (parte em destaque, laranja)</Label>
            <Input
              value={form.hero_title_highlight || ''}
              onChange={(e) => setForm((f) => ({ ...f, hero_title_highlight: e.target.value }))}
              placeholder="Ex:  Cardápio Digital"
            />
          </div>
          <div>
            <Label>Subtítulo</Label>
            <Textarea
              value={form.hero_subtitle || ''}
              onChange={(e) => setForm((f) => ({ ...f, hero_subtitle: e.target.value }))}
              placeholder="Descrição curta da oferta"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* 3 Destaques */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Destaques (3 cards)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex gap-4 flex-wrap">
                <div className="w-full sm:w-48">
                  <Label>Ícone</Label>
                  <Select
                    value={form[`feature_${n}_icon`] || 'Smartphone'}
                    onValueChange={(v) => setForm((f) => ({ ...f, [`feature_${n}_icon`]: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICON_OPTS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-0">
                  <Label>Título</Label>
                  <Input
                    value={form[`feature_${n}_title`] || ''}
                    onChange={(e) => setForm((f) => ({ ...f, [`feature_${n}_title`]: e.target.value }))}
                    placeholder="Título do card"
                  />
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input
                  value={form[`feature_${n}_desc`] || ''}
                  onChange={(e) => setForm((f) => ({ ...f, [`feature_${n}_desc`]: e.target.value }))}
                  placeholder="Texto curto"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Preços e plano */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="w-5 h-5 text-green-600" />
            Preços e nome do plano
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Preço mensal (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.monthly_price ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, monthly_price: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Preço anual (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.yearly_price ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, yearly_price: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <div>
            <Label>Nome do plano</Label>
            <Input
              value={form.plan_name || ''}
              onChange={(e) => setForm((f) => ({ ...f, plan_name: e.target.value }))}
              placeholder="Ex: Plano Profissional"
            />
          </div>
          <div>
            <Label>Subtítulo do plano</Label>
            <Input
              value={form.plan_subtitle || ''}
              onChange={(e) => setForm((f) => ({ ...f, plan_subtitle: e.target.value }))}
              placeholder="Ex: Tudo que você precisa para vender mais"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de benefícios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Benefícios (lista com check)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nova benefício..."
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
            />
            <Button type="button" onClick={addFeature} variant="outline" size="icon"><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(form.features || []).map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg">
                <span className="text-sm">{f}</span>
                <button type="button" onClick={() => removeFeature(i)} className="text-gray-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5" />
            Formas de pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Tipo da chave PIX</Label>
              <Select
                value={form.pix_key_type || 'cpf'}
                onValueChange={(v) => setForm((f) => ({ ...f, pix_key_type: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Chave PIX</Label>
              <Input
                value={form.pix_key || ''}
                onChange={(e) => setForm((f) => ({ ...f, pix_key: e.target.value }))}
                placeholder="Chave PIX"
              />
            </div>
          </div>
          <div>
            <Label>Beneficiário PIX</Label>
            <Input
              value={form.pix_beneficiary || ''}
              onChange={(e) => setForm((f) => ({ ...f, pix_beneficiary: e.target.value }))}
              placeholder="Nome no PIX"
            />
          </div>
          <div>
            <Label>Link de pagamento (Mercado Pago, Stripe, etc.)</Label>
            <Input
              value={form.payment_link || ''}
              onChange={(e) => setForm((f) => ({ ...f, payment_link: e.target.value }))}
              placeholder="https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              Link do checkout (cartão, boleto, PIX). Mercado Pago: Ferramentas de vendas → Links de pagamento. Veja <code className="bg-black/5 dark:bg-white/10 px-1 rounded text-[11px]">MERCADOPAGO.md</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CTA e selos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">CTA e selos de confiança</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Título do CTA</Label>
            <Input
              value={form.cta_title || ''}
              onChange={(e) => setForm((f) => ({ ...f, cta_title: e.target.value }))}
              placeholder="Ex: Pronto para começar?"
            />
          </div>
          <div>
            <Label>Subtítulo do CTA</Label>
            <Textarea
              value={form.cta_subtitle || ''}
              onChange={(e) => setForm((f) => ({ ...f, cta_subtitle: e.target.value }))}
              placeholder="Ex: Após o pagamento, envie o comprovante..."
              rows={2}
            />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label>Selos de confiança 1</Label>
              <Input
                value={form.trust_1 || ''}
                onChange={(e) => setForm((f) => ({ ...f, trust_1: e.target.value }))}
                placeholder="Ex: Pagamento Seguro"
              />
            </div>
            <div>
              <Label>Selos de confiança 2</Label>
              <Input
                value={form.trust_2 || ''}
                onChange={(e) => setForm((f) => ({ ...f, trust_2: e.target.value }))}
                placeholder="Ex: Ativação Imediata"
              />
            </div>
            <div>
              <Label>Selos de confiança 3</Label>
              <Input
                value={form.trust_3 || ''}
                onChange={(e) => setForm((f) => ({ ...f, trust_3: e.target.value }))}
                placeholder="Ex: Suporte 24h"
              />
            </div>
          </div>
          <div>
            <Label>WhatsApp (quando não há PIX/link — só número, ex: 5586988196114)</Label>
            <Input
              value={form.whatsapp_number || ''}
              onChange={(e) => setForm((f) => ({ ...f, whatsapp_number: e.target.value }))}
              placeholder="5586988196114"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-orange-500 hover:bg-orange-600">
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}
