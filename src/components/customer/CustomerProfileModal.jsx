import React, { useState, useEffect } from 'react';
import { X, User, Star, MessageSquare, History, Save, LogOut, Mail, Phone, MapPin, Award, TrendingUp, Package, CreditCard, Camera, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { apiClient as base44 } from '@/api/apiClient';
import CustomerOrdersHistory from './CustomerOrdersHistory';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function CustomerProfileModal({ isOpen, onClose, primaryColor = '#f97316' }) {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    complement: '',
    neighborhood: '',
    city: '',
    zipcode: '',
    profile_picture: ''
  });
  const [feedback, setFeedback] = useState({
    rating: 0,
    comment: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

  // Função para buscar CEP automaticamente
  const fetchCepData = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          address: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          zipcode: cleanCep
        }));
        toast.success('Endereço carregado automaticamente!');
      } else {
        toast.error('CEP não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao buscar CEP. Tente novamente.');
    } finally {
      setLoadingCep(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUserData();
    }
  }, [isOpen]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Carregar dados do cliente se existir
      const customers = await base44.entities.Customer.filter({ email: userData.email });
      if (customers.length > 0) {
        const customer = customers[0];
        setFormData({
          name: customer.name || '',
          phone: customer.phone || '',
          email: customer.email || userData.email || '',
          address: customer.address || '',
          complement: customer.complement || '',
          neighborhood: customer.neighborhood || '',
          city: customer.city || '',
          zipcode: customer.zipcode || '',
          profile_picture: customer.profile_picture || ''
        });
      } else {
        setFormData({
          name: userData.full_name || '',
          phone: '',
          email: userData.email || '',
          address: '',
          complement: '',
          neighborhood: '',
          city: '',
          zipcode: '',
          profile_picture: ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const customers = await base44.entities.Customer.filter({ email: user.email });
      
      const customerData = {
        ...formData,
        email: user.email
      };

      if (customers.length > 0) {
        await base44.entities.Customer.update(customers[0].id, customerData);
      } else {
        await base44.entities.Customer.create(customerData);
      }
      
      toast.success('Perfil salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.rating || !feedback.comment.trim()) {
      toast.error('Preencha a avaliação e o comentário');
      return;
    }

    try {
      // Tentar criar feedback, se a entidade existir
      try {
        await base44.entities.Feedback.create({
          customer_email: user.email,
          rating: feedback.rating,
          comment: feedback.comment,
          created_at: new Date().toISOString()
        });
      } catch (e) {
        // Se não existir entidade Feedback, apenas logar
        console.log('Entidade Feedback não disponível');
      }
      
      toast.success('Obrigado pelo seu feedback!');
      setFeedback({ rating: 0, comment: '' });
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      toast.error('Erro ao enviar feedback');
    }
  };

  const handleLogout = () => {
    if (confirm('Deseja realmente sair?')) {
      base44.auth.logout();
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo e tamanho
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, profile_picture: reader.result }));
      toast.success('Foto atualizada! Clique em "Salvar Alterações" para confirmar');
    };
    reader.readAsDataURL(file);
  };

  // Calcular pontos de fidelidade e estatísticas
  const { data: orders = [] } = useQuery({
    queryKey: ['customerOrders', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      try {
        return await base44.entities.Order.filter({ customer_email: user.email });
      } catch {
        return [];
      }
    },
    enabled: !!user?.email && isOpen
  });

  const loyaltyPoints = orders.length; // 1 ponto por pedido
  const totalSpent = orders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
  const completedOrders = orders.filter(o => o.status === 'completed' || o.status === 'delivered').length;

  if (!isOpen) return null;

  const tabs = [
    { id: 'profile', label: 'Meus Dados', icon: User },
    { id: 'loyalty', label: 'Fidelidade', icon: Award },
    { id: 'history', label: 'Histórico', icon: History },
    { id: 'feedback', label: 'Avaliação', icon: MessageSquare },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-gray-900 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header Aprimorado */}
          <div className="relative p-5 sm:p-6" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2.5 rounded-full hover:bg-white/20 transition-colors z-10 backdrop-blur-sm"
              title="Fechar"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-5">
                {/* Avatar com Upload */}
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center border-3 border-white/60 shadow-xl overflow-hidden">
                    {formData.profile_picture ? (
                      <img src={formData.profile_picture} alt="Foto de perfil" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-white" />
                    )}
                  </div>
                  <label 
                    htmlFor="photo-upload"
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform border-2"
                    style={{ color: primaryColor, borderColor: primaryColor }}
                    title="Alterar foto"
                  >
                    <Camera className="w-4 h-4" />
                  </label>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-white drop-shadow-lg">{formData.name || user?.full_name || 'Meu Perfil'}</h2>
                  <p className="text-white/90 text-sm flex items-center gap-2 drop-shadow mt-1">
                    <Mail className="w-4 h-4" />
                    {user?.email}
                  </p>
                </div>
              </div>
              
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto bg-gray-50 dark:bg-gray-900/50 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-2 px-4 md:px-6 py-3 font-medium transition-all border-b-2 whitespace-nowrap min-w-fit ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-gray-900'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  style={activeTab === tab.id ? { borderBottomColor: primaryColor, color: primaryColor } : {}}
                  title={tab.label}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="hidden sm:inline text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-gray-50 dark:bg-gray-950">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: primaryColor }}></div>
                  <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Dados Pessoais */}
                {activeTab === 'profile' && (
                  <div className="max-w-3xl mx-auto space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="w-5 h-5" style={{ color: primaryColor }} />
                          Informações Pessoais
                        </CardTitle>
                        <CardDescription>Mantenha seus dados atualizados para melhor atendimento</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <Label htmlFor="name" className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              Nome Completo
                            </Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Seu nome completo"
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label htmlFor="email" className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              E-mail
                            </Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              disabled
                              className="mt-1.5 bg-gray-100 dark:bg-gray-800"
                            />
                          </div>
                          <div>
                            <Label htmlFor="phone" className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              Telefone / WhatsApp
                            </Label>
                            <Input
                              id="phone"
                              value={formData.phone}
                              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                              placeholder="(00) 00000-0000"
                              maxLength={11}
                              className="mt-1.5"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="w-5 h-5" style={{ color: primaryColor }} />
                          Endereço de Entrega
                        </CardTitle>
                        <CardDescription>Facilite seus próximos pedidos salvando seu endereço</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="zipcode">CEP</Label>
                            <div className="relative mt-1.5">
                              <Input
                                id="zipcode"
                                value={formData.zipcode}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '');
                                  setFormData(prev => ({ ...prev, zipcode: value }));
                                  if (value.length === 8) {
                                    fetchCepData(value);
                                  }
                                }}
                                placeholder="00000-000"
                                maxLength={8}
                                disabled={loadingCep}
                                className="pr-10"
                              />
                              {loadingCep && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: primaryColor }}></div>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Digite o CEP e o endereço será preenchido automaticamente</p>
                          </div>
                          <div>
                            <Label htmlFor="city">Cidade</Label>
                            <Input
                              id="city"
                              value={formData.city}
                              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                              placeholder="Cidade"
                              className="mt-1.5"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label htmlFor="address">Endereço</Label>
                            <Input
                              id="address"
                              value={formData.address}
                              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                              placeholder="Rua, número"
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label htmlFor="complement">Complemento</Label>
                            <Input
                              id="complement"
                              value={formData.complement}
                              onChange={(e) => setFormData(prev => ({ ...prev, complement: e.target.value }))}
                              placeholder="Apto, bloco, etc"
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label htmlFor="neighborhood">Bairro</Label>
                            <Input
                              id="neighborhood"
                              value={formData.neighborhood}
                              onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                              placeholder="Bairro"
                              className="mt-1.5"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        onClick={handleSaveProfile} 
                        className="flex-1" 
                        disabled={saving}
                        style={{ backgroundColor: primaryColor }}
                        onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                      <Button onClick={handleLogout} variant="outline" className="sm:w-auto border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sair da Conta
                      </Button>
                    </div>
                  </div>
                )}

                {/* Fidelidade */}
                {activeTab === 'loyalty' && (
                  <div className="max-w-4xl mx-auto space-y-6">
                    {/* Card de Pontos Principal */}
                    <Card className="relative overflow-hidden">
                      <div className="absolute inset-0 opacity-90" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}></div>
                      <CardContent className="relative p-8 text-center text-white">
                        <Award className="w-20 h-20 mx-auto mb-4 drop-shadow-lg" fill="white" />
                        <h3 className="text-5xl font-bold mb-2 drop-shadow-md">{loyaltyPoints}</h3>
                        <p className="text-xl opacity-95 font-medium">Pontos de Fidelidade</p>
                        <div className="mt-6 pt-6 border-t border-white/30">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                              <Package className="w-5 h-5 mx-auto mb-1" />
                              <p className="font-semibold">{completedOrders}</p>
                              <p className="text-xs opacity-90">Pedidos Completos</p>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                              <CreditCard className="w-5 h-5 mx-auto mb-1" />
                              <p className="font-semibold">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpent)}
                              </p>
                              <p className="text-xs opacity-90">Total Gasto</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Como Funciona */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" style={{ color: primaryColor }} />
                          Como Funciona
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: `${primaryColor}15` }}>
                          <div className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: primaryColor }}>1</div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Ganhe Pontos</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">1 ponto por cada pedido realizado</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: `${primaryColor}15` }}>
                          <div className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: primaryColor }}>2</div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Acumule</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Seus pontos não expiram e crescem a cada compra</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: `${primaryColor}15` }}>
                          <div className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: primaryColor }}>3</div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Troque por Benefícios</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Descontos exclusivos e promoções especiais</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Histórico */}
                {activeTab === 'history' && (
                  <div className="max-w-5xl mx-auto">
                    {user?.email ? (
                      <>
                        {orders.length > 0 ? (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                              <Card>
                                <CardContent className="p-4 text-center">
                                  <Package className="w-8 h-8 mx-auto mb-2" style={{ color: primaryColor }} />
                                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{orders.length}</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Total de Pedidos</p>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardContent className="p-4 text-center">
                                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-500" />
                                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedOrders}</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Concluídos</p>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardContent className="p-4 text-center">
                                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpent)}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Gasto</p>
                                </CardContent>
                              </Card>
                            </div>
                            <CustomerOrdersHistory userEmail={user.email} />
                          </>
                        ) : (
                          <Card>
                            <CardContent className="p-12 text-center">
                              <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Nenhum pedido ainda</h3>
                              <p className="text-gray-600 dark:text-gray-400">Faça seu primeiro pedido e comece a acumular pontos!</p>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    ) : (
                      <Card>
                        <CardContent className="p-12 text-center">
                          <History className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-600 dark:text-gray-400">Faça login para ver seu histórico de pedidos</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Feedback */}
                {activeTab === 'feedback' && (
                  <div className="max-w-2xl mx-auto">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5" style={{ color: primaryColor }} />
                          Sua Opinião é Importante
                        </CardTitle>
                        <CardDescription>Ajude-nos a melhorar nosso atendimento e qualidade</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div>
                          <Label className="text-base font-semibold mb-3 block">Como você avalia nosso serviço?</Label>
                          <div className="flex gap-2 justify-center my-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setFeedback(prev => ({ ...prev, rating: star }))}
                                className="transition-all hover:scale-110 active:scale-95"
                              >
                                <Star
                                  className={`w-12 h-12 ${star <= feedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                                />
                              </button>
                            ))}
                          </div>
                          {feedback.rating > 0 && (
                            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                              {feedback.rating === 5 && '🌟 Excelente!'}
                              {feedback.rating === 4 && '😊 Muito bom!'}
                              {feedback.rating === 3 && '👍 Bom'}
                              {feedback.rating === 2 && '😐 Regular'}
                              {feedback.rating === 1 && '😞 Ruim'}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="comment" className="text-base font-semibold">Deixe seu comentário</Label>
                          <Textarea
                            id="comment"
                            value={feedback.comment}
                            onChange={(e) => setFeedback(prev => ({ ...prev, comment: e.target.value }))}
                            placeholder="Conte-nos sobre sua experiência: atendimento, qualidade dos produtos, tempo de entrega..."
                            rows={6}
                            className="mt-2 resize-none"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                            {feedback.comment.length}/500 caracteres
                          </p>
                        </div>
                        
                        <Button 
                          onClick={handleSubmitFeedback} 
                          className="w-full py-6 text-base font-semibold"
                          style={{ backgroundColor: primaryColor }}
                          onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                          onMouseLeave={(e) => e.target.style.opacity = '1'}
                          disabled={!feedback.rating || !feedback.comment.trim()}
                        >
                          <MessageSquare className="w-5 h-5 mr-2" />
                          Enviar Avaliação
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
