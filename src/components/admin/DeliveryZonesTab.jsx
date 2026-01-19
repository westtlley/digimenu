import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, MapPin } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';

export default function DeliveryZonesTab() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ neighborhood: '', fee: '', is_active: true });

  const [deliveryConfig, setDeliveryConfig] = useState({
    delivery_fee_mode: 'zone',
    delivery_fee: 0,
    min_order_value: 0,
    latitude: null, longitude: null,
    delivery_base_fee: 0, delivery_price_per_km: 0,
    delivery_min_fee: 0, delivery_max_fee: null, delivery_free_distance: null,
  });

  const queryClient = useQueryClient();

  const { data: stores = [] } = useQuery({ queryKey: ['store'], queryFn: () => base44.entities.Store.list() });
  const store = stores[0];

  useEffect(() => {
    if (store) {
      setDeliveryConfig({
        delivery_fee_mode: store.delivery_fee_mode || 'zone',
        delivery_fee: store.delivery_fee || 0,
        min_order_value: store.min_order_value || store.min_order_price || 0,
        latitude: store.latitude || null, longitude: store.longitude || null,
        delivery_base_fee: store.delivery_base_fee || 0, delivery_price_per_km: store.delivery_price_per_km || 0,
        delivery_min_fee: store.delivery_min_fee || 0, delivery_max_fee: store.delivery_max_fee ?? null, delivery_free_distance: store.delivery_free_distance ?? null,
      });
    }
  }, [store]);

  const updateStoreMutation = useMutation({
    mutationFn: ({ data }) => base44.entities.Store.update(store.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store'] });
      toast.success('Configuração de entrega salva');
    },
    onError: (e) => toast.error(e?.message || 'Erro ao salvar'),
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['deliveryZones'],
    queryFn: () => base44.entities.DeliveryZone.list('neighborhood'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DeliveryZone.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryZones'] });
      closeModal();
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 z-[9999] bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl';
      toast.innerHTML = '✅ Zona criada!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DeliveryZone.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryZones'] });
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 z-[9999] bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm';
      toast.innerHTML = '✅ Salvo!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DeliveryZone.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deliveryZones'] }),
  });

  const closeModal = () => {
    setShowModal(false);
    setFormData({ neighborhood: '', fee: '', is_active: true });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({ ...formData, fee: parseFloat(formData.fee) || 0 });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Configuração de entrega (taxa, pedido mínimo, modo zona/distância) */}
      {store && (
        <Card>
          <CardHeader>
            <CardTitle>Configuração de entrega</CardTitle>
            <CardDescription>Modo de cálculo, taxa padrão e pedido mínimo. Taxas por bairro abaixo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">Modo de cálculo</Label>
              <div className="flex gap-2">
                <Button type="button" variant={deliveryConfig.delivery_fee_mode === 'zone' ? 'default' : 'outline'} size="sm" onClick={() => setDeliveryConfig(c=>({...c, delivery_fee_mode: 'zone'}))}>Por zona/bairro</Button>
                <Button type="button" variant={deliveryConfig.delivery_fee_mode === 'distance' ? 'default' : 'outline'} size="sm" onClick={() => setDeliveryConfig(c=>({...c, delivery_fee_mode: 'distance'}))}>Por distância (km)</Button>
              </div>
            </div>
            {deliveryConfig.delivery_fee_mode === 'zone' && (
              <div>
                <Label>Taxa padrão (R$)</Label>
                <Input type="number" step="0.01" value={deliveryConfig.delivery_fee} onChange={e=>setDeliveryConfig(c=>({...c, delivery_fee: parseFloat(e.target.value)||0}))} />
              </div>
            )}
            {deliveryConfig.delivery_fee_mode === 'distance' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Latitude</Label><Input type="number" step="0.000001" value={deliveryConfig.latitude||''} onChange={e=>setDeliveryConfig(c=>({...c, latitude: e.target.value?parseFloat(e.target.value):null}))} placeholder="-5.08" /></div>
                  <div><Label>Longitude</Label><Input type="number" step="0.000001" value={deliveryConfig.longitude||''} onChange={e=>setDeliveryConfig(c=>({...c, longitude: e.target.value?parseFloat(e.target.value):null}))} placeholder="-42.80" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Taxa base (R$)</Label><Input type="number" step="0.01" value={deliveryConfig.delivery_base_fee} onChange={e=>setDeliveryConfig(c=>({...c, delivery_base_fee: parseFloat(e.target.value)||0}))} /></div>
                  <div><Label>R$ por km</Label><Input type="number" step="0.01" value={deliveryConfig.delivery_price_per_km} onChange={e=>setDeliveryConfig(c=>({...c, delivery_price_per_km: parseFloat(e.target.value)||0}))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>Taxa mín (R$)</Label><Input type="number" step="0.01" value={deliveryConfig.delivery_min_fee} onChange={e=>setDeliveryConfig(c=>({...c, delivery_min_fee: parseFloat(e.target.value)||0}))} /></div>
                  <div><Label>Taxa máx (R$)</Label><Input type="number" step="0.01" value={deliveryConfig.delivery_max_fee??''} onChange={e=>setDeliveryConfig(c=>({...c, delivery_max_fee: e.target.value?parseFloat(e.target.value):null}))} /></div>
                  <div><Label>Grátis até (km)</Label><Input type="number" step="0.1" value={deliveryConfig.delivery_free_distance??''} onChange={e=>setDeliveryConfig(c=>({...c, delivery_free_distance: e.target.value?parseFloat(e.target.value):null}))} /></div>
                </div>
              </>
            )}
            <div>
              <Label>Pedido mínimo (R$)</Label>
              <Input type="number" step="0.01" value={deliveryConfig.min_order_value} onChange={e=>setDeliveryConfig(c=>({...c, min_order_value: parseFloat(e.target.value)||0}))} />
            </div>
            <Button onClick={()=> updateStoreMutation.mutate({data: deliveryConfig})} disabled={updateStoreMutation.isPending}>Salvar configuração</Button>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold">Zonas de Entrega</h2>
          <p className="text-sm text-gray-500">Taxas por bairro</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4 mr-2" />
          Nova Zona
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {zones.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={MapPin}
              title="Defina as zonas de entrega para calcular taxas corretamente"
              description="Configure taxas por bairro para cobrar valores justos e transparentes"
              actionLabel="Criar zona de entrega"
              onAction={() => setShowModal(true)}
            />
          </div>
        ) : (
          zones.map(zone => (
            <div key={zone.id} className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={zone.neighborhood}
                      onChange={(e) => updateMutation.mutate({
                        id: zone.id,
                        data: { ...zone, neighborhood: e.target.value }
                      })}
                      className="font-semibold text-base bg-transparent border-b border-transparent hover:border-gray-300 focus:border-orange-500 focus:outline-none w-full"
                    />
                  </div>
                </div>
                <Switch
                  checked={zone.is_active}
                  onCheckedChange={(checked) => updateMutation.mutate({
                    id: zone.id,
                    data: { ...zone, is_active: checked }
                  })}
                />
              </div>

              <div className="mb-3">
                <Label className="text-xs text-gray-500">Taxa de Entrega</Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={zone.fee}
                    onChange={(e) => updateMutation.mutate({
                      id: zone.id,
                      data: { ...zone, fee: parseFloat(e.target.value) || 0 }
                    })}
                    className="flex-1 px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-lg font-bold text-green-600">{formatCurrency(zone.fee)}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-500 hover:text-red-700"
                  onClick={() => deleteMutation.mutate(zone.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Nova Zona de Entrega
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome do Bairro</Label>
              <Input
                value={formData.neighborhood}
                onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                placeholder="Ex: Centro, Jardins..."
                required
              />
            </div>

            <div>
              <Label>Taxa de Entrega (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.fee}
                onChange={(e) => setFormData(prev => ({ ...prev, fee: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <Label>Zona ativa</Label>
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
                Criar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}