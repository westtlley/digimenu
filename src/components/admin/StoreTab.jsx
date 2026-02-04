import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Store, Save, Clock, Image as ImageIcon, MapPin, Instagram, Facebook, MessageSquare, AlertCircle, HelpCircle, Link2, Copy, CheckCircle2, XCircle, TrendingUp, Music2, Sparkles, ShoppingCart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePermission } from '../permissions/usePermission';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import toast from 'react-hot-toast';
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import MasterSlugSettings from './MasterSlugSettings';

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
  const { subscriberData, isMaster, refresh } = usePermission();
  const [user, setUser] = React.useState(null);
  const [slugEdit, setSlugEdit] = useState('');
  const [formData, setFormData] = useState({
    name: '', logo: '', whatsapp: '', address: '', slogan: '', instagram: '', facebook: '', tiktok: '',
    is_open: null, accepting_orders: true, pause_message: '',
    opening_time: '08:00', closing_time: '18:00', working_days: [1, 2, 3, 4, 5],
    cross_sell_config: {
      enabled: true,
      beverage_offer: {
        enabled: true,
        trigger_product_types: ['pizza'],
        min_cart_value: 0,
        dish_id: null,
        title: '🥤 Que tal uma bebida?',
        message: 'Pizza sem bebida? Adicione {product_name} por apenas {product_price}',
        discount_percent: 0
      },
      dessert_offer: {
        enabled: true,
        min_cart_value: 40,
        dish_id: null,
        title: '🍰 Que tal uma sobremesa?',
        message: 'Complete seu pedido com {product_name} por apenas {product_price}',
        discount_percent: 0
      },
      combo_offer: {
        enabled: true,
        min_pizzas: 2,
        dish_id: null,
        title: '🔥 Oferta Especial!',
        message: 'Compre {min_pizzas} pizzas e ganhe {product_name} GRÁTIS!',
        discount_percent: 100
      }
    }
  });

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

  useEffect(() => {
    if (subscriberData?.slug != null) setSlugEdit(subscriberData.slug);
  }, [subscriberData?.slug]);

  const slugSaveMutation = useMutation({
    mutationFn: async (val) => {
      const s = String(val || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await base44.put(`/subscribers/${subscriberData.id}`, { slug: s || null });
    },
    onSuccess: () => {
      refresh();
      toast.success('Link do cardápio atualizado.');
    },
    onError: (e) => toast.error(e?.message || 'Erro ao salvar link'),
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['store'],
    queryFn: () => base44.entities.Store.list(),
  });

  const { data: dishes = [] } = useQuery({
    queryKey: ['dishesForCrossSell'],
    queryFn: () => base44.entities.Dish.list(),
  });

  const store = stores[0];
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  useEffect(() => {
    if (store) {
      setFormData(prev => ({
        ...prev,
        name: store.name || '',
        logo: store.logo || '',
        whatsapp: store.whatsapp || '',
        address: store.address || '',
        slogan: store.slogan || '',
        instagram: store.instagram || '',
        facebook: store.facebook || '',
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
        toast.success('Logo atualizada! Ela será exibida no cardápio digital.');
      } catch (error) {
        console.error('Erro ao fazer upload:', error);
        toast.error('Erro ao fazer upload do logotipo');
      }
    }
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

  // Estatísticas e validações
  const storeStatus = useMemo(() => {
    const hasLogo = !!formData.logo;
    const hasName = !!formData.name?.trim();
    const hasWhatsApp = !!formData.whatsapp?.trim();
    const hasAddress = !!formData.address?.trim();
    const isConfigured = hasLogo && hasName && hasWhatsApp;
    const workingDaysCount = (formData.working_days || []).length;
    const isOpen = storeMode === 'open' || (storeMode === 'auto' && workingDaysCount > 0);

    return {
      hasLogo,
      hasName,
      hasWhatsApp,
      hasAddress,
      isConfigured,
      workingDaysCount,
      isOpen
    };
  }, [formData, storeMode]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Configurações da Loja</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerencie as informações e funcionamento do seu restaurante</p>
        </div>

        {/* Configuração de Slug do Master */}
        {isMaster && user && (
          <div className="mb-6">
            <MasterSlugSettings user={user} />
          </div>
        )}

        {/* Status da Configuração */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className={storeStatus.hasLogo ? 'border-green-200' : 'border-gray-200'}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Logo</p>
                  <p className="text-lg font-bold">{storeStatus.hasLogo ? '✓' : '✗'}</p>
                </div>
                {storeStatus.hasLogo ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-gray-400" />
                )}
              </div>
            </CardContent>
          </Card>
          <Card className={storeStatus.hasName ? 'border-green-200' : 'border-gray-200'}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Nome</p>
                  <p className="text-lg font-bold">{storeStatus.hasName ? '✓' : '✗'}</p>
                </div>
                {storeStatus.hasName ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-gray-400" />
                )}
              </div>
            </CardContent>
          </Card>
          <Card className={storeStatus.hasWhatsApp ? 'border-green-200' : 'border-gray-200'}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">WhatsApp</p>
                  <p className="text-lg font-bold">{storeStatus.hasWhatsApp ? '✓' : '✗'}</p>
                </div>
                {storeStatus.hasWhatsApp ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-gray-400" />
                )}
              </div>
            </CardContent>
          </Card>
          <Card className={storeStatus.isOpen ? 'border-green-200' : 'border-red-200'}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                  <p className="text-lg font-bold">{storeStatus.isOpen ? 'Aberta' : 'Fechada'}</p>
                </div>
                {storeStatus.isOpen ? (
                  <TrendingUp className="w-6 h-6 text-green-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500" />
                )}
              </div>
            </CardContent>
          </Card>
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
                <p className="text-xs text-gray-500 mt-1">Esta logo será exibida no cardápio digital</p>
              </div>

              <Separator />

              {/* Nome da Loja */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="store-name" className="flex items-center gap-2 mb-2">
                    <Store className="w-4 h-4 text-gray-500" />
                    Nome da Loja *
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">Nome que aparecerá no cardápio digital e nos pedidos dos clientes</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="store-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Restaurante Raiz"
                    required
                    className={!formData.name?.trim() ? 'border-red-300' : ''}
                  />
                  {!formData.name?.trim() && (
                    <p className="text-xs text-red-500 mt-1">Nome da loja é obrigatório</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="whatsapp" className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-gray-500" />
                    WhatsApp
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">Número usado para receber pedidos via WhatsApp. Formato: DDD + número completo</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setFormData(prev => ({ ...prev, whatsapp: value }));
                    }}
                    placeholder="5586999999999"
                    maxLength={15}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Formato: DDD + número (apenas números)
                    {formData.whatsapp && formData.whatsapp.length < 10 && (
                      <span className="text-red-500 ml-2">Número muito curto</span>
                    )}
                  </p>
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
                <Label htmlFor="slogan" className="mb-2 flex items-center gap-2">
                  Frase do Restaurante
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">Slogan ou frase que aparece no topo do cardápio digital para atrair clientes</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="slogan"
                  value={formData.slogan}
                  onChange={(e) => setFormData(prev => ({ ...prev, slogan: e.target.value }))}
                  placeholder="Ex: O melhor sabor da região!"
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
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

                <div>
                  <Label htmlFor="tiktok" className="flex items-center gap-2 mb-2">
                    <Music2 className="w-4 h-4 text-gray-500" />
                    TikTok
                  </Label>
                  <Input
                    id="tiktok"
                    value={formData.tiktok}
                    onChange={(e) => setFormData(prev => ({ ...prev, tiktok: e.target.value }))}
                    placeholder="@seurestaurante"
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

          {/* 🎯 Configuração de Cross-sell (Ofertas Inteligentes) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                Ofertas Inteligentes (Cross-sell)
              </CardTitle>
              <CardDescription>
                Configure ofertas automáticas que aparecem quando o cliente adiciona itens ao carrinho
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Ativar/Desativar Cross-sell */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <Switch
                  checked={formData.cross_sell_config?.enabled !== false}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    cross_sell_config: {
                      ...prev.cross_sell_config,
                      enabled: checked
                    }
                  }))}
                />
                <div className="flex-1">
                  <Label className="font-semibold cursor-pointer">
                    Ativar Ofertas Inteligentes
                  </Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Sugerir produtos complementares automaticamente para aumentar o ticket médio
                  </p>
                </div>
              </div>

              {formData.cross_sell_config?.enabled !== false && (
                <div className="space-y-6">
                  {/* Oferta de Bebida */}
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🥤</span>
                        <Label className="text-base font-semibold">Oferta de Bebida</Label>
                      </div>
                      <Switch
                        checked={formData.cross_sell_config?.beverage_offer?.enabled !== false}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          cross_sell_config: {
                            ...prev.cross_sell_config,
                            beverage_offer: {
                              ...prev.cross_sell_config.beverage_offer,
                              enabled: checked
                            }
                          }
                        }))}
                      />
                    </div>

                    {formData.cross_sell_config?.beverage_offer?.enabled !== false && (
                      <div className="space-y-4 pl-8 border-l-2 border-blue-200 dark:border-blue-800">
                        <div>
                          <Label>Produto a Sugerir</Label>
                          <Select
                            value={formData.cross_sell_config?.beverage_offer?.dish_id || ''}
                            onValueChange={(value) => setFormData(prev => ({
                              ...prev,
                              cross_sell_config: {
                                ...prev.cross_sell_config,
                                beverage_offer: {
                                  ...prev.cross_sell_config.beverage_offer,
                                  dish_id: value || null
                                }
                              }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma bebida" />
                            </SelectTrigger>
                            <SelectContent>
                              {dishes.filter(d => 
                                d.product_type === 'beverage' || 
                                d.category?.toLowerCase().includes('bebida') ||
                                d.name?.toLowerCase().match(/(coca|pepsi|refrigerante|suco|água|bebida)/i)
                              ).map(dish => (
                                <SelectItem key={dish.id} value={dish.id}>
                                  {dish.name} - {formatCurrency(dish.price || 0)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500 mt-1">
                            Quando o cliente adicionar pizza, esta bebida será sugerida
                          </p>
                        </div>

                        <div>
                          <Label>Título da Oferta</Label>
                          <Input
                            value={formData.cross_sell_config?.beverage_offer?.title || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              cross_sell_config: {
                                ...prev.cross_sell_config,
                                beverage_offer: {
                                  ...prev.cross_sell_config.beverage_offer,
                                  title: e.target.value
                                }
                              }
                            }))}
                            placeholder="Ex: 🥤 Que tal uma bebida?"
                          />
                        </div>

                        <div>
                          <Label>Mensagem</Label>
                          <Textarea
                            value={formData.cross_sell_config?.beverage_offer?.message || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              cross_sell_config: {
                                ...prev.cross_sell_config,
                                beverage_offer: {
                                  ...prev.cross_sell_config.beverage_offer,
                                  message: e.target.value
                                }
                              }
                            }))}
                            placeholder="Use {product_name} e {product_price} para valores dinâmicos"
                            rows={2}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Variáveis disponíveis: {'{product_name}'}, {'{product_price}'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Desconto (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={formData.cross_sell_config?.beverage_offer?.discount_percent || 0}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                cross_sell_config: {
                                  ...prev.cross_sell_config,
                                  beverage_offer: {
                                    ...prev.cross_sell_config.beverage_offer,
                                    discount_percent: parseInt(e.target.value) || 0
                                  }
                                }
                              }))}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Oferta de Sobremesa */}
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🍰</span>
                        <Label className="text-base font-semibold">Oferta de Sobremesa</Label>
                      </div>
                      <Switch
                        checked={formData.cross_sell_config?.dessert_offer?.enabled !== false}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          cross_sell_config: {
                            ...prev.cross_sell_config,
                            dessert_offer: {
                              ...prev.cross_sell_config.dessert_offer,
                              enabled: checked
                            }
                          }
                        }))}
                      />
                    </div>

                    {formData.cross_sell_config?.dessert_offer?.enabled !== false && (
                      <div className="space-y-4 pl-8 border-l-2 border-purple-200 dark:border-purple-800">
                        <div>
                          <Label>Produto a Sugerir</Label>
                          <Select
                            value={formData.cross_sell_config?.dessert_offer?.dish_id || ''}
                            onValueChange={(value) => setFormData(prev => ({
                              ...prev,
                              cross_sell_config: {
                                ...prev.cross_sell_config,
                                dessert_offer: {
                                  ...prev.cross_sell_config.dessert_offer,
                                  dish_id: value || null
                                }
                              }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma sobremesa" />
                            </SelectTrigger>
                            <SelectContent>
                              {dishes.filter(d => 
                                d.category?.toLowerCase().includes('sobremesa') ||
                                d.tags?.includes('dessert') ||
                                d.name?.toLowerCase().match(/(pudim|brigadeiro|sorvete|açaí|sobremesa)/i)
                              ).map(dish => (
                                <SelectItem key={dish.id} value={dish.id}>
                                  {dish.name} - {formatCurrency(dish.price || 0)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Valor Mínimo do Carrinho (R$)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={formData.cross_sell_config?.dessert_offer?.min_cart_value || 40}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                cross_sell_config: {
                                  ...prev.cross_sell_config,
                                  dessert_offer: {
                                    ...prev.cross_sell_config.dessert_offer,
                                    min_cart_value: parseFloat(e.target.value) || 0
                                  }
                                }
                              }))}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Oferta aparece quando carrinho ≥ este valor
                            </p>
                          </div>
                          <div>
                            <Label>Desconto (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={formData.cross_sell_config?.dessert_offer?.discount_percent || 0}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                cross_sell_config: {
                                  ...prev.cross_sell_config,
                                  dessert_offer: {
                                    ...prev.cross_sell_config.dessert_offer,
                                    discount_percent: parseInt(e.target.value) || 0
                                  }
                                }
                              }))}
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Título da Oferta</Label>
                          <Input
                            value={formData.cross_sell_config?.dessert_offer?.title || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              cross_sell_config: {
                                ...prev.cross_sell_config,
                                dessert_offer: {
                                  ...prev.cross_sell_config.dessert_offer,
                                  title: e.target.value
                                }
                              }
                            }))}
                            placeholder="Ex: 🍰 Que tal uma sobremesa?"
                          />
                        </div>

                        <div>
                          <Label>Mensagem</Label>
                          <Textarea
                            value={formData.cross_sell_config?.dessert_offer?.message || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              cross_sell_config: {
                                ...prev.cross_sell_config,
                                dessert_offer: {
                                  ...prev.cross_sell_config.dessert_offer,
                                  message: e.target.value
                                }
                              }
                            }))}
                            placeholder="Use {product_name} e {product_price} para valores dinâmicos"
                            rows={2}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Oferta de Combo */}
                  <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🔥</span>
                        <Label className="text-base font-semibold">Oferta de Combo Especial</Label>
                      </div>
                      <Switch
                        checked={formData.cross_sell_config?.combo_offer?.enabled !== false}
                        onCheckedChange={(checked) => setFormData(prev => ({
                          ...prev,
                          cross_sell_config: {
                            ...prev.cross_sell_config,
                            combo_offer: {
                              ...prev.cross_sell_config.combo_offer,
                              enabled: checked
                            }
                          }
                        }))}
                      />
                    </div>

                    {formData.cross_sell_config?.combo_offer?.enabled !== false && (
                      <div className="space-y-4 pl-8 border-l-2 border-orange-200 dark:border-orange-800">
                        <div>
                          <Label>Produto Grátis</Label>
                          <Select
                            value={formData.cross_sell_config?.combo_offer?.dish_id || ''}
                            onValueChange={(value) => setFormData(prev => ({
                              ...prev,
                              cross_sell_config: {
                                ...prev.cross_sell_config,
                                combo_offer: {
                                  ...prev.cross_sell_config.combo_offer,
                                  dish_id: value || null
                                }
                              }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o produto grátis" />
                            </SelectTrigger>
                            <SelectContent>
                              {dishes.filter(d => d.is_active !== false).map(dish => (
                                <SelectItem key={dish.id} value={dish.id}>
                                  {dish.name} - {formatCurrency(dish.price || 0)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500 mt-1">
                            Produto que será oferecido grátis no combo
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Mínimo de Pizzas</Label>
                            <Input
                              type="number"
                              min="1"
                              value={formData.cross_sell_config?.combo_offer?.min_pizzas || 2}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                cross_sell_config: {
                                  ...prev.cross_sell_config,
                                  combo_offer: {
                                    ...prev.cross_sell_config.combo_offer,
                                    min_pizzas: parseInt(e.target.value) || 2
                                  }
                                }
                              }))}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Oferta aparece quando cliente tem esta quantidade de pizzas
                            </p>
                          </div>
                        </div>

                        <div>
                          <Label>Título da Oferta</Label>
                          <Input
                            value={formData.cross_sell_config?.combo_offer?.title || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              cross_sell_config: {
                                ...prev.cross_sell_config,
                                combo_offer: {
                                  ...prev.cross_sell_config.combo_offer,
                                  title: e.target.value
                                }
                              }
                            }))}
                            placeholder="Ex: 🔥 Oferta Especial!"
                          />
                        </div>

                        <div>
                          <Label>Mensagem</Label>
                          <Textarea
                            value={formData.cross_sell_config?.combo_offer?.message || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              cross_sell_config: {
                                ...prev.cross_sell_config,
                                combo_offer: {
                                  ...prev.cross_sell_config.combo_offer,
                                  message: e.target.value
                                }
                              }
                            }))}
                            placeholder="Use {product_name}, {min_pizzas} para valores dinâmicos"
                            rows={2}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Variáveis: {'{product_name}'}, {'{min_pizzas}'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Link do cardápio — cada assinante tem seu link /s/:slug - ÚLTIMA OPÇÃO */}
          {!isMaster && subscriberData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  Link do seu cardápio
                </CardTitle>
                <CardDescription>
                  Este é o link que seus clientes usam para ver o cardápio. Compartilhe no WhatsApp, redes sociais, etc.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Seu link</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      readOnly
                      value={typeof window !== 'undefined' ? `${window.location.origin}/s/${subscriberData?.slug || '...'}` : ''}
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const url = `${window.location.origin}/s/${subscriberData?.slug || ''}`;
                        if (url && navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast.success('Link copiado!'));
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Personalize o final do link (ex: meu-restaurante)</Label>
                  <p className="text-xs text-gray-500 mb-1">Apenas letras minúsculas, números e hífen. Deixe em branco para remover.</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="ex: meu-restaurante"
                      value={slugEdit}
                      onChange={(e) => setSlugEdit(e.target.value)}
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      onClick={() => slugSaveMutation.mutate(slugEdit)}
                      disabled={slugSaveMutation.isPending}
                    >
                      {slugSaveMutation.isPending ? 'Salvando…' : 'Salvar'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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