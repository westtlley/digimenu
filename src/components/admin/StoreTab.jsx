import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Store, Save, Clock, DollarSign, CreditCard, Tag, Image as ImageIcon, MapPin, Instagram, Facebook, MessageSquare, AlertCircle } from 'lucide-react';
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

export default function StoreTab() {
  const [user, setUser] = React.useState(null);
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    banner_image: '',
    banners: [],
    whatsapp: '',
    address: '',
    slogan: '',
    instagram: '',
    facebook: '',
    payment_methods: [],
    delivery_fee: 0,
    min_order_value: 0,
    delivery_fee_mode: 'zone', // 'zone' ou 'distance'
    latitude: null,
    longitude: null,
    delivery_base_fee: 0,
    delivery_price_per_km: 0,
    delivery_min_fee: 0,
    delivery_max_fee: null,
    delivery_free_distance: null,
    is_open: null,
    accepting_orders: true,
    pause_message: '',
    opening_time: '08:00',
    closing_time: '18:00',
    working_days: [1, 2, 3, 4, 5],
  });
  const [newPaymentMethod, setNewPaymentMethod] = useState({ name: '', image: '' });

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.error('Error loading user:', e);
      }
    };
    loadUser();
  }, []);

  const { data: stores = [] } = useQuery({
    queryKey: ['store'],
    queryFn: () => base44.entities.Store.list(),
  });

  const store = stores[0];

  useEffect(() => {
    if (store) {
      setFormData(prev => ({
        ...prev,
        name: store.name || '',
        logo: store.logo || '',
        banner_image: store.banner_image || '',
        banners: store.banners || [],
        whatsapp: store.whatsapp || '',
        address: store.address || '',
        slogan: store.slogan || '',
        instagram: store.instagram || '',
        facebook: store.facebook || '',
        payment_methods: store.payment_methods || [],
        delivery_fee: store.delivery_fee || 0,
        min_order_value: store.min_order_value || store.min_order_price || 0,
        delivery_fee_mode: store.delivery_fee_mode || 'zone',
        latitude: store.latitude || null,
        longitude: store.longitude || null,
        delivery_base_fee: store.delivery_base_fee || 0,
        delivery_price_per_km: store.delivery_price_per_km || 0,
        delivery_min_fee: store.delivery_min_fee || 0,
        delivery_max_fee: store.delivery_max_fee || null,
        delivery_free_distance: store.delivery_free_distance || null,
        is_open: store.is_open === null || store.is_open === undefined ? null : store.is_open,
        accepting_orders: store.accepting_orders === false ? false : true,
        pause_message: store.pause_message || '',
        opening_time: store.opening_time || '08:00',
        closing_time: store.closing_time || '18:00',
        working_days: store.working_days || [1, 2, 3, 4, 5],
      }));
    }
  }, [store]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      console.log('Criando loja:', data);
      
      // Limpar dados: remover valores undefined
      const cleanData = Object.keys(data).reduce((acc, key) => {
        const value = data[key];
        if (value === undefined) return acc;
        if (Array.isArray(value)) {
          acc[key] = value.filter(item => item !== undefined && item !== null);
        } else {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      const storeData = {
        ...cleanData,
        owner_email: user?.subscriber_email || user?.email
      };
      
      console.log('Dados limpos a serem criados:', storeData);
      
      try {
        const created = await base44.entities.Store.create(storeData);
        console.log('Loja criada:', created);
        return { success: true, store: created };
      } catch (error) {
        console.error('Erro ao criar loja:', error);
        console.error('Stack:', error.stack);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store'] });
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.refetchQueries({ queryKey: ['store'] });
      toast.success('✅ Loja criada com sucesso!', {
        duration: 3000,
        position: 'top-center'
      });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error) => {
      console.error('Erro ao criar:', error);
      toast.error('❌ Erro ao criar: ' + (error?.message || 'Desconhecido'), {
        duration: 5000,
        position: 'top-center'
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ data }) => {
      console.log('💾 [StoreTab] Salvando dados da loja:', data);
      
      // Limpar dados: remover valores undefined e garantir que arrays sejam válidos
      const cleanData = Object.keys(data).reduce((acc, key) => {
        const value = data[key];
        // Ignorar undefined
        if (value === undefined) return acc;
        // Garantir que arrays sejam arrays válidos
        if (Array.isArray(value)) {
          acc[key] = value.filter(item => item !== undefined && item !== null);
        } else {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      const storeData = {
        ...cleanData,
        owner_email: user?.subscriber_email || user?.email
      };
      
      console.log('✅ [StoreTab] Dados limpos a serem salvos:', JSON.stringify(storeData, null, 2));
      
      // Sempre usar o método direto de update/create para garantir que funcione
      try {
        const stores = await base44.entities.Store.list();
        console.log('📋 [StoreTab] Lojas encontradas:', stores.length, stores);
        
        if (stores.length === 0) {
          console.log('➕ [StoreTab] Criando nova loja...');
          const created = await base44.entities.Store.create(storeData);
          console.log('✅ [StoreTab] Loja criada com sucesso:', created);
          return { success: true, store: created };
        } else {
          console.log('🔄 [StoreTab] Atualizando loja existente (ID:', stores[0].id, ')...');
          console.log('📤 [StoreTab] Enviando dados:', JSON.stringify(storeData, null, 2));
          const updated = await base44.entities.Store.update(stores[0].id, storeData);
          console.log('✅ [StoreTab] Loja atualizada com sucesso:', updated);
          return { success: true, store: updated };
        }
      } catch (error) {
        console.error('❌ [StoreTab] Erro ao salvar loja:', error);
        console.error('❌ [StoreTab] Detalhes do erro:', {
          message: error.message,
          stack: error.stack,
          response: error.response,
          data: error.data
        });
        throw error;
      }
    },
    onSuccess: (result) => {
      console.log('Sucesso ao salvar:', result);
      // Invalidar todas as queries relacionadas à loja
      queryClient.invalidateQueries({ queryKey: ['store'] });
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      // Forçar refetch imediato
      queryClient.refetchQueries({ queryKey: ['store'] });
      toast.success('✅ Configurações da loja salvas com sucesso!', {
        duration: 3000,
        position: 'top-center'
      });
      // Recarregar página após 1 segundo para garantir que tudo seja atualizado
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error) => {
      console.error('❌ Erro ao salvar loja:', error);
      console.error('❌ Erro detalhado:', {
        message: error?.message,
        stack: error?.stack,
        response: error?.response,
        data: error?.data
      });
      const errorMessage = error?.message || error?.response?.data?.message || error?.toString() || 'Erro desconhecido';
      toast.error('❌ Erro ao salvar as configurações da loja. ' + errorMessage, {
        duration: 5000,
        position: 'top-center'
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log('FormData antes de salvar:', formData);
    
    if (store) {
      updateMutation.mutate({ data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
        const url = await uploadToCloudinary(file, 'store');
        setFormData(prev => ({ ...prev, logo: url }));
      } catch (error) {
        console.error('Erro ao fazer upload:', error);
        alert('Erro ao fazer upload do logotipo');
      }
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
        const url = await uploadToCloudinary(file, 'store');
        setFormData(prev => ({ ...prev, banner_image: url }));
      } catch (error) {
        console.error('Erro ao fazer upload:', error);
        alert('Erro ao fazer upload da foto de capa');
      }
    }
  };

  const handleBannerItemUpload = async (e, index) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
        const url = await uploadToCloudinary(file, 'store');
        setFormData(prev => {
          const newBanners = [...(prev.banners || [])];
          newBanners[index] = { ...newBanners[index], image: url };
          return { ...prev, banners: newBanners };
        });
      } catch (error) {
        console.error('Erro ao fazer upload:', error);
        alert('Erro ao fazer upload do banner');
      }
    }
  };

  const addBanner = () => {
    setFormData(prev => ({
      ...prev,
      banners: [...(prev.banners || []), { image: '', title: '', subtitle: '', link: '', active: true }]
    }));
  };

  const removeBanner = (index) => {
    setFormData(prev => {
      const newBanners = [...(prev.banners || [])];
      newBanners.splice(index, 1);
      return { ...prev, banners: newBanners };
    });
  };

  const updateBanner = (index, field, value) => {
    setFormData(prev => {
      const newBanners = [...(prev.banners || [])];
      newBanners[index] = { ...newBanners[index], [field]: value };
      return { ...prev, banners: newBanners };
    });
  };

  const toggleDay = (dayValue) => {
    setFormData(prev => {
      const days = prev.working_days || [];
      if (days.includes(dayValue)) {
        return { ...prev, working_days: days.filter(d => d !== dayValue) };
      } else {
        return { ...prev, working_days: [...days, dayValue].sort() };
      }
    });
  };

  const getStoreMode = () => {
    if (formData.is_open === true) return 'open';
    if (formData.is_open === false) return 'closed';
    return 'auto';
  };

  const setStoreMode = (mode) => {
    if (mode === 'open') {
      setFormData(prev => ({ ...prev, is_open: true }));
    } else if (mode === 'closed') {
      setFormData(prev => ({ ...prev, is_open: false }));
    } else {
      setFormData(prev => ({ ...prev, is_open: null }));
    }
  };

  const storeMode = getStoreMode();

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Configurações da Loja</h1>
          <p className="text-gray-600">Gerencie as informações e funcionamento do seu restaurante</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção: Identidade da Loja */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-orange-500" />
                Identidade da Loja
              </CardTitle>
              <CardDescription>Nome, logo e informações de contato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo */}
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center mb-3 overflow-hidden border-2 border-dashed border-gray-300 hover:border-orange-400 transition-colors">
                  {formData.logo ? (
                    <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <label className="text-sm text-orange-600 cursor-pointer hover:text-orange-700 font-medium flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  Alterar Logotipo
                </label>
                <span className="text-xs text-gray-500 mt-1">Recomendado: 500x500px</span>
              </div>

              {/* Foto de Capa */}
              <div className="flex flex-col">
                <Label className="mb-2">Foto de Capa (Banner Superior)</Label>
                <div className="w-full h-48 bg-gray-100 rounded-xl flex items-center justify-center mb-3 overflow-hidden border-2 border-dashed border-gray-300 hover:border-orange-400 transition-colors">
                  {formData.banner_image ? (
                    <img src={formData.banner_image} alt="Banner" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-gray-400">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm">Nenhuma foto de capa</p>
                    </div>
                  )}
                </div>
                <label className="text-sm text-orange-600 cursor-pointer hover:text-orange-700 font-medium flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="hidden"
                  />
                  {formData.banner_image ? 'Alterar Foto de Capa' : 'Adicionar Foto de Capa'}
                </label>
                <span className="text-xs text-gray-500 mt-1">Recomendado: 1200x400px (largura x altura)</span>
              </div>

              <Separator />

              {/* Nome da Loja */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="store-name" className="flex items-center gap-2 mb-2">
                    <Store className="w-4 h-4 text-gray-500" />
                    Nome da Loja *
                  </Label>
                  <Input
                    id="store-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Restaurante Raiz"
                  />
                </div>

                <div>
                  <Label htmlFor="whatsapp" className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-gray-500" />
                    WhatsApp
                  </Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                    placeholder="5586999999999"
                  />
                  <p className="text-xs text-gray-500 mt-1">Formato: DDD + número (sem espaços)</p>
                </div>
              </div>

              <div>
                <Label htmlFor="address" className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  Endereço
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Rua, número, bairro, cidade"
                />
              </div>

              <div>
                <Label htmlFor="slogan" className="mb-2 block">Frase do Restaurante</Label>
                <Input
                  id="slogan"
                  value={formData.slogan}
                  onChange={(e) => setFormData(prev => ({ ...prev, slogan: e.target.value }))}
                  placeholder="Ex: O melhor sabor da região!"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="instagram" className="flex items-center gap-2 mb-2">
                    <Instagram className="w-4 h-4 text-gray-500" />
                    Instagram
                  </Label>
                  <Input
                    id="instagram"
                    value={formData.instagram}
                    onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                    placeholder="@seurestaurante"
                  />
                </div>

                <div>
                  <Label htmlFor="facebook" className="flex items-center gap-2 mb-2">
                    <Facebook className="w-4 h-4 text-gray-500" />
                    Facebook
                  </Label>
                  <Input
                    id="facebook"
                    value={formData.facebook}
                    onChange={(e) => setFormData(prev => ({ ...prev, facebook: e.target.value }))}
                    placeholder="Link da página"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seção: Funcionamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                Funcionamento
              </CardTitle>
              <CardDescription>Defina quando sua loja está aberta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Modo da Loja */}
              <div>
                <Label className="mb-3 block font-semibold">Modo de Funcionamento</Label>
                <div className="grid sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setStoreMode('auto')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      storeMode === 'auto'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${storeMode === 'auto' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                      <span className="font-semibold text-sm">🔵 Automático</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Baseado em horários e dias configurados
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStoreMode('open')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      storeMode === 'open'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${storeMode === 'open' ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="font-semibold text-sm">🟢 Sempre Aberta</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Ignora horários, aberto 24h
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStoreMode('closed')}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      storeMode === 'closed'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${storeMode === 'closed' ? 'bg-red-500' : 'bg-gray-300'}`} />
                      <span className="font-semibold text-sm">🔴 Fechada</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Loja fechada independente do horário
                    </p>
                  </button>
                </div>
              </div>

              {/* Horários (apenas se AUTO) */}
              {storeMode === 'auto' && (
                <>
                  <Separator />
                  <div>
                    <Label className="mb-3 block font-semibold">Horário de Funcionamento</Label>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="opening-time" className="text-sm text-gray-600 mb-2 block">Abertura</Label>
                        <Input
                          id="opening-time"
                          type="time"
                          value={formData.opening_time}
                          onChange={(e) => setFormData(prev => ({ ...prev, opening_time: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="closing-time" className="text-sm text-gray-600 mb-2 block">Fechamento</Label>
                        <Input
                          id="closing-time"
                          type="time"
                          value={formData.closing_time}
                          onChange={(e) => setFormData(prev => ({ ...prev, closing_time: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-3 block font-semibold">Dias de Funcionamento</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className={`w-14 h-12 rounded-lg border-2 font-semibold text-sm transition-all ${
                            (formData.working_days || []).includes(day.value)
                              ? 'bg-orange-500 border-orange-500 text-white'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Seção: Pausa de Pedidos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Pausa Temporária de Pedidos
              </CardTitle>
              <CardDescription>Bloqueie pedidos sem fechar a loja</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <Checkbox
                  id="pause-orders"
                  checked={formData.accepting_orders === false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, accepting_orders: !checked }))}
                />
                <div className="flex-1">
                  <Label htmlFor="pause-orders" className="font-semibold cursor-pointer">
                    Pausar Pedidos Temporariamente
                  </Label>
                  <p className="text-xs text-gray-600 mt-1">
                    A loja continua visível, mas os clientes não poderão fazer pedidos
                  </p>
                </div>
              </div>

              {formData.accepting_orders === false && (
                <div className="pl-7">
                  <Label htmlFor="pause-message" className="text-sm mb-2 block">Mensagem para clientes</Label>
                  <Input
                    id="pause-message"
                    value={formData.pause_message || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, pause_message: e.target.value }))}
                    placeholder="Ex: Voltamos em 30 minutos"
                  />
                  <p className="text-xs text-gray-500 mt-2 p-3 bg-gray-50 rounded-lg border">
                    <strong>Prévia:</strong> {formData.pause_message || 'Voltamos em breve.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seção: Pagamentos e Taxas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-500" />
                Pagamentos e Taxas
              </CardTitle>
              <CardDescription>Formas de pagamento e taxa de entrega</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Modo de Cálculo de Taxa */}
              <div>
                <Label className="mb-3 block font-semibold">Modo de Cálculo de Taxa de Entrega</Label>
                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, delivery_fee_mode: 'zone' }))}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      formData.delivery_fee_mode === 'zone'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${formData.delivery_fee_mode === 'zone' ? 'bg-orange-500' : 'bg-gray-300'}`} />
                      <span className="font-semibold text-sm">📍 Por Zona/Bairro</span>
                    </div>
                    <p className="text-xs text-gray-600">Taxa fixa por bairro (atual)</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, delivery_fee_mode: 'distance' }))}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      formData.delivery_fee_mode === 'distance'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${formData.delivery_fee_mode === 'distance' ? 'bg-orange-500' : 'bg-gray-300'}`} />
                      <span className="font-semibold text-sm">📏 Por Distância (M/KM)</span>
                    </div>
                    <p className="text-xs text-gray-600">Cálculo baseado na distância</p>
                  </button>
                </div>
              </div>

              {/* Configuração por Zona */}
              {formData.delivery_fee_mode === 'zone' && (
                <div>
                  <Label htmlFor="delivery-fee" className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    Taxa de Entrega Padrão (R$)
                  </Label>
                  <Input
                    id="delivery-fee"
                    type="number"
                    step="0.01"
                    value={formData.delivery_fee}
                    onChange={(e) => setFormData(prev => ({ ...prev, delivery_fee: parseFloat(e.target.value) || 0 }))}
                    placeholder="0,00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Taxa padrão. Configure taxas específicas por bairro na aba "Zonas de Entrega"
                  </p>
                </div>
              )}

              {/* Configuração por Distância */}
              {formData.delivery_fee_mode === 'distance' && (
                <div className="space-y-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-5 h-5 text-orange-600" />
                    <Label className="font-semibold text-orange-900">Configuração de Cálculo por Distância</Label>
                  </div>

                  {/* Localização da Loja */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="latitude" className="text-sm mb-2 block">Latitude da Loja *</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="0.000001"
                        value={formData.latitude || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) || null }))}
                        placeholder="-5.0892"
                        required={formData.delivery_fee_mode === 'distance'}
                      />
                      <p className="text-xs text-gray-500 mt-1">Use o mapa para obter as coordenadas</p>
                    </div>

                    <div>
                      <Label htmlFor="longitude" className="text-sm mb-2 block">Longitude da Loja *</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="0.000001"
                        value={formData.longitude || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) || null }))}
                        placeholder="-42.8019"
                        required={formData.delivery_fee_mode === 'distance'}
                      />
                    </div>
                  </div>

                  <Separator className="bg-orange-200" />

                  {/* Parâmetros de Cálculo */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="delivery-base-fee" className="text-sm mb-2 block">Taxa Base (R$)</Label>
                      <Input
                        id="delivery-base-fee"
                        type="number"
                        step="0.01"
                        value={formData.delivery_base_fee || 0}
                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_base_fee: parseFloat(e.target.value) || 0 }))}
                        placeholder="5,00"
                      />
                      <p className="text-xs text-gray-500 mt-1">Valor fixo inicial</p>
                    </div>

                    <div>
                      <Label htmlFor="delivery-price-per-km" className="text-sm mb-2 block">Preço por KM (R$)</Label>
                      <Input
                        id="delivery-price-per-km"
                        type="number"
                        step="0.01"
                        value={formData.delivery_price_per_km || 0}
                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_price_per_km: parseFloat(e.target.value) || 0 }))}
                        placeholder="2,50"
                      />
                      <p className="text-xs text-gray-500 mt-1">Multiplicado pela distância</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="delivery-min-fee" className="text-sm mb-2 block">Taxa Mínima (R$)</Label>
                      <Input
                        id="delivery-min-fee"
                        type="number"
                        step="0.01"
                        value={formData.delivery_min_fee || 0}
                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_min_fee: parseFloat(e.target.value) || 0 }))}
                        placeholder="5,00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="delivery-max-fee" className="text-sm mb-2 block">Taxa Máxima (R$) - Opcional</Label>
                      <Input
                        id="delivery-max-fee"
                        type="number"
                        step="0.01"
                        value={formData.delivery_max_fee || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_max_fee: e.target.value ? parseFloat(e.target.value) : null }))}
                        placeholder="20,00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="delivery-free-distance" className="text-sm mb-2 block">Entrega Grátis Até (KM) - Opcional</Label>
                      <Input
                        id="delivery-free-distance"
                        type="number"
                        step="0.1"
                        value={formData.delivery_free_distance || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, delivery_free_distance: e.target.value ? parseFloat(e.target.value) : null }))}
                        placeholder="2,0"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                    <p className="text-xs text-blue-800">
                      <strong>Fórmula:</strong> Taxa = Taxa Base + (Distância × Preço por KM)
                      <br />
                      <strong>Exemplo:</strong> Base R$ 5,00 + (3km × R$ 2,50) = R$ 12,50
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <Label htmlFor="min-order-value" className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  Pedido Mínimo (R$)
                </Label>
                <Input
                  id="min-order-value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.min_order_value || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_order_value: parseFloat(e.target.value) || 0 }))}
                  placeholder="0,00"
                />
                <p className="text-xs text-gray-500 mt-1">Valor mínimo necessário para realizar um pedido</p>
              </div>

              <Separator />

              <div>
                <Label className="mb-3 block font-semibold">Formas de Pagamento Aceitas</Label>
                
                {formData.payment_methods.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {formData.payment_methods.map((method, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                        {method.image && (
                          <img src={method.image} alt={method.name} className="h-8 object-contain" />
                        )}
                        <span className="flex-1 text-sm font-medium">{method.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            payment_methods: prev.payment_methods.filter((_, i) => i !== idx)
                          }))}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remover
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Input
                    placeholder="Nome (ex: Visa, Mastercard, PIX)"
                    value={newPaymentMethod.name}
                    onChange={(e) => setNewPaymentMethod(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="URL da imagem da bandeira"
                      value={newPaymentMethod.image}
                      onChange={(e) => setNewPaymentMethod(prev => ({ ...prev, image: e.target.value }))}
                      className="flex-1"
                    />
                    <label className="cursor-pointer">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>Upload</span>
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const { uploadToCloudinary } = await import('@/utils/cloudinaryUpload');
                              const url = await uploadToCloudinary(file, 'payment-methods');
                              setNewPaymentMethod(prev => ({ ...prev, image: url }));
                            } catch (error) {
                              console.error('Erro ao fazer upload:', error);
                              alert('Erro ao fazer upload da imagem');
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (newPaymentMethod.name) {
                        setFormData(prev => ({
                          ...prev,
                          payment_methods: [...prev.payment_methods, { ...newPaymentMethod }]
                        }));
                        setNewPaymentMethod({ name: '', image: '' });
                        toast.success('Forma de pagamento adicionada');
                      }
                    }}
                    className="w-full"
                  >
                    Adicionar Forma de Pagamento
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seção: Banners Promocionais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-orange-500" />
                Banners Promocionais
              </CardTitle>
              <CardDescription>Adicione banners promocionais que aparecerão no cardápio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(formData.banners || []).map((banner, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Banner {index + 1}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBanner(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remover
                    </Button>
                  </div>
                  
                  <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
                    {banner.image ? (
                      <img src={banner.image} alt={`Banner ${index + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center text-gray-400">
                        <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                        <p className="text-xs">Sem imagem</p>
                      </div>
                    )}
                  </div>
                  
                  <label className="text-sm text-orange-600 cursor-pointer hover:text-orange-700 font-medium flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleBannerItemUpload(e, index)}
                      className="hidden"
                    />
                    {banner.image ? 'Alterar Imagem' : 'Adicionar Imagem'}
                  </label>
                  
                  <Input
                    placeholder="Título do banner (opcional)"
                    value={banner.title || ''}
                    onChange={(e) => updateBanner(index, 'title', e.target.value)}
                  />
                  
                  <Input
                    placeholder="Subtítulo do banner (opcional)"
                    value={banner.subtitle || ''}
                    onChange={(e) => updateBanner(index, 'subtitle', e.target.value)}
                  />
                  
                  <Input
                    placeholder="Link (opcional)"
                    value={banner.link || ''}
                    onChange={(e) => updateBanner(index, 'link', e.target.value)}
                  />
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={banner.active !== false}
                      onCheckedChange={(checked) => updateBanner(index, 'active', checked)}
                    />
                    <Label>Banner ativo</Label>
                  </div>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                onClick={addBanner}
                className="w-full"
              >
                + Adicionar Banner
              </Button>
            </CardContent>
          </Card>

          {/* Botão Salvar */}
          <div className="sticky bottom-0 pt-4 pb-6 bg-gray-50 z-10">
            <Button 
              type="submit" 
              size="lg"
              className="w-full bg-orange-500 hover:bg-orange-600 shadow-lg"
              disabled={updateMutation.isPending || createMutation.isPending}
            >
              <Save className={`w-5 h-5 mr-2 ${(updateMutation.isPending || createMutation.isPending) ? 'animate-spin' : ''}`} />
              {(updateMutation.isPending || createMutation.isPending) ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}