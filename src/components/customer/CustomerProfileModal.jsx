import React, { useState, useEffect } from 'react';
import { X, User, Star, MessageSquare, History, Save, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiClient as base44 } from '@/api/apiClient';
import CustomerOrdersHistory from './CustomerOrdersHistory';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function CustomerProfileModal({ isOpen, onClose }) {
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
    zipcode: ''
  });
  const [feedback, setFeedback] = useState({
    rating: 0,
    comment: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadUserData();
    }
  }, [isOpen]);

  const loadUserData = async () => {
    try {
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
          zipcode: customer.zipcode || ''
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
          zipcode: ''
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
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.rating || !feedback.comment) {
      toast.error('Preencha todos os campos do feedback');
      return;
    }

    try {
      await base44.entities.Feedback.create({
        customer_email: user.email,
        rating: feedback.rating,
        comment: feedback.comment,
        created_at: new Date().toISOString()
      });
      
      toast.success('Feedback enviado com sucesso!');
      setFeedback({ rating: 0, comment: '' });
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      toast.error('Erro ao enviar feedback');
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  // Calcular pontos de fidelidade (exemplo: 1 ponto por pedido)
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
    enabled: !!user?.email && isOpen && activeTab === 'loyalty'
  });

  const loyaltyPoints = orders.length; // Simplificado: 1 ponto por pedido

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Perfil do Cliente</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border overflow-x-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 md:px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'profile'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              Dados Pessoais
            </button>
            <button
              onClick={() => setActiveTab('loyalty')}
              className={`px-4 md:px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'loyalty'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Star className="w-4 h-4 inline mr-2" />
              Fidelidade
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`px-4 md:px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'feedback'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Feedback
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 md:px-6 py-3 font-medium transition-colors border-b-2 ${
                activeTab === 'history'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <History className="w-4 h-4 inline mr-2" />
              Histórico
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {/* Dados Pessoais */}
                {activeTab === 'profile' && (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Seu nome completo"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div>
                        <Label htmlFor="zipcode">CEP</Label>
                        <Input
                          id="zipcode"
                          value={formData.zipcode}
                          onChange={(e) => setFormData(prev => ({ ...prev, zipcode: e.target.value }))}
                          placeholder="00000-000"
                        />
                      </div>
                      <div>
                        <Label htmlFor="address">Endereço</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                          placeholder="Rua, número"
                        />
                      </div>
                      <div>
                        <Label htmlFor="complement">Complemento</Label>
                        <Input
                          id="complement"
                          value={formData.complement}
                          onChange={(e) => setFormData(prev => ({ ...prev, complement: e.target.value }))}
                          placeholder="Apto, bloco, etc"
                        />
                      </div>
                      <div>
                        <Label htmlFor="neighborhood">Bairro</Label>
                        <Input
                          id="neighborhood"
                          value={formData.neighborhood}
                          onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                          placeholder="Bairro"
                        />
                      </div>
                      <div>
                        <Label htmlFor="city">Cidade</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="Cidade"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSaveProfile} className="flex-1">
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Dados
                      </Button>
                      <Button onClick={handleLogout} variant="outline" className="text-red-600 hover:bg-red-50">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sair
                      </Button>
                    </div>
                  </div>
                )}

                {/* Fidelidade */}
                {activeTab === 'loyalty' && (
                  <div className="space-y-6">
                    <div className="text-center p-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl text-white">
                      <Star className="w-16 h-16 mx-auto mb-4 fill-white" />
                      <h3 className="text-3xl font-bold mb-2">{loyaltyPoints}</h3>
                      <p className="text-lg opacity-90">Pontos de Fidelidade</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-lg">Como funciona:</h4>
                      <ul className="space-y-2 text-muted-foreground">
                        <li>• 1 ponto por cada pedido realizado</li>
                        <li>• Acumule pontos e troque por descontos</li>
                        <li>• Pontos não expiram</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {activeTab === 'feedback' && (
                  <div className="space-y-4 max-w-2xl mx-auto">
                    <div>
                      <Label>Avaliação</Label>
                      <div className="flex gap-2 mt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setFeedback(prev => ({ ...prev, rating: star }))}
                            className="text-3xl transition-transform hover:scale-110"
                          >
                            <Star
                              className={star <= feedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="comment">Comentário</Label>
                      <Textarea
                        id="comment"
                        value={feedback.comment}
                        onChange={(e) => setFeedback(prev => ({ ...prev, comment: e.target.value }))}
                        placeholder="Deixe seu feedback sobre o atendimento, qualidade dos produtos, etc..."
                        rows={6}
                      />
                    </div>
                    <Button onClick={handleSubmitFeedback} className="w-full">
                      Enviar Feedback
                    </Button>
                  </div>
                )}

                {/* Histórico */}
                {activeTab === 'history' && (
                  <div>
                    {user?.email ? (
                      <CustomerOrdersHistory userEmail={user.email} />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Faça login para ver seu histórico de pedidos
                      </div>
                    )}
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
