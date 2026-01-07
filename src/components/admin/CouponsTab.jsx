import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Ticket, Percent, DollarSign, Calendar, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function CouponsTab() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    min_order_value: '',
    max_uses: '',
    is_active: true,
    expires_at: '',
  });

  const queryClient = useQueryClient();

  const { data: coupons = [] } = useQuery({
    queryKey: ['coupons'],
    queryFn: () => base44.entities.Coupon.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Coupon.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      closeModal();
      toast.success('Cupom criado com sucesso!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Coupon.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coupons'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Coupon.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Cupom excluído!');
    },
  });

  const closeModal = () => {
    setShowModal(false);
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_value: '',
      max_uses: '',
      is_active: true,
      expires_at: '',
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      code: formData.code.toUpperCase(),
      discount_value: parseFloat(formData.discount_value) || 0,
      min_order_value: parseFloat(formData.min_order_value) || 0,
      max_uses: parseInt(formData.max_uses) || 0,
      current_uses: 0,
    });
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code }));
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const isExpired = (date) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold">Cupons de Desconto</h2>
          <p className="text-sm text-gray-500">{coupons.length} cupons cadastrados</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4 mr-2" />
          Novo Cupom
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400 border-2 border-dashed rounded-xl">
            <Ticket className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum cupom cadastrado ainda</p>
          </div>
        ) : (
          coupons.map(coupon => {
            const expired = isExpired(coupon.expires_at);
            const maxReached = coupon.max_uses > 0 && coupon.current_uses >= coupon.max_uses;
            const isValid = coupon.is_active && !expired && !maxReached;

            return (
              <div 
                key={coupon.id} 
                className={`bg-white rounded-xl p-4 shadow-sm border-2 ${
                  isValid ? 'border-green-200' : 'border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      coupon.discount_type === 'percentage' ? 'bg-purple-100' : 'bg-green-100'
                    }`}>
                      {coupon.discount_type === 'percentage' ? (
                        <Percent className="w-5 h-5 text-purple-600" />
                      ) : (
                        <DollarSign className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <button 
                        onClick={() => copyCode(coupon.code)}
                        className="font-mono font-bold text-lg hover:text-orange-500 flex items-center gap-1"
                      >
                        {coupon.code}
                        <Copy className="w-3 h-3" />
                      </button>
                      <p className="text-sm text-gray-500">
                        {coupon.discount_type === 'percentage' 
                          ? `${coupon.discount_value}% de desconto`
                          : `${formatCurrency(coupon.discount_value)} de desconto`
                        }
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={coupon.is_active}
                    onCheckedChange={(checked) => updateMutation.mutate({
                      id: coupon.id,
                      data: { ...coupon, is_active: checked }
                    })}
                  />
                </div>

                <div className="space-y-2 text-sm">
                  {coupon.min_order_value > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Pedido mínimo:</span>
                      <span>{formatCurrency(coupon.min_order_value)}</span>
                    </div>
                  )}
                  {coupon.max_uses > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Usos:</span>
                      <span>{coupon.current_uses || 0} / {coupon.max_uses}</span>
                    </div>
                  )}
                  {coupon.expires_at && (
                    <div className="flex justify-between text-gray-500">
                      <span>Expira em:</span>
                      <span className={expired ? 'text-red-500' : ''}>
                        {format(new Date(coupon.expires_at), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <div className="flex gap-1">
                    {!isValid && (
                      <Badge variant="outline" className="text-xs text-red-500 border-red-200">
                        {expired ? 'Expirado' : maxReached ? 'Esgotado' : 'Inativo'}
                      </Badge>
                    )}
                    {isValid && (
                      <Badge className="bg-green-100 text-green-700 text-xs">Ativo</Badge>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                    onClick={() => {
                      if (confirm('Excluir este cupom?')) {
                        deleteMutation.mutate(coupon.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Criar Cupom */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" /> Criar Cupom
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Código do Cupom</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="Ex: DESCONTO10"
                  className="font-mono uppercase"
                  required
                />
                <Button type="button" variant="outline" onClick={generateCode}>
                  Gerar
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de Desconto</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, discount_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor do Desconto</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.discount_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                  placeholder={formData.discount_type === 'percentage' ? '10' : '5.00'}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Pedido Mínimo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.min_order_value}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_order_value: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Limite de Usos</Label>
                <Input
                  type="number"
                  value={formData.max_uses}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_uses: e.target.value }))}
                  placeholder="Ilimitado"
                />
              </div>
            </div>

            <div>
              <Label>Data de Expiração</Label>
              <Input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <Label>Ativar cupom</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600">
                Criar Cupom
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}