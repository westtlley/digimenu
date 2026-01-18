import React, { useState, useEffect, useMemo } from 'react';
import { apiClient as base44 } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  Users, 
  Plus, 
  Trash2, 
  Mail, 
  Check, 
  X, 
  Loader2, 
  ArrowLeft,
  Crown,
  Calendar,
  Search,
  MoreVertical,
  Package,
  Settings,
  Edit,
  Eye,
  Lock,
  Copy,
  RefreshCw
} from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from 'lucide-react';
import UserAuthButton from '../components/atoms/UserAuthButton';
import PermissionsEditor from '../components/permissions/PermissionsEditor';
import SubscriberDataViewer from '../components/admin/SubscriberDataViewer';
import SubscriberDataFilter from '../components/admin/SubscriberDataFilter';
import ExpirationProgressBar from '../components/admin/subscribers/ExpirationProgressBar';
import ExportCSV from '../components/admin/subscribers/ExportCSV';
import ImportCSV from '../components/admin/subscribers/ImportCSV';
import AdvancedFilters from '../components/admin/subscribers/AdvancedFilters';
import { comparePermissions, getPlanPermissions } from '../components/permissions/PlanPresets';
import { formatBrazilianDate } from '../components/utils/dateUtils';
import toast from 'react-hot-toast';
import StatCard from '../components/ui/StatCard';
import { Skeleton, SkeletonCard, SkeletonStats } from '../components/ui/skeleton';
import EmptyState from '../components/ui/EmptyState';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function Assinantes() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newSubscriber, setNewSubscriber] = useState({
    email: '',
    name: '',
    plan: 'basic', // Inicializar com 'basic' em vez de 'custom'
    status: 'active',
    expires_at: '',
    permissions: getPlanPermissions('basic') // Inicializar com permissões do plano básico
  });
  const [viewingSubscriber, setViewingSubscriber] = useState(null);
  const [selectedSubscriberForData, setSelectedSubscriberForData] = useState(null);
  const [passwordTokens, setPasswordTokens] = useState({}); // Cache de tokens por assinante

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        // Apenas usuários master podem acessar a página de assinantes
        if (!userData.is_master) {
          window.location.href = createPageUrl('Admin');
        }
      } catch (e) {
        base44.auth.redirectToLogin();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const { data: subscribers = [], isLoading: subscribersLoading, refetch: refetchSubscribers } = useQuery({
    queryKey: ['subscribers'],
    queryFn: async () => {
      console.log('🔄 Buscando assinantes...');
      try {
        const response = await base44.functions.invoke('getSubscribers');
        console.log('📥 Resposta getSubscribers RAW:', response);
        console.log('📥 Resposta getSubscribers STRINGIFIED:', JSON.stringify(response, null, 2));
        
        // Verificar diferentes formatos de resposta
        let subscribersList = [];
        
        if (response?.data?.subscribers) {
          // Formato: { data: { subscribers: [...] } }
          subscribersList = response.data.subscribers;
        } else if (response?.data && Array.isArray(response.data)) {
          // Formato: { data: [...] }
          subscribersList = response.data;
        } else if (Array.isArray(response)) {
          // Formato: [...]
          subscribersList = response;
        } else if (response?.data?.error) {
          throw new Error(response.data.error);
        } else {
          console.warn('⚠️ Formato de resposta inesperado:', response);
          subscribersList = [];
        }
        
        console.log('📋 Assinantes retornados:', subscribersList.length);
        console.log('📋 IDs dos assinantes:', subscribersList.map(s => s.id || s.email));
        
        // Atualizar cache de tokens
        const tokensMap = {};
        subscribersList.forEach(sub => {
          if (sub.setup_url || sub.password_token) {
            tokensMap[sub.id || sub.email] = {
              token: sub.password_token,
              setup_url: sub.setup_url,
              expires_at: sub.token_expires_at
            };
          }
        });
        setPasswordTokens(tokensMap);
        
        return subscribersList;
      } catch (error) {
        console.error('❌ Erro ao buscar assinantes:', error);
        throw error;
      }
    },
    enabled: !!user?.is_master,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    // Atualizar automaticamente a cada 5 minutos para garantir tokens válidos
    refetchInterval: 5 * 60 * 1000
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const allPlans = await base44.entities.Plan.list('order');
      return allPlans.filter(p => p.is_active);
    },
    enabled: !!user?.is_master
  });

  const createMutation = useMutation({
    // Optimistic Update: Atualiza UI imediatamente antes da resposta do servidor
    onMutate: async (newSubscriberData) => {
      // Cancelar queries em andamento
      await queryClient.cancelQueries({ queryKey: ['subscribers'] });
      
      // Snapshot do estado anterior
      const previousSubscribers = queryClient.getQueryData(['subscribers']);
      
      // Criar assinante temporário otimista
      const optimisticSubscriber = {
        id: `temp-${Date.now()}`,
        ...newSubscriberData,
        status: newSubscriberData.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _optimistic: true
      };
      
      // Atualizar cache otimisticamente
      queryClient.setQueryData(['subscribers'], (old = []) => [...old, optimisticSubscriber]);
      
      return { previousSubscribers };
    },
    mutationFn: async (data) => {
      console.log('📤 [FRONTEND] Enviando dados para criar assinante:', JSON.stringify(data, null, 2));
      
      try {
        const response = await base44.functions.invoke('createSubscriber', data);
        
        console.log('📥 [FRONTEND] Resposta RAW recebida:', response);
        console.log('📥 [FRONTEND] Tipo da resposta:', typeof response);
        console.log('📥 [FRONTEND] response é objeto?', typeof response === 'object');
        console.log('📥 [FRONTEND] response.data existe?', !!response?.data);
        console.log('📥 [FRONTEND] response.data:', response?.data);
        console.log('📥 [FRONTEND] response.data?.subscriber existe?', !!response?.data?.subscriber);
        console.log('📥 [FRONTEND] response.data?.subscriber:', response?.data?.subscriber);
        console.log('📥 [FRONTEND] Resposta completa (stringified):', JSON.stringify(response, null, 2));
        
        // Verificar se há erro
        if (response?.data?.error) {
          console.error('❌ [FRONTEND] Erro na resposta:', response.data.error);
          throw new Error(response.data.error);
        }
        
        // Verificar se subscriber existe - múltiplas verificações
        if (!response) {
          console.error('❌ [FRONTEND] Resposta é null ou undefined');
          throw new Error('Resposta inválida do servidor: resposta vazia');
        }
        
        if (!response.data) {
          console.error('❌ [FRONTEND] response.data não existe. Resposta completa:', response);
          throw new Error('Resposta inválida do servidor: campo data não encontrado');
        }
        
        if (!response.data.subscriber) {
          console.error('❌ [FRONTEND] response.data.subscriber não existe');
          console.error('❌ [FRONTEND] response.data completo:', JSON.stringify(response.data, null, 2));
          console.error('❌ [FRONTEND] Chaves de response.data:', Object.keys(response.data || {}));
          throw new Error('Resposta inválida do servidor. Subscriber não encontrado na resposta.');
        }
        
        console.log('✅ [FRONTEND] Subscriber encontrado:', response.data.subscriber);
        // Retornar tanto o subscriber quanto os dados adicionais (token, setup_url)
        return {
          ...response.data.subscriber,
          setup_url: response.data.setup_url,
          password_token: response.data.password_token
        };
      } catch (error) {
        console.error('❌ [FRONTEND] Erro na mutationFn:', error);
        console.error('❌ [FRONTEND] Stack trace:', error.stack);
        throw error;
      }
    },
    onSuccess: async (data) => {
      console.log('✅ [FRONTEND] Assinante criado com sucesso - dados completos:', JSON.stringify(data, null, 2));
      console.log('✅ [FRONTEND] data.setup_url:', data.setup_url);
      console.log('✅ [FRONTEND] data.password_token:', data.password_token);
      
      // Fechar modal primeiro
      setShowAddModal(false);
      
      // Limpar formulário
      setNewSubscriber({ 
        email: '', 
        name: '', 
        plan: 'basic', 
        status: 'active', 
        expires_at: '',
        permissions: getPlanPermissions('basic')
      });
      
      // Construir URL base se não vier no setup_url
      const baseUrl = window.location.origin;
      let setupUrl = data.setup_url;
      
      // Se não tiver setup_url mas tiver token, construir manualmente
      if (!setupUrl && data.password_token) {
        setupUrl = `${baseUrl}/definir-senha?token=${data.password_token}`;
        console.log('🔗 [FRONTEND] URL construída manualmente:', setupUrl);
      }
      
      // Mostrar link de definição de senha se disponível
      if (setupUrl) {
        const linkText = `Link para definir senha:\n\n${setupUrl}\n\n(Link copiado para a área de transferência)`;
        
        // Copiar link para área de transferência
        try {
          await navigator.clipboard.writeText(setupUrl);
          console.log('🔗 [FRONTEND] Link copiado para área de transferência:', setupUrl);
        } catch (err) {
          console.error('❌ [FRONTEND] Erro ao copiar link:', err);
        }
        
        // Mostrar toast
        toast.success('Assinante criado! Link de definição de senha copiado.', {
          duration: 5000
        });
        
        // Mostrar alerta com o link (sempre exibir)
        setTimeout(() => {
          alert(`✅ Assinante criado com sucesso!\n\n${linkText}`);
        }, 500);
      } else {
        console.warn('⚠️ [FRONTEND] setup_url não encontrado nos dados');
        toast.success('Assinante criado com sucesso!');
        alert('Assinante criado com sucesso!\n\n⚠️ Link de definição de senha não foi gerado. Verifique os logs do backend.');
      }
      
      // Invalidar e forçar refetch imediatamente (múltiplas tentativas para garantir)
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
      
      // Refetch imediato
      setTimeout(async () => {
        try {
          const result = await refetchSubscribers();
          console.log('🔄 [1ª tentativa] Lista de assinantes atualizada:', result.data?.length || 0, 'assinantes');
        } catch (error) {
          console.error('❌ Erro no refetch (1ª tentativa):', error);
        }
      }, 300);
      
      // Refetch após 1 segundo (caso a primeira não funcione)
      setTimeout(async () => {
        try {
          const result = await refetchSubscribers();
          console.log('🔄 [2ª tentativa] Lista de assinantes atualizada:', result.data?.length || 0, 'assinantes');
        } catch (error) {
          console.error('❌ Erro no refetch (2ª tentativa):', error);
        }
      }, 1500);
      
      // Refetch após 3 segundos (garantia final)
      setTimeout(async () => {
        try {
          await queryClient.refetchQueries({ queryKey: ['subscribers'] });
          console.log('🔄 [3ª tentativa] Query invalidada e refetchada novamente');
        } catch (error) {
          console.error('❌ Erro no refetch (3ª tentativa):', error);
        }
      }, 3000);
    },
    onError: (error, newSubscriberData, context) => {
      // Rollback: reverter para estado anterior em caso de erro
      if (context?.previousSubscribers) {
        queryClient.setQueryData(['subscribers'], context.previousSubscribers);
      }
      
      console.error('❌ Erro completo ao criar assinante:', error);
      const errorMessage = error?.message || error?.toString() || 'Erro desconhecido';
      toast.error(`Erro ao adicionar assinante: ${errorMessage}`);
    },
    onSettled: () => {
      // Invalidar queries após sucesso ou erro para sincronizar com servidor
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
    }
  });

  const updateMutation = useMutation({
    // Optimistic Update para edição
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['subscribers'] });
      const previousSubscribers = queryClient.getQueryData(['subscribers']);
      
      // Atualizar otimisticamente
      queryClient.setQueryData(['subscribers'], (old = []) =>
        old.map(sub => sub.id === id ? { ...sub, ...data, _optimistic: true } : sub)
      );
      
      return { previousSubscribers };
    },
    mutationFn: async ({ id, data, originalData }) => {
      const response = await base44.functions.invoke('updateSubscriber', { id, data, originalData });
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      return response.data.subscriber;
    },
    onError: (error, variables, context) => {
      // Rollback em caso de erro
      if (context?.previousSubscribers) {
        queryClient.setQueryData(['subscribers'], context.previousSubscribers);
      }
      const errorMessage = error?.message || error?.toString() || 'Erro ao atualizar assinante';
      toast.error(errorMessage);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
    }
  });

  const deleteMutation = useMutation({
    // Optimistic Update para exclusão
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['subscribers'] });
      const previousSubscribers = queryClient.getQueryData(['subscribers']);
      
      // Remover otimisticamente
      queryClient.setQueryData(['subscribers'], (old = []) =>
        old.filter(sub => sub.id !== id)
      );
      
      return { previousSubscribers };
    },
    mutationFn: async (id) => {
      const response = await base44.functions.invoke('deleteSubscriber', { id });
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
    onError: (error, id, context) => {
      // Rollback em caso de erro
      if (context?.previousSubscribers) {
        queryClient.setQueryData(['subscribers'], context.previousSubscribers);
      }
      toast.error('Erro ao excluir assinante');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
    }
  });

  // Mutation para gerar/regenerar token de senha
  const generateTokenMutation = useMutation({
    mutationFn: async ({ subscriber_id, email }) => {
      const response = await base44.functions.invoke('generatePasswordTokenForSubscriber', {
        subscriber_id,
        email
      });
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      console.log('✅ [FRONTEND] Token gerado com sucesso:', response.data);
      return response.data;
    },
    onSuccess: async (data, variables) => {
      console.log('✅ [FRONTEND] onSuccess - Token gerado:', data);
      console.log('✅ [FRONTEND] setup_url recebido:', data.setup_url);
      console.log('✅ [FRONTEND] token recebido:', data.token);
      
      // Atualizar cache local
      const key = variables.subscriber_id || variables.email;
      const tokenInfo = {
        token: data.token || data.data?.token,
        setup_url: data.setup_url || data.data?.setup_url,
        expires_at: data.expires_at || data.data?.expires_at
      };
      
      console.log('💾 [FRONTEND] Salvando no cache local:', { key, tokenInfo });
      setPasswordTokens(prev => ({
        ...prev,
        [key]: tokenInfo
      }));
      
      // Invalidar e refetch imediatamente
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
      
      // Refetch após um pequeno delay para garantir
      setTimeout(async () => {
        try {
          await refetchSubscribers();
          console.log('🔄 Lista de assinantes atualizada após gerar token');
        } catch (error) {
          console.error('❌ Erro ao refetch após gerar token:', error);
        }
      }, 300);
      
      // Se tiver setup_url, copiar automaticamente e mostrar
      const setupUrl = data.setup_url || data.data?.setup_url;
      if (setupUrl) {
        try {
          await navigator.clipboard.writeText(setupUrl);
          toast.success('Token gerado! Link copiado para a área de transferência.', {
            duration: 5000
          });
        } catch (err) {
          toast.success('Token de senha gerado com sucesso!');
        }
      } else {
        toast.success('Token de senha gerado com sucesso!');
      }
    },
    onError: (error) => {
      console.error('❌ Erro ao gerar token:', error);
      toast.error(error.message || 'Erro ao gerar token de senha');
    }
  });

  // Função para copiar link de senha
  const copyPasswordLink = async (setupUrl, subscriberName) => {
    if (!setupUrl) {
      toast.error('Link de senha não disponível. Gerando novo token...');
      return;
    }
    
    try {
      await navigator.clipboard.writeText(setupUrl);
      toast.success(`Link de senha copiado para ${subscriberName || 'assinante'}!`);
    } catch (err) {
      console.error('Erro ao copiar link:', err);
      toast.error('Erro ao copiar link. Tente novamente.');
    }
  };

  // Função para regenerar token
  const regenerateToken = (subscriber) => {
    generateTokenMutation.mutate({
      subscriber_id: subscriber.id,
      email: subscriber.email
    });
  };

  const handleAddSubscriber = () => {
    if (!newSubscriber.email) {
      alert('Por favor, preencha o email do assinante');
      return;
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newSubscriber.email)) {
      alert('Por favor, insira um email válido');
      return;
    }

    // Garantir que plan seja STRING válida
    const planValue = String(newSubscriber.plan || 'basic');
    const finalPlan = planValue;

    // Obter permissões do plano se não for custom
    let permissions = newSubscriber.permissions || {};
    if (finalPlan !== 'custom' && (!permissions || Object.keys(permissions).length === 0)) {
      permissions = getPlanPermissions(finalPlan);
    }

    // Limpar campos vazios e garantir tipos corretos
    const dataToCreate = {
      email: newSubscriber.email.trim().toLowerCase(),
      name: (newSubscriber.name || '').trim(),
      plan: finalPlan,
      status: String(newSubscriber.status || 'active'),
    };
    
    // Adicionar expires_at apenas se tiver valor
    if (newSubscriber.expires_at) {
      dataToCreate.expires_at = newSubscriber.expires_at;
    }
    
    // Adicionar permissions (sempre objeto válido)
    if (permissions && Object.keys(permissions).length > 0) {
      dataToCreate.permissions = permissions;
    }

    console.log('Criando assinante:', JSON.stringify(dataToCreate, null, 2));
    
    try {
      createMutation.mutate(dataToCreate);
    } catch (error) {
      console.error('Erro ao criar assinante:', error);
      alert('Erro ao criar assinante: ' + error.message);
    }
  };

  const handleToggleStatus = (subscriber) => {
    const newStatus = subscriber.status === 'active' ? 'inactive' : 'active';
    updateMutation.mutate({ 
      id: subscriber.id, 
      data: { ...subscriber, status: newStatus },
      originalData: subscriber
    });
  };

  const [permissionLogs, setPermissionLogs] = useState([]);
  
  const openEditModal = async (subscriber) => {
    console.log('📂 Abrindo modal para:', subscriber);
    const initialState = {
      ...subscriber,
      permissions: subscriber.permissions || {}
    };
    console.log('📂 Estado inicial editingSubscriber:', initialState);
    setEditingSubscriber(initialState);
    setShowEditModal(true);
    
    // Carregar logs de permissão
    try {
      const logs = await base44.entities.PermissionLog.filter(
        { subscriber_email: subscriber.email },
        '-created_date',
        10
      );
      setPermissionLogs(logs);
    } catch (e) {
      console.error('Erro ao carregar logs:', e);
      setPermissionLogs([]);
    }
  };

  const handleSaveEdit = () => {
    if (!editingSubscriber) return;

    const originalData = subscribers.find(s => s.id === editingSubscriber.id);

    console.log('💾 SALVANDO - editingSubscriber completo:', JSON.stringify(editingSubscriber, null, 2));

    const dataToUpdate = {
      id: editingSubscriber.id, // Incluir ID no data também para garantir
      email: editingSubscriber.email,
      linked_user_email: editingSubscriber.linked_user_email || editingSubscriber.email,
      name: editingSubscriber.name || '',
      plan: editingSubscriber.plan,
      status: editingSubscriber.status || 'active',
      expires_at: editingSubscriber.expires_at || '',
      permissions: editingSubscriber.permissions || {},
      notes: editingSubscriber.notes || ''
    };

    console.log('💾 SALVANDO - editingSubscriber.id:', editingSubscriber.id);
    console.log('💾 SALVANDO - originalData:', originalData);
    console.log('💾 SALVANDO - dataToUpdate completo:', JSON.stringify(dataToUpdate, null, 2));

    updateMutation.mutate({ 
      id: editingSubscriber.id, 
      data: dataToUpdate,
      originalData 
    });
    setShowEditModal(false);
    setEditingSubscriber(null);
    setPermissionLogs([]);
  };
  
  const handlePlanChange = (newPlan) => {
    console.log('🧠 Assinantes.jsx - Recebido plano:', newPlan);

    // Obter permissões do novo plano se não for custom
    const newPermissions = newPlan !== 'custom' ? getPlanPermissions(newPlan) : {};

    if (editingSubscriber) {
      setEditingSubscriber(prev => {
        const updated = { 
          ...prev, 
          plan: newPlan,
          // Atualizar permissões apenas se não for custom ou se não tiver permissões customizadas
          permissions: newPlan !== 'custom' ? newPermissions : (prev.permissions || {})
        };
        console.log('🧠 Assinantes.jsx - editingSubscriber atualizado:', updated.plan, updated.permissions);
        return updated;
      });
    } else {
      setNewSubscriber(prev => {
        const updated = { 
          ...prev, 
          plan: newPlan,
          // Atualizar permissões apenas se não for custom
          permissions: newPlan !== 'custom' ? newPermissions : {}
        };
        console.log('🧠 Assinantes.jsx - newSubscriber atualizado:', updated.plan, updated.permissions);
        return updated;
      });
    }
  };




  // Debounce da busca para melhor performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const [filteredSubscribers, setFilteredSubscribers] = useState([]);

  // Busca básica (por termo)
  const searchFilteredSubscribers = useMemo(() => {
    if (!debouncedSearchTerm) return subscribers;
    
    const term = debouncedSearchTerm.toLowerCase();
    return subscribers.filter(s => 
      s.email?.toLowerCase().includes(term) ||
      s.name?.toLowerCase().includes(term)
    );
  }, [subscribers, debouncedSearchTerm]);

  // Atualizar filteredSubscribers quando searchFilteredSubscribers mudar ou quando filtros avançados mudarem
  useEffect(() => {
    if (filteredSubscribers.length === 0 || debouncedSearchTerm) {
      setFilteredSubscribers(searchFilteredSubscribers);
    }
  }, [searchFilteredSubscribers, debouncedSearchTerm]);

  const handleAdvancedFilterChange = (filtered) => {
    // Aplicar busca no resultado dos filtros avançados
    if (!debouncedSearchTerm) {
      setFilteredSubscribers(filtered);
    } else {
      const term = debouncedSearchTerm.toLowerCase();
      const searchFiltered = filtered.filter(s => 
        s.email?.toLowerCase().includes(term) ||
        s.name?.toLowerCase().includes(term)
      );
      setFilteredSubscribers(searchFiltered);
    }
  };

  const getPlanLabel = (slug) => {
    if (slug === 'custom') return 'Personalizado';
    const plan = plans.find(p => p.slug === slug);
    return plan?.name || slug;
  };

  const getPlanColor = (slug) => {
    if (slug === 'custom') return 'bg-orange-100 text-orange-700';
    if (slug === 'basic') return 'bg-gray-100 text-gray-700';
    if (slug === 'pro') return 'bg-blue-100 text-blue-700';
    if (slug === 'premium') return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (loading || subscribersLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user?.is_master) {
    return null;
  }

  // Se está visualizando dados completos de um assinante
  if (viewingSubscriber) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <SubscriberDataViewer 
            subscriber={viewingSubscriber}
            onBack={() => setViewingSubscriber(null)}
          />
        </div>
      </div>
    );
  }

  // Se está visualizando dados filtrados de um assinante
  if (selectedSubscriberForData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <SubscriberDataFilter 
            subscriber={selectedSubscriberForData}
            onBack={() => setSelectedSubscriberForData(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white shadow-xl">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Admin')}>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg"
                >
                  <Users className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h1 className="font-bold text-xl tracking-tight">Gestão de Assinantes</h1>
                  <p className="text-gray-300 text-sm">Gerencie quem tem acesso ao sistema</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ImportCSV 
                onImport={async (subscribers) => {
                  // Importar múltiplos assinantes
                  let successCount = 0;
                  let errorCount = 0;
                  
                  for (const sub of subscribers) {
                    try {
                      await createMutation.mutateAsync(sub);
                      successCount++;
                    } catch (error) {
                      console.error('Erro ao importar assinante:', sub.email, error);
                      errorCount++;
                    }
                  }
                  
                  if (errorCount > 0) {
                    toast.error(`${errorCount} assinante(s) não puderam ser importado(s)`);
                  }
                  if (successCount > 0) {
                    toast.success(`${successCount} assinante(s) importado(s) com sucesso!`);
                  }
                }}
              />
              <ExportCSV subscribers={subscribers} />
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  onClick={() => setShowAddModal(true)}
                  className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Assinante
                </Button>
              </motion.div>
              <ThemeToggle className="text-white hover:bg-gray-700" />
              <UserAuthButton className="text-white" />
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-4 -mt-4">
        {subscribersLoading ? (
          <SkeletonStats count={4} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Check}
              value={subscribers.filter(s => s.status === 'active').length}
              label="Ativos"
              color="success"
              delay={0}
            />
            <StatCard
              icon={X}
              value={subscribers.filter(s => s.status === 'inactive').length}
              label="Inativos"
              color="error"
              delay={0.1}
            />
            <StatCard
              icon={Crown}
              value={subscribers.filter(s => s.plan === 'premium' || s.plan === 'enterprise').length}
              label="Premium+"
              color="warning"
              delay={0.2}
            />
            <StatCard
              icon={Users}
              value={subscribers.length}
              label="Total"
              color="info"
              delay={0.3}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search e Filtros */}
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative flex-1 min-w-[250px] max-w-md"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar por email ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-11 border-gray-300 focus:border-orange-500 focus:ring-orange-500 transition-all duration-200"
            />
          </motion.div>
          <AdvancedFilters 
            subscribers={subscribers} 
            onFilterChange={handleAdvancedFilterChange}
          />
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
          {subscribersLoading ? (
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filteredSubscribers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum assinante encontrado"
              description={searchTerm 
                ? `Não encontramos assinantes com "${searchTerm}". Tente buscar com outros termos.`
                : "Adicione seu primeiro assinante para começar a gerenciar o acesso ao sistema."
              }
              action={() => setShowAddModal(true)}
              actionLabel="Adicionar Assinante"
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredSubscribers.map((subscriber, index) => (
                <motion.div
                  key={subscriber.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="p-5 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-md ${
                          subscriber.status === 'active' 
                            ? 'bg-gradient-to-br from-green-400 to-green-600' 
                            : 'bg-gradient-to-br from-gray-300 to-gray-400'
                        }`}
                      >
                        {subscriber.name ? (
                          <span className="text-white font-semibold text-sm">
                            {subscriber.name.charAt(0).toUpperCase()}
                          </span>
                        ) : (
                          <Mail className={`w-6 h-6 text-white`} />
                        )}
                        {subscriber.status === 'active' && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                        )}
                      </motion.div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">{subscriber.name || subscriber.email}</p>
                          <Badge className={`text-xs font-medium px-2 py-0.5 ${getPlanColor(subscriber.plan)} shadow-sm`}>
                            {getPlanLabel(subscriber.plan)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{subscriber.email}</p>
                        {subscriber.linked_user_email && (
                          <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                            🔗 Acesso: {subscriber.linked_user_email}
                          </p>
                        )}
                        {subscriber.expires_at && (
                          <div className="mt-2">
                            <ExpirationProgressBar expiresAt={subscriber.expires_at} />
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3" />
                              Renovação: {formatBrazilianDate(subscriber.expires_at)}
                            </p>
                          </div>
                        )}
                        {/* Link de Definição de Senha */}
                        <div className="mt-2 space-y-1">
                          {/* Verificar setup_url do subscriber ou do cache de tokens */}
                          {(() => {
                            const subscriberKey = subscriber.id || subscriber.email;
                            const cachedToken = passwordTokens[subscriberKey];
                            const setupUrl = subscriber.setup_url || cachedToken?.setup_url;
                            
                            if (setupUrl) {
                              return (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                                    <Lock className="w-3 h-3 text-blue-600" />
                                    <span className="text-xs text-blue-700 font-medium">Link disponível</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs bg-blue-500 text-white hover:bg-blue-600"
                                    onClick={() => copyPasswordLink(setupUrl, subscriber.name || subscriber.email)}
                                  >
                                    <Copy className="w-3 h-3 mr-1" />
                                    Copiar Link
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => regenerateToken(subscriber)}
                                    disabled={generateTokenMutation.isPending}
                                  >
                                    <RefreshCw className={`w-3 h-3 mr-1 ${generateTokenMutation.isPending ? 'animate-spin' : ''}`} />
                                    Regenerar
                                  </Button>
                                  {/* Mostrar link de forma legível */}
                                  <div className="w-full mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono break-all">
                                    {setupUrl}
                                  </div>
                                </div>
                              );
                            } else if (subscriber.has_password) {
                              return (
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1 bg-green-50 border border-green-200 rounded px-2 py-1">
                                    <Check className="w-3 h-3 text-green-600" />
                                    <span className="text-xs text-green-700">Senha já definida</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs bg-orange-500 text-white hover:bg-orange-600"
                                    onClick={() => regenerateToken(subscriber)}
                                    disabled={generateTokenMutation.isPending}
                                  >
                                    <RefreshCw className={`w-3 h-3 mr-1 ${generateTokenMutation.isPending ? 'animate-spin' : ''}`} />
                                    Gerar Novo Link
                                  </Button>
                                </div>
                              );
                            } else {
                              return (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                                    <Lock className="w-3 h-3 text-yellow-600" />
                                    <span className="text-xs text-yellow-700">Sem link</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs bg-orange-500 text-white hover:bg-orange-600"
                                    onClick={() => regenerateToken(subscriber)}
                                    disabled={generateTokenMutation.isPending}
                                  >
                                    <RefreshCw className={`w-3 h-3 mr-1 ${generateTokenMutation.isPending ? 'animate-spin' : ''}`} />
                                    Gerar Link Temporário
                                  </Button>
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={cn(
                        'font-medium px-3 py-1 shadow-sm',
                        subscriber.status === 'active' 
                          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
                          : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                      )}>
                        {subscriber.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingSubscriber(subscriber)}>
                            <Package className="w-4 h-4 mr-2" />
                            Ver Dados Completos
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSelectedSubscriberForData(subscriber)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Dados Filtrados
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditModal(subscriber)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar Assinatura
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(subscriber)}>
                            {subscriber.status === 'active' ? (
                              <>
                                <X className="w-4 h-4 mr-2" />
                                Desativar Assinatura
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-2" />
                                Ativar Assinatura
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              // Duplicar assinante
                              const duplicated = {
                                ...subscriber,
                                email: `${subscriber.email.split('@')[0]}_copy@${subscriber.email.split('@')[1]}`,
                                name: `${subscriber.name} (Cópia)`,
                                id: undefined
                              };
                              setNewSubscriber({
                                email: duplicated.email,
                                name: duplicated.name,
                                plan: duplicated.plan,
                                status: duplicated.status || 'active',
                                expires_at: duplicated.expires_at || '',
                                permissions: duplicated.permissions || getPlanPermissions('basic')
                              });
                              setShowAddModal(true);
                              toast.success('Dados do assinante copiados! Revise e salve.');
                            }}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              if (confirm('Excluir este assinante?')) {
                                deleteMutation.mutate(subscriber.id);
                              }
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-500" />
              Adicionar Assinante
            </DialogTitle>
          </DialogHeader>

          <TooltipProvider>
            <div className="space-y-4 py-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-gray-700">Email da Assinatura *</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Email principal do titular da assinatura. Será usado para login e identificação.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newSubscriber.email}
                  onChange={(e) => setNewSubscriber({...newSubscriber, email: e.target.value})}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email do titular da assinatura
                </p>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-gray-700">Email de Acesso (opcional)</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Se diferente do email da assinatura, informe aqui o email que terá acesso ao painel. Deixe vazio para usar o mesmo email.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={newSubscriber.linked_user_email || ''}
                  onChange={(e) => setNewSubscriber({...newSubscriber, linked_user_email: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se diferente, informe o email do usuário que terá acesso ao painel
                </p>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-gray-700">Nome</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Nome completo ou comercial do assinante. Será exibido no dashboard e relatórios.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  placeholder="Nome do assinante"
                  value={newSubscriber.name}
                  onChange={(e) => setNewSubscriber({...newSubscriber, name: e.target.value})}
                />
              </div>
            
            <PermissionsEditor
              permissions={newSubscriber.permissions}
              onChange={(perms) => setNewSubscriber({...newSubscriber, permissions: perms})}
              selectedPlan={newSubscriber.plan}
              onPlanChange={handlePlanChange}
            />
            
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-gray-700">Data de Expiração</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Data em que a assinatura expira automaticamente. Deixe vazio para assinatura sem expiração (permanente).</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  type="date"
                  value={newSubscriber.expires_at}
                  onChange={(e) => setNewSubscriber({...newSubscriber, expires_at: e.target.value})}
                />
              </div>
            </div>
          </TooltipProvider>
            

          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddSubscriber}
              disabled={!newSubscriber.email || createMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-orange-500" />
              Editar Assinante
            </DialogTitle>
          </DialogHeader>



          {editingSubscriber && (
            <div className="space-y-4 py-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Email da Assinatura</label>
                  <Input
                    type="email"
                    value={editingSubscriber.email}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Email de Acesso</label>
                  <Input
                    type="email"
                    placeholder="Se diferente do email da assinatura"
                    value={editingSubscriber.linked_user_email || ''}
                    onChange={(e) => setEditingSubscriber({...editingSubscriber, linked_user_email: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Email do usuário que terá acesso ao painel (deixe vazio se for o mesmo da assinatura)
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Nome</label>
                  <Input
                    value={editingSubscriber.name || ''}
                    onChange={(e) => setEditingSubscriber({...editingSubscriber, name: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
                  <Select 
                    value={editingSubscriber.status} 
                    onValueChange={(v) => setEditingSubscriber({...editingSubscriber, status: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Data de Expiração</label>
                  <Input
                    type="date"
                    value={editingSubscriber.expires_at || ''}
                    onChange={(e) => setEditingSubscriber({...editingSubscriber, expires_at: e.target.value})}
                  />
                </div>
              </div>
              
              <PermissionsEditor
                permissions={editingSubscriber.permissions}
                onChange={(perms) => {
                  console.log('🔄 Permissions onChange - Antes:', editingSubscriber.plan);
                  setEditingSubscriber(prev => {
                    console.log('🔄 Permissions onChange - Prev plan:', prev.plan);
                    const updated = {...prev, permissions: perms};
                    console.log('🔄 Permissions onChange - Depois:', updated.plan);
                    return updated;
                  });
                }}
                selectedPlan={editingSubscriber.plan}
                onPlanChange={handlePlanChange}
              />

              {permissionLogs.length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Histórico de Alterações</label>
                  <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                    {permissionLogs.map(log => (
                      <div key={log.id} className="text-xs bg-white p-2 rounded border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-700">{log.description}</span>
                          <span className="text-gray-400">
                            {(() => {
                              const date = new Date(log.created_date);
                              const day = String(date.getDate()).padStart(2, '0');
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const year = date.getFullYear();
                              const hour = String(date.getHours()).padStart(2, '0');
                              const minute = String(date.getMinutes()).padStart(2, '0');
                              return `${day}/${month}/${year} ${hour}:${minute}`;
                            })()}
                          </span>
                        </div>
                        <p className="text-gray-500">Por: {log.changed_by}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Observações</label>
                <textarea
                  value={editingSubscriber.notes || ''}
                  onChange={(e) => setEditingSubscriber({...editingSubscriber, notes: e.target.value})}
                  className="w-full border rounded-lg p-2 text-sm"
                  rows={3}
                  placeholder="Notas internas sobre o assinante..."
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}