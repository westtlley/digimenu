import React, { useState } from 'react';
import { apiClient as base44 } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Star, Trash2, Plus, ImageIcon } from 'lucide-react';
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePermission } from '@/components/permissions/usePermission';

export default function LoyaltyTab() {
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [rewardForm, setRewardForm] = useState({
    name: '',
    description: '',
    points_cost: 0,
    reward_type: 'discount_percentage',
    reward_value: 0,
    image: '',
    is_active: true
  });

  const queryClient = useQueryClient();
  const { menuContext } = usePermission();

  // ✅ CORREÇÃO: Buscar configurações de fidelidade com contexto do slug
  const { data: loyaltyConfigs = [] } = useQuery({
    queryKey: ['loyaltyConfig', menuContext?.type, menuContext?.value],
    queryFn: async () => {
      if (!menuContext) return [];
      const opts = {};
      if (menuContext.type === 'subscriber' && menuContext.value) {
        opts.as_subscriber = menuContext.value;
      }
      return base44.entities.LoyaltyConfig.list(null, opts);
    },
    enabled: !!menuContext,
  });

  // ✅ CORREÇÃO: Buscar recompensas com contexto do slug
  const { data: rewards = [] } = useQuery({
    queryKey: ['loyaltyRewards', menuContext?.type, menuContext?.value],
    queryFn: async () => {
      if (!menuContext) return [];
      const opts = {};
      if (menuContext.type === 'subscriber' && menuContext.value) {
        opts.as_subscriber = menuContext.value;
      }
      return base44.entities.LoyaltyReward.list(null, opts);
    },
    enabled: !!menuContext,
  });

  const config = loyaltyConfigs[0] || { points_per_real: 1, min_order_value: 0, is_active: false };

  const updateConfigMutation = useMutation({
    mutationFn: (data) => {
      if (loyaltyConfigs.length > 0) {
        return base44.entities.LoyaltyConfig.update(loyaltyConfigs[0].id, data);
      }
      return base44.entities.LoyaltyConfig.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyaltyConfig'] });
      toast.success('Configurações salvas!');
    }
  });

  const createRewardMutation = useMutation({
    mutationFn: (data) => base44.entities.LoyaltyReward.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyaltyRewards'] });
      toast.success('Recompensa criada!');
      setShowRewardForm(false);
      setRewardForm({
        name: '', description: '', points_cost: 0, reward_type: 'discount_percentage',
        reward_value: 0, image: '', is_active: true
      });
    }
  });

  const updateRewardMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LoyaltyReward.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyaltyRewards'] });
      toast.success('Recompensa atualizada!');
      setShowRewardForm(false);
      setEditingReward(null);
    }
  });

  const deleteRewardMutation = useMutation({
    mutationFn: (id) => base44.entities.LoyaltyReward.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyaltyRewards'] });
      toast.success('Recompensa excluída!');
    }
  });

  const handleSaveConfig = (field, value) => {
    updateConfigMutation.mutate({ ...config, [field]: value });
  };

  const handleSaveReward = () => {
    if (editingReward) {
      updateRewardMutation.mutate({ id: editingReward.id, data: rewardForm });
    } else {
      createRewardMutation.mutate(rewardForm);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
        const url = await uploadToCloudinary(file, 'loyalty');
      setRewardForm(prev => ({ ...prev, image: url }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Sistema de Fidelidade</h1>
        <p className="text-gray-600">Configure pontos e recompensas para seus clientes</p>
      </div>

      {/* Configurações Gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-orange-500" />
            Configurações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <Label className="font-semibold">Sistema Ativo</Label>
              <p className="text-sm text-gray-600">Habilitar acúmulo de pontos</p>
            </div>
            <Switch
              checked={config.is_active}
              onCheckedChange={(checked) => handleSaveConfig('is_active', checked)}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Pontos por R$ 1,00</Label>
              <Input
                type="number"
                step="0.1"
                value={config.points_per_real}
                onChange={(e) => handleSaveConfig('points_per_real', parseFloat(e.target.value) || 1)}
                placeholder="1"
              />
            </div>

            <div>
              <Label>Valor Mínimo do Pedido</Label>
              <Input
                type="number"
                step="0.01"
                value={config.min_order_value}
                onChange={(e) => handleSaveConfig('min_order_value', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">Pedidos abaixo não acumulam pontos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recompensas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-orange-500" />
                Recompensas
              </CardTitle>
              <CardDescription>Crie recompensas que clientes podem resgatar</CardDescription>
            </div>
            <Button onClick={() => {
              setShowRewardForm(true);
              setEditingReward(null);
              setRewardForm({
                name: '', description: '', points_cost: 0, reward_type: 'discount_percentage',
                reward_value: 0, image: '', is_active: true
              });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Recompensa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rewards.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Gift className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhuma recompensa criada ainda</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {rewards.map(reward => (
                <div key={reward.id} className="border rounded-xl p-4 space-y-3">
                  {reward.image && (
                    <img src={reward.image} alt={reward.name} className="w-full h-32 object-cover rounded-lg" />
                  )}
                  <div>
                    <h3 className="font-bold">{reward.name}</h3>
                    <p className="text-sm text-gray-600">{reward.description}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-orange-500">
                      {reward.points_cost} pontos
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingReward(reward);
                          setRewardForm(reward);
                          setShowRewardForm(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Excluir recompensa?')) {
                            deleteRewardMutation.mutate(reward.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Form Modal */}
          {showRewardForm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
                <h2 className="text-xl font-bold">
                  {editingReward ? 'Editar Recompensa' : 'Nova Recompensa'}
                </h2>

                <div>
                  <Label>Nome</Label>
                  <Input
                    value={rewardForm.name}
                    onChange={(e) => setRewardForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: 10% de desconto"
                  />
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={rewardForm.description}
                    onChange={(e) => setRewardForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva a recompensa..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Custo em Pontos</Label>
                  <Input
                    type="number"
                    value={rewardForm.points_cost}
                    onChange={(e) => setRewardForm(prev => ({ ...prev, points_cost: parseInt(e.target.value) || 0 }))}
                  />
                </div>

                <div>
                  <Label>Tipo de Recompensa</Label>
                  <Select
                    value={rewardForm.reward_type}
                    onValueChange={(value) => setRewardForm(prev => ({ ...prev, reward_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discount_percentage">Desconto %</SelectItem>
                      <SelectItem value="discount_fixed">Desconto R$</SelectItem>
                      <SelectItem value="free_item">Item Grátis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rewardForm.reward_value}
                    onChange={(e) => setRewardForm(prev => ({ ...prev, reward_value: parseFloat(e.target.value) || 0 }))}
                    placeholder={rewardForm.reward_type === 'discount_percentage' ? '10' : '5.00'}
                  />
                </div>

                <div>
                  <Label>Imagem</Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full"
                  />
                  {rewardForm.image && (
                    <img src={rewardForm.image} alt="" className="mt-2 w-20 h-20 object-cover rounded" />
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRewardForm(false);
                      setEditingReward(null);
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveReward}
                    className="flex-1 bg-orange-500"
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}