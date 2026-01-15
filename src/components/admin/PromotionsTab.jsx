import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Zap, ArrowUpRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function PromotionsTab() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'add',
    trigger_min_value: '',
    offer_dish_id: '',
    offer_price: '',
    original_price: '',
    description: '',
    is_active: true,
  });

  const queryClient = useQueryClient();

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => base44.entities.Promotion.list(),
  });

  const { data: dishes = [] } = useQuery({
    queryKey: ['dishes'],
    queryFn: () => base44.entities.Dish.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Promotion.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      closeModal();
      toast.success('Promoção criada!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Promotion.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoção atualizada!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Promotion.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoção excluída!');
    },
  });

  const closeModal = () => {
    setShowModal(false);
    setFormData({
      name: '',
      type: 'add',
      trigger_min_value: '',
      offer_dish_id: '',
      offer_price: '',
      original_price: '',
      description: '',
      is_active: true,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      trigger_min_value: parseFloat(formData.trigger_min_value) || 0,
      offer_price: parseFloat(formData.offer_price) || 0,
      original_price: parseFloat(formData.original_price) || 0,
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const safeDishes = Array.isArray(dishes) ? dishes : [];
  const getDishName = (id) => safeDishes.find(d => d.id === id)?.name || 'Prato não encontrado';

  return (
    <div className="p-4 sm:p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-bold">Promoções Upsell</h2>
          <p className="text-sm text-gray-500">Ofertas exibidas ao finalizar pedido</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4 mr-2" />
          Nova Promoção
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {promotions.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400 border-2 border-dashed rounded-xl">
            <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma promoção cadastrada</p>
          </div>
        ) : (
          promotions.map(promo => (
            <div key={promo.id} className={`bg-white rounded-xl p-4 shadow-sm border-2 ${promo.is_active ? 'border-green-200' : 'border-gray-200 opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Badge className={promo.type === 'add' ? 'bg-blue-500' : 'bg-purple-500'}>
                    {promo.type === 'add' ? <Plus className="w-3 h-3 mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                    {promo.type === 'add' ? 'Adicionar' : 'Substituir'}
                  </Badge>
                  <h3 className="font-bold mt-2">{promo.name}</h3>
                </div>
                <Switch
                  checked={promo.is_active}
                  onCheckedChange={(checked) => updateMutation.mutate({
                    id: promo.id,
                    data: { ...promo, is_active: checked }
                  })}
                />
              </div>

              <p className="text-sm text-gray-500 mb-2">{getDishName(promo.offer_dish_id)}</p>
              
              <div className="flex items-center gap-2 mb-2">
                {promo.original_price > promo.offer_price && (
                  <span className="text-sm text-gray-400 line-through">{formatCurrency(promo.original_price)}</span>
                )}
                <span className="font-bold text-green-600">{formatCurrency(promo.offer_price)}</span>
              </div>

              {promo.trigger_min_value > 0 && (
                <p className="text-xs text-gray-400">Pedido mínimo: {formatCurrency(promo.trigger_min_value)}</p>
              )}

              <div className="mt-3 pt-3 border-t flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => {
                    if (confirm('Excluir esta promoção?')) {
                      deleteMutation.mutate(promo.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Nova Promoção Upsell</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome da Promoção</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Adicione uma sobremesa!"
                required
              />
            </div>

            <div>
              <Label>Tipo</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Adicionar ao pedido</SelectItem>
                  <SelectItem value="replace">Substituir item</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Prato Oferecido</Label>
              <Select value={formData.offer_dish_id} onValueChange={(value) => {
                const dish = safeDishes.find(d => d.id === value);
                setFormData(prev => ({ 
                  ...prev, 
                  offer_dish_id: value,
                  original_price: dish?.price?.toString() || ''
                }));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um prato" />
                </SelectTrigger>
                <SelectContent>
                  {(Array.isArray(dishes) ? dishes : []).filter(d => d.is_active !== false).map(dish => (
                    <SelectItem key={dish.id} value={dish.id}>{dish.name} - {formatCurrency(dish.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Preço Original</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.original_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, original_price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Preço Promocional</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.offer_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, offer_price: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Pedido Mínimo (opcional)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.trigger_min_value}
                onChange={(e) => setFormData(prev => ({ ...prev, trigger_min_value: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição opcional..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600">
                Criar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}