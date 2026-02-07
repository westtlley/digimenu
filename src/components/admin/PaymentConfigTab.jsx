import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CreditCard, 
  QrCode, 
  ExternalLink, 
  Save, 
  Loader2,
  Plus,
  X,
  DollarSign
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermission } from '../permissions/usePermission';

export default function PaymentConfigTab() {
  const [config, setConfig] = useState({
    pix_key: '',
    pix_key_type: 'cpf',
    pix_beneficiary: '',
    payment_link: '',
    monthly_price: 49.90,
    yearly_price: 399.90,
    features: []
  });
  const [newFeature, setNewFeature] = useState('');

  const queryClient = useQueryClient();
  const { menuContext } = usePermission();

  // ✅ CORREÇÃO: Buscar configurações de pagamento com contexto do slug
  const { data: paymentConfigs = [], isLoading } = useQuery({
    queryKey: ['paymentConfig', menuContext?.type, menuContext?.value],
    queryFn: async () => {
      if (!menuContext) return [];
      const opts = {};
      if (menuContext.type === 'subscriber' && menuContext.value) {
        opts.as_subscriber = menuContext.value;
      }
      return base44.entities.PaymentConfig.list(null, opts);
    },
    enabled: !!menuContext,
  });

  useEffect(() => {
    if (paymentConfigs.length > 0) {
      setConfig(paymentConfigs[0]);
    }
  }, [paymentConfigs]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (paymentConfigs.length > 0) {
        return base44.entities.PaymentConfig.update(paymentConfigs[0].id, data);
      } else {
        return base44.entities.PaymentConfig.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentConfig'] });
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 z-[9999] bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl';
      toast.innerHTML = '✅ Configurações salvas!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    }
  });

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setConfig({
        ...config,
        features: [...(config.features || []), newFeature.trim()]
      });
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index) => {
    setConfig({
      ...config,
      features: config.features.filter((_, i) => i !== index)
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Configurações de Pagamento</h2>
          <p className="text-sm text-gray-500">Configure as opções de pagamento para novos assinantes</p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-orange-500 hover:bg-orange-600"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* PIX Config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <QrCode className="w-5 h-5 text-green-600" />
              Pagamento PIX
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tipo da Chave</Label>
              <Select 
                value={config.pix_key_type || 'cpf'} 
                onValueChange={(v) => setConfig({...config, pix_key_type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                placeholder="Digite sua chave PIX"
                value={config.pix_key || ''}
                onChange={(e) => setConfig({...config, pix_key: e.target.value})}
              />
            </div>

            <div>
              <Label>Nome do Beneficiário</Label>
              <Input
                placeholder="Nome que aparece no PIX"
                value={config.pix_beneficiary || ''}
                onChange={(e) => setConfig({...config, pix_beneficiary: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Link */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ExternalLink className="w-5 h-5 text-blue-600" />
              Link de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>URL do Link de Pagamento</Label>
              <Input
                placeholder="https://..."
                value={config.payment_link || ''}
                onChange={(e) => setConfig({...config, payment_link: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">
                Cole o link de pagamento do PagSeguro, Mercado Pago, Stripe, etc.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
              Preços
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Preço Mensal (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="49.90"
                value={config.monthly_price || ''}
                onChange={(e) => setConfig({...config, monthly_price: parseFloat(e.target.value) || 0})}
              />
            </div>

            <div>
              <Label>Preço Anual (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="399.90"
                value={config.yearly_price || ''}
                onChange={(e) => setConfig({...config, yearly_price: parseFloat(e.target.value) || 0})}
              />
              <p className="text-xs text-gray-500 mt-1">
                Desconto de {config.monthly_price && config.yearly_price 
                  ? Math.round((1 - (config.yearly_price / (config.monthly_price * 12))) * 100) 
                  : 0}% em relação ao mensal
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Funcionalidades Incluídas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nova funcionalidade..."
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddFeature()}
              />
              <Button onClick={handleAddFeature} size="icon" variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(config.features || []).map((feature, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg"
                >
                  <span className="text-sm">{feature}</span>
                  <button 
                    onClick={() => handleRemoveFeature(i)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(!config.features || config.features.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-4">
                  Nenhuma funcionalidade adicionada. Será usado o padrão.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}