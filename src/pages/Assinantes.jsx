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
  Lock,
  Copy,
  RefreshCw,
  CheckSquare,
  Square,
  Link2,
  BarChart3,
  Phone,
  Building2,
  Tag
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
  DialogDescription,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, ExternalLink } from 'lucide-react';
import UserAuthButton from '../components/atoms/UserAuthButton';
import PermissionsEditor from '../components/permissions/PermissionsEditor';
import SubscriberDataViewer from '../components/admin/SubscriberDataViewer';
import ExpirationProgressBar from '../components/admin/subscribers/ExpirationProgressBar';
import ExportCSV from '../components/admin/subscribers/ExportCSV';
import ImportCSV from '../components/admin/subscribers/ImportCSV';
import AdvancedFilters from '../components/admin/subscribers/AdvancedFilters';
import BulkActions from '../components/admin/subscribers/BulkActions';
import SetupLinkModal from '../components/admin/subscribers/SetupLinkModal';
import SubscriberStats from '../components/admin/subscribers/SubscriberStats';
import PlanTemplates from '../components/admin/subscribers/PlanTemplates';
import PlanCard from '../components/admin/subscribers/PlanCard';
import PlanComparison from '../components/admin/subscribers/PlanComparison';
import { comparePermissions, getPlanPermissions } from '../components/permissions/PlanPresets';
import { formatBrazilianDate } from '../components/utils/dateUtils';
import toast from 'react-hot-toast';
import StatCard from '../components/ui/StatCard';
import { Skeleton, SkeletonCard, SkeletonStats } from '../components/ui/skeleton';
import EmptyState from '../components/ui/EmptyState';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import ThemeToggle from '../components/ui/ThemeToggle';
import { logger } from '@/utils/logger';

export default function Assinantes() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newSubscriber, setNewSubscriber] = useState({
    email: '',
    linked_user_email: '',
    name: '',
    slug: '',
    plan: 'basic',
    status: 'active',
    expires_at: '',
    permissions: getPlanPermissions('basic'),
    phone: '',
    cnpj_cpf: '',
    origem: 'manual',
    tags: [],
    notes: ''
  });
  const [viewingSubscriber, setViewingSubscriber] = useState(null);
  const [selectedSubscriberForData, setSelectedSubscriberForData] = useState(null);
  const [passwordTokens, setPasswordTokens] = useState({}); // Cache de tokens por assinante
  const [selectedSubscriberIds, setSelectedSubscriberIds] = useState(new Set()); // IDs selecionados para bulk actions
  const [setupLinkModal, setSetupLinkModal] = useState({ open: false, url: null, name: null });
  const [subscriberToDelete, setSubscriberToDelete] = useState(null);
  const [showPlanCards, setShowPlanCards] = useState(false); // Toggle para mostrar cards visuais

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

  const { data: subscribers = [], isLoading: subscribersLoading, isError: subscribersError, error: subscribersErrorDetails, refetch: refetchSubscribers } = useQuery({
    queryKey: ['subscribers'],
    queryFn: async () => {
      logger.log('🔄 Buscando assinantes...');
      try {
        // Usar GET /api/establishments/subscribers (rota REST existente)
        const response = await base44.get('/establishments/subscribers');
        
        let subscribersList = [];
        if (response?.data?.subscribers) {
          subscribersList = response.data.subscribers;
        } else if (response?.data && Array.isArray(response.data)) {
          subscribersList = response.data;
        } else if (Array.isArray(response)) {
          subscribersList = response;
        } else if (response?.data?.error) {
          throw new Error(response.data.error);
        } else if (response?.subscribers) {
          subscribersList = response.subscribers;
        } else {
          console.warn('⚠️ Formato de resposta inesperado:', response);
          subscribersList = [];
        }
        
        logger.log('📋 Assinantes retornados:', subscribersList.length);
        
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
        logger.error('❌ Erro ao buscar assinantes:', error);
        throw error;
      }
    },
    enabled: !!user?.is_master,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: (failureCount, error) => {
      // Não retentar em 401/403/404 — falha rápido para mostrar UI de erro
      const status = error?.response?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      const msg = error?.message || '';
      if (msg.includes('401') || msg.includes('403') || msg.includes('404') || msg.includes('Acesso negado')) return false;
      return failureCount < 2;
    },
    refetchInterval: 5 * 60 * 1000
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      try {
        const allPlans = await base44.entities.Plan.list('order');
        const activePlans = allPlans.filter(p => p.is_active !== false);
        
        // Se não houver planos no banco, retornar planos padrão
        if (activePlans.length === 0) {
          console.log('⚠️ Nenhum plano no banco, retornando planos padrão (Assinantes)');
          return [
            { id: 'free', slug: 'free', name: 'Gratuito', description: 'Teste de 10 dias', is_active: true, order: 0 },
            { id: 'basic', slug: 'basic', name: 'Básico', description: 'Funcionalidades essenciais', is_active: true, order: 1 },
            { id: 'pro', slug: 'pro', name: 'Pro', description: 'Recursos avançados', is_active: true, order: 2 },
            { id: 'ultra', slug: 'ultra', name: 'Ultra', description: 'Todos os recursos', is_active: true, order: 3 }
          ];
        }
        
        return activePlans;
      } catch (error) {
        console.error('❌ Erro ao carregar planos, retornando padrão:', error);
        return [
          { id: 'free', slug: 'free', name: 'Gratuito', description: 'Teste de 10 dias', is_active: true, order: 0 },
          { id: 'basic', slug: 'basic', name: 'Básico', description: 'Funcionalidades essenciais', is_active: true, order: 1 },
          { id: 'pro', slug: 'pro', name: 'Pro', description: 'Recursos avançados', is_active: true, order: 2 },
          { id: 'ultra', slug: 'ultra', name: 'Ultra', description: 'Todos os recursos', is_active: true, order: 3 }
        ];
      }
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
      logger.log('📤 [FRONTEND] Enviando dados para criar assinante:', JSON.stringify(data, null, 2));
      
      try {
        const response = await base44.post('/establishments/subscribers', data);
        
        logger.log('📥 [FRONTEND] Resposta RAW recebida:', response);
        logger.log('📥 [FRONTEND] Tipo da resposta:', typeof response);
        logger.log('📥 [FRONTEND] response é objeto?', typeof response === 'object');
        logger.log('📥 [FRONTEND] response.data existe?', !!response?.data);
        logger.log('📥 [FRONTEND] response.data:', response?.data);
        logger.log('📥 [FRONTEND] response.data?.subscriber existe?', !!response?.data?.subscriber);
        logger.log('📥 [FRONTEND] response.data?.subscriber:', response?.data?.subscriber);
        logger.log('📥 [FRONTEND] Resposta completa (stringified):', JSON.stringify(response, null, 2));
        
        // Verificar se há erro
        if (response?.data?.error) {
          logger.error('❌ [FRONTEND] Erro na resposta:', response.data.error);
          throw new Error(response.data.error);
        }
        
        // Verificar se subscriber existe - múltiplas verificações
        if (!response) {
          logger.error('❌ [FRONTEND] Resposta é null ou undefined');
          throw new Error('Resposta inválida do servidor: resposta vazia');
        }
        
        if (!response.data) {
          logger.error('❌ [FRONTEND] response.data não existe. Resposta completa:', response);
          throw new Error('Resposta inválida do servidor: campo data não encontrado');
        }
        
        if (!response.data.subscriber) {
          logger.error('❌ [FRONTEND] response.data.subscriber não existe');
          logger.error('❌ [FRONTEND] response.data completo:', JSON.stringify(response.data, null, 2));
          logger.error('❌ [FRONTEND] Chaves de response.data:', Object.keys(response.data || {}));
          throw new Error('Resposta inválida do servidor. Subscriber não encontrado na resposta.');
        }
        
        logger.log('✅ [FRONTEND] Subscriber encontrado:', response.data.subscriber);
        // Retornar tanto o subscriber quanto os dados adicionais (token, setup_url)
        return {
          ...response.data.subscriber,
          setup_url: response.data.setup_url,
          password_token: response.data.password_token
        };
      } catch (error) {
        logger.error('❌ [FRONTEND] Erro na mutationFn:', error);
        logger.error('❌ [FRONTEND] Stack trace:', error.stack);
        throw error;
      }
    },
    onSuccess: async (data) => {
      logger.log('✅ [FRONTEND] Assinante criado com sucesso - dados completos:', JSON.stringify(data, null, 2));
      logger.log('✅ [FRONTEND] data.setup_url:', data.setup_url);
      logger.log('✅ [FRONTEND] data.password_token:', data.password_token);
      
      // Fechar modal primeiro
      setShowAddModal(false);
      
      // Limpar formulário
      setNewSubscriber({ 
        email: '', 
        linked_user_email: '',
        name: '', 
        slug: '',
        plan: 'basic', 
        status: 'active', 
        expires_at: '',
        permissions: getPlanPermissions('basic'),
        phone: '',
        cnpj_cpf: '',
        origem: 'manual',
        tags: [],
        notes: ''
      });
      
      const baseUrl = window.location.origin;
      let setupUrl = data.setup_url;
      if (!setupUrl && data.password_token) {
        setupUrl = `${baseUrl}/definir-senha?token=${data.password_token}`;
      }
      
      try {
        if (setupUrl) await navigator.clipboard.writeText(setupUrl);
      } catch (err) {
        logger.error('Erro ao copiar link:', err);
      }
      
      toast.success(setupUrl ? 'Assinante criado! Link copiado.' : 'Assinante criado com sucesso!');
      setSetupLinkModal({ open: true, url: setupUrl, name: data.name || data.email });
      
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
      setTimeout(() => refetchSubscribers().catch(() => {}), 500);
    },
    onError: (error, newSubscriberData, context) => {
      // Rollback: reverter para estado anterior em caso de erro
      if (context?.previousSubscribers) {
        queryClient.setQueryData(['subscribers'], context.previousSubscribers);
      }
      
      logger.error('❌ Erro completo ao criar assinante:', error);
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
      if (response.data?.error) {
        throw new Error(response.data.error);
      }
      // Suporta data.subscriber (legado) ou data direto (novo padrão)
      return response.data?.subscriber ?? response.data;
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
      logger.log('✅ [FRONTEND] Token gerado com sucesso:', response.data);
      return response.data;
    },
    onSuccess: async (data, variables) => {
      logger.log('✅ [FRONTEND] onSuccess - Token gerado:', data);
      logger.log('✅ [FRONTEND] setup_url recebido:', data.setup_url);
      logger.log('✅ [FRONTEND] token recebido:', data.token);
      
      // Atualizar cache local
      const key = variables.subscriber_id || variables.email;
      const tokenInfo = {
        token: data.token || data.data?.token,
        setup_url: data.setup_url || data.data?.setup_url,
        expires_at: data.expires_at || data.data?.expires_at
      };
      
      logger.log('💾 [FRONTEND] Salvando no cache local:', { key, tokenInfo });
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
          logger.log('🔄 Lista de assinantes atualizada após gerar token');
        } catch (error) {
          logger.error('❌ Erro ao refetch após gerar token:', error);
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
      logger.error('❌ Erro ao gerar token:', error);
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
      logger.error('Erro ao copiar link:', err);
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

  const validateEmail = (email) => {
    if (!email) return { valid: false, error: 'Email é obrigatório' };
    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) return { valid: false, error: 'Formato de email inválido' };
    const emailExists = subscribers.some(
      s => s.email?.toLowerCase() === trimmedEmail && s.id !== newSubscriber.id
    );
    if (emailExists) return { valid: false, error: 'Este email já está cadastrado' };
    return { valid: true, email: trimmedEmail };
  };

  const normalizeSlug = (val) => (val || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '';
  const validateSlug = (slug) => {
    if (!slug) return { valid: true, slug: '' };
    const n = normalizeSlug(slug);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(n)) return { valid: false, error: 'Use apenas letras minúsculas, números e hífen' };
    return { valid: true, slug: n };
  };

  const handleAddSubscriber = () => {
    // Validação de email
    const emailValidation = validateEmail(newSubscriber.email);
    if (!emailValidation.valid) {
      toast.error(emailValidation.error);
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

    const slugValidation = validateSlug(newSubscriber.slug);
    if (!slugValidation.valid) {
      toast.error(slugValidation.error);
      return;
    }

    const dataToCreate = {
      email: emailValidation.email,
      name: (newSubscriber.name || '').trim(),
      plan: finalPlan,
      status: String(newSubscriber.status || 'active'),
    };
    if (newSubscriber.expires_at) dataToCreate.expires_at = newSubscriber.expires_at;
    if (slugValidation.slug) dataToCreate.slug = slugValidation.slug;
    if (newSubscriber.linked_user_email != null && String(newSubscriber.linked_user_email || '').trim()) {
      dataToCreate.linked_user_email = String(newSubscriber.linked_user_email).trim();
    }
    if (permissions && Object.keys(permissions).length > 0) dataToCreate.permissions = permissions;
    if (newSubscriber.phone?.trim()) dataToCreate.phone = newSubscriber.phone.trim();
    if (newSubscriber.cnpj_cpf?.trim()) dataToCreate.cnpj_cpf = newSubscriber.cnpj_cpf.trim();
    if (newSubscriber.notes?.trim()) dataToCreate.notes = newSubscriber.notes.trim();
    if (newSubscriber.origem?.trim()) dataToCreate.origem = newSubscriber.origem.trim();
    if (Array.isArray(newSubscriber.tags) && newSubscriber.tags.length > 0) {
      dataToCreate.tags = newSubscriber.tags.filter(t => t && String(t).trim());
    }

    logger.log('Criando assinante:', JSON.stringify(dataToCreate, null, 2));
    
    try {
      createMutation.mutate(dataToCreate);
    } catch (error) {
      logger.error('Erro ao criar assinante:', error);
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
    logger.log('📂 Abrindo modal para:', subscriber);
    const initialState = {
      ...subscriber,
      permissions: subscriber.permissions || {},
      plan: subscriber.plan || 'basic', // ✅ Garantir que plan sempre tenha valor
      status: subscriber.status || 'active' // ✅ Garantir que status sempre tenha valor
    };
    logger.log('📂 Estado inicial editingSubscriber:', initialState);
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
      logger.error('Erro ao carregar logs:', e);
      setPermissionLogs([]);
    }
  };

  const handleSaveEdit = () => {
    if (!editingSubscriber) return;

    const originalData = subscribers.find(s => s.id === editingSubscriber.id);

    logger.log('💾 SALVANDO - editingSubscriber completo:', JSON.stringify(editingSubscriber, null, 2));

    const slugValidation = validateSlug(editingSubscriber.slug);
    if (!slugValidation.valid) {
      toast.error(slugValidation.error);
      return;
    }
    const dataToUpdate = {
      id: editingSubscriber.id,
      email: editingSubscriber.email,
      linked_user_email: editingSubscriber.linked_user_email || editingSubscriber.email,
      name: editingSubscriber.name || '',
      plan: editingSubscriber.plan,
      status: editingSubscriber.status || 'active',
      expires_at: editingSubscriber.expires_at || '',
      permissions: editingSubscriber.permissions || {},
      notes: editingSubscriber.notes || '',
      slug: slugValidation.slug ?? '',
      phone: editingSubscriber.phone || '',
      cnpj_cpf: editingSubscriber.cnpj_cpf || '',
      origem: editingSubscriber.origem || '',
      tags: Array.isArray(editingSubscriber.tags) ? editingSubscriber.tags : []
    };

    logger.log('💾 SALVANDO - editingSubscriber.id:', editingSubscriber.id);
    logger.log('💾 SALVANDO - originalData:', originalData);
    logger.log('💾 SALVANDO - dataToUpdate completo:', JSON.stringify(dataToUpdate, null, 2));

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
    logger.log('🧠 Assinantes.jsx - Recebido plano:', newPlan);

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
        logger.log('🧠 Assinantes.jsx - editingSubscriber atualizado:', updated.plan, updated.permissions);
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
        logger.log('🧠 Assinantes.jsx - newSubscriber atualizado:', updated.plan, updated.permissions);
        return updated;
      });
    }
  };




  // Debounce da busca para melhor performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Busca básica (por termo)
  const searchFilteredSubscribers = useMemo(() => {
    if (!debouncedSearchTerm) return subscribers;
    
    const term = debouncedSearchTerm.toLowerCase();
    return subscribers.filter(s => 
      s.email?.toLowerCase().includes(term) ||
      s.name?.toLowerCase().includes(term)
    );
  }, [subscribers, debouncedSearchTerm]);

  // Estado de filtros avançados
  const [advancedFiltered, setAdvancedFiltered] = useState(null);

  // Combinar busca e filtros avançados
  const filteredSubscribers = useMemo(() => {
    const baseList = advancedFiltered !== null ? advancedFiltered : subscribers;
    
    if (!debouncedSearchTerm) return baseList;
    
    const term = debouncedSearchTerm.toLowerCase();
    return baseList.filter(s => 
      s.email?.toLowerCase().includes(term) ||
      s.name?.toLowerCase().includes(term)
    );
  }, [subscribers, debouncedSearchTerm, advancedFiltered]);

  const handleAdvancedFilterChange = (filtered) => {
    setAdvancedFiltered(filtered);
  };

  const getPlanLabel = (slug) => {
    if (slug === 'custom') return 'Personalizado';
    const plan = plans.find(p => p.slug === slug);
    return plan?.name || slug;
  };

  const getPlanColor = (slug) => {
    if (slug === 'custom') return 'bg-orange-100 text-orange-700';
    if (slug === 'free') return 'bg-emerald-100 text-emerald-700';
    if (slug === 'basic') return 'bg-blue-100 text-blue-700';
    if (slug === 'pro') return 'bg-orange-100 text-orange-700';
    if (slug === 'ultra') return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (loading) {
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

  return (
    <div className="min-h-screen min-h-screen-mobile bg-gray-50">
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
              <Link to={createPageUrl('AdminMasterDashboard')}>
                <Button variant="ghost" className="text-white hover:bg-white/10 font-medium">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              </Link>
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
                      logger.error('Erro ao importar assinante:', sub.email, error);
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
          <SubscriberStats subscribers={subscribers} />
        )}
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search e Filtros */}
        <div className="mb-6 space-y-4">
          {/* Barra de Busca */}
          <div className="flex items-center gap-3 flex-wrap">
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

          {/* Filtros Rápidos Visuais */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 flex-wrap bg-white rounded-xl p-3 border-2 border-gray-200 shadow-sm"
          >
            <span className="text-sm font-medium text-gray-700 mr-2">Filtro Rápido:</span>
            {[
              { label: 'Todos', count: subscribers.length, filter: null, color: 'gray' },
              { label: 'Ativos', count: subscribers.filter(s => s.status === 'active').length, filter: 'active', color: 'green' },
              { label: 'Inativos', count: subscribers.filter(s => s.status === 'inactive').length, filter: 'inactive', color: 'red' },
              { label: 'Gratuitos', count: subscribers.filter(s => s.plan === 'free' && s.status === 'active').length, filter: 'free', color: 'green' },
              { label: 'Básico', count: subscribers.filter(s => s.plan === 'basic' && s.status === 'active').length, filter: 'basic', color: 'blue' },
              { label: 'Pro', count: subscribers.filter(s => s.plan === 'pro' && s.status === 'active').length, filter: 'pro', color: 'orange' },
              { label: 'Ultra', count: subscribers.filter(s => s.plan === 'ultra' && s.status === 'active').length, filter: 'ultra', color: 'purple' },
            ].map((quickFilter) => {
              const isActive = advancedFiltered === null && quickFilter.filter === null;
              const colorClasses = {
                gray: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300',
                green: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
                red: 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200',
                blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
                orange: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200',
                purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200'
              };
              
              return (
                <Button
                  key={quickFilter.label}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "text-xs font-medium transition-all duration-200",
                    colorClasses[quickFilter.color],
                    isActive && "ring-2 ring-offset-2 ring-orange-500"
                  )}
                  onClick={() => {
                    if (quickFilter.filter === null) {
                      setAdvancedFiltered(null);
                    } else if (quickFilter.filter === 'active' || quickFilter.filter === 'inactive') {
                      setAdvancedFiltered(subscribers.filter(s => s.status === quickFilter.filter));
                    } else {
                      setAdvancedFiltered(subscribers.filter(s => s.plan === quickFilter.filter && s.status === 'active'));
                    }
                  }}
                >
                  {quickFilter.label}
                  <Badge className="ml-1.5 bg-white/50 text-current border-current/20">
                    {quickFilter.count}
                  </Badge>
                </Button>
              );
            })}
          </motion.div>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
          {/* Bulk Actions */}
          {!subscribersLoading && filteredSubscribers.length > 0 && (
            <BulkActions
              subscribers={filteredSubscribers}
              selectedIds={Array.from(selectedSubscriberIds)}
              onSelectionChange={(ids) => setSelectedSubscriberIds(new Set(ids))}
              onBulkAction={async (action, selectedSubscribers) => {
                try {
                  switch (action) {
                    case 'activate':
                      await Promise.all(
                        selectedSubscribers.map(sub => 
                          updateMutation.mutateAsync({
                            id: sub.id,
                            data: { ...sub, status: 'active' },
                            originalData: sub
                          })
                        )
                      );
                      toast.success(`${selectedSubscribers.length} assinante(s) ativado(s)!`);
                      break;
                    case 'deactivate':
                      await Promise.all(
                        selectedSubscribers.map(sub => 
                          updateMutation.mutateAsync({
                            id: sub.id,
                            data: { ...sub, status: 'inactive' },
                            originalData: sub
                          })
                        )
                      );
                      toast.success(`${selectedSubscribers.length} assinante(s) desativado(s)!`);
                      break;
                    case 'delete':
                      await Promise.all(
                        selectedSubscribers.map(sub => deleteMutation.mutateAsync(sub.id))
                      );
                      toast.success(`${selectedSubscribers.length} assinante(s) excluído(s)!`);
                      break;
                    case 'export':
                      const { exportSubscribersToCSV, downloadCSV } = await import('@/utils/csvUtils');
                      const csvContent = exportSubscribersToCSV(selectedSubscribers);
                      const dateStr = new Date().toISOString().split('T')[0];
                      downloadCSV(csvContent, `assinantes_selecionados_${dateStr}.csv`);
                      toast.success(`${selectedSubscribers.length} assinante(s) exportado(s)!`);
                      break;
                  }
                  setSelectedSubscriberIds(new Set());
                } catch (error) {
                  logger.error('Erro na ação em lote:', error);
                  toast.error('Erro ao executar ação em lote');
                }
              }}
            />
          )}

          {subscribersError ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <p className="text-red-600 font-medium mb-2">Erro ao carregar assinantes</p>
              <p className="text-gray-500 text-sm mb-4 max-w-md">
                {subscribersErrorDetails?.response?.data?.message ?? subscribersErrorDetails?.message ?? 'Verifique sua conexão ou tente novamente em instantes.'}
              </p>
              <Button onClick={() => refetchSubscribers()} variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </Button>
            </div>
          ) : subscribersLoading ? (
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
              {filteredSubscribers.map((subscriber, index) => {
                const isSelected = selectedSubscriberIds.has(subscriber.id);
                return (
                  <motion.div
                    key={subscriber.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className={`p-5 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${
                      isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            const newSet = new Set(selectedSubscriberIds);
                            if (isSelected) {
                              newSet.delete(subscriber.id);
                            } else {
                              newSet.add(subscriber.id);
                            }
                            setSelectedSubscriberIds(newSet);
                          }}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </Button>
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
                        {subscriber.phone && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" /> {subscriber.phone}
                          </p>
                        )}
                        {Array.isArray(subscriber.tags) && subscriber.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {subscriber.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-[10px] py-0 px-1.5">{tag}</Badge>
                            ))}
                            {subscriber.tags.length > 3 && <span className="text-xs text-gray-400">+{subscriber.tags.length - 3}</span>}
                          </div>
                        )}
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
                        {/* Status da Senha (SEGURANÇA: Link removido) */}
                        <div className="mt-2 space-y-1">
                          {(() => {
                            if (subscriber.has_password) {
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
                                    Resetar Senha
                                  </Button>
                                </div>
                              );
                            } else {
                              return (
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                                    <Lock className="w-3 h-3 text-yellow-600" />
                                    <span className="text-xs text-yellow-700">Senha pendente</span>
                                  </div>
                                  <span className="text-xs text-gray-500 italic">(Link enviado por e-mail)</span>
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
                          {subscriber.slug && (
                            <DropdownMenuItem
                              onClick={() => window.open(`/s/${subscriber.slug}`, '_blank', 'noopener')}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Abrir cardápio
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setViewingSubscriber(subscriber)}>
                            <Package className="w-4 h-4 mr-2" />
                            Ver Dados Completos
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
                              setNewSubscriber({
                                email: '',
                                linked_user_email: subscriber.linked_user_email || '',
                                name: subscriber.name ? `${subscriber.name} (cópia)` : '',
                                slug: '',
                                plan: subscriber.plan || 'basic',
                                status: subscriber.status || 'active',
                                expires_at: subscriber.expires_at || '',
                                permissions: subscriber.permissions || getPlanPermissions(subscriber.plan || 'basic'),
                                phone: subscriber.phone || '',
                                cnpj_cpf: subscriber.cnpj_cpf || '',
                                origem: subscriber.origem || 'manual',
                                tags: Array.isArray(subscriber.tags) ? [...subscriber.tags] : [],
                                notes: subscriber.notes || ''
                              });
                              setShowAddModal(true);
                              toast.success('Dados copiados. Informe um novo email e salve.');
                            }}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setSubscriberToDelete(subscriber)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    </div>
                  </div>
                  </motion.div>
                );
              })}
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
              
              <div data-field="email-acesso" className="border-l-2 border-orange-200 pl-3">
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-gray-700" htmlFor="linked_user_email">Email de Acesso / Email personalizado (opcional)</label>
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
                  id="linked_user_email"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
                  <Select value={newSubscriber.status} onValueChange={(v) => setNewSubscriber({...newSubscriber, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                    <Phone className="w-4 h-4 text-orange-500" />
                    Telefone
                  </label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={newSubscriber.phone || ''}
                    onChange={(e) => setNewSubscriber({...newSubscriber, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                    <Building2 className="w-4 h-4 text-orange-500" />
                    CNPJ/CPF
                  </label>
                  <Input
                    placeholder="00.000.000/0001-00"
                    value={newSubscriber.cnpj_cpf || ''}
                    onChange={(e) => setNewSubscriber({...newSubscriber, cnpj_cpf: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Origem</label>
                  <Select value={newSubscriber.origem || 'manual'} onValueChange={(v) => setNewSubscriber({...newSubscriber, origem: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="import">Importação CSV</SelectItem>
                      <SelectItem value="landing">Landing Page</SelectItem>
                      <SelectItem value="indicacao">Indicação</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Link2 className="w-4 h-4 text-orange-500" />
                    Link do cardápio
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Parte final da URL do cardápio: /s/meu-restaurante. Apenas letras minúsculas, números e hífen. Deixe vazio para o assinante definir depois em Loja.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  placeholder="ex: meu-restaurante"
                  value={newSubscriber.slug || ''}
                  onChange={(e) => setNewSubscriber({...newSubscriber, slug: e.target.value})}
                  onBlur={(e) => setNewSubscriber(prev => ({...prev, slug: normalizeSlug(prev.slug)}))}
                  className="font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">URL: /s/<span className="font-mono">{normalizeSlug(newSubscriber.slug) || '...'}</span></p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                  <Tag className="w-4 h-4 text-orange-500" />
                  Tags (separadas por vírgula)
                </label>
                <Input
                  placeholder="ex: beta, parceiro, vip"
                  value={Array.isArray(newSubscriber.tags) ? newSubscriber.tags.join(', ') : ''}
                  onChange={(e) => {
                    const vals = (e.target.value || '').split(',').map(t => t.trim()).filter(Boolean);
                    setNewSubscriber({...newSubscriber, tags: vals});
                  }}
                />
              </div>

              {/* Templates de Planos */}
              <PlanTemplates
                onSelectTemplate={(template) => {
                  setNewSubscriber({
                    ...newSubscriber,
                    permissions: template.permissions,
                    plan: 'custom'
                  });
                  toast.success(`Template "${template.name}" aplicado!`);
                }}
              />
            
            <PermissionsEditor
              permissions={newSubscriber.permissions}
              onChange={(perms) => setNewSubscriber({...newSubscriber, permissions: perms})}
              selectedPlan={newSubscriber.plan}
              onPlanChange={handlePlanChange}
            />
            
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-sm font-medium text-gray-700">Data de Expiração</label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Data em que a assinatura expira. Deixe vazio para permanente.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    type="date"
                    value={newSubscriber.expires_at}
                    onChange={(e) => setNewSubscriber({...newSubscriber, expires_at: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Observações</label>
                  <Input
                    placeholder="Notas internas..."
                    value={newSubscriber.notes || ''}
                    onChange={(e) => setNewSubscriber({...newSubscriber, notes: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </TooltipProvider>
          
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

      {/* Edit Modal - size="large" para exibir em largura correta no desktop */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent size="large" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-orange-500" />
              Editar Assinante
            </DialogTitle>
            <DialogDescription>
              Edite as informações e permissões do assinante
            </DialogDescription>
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
                
                <div data-field="email-acesso" className="border-l-2 border-orange-200 pl-3">
                  <label className="text-sm font-medium text-gray-700 mb-1 block" htmlFor="edit-linked_user_email">Email de Acesso / Email personalizado</label>
                  <Input
                    id="edit-linked_user_email"
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

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                    <Link2 className="w-4 h-4 text-orange-500" />
                    Link do cardápio
                  </label>
                  <Input
                    placeholder="ex: meu-restaurante"
                    value={editingSubscriber.slug || ''}
                    onChange={(e) => setEditingSubscriber({...editingSubscriber, slug: e.target.value})}
                    onBlur={(e) => setEditingSubscriber(prev => ({...prev, slug: normalizeSlug(prev.slug)}))}
                    className="font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">URL: /s/<span className="font-mono">{normalizeSlug(editingSubscriber.slug) || '...'}</span></p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                    <Phone className="w-4 h-4 text-orange-500" />
                    Telefone
                  </label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={editingSubscriber.phone || ''}
                    onChange={(e) => setEditingSubscriber({...editingSubscriber, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                    <Building2 className="w-4 h-4 text-orange-500" />
                    CNPJ/CPF
                  </label>
                  <Input
                    placeholder="00.000.000/0001-00"
                    value={editingSubscriber.cnpj_cpf || ''}
                    onChange={(e) => setEditingSubscriber({...editingSubscriber, cnpj_cpf: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Origem</label>
                  <Select value={editingSubscriber.origem || 'manual'} onValueChange={(v) => setEditingSubscriber({...editingSubscriber, origem: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="import">Importação CSV</SelectItem>
                      <SelectItem value="landing">Landing Page</SelectItem>
                      <SelectItem value="indicacao">Indicação</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1 block flex items-center gap-1">
                    <Tag className="w-4 h-4 text-orange-500" />
                    Tags (separadas por vírgula)
                  </label>
                  <Input
                    placeholder="ex: beta, parceiro"
                    value={Array.isArray(editingSubscriber.tags) ? editingSubscriber.tags.join(', ') : ''}
                    onChange={(e) => {
                      const vals = (e.target.value || '').split(',').map(t => t.trim()).filter(Boolean);
                      setEditingSubscriber({...editingSubscriber, tags: vals});
                    }}
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

              {/* Templates de Planos (no modal de edição) */}
              <PlanTemplates
                onSelectTemplate={(template) => {
                  setEditingSubscriber({
                    ...editingSubscriber,
                    permissions: template.permissions,
                    plan: 'custom'
                  });
                  toast.success(`Template "${template.name}" aplicado!`);
                }}
              />
              
              <PermissionsEditor
                permissions={editingSubscriber.permissions}
                onChange={(perms) => {
                  logger.log('🔄 Permissions onChange - Antes:', editingSubscriber.plan);
                  setEditingSubscriber(prev => {
                    logger.log('🔄 Permissions onChange - Prev plan:', prev.plan);
                    const updated = {...prev, permissions: perms};
                    logger.log('🔄 Permissions onChange - Depois:', updated.plan);
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

      {/* Modal pós-criação - link de definição de senha */}
      <SetupLinkModal
        open={setupLinkModal.open}
        onClose={() => setSetupLinkModal({ open: false, url: null, name: null })}
        setupUrl={setupLinkModal.url}
        subscriberName={setupLinkModal.name}
      />

      {/* AlertDialog para exclusão */}
      <AlertDialog open={!!subscriberToDelete} onOpenChange={(open) => !open && setSubscriberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir assinante?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O assinante <strong>{subscriberToDelete?.name || subscriberToDelete?.email}</strong> e todos os dados associados serão removidos.
              Considerar desativar em vez de excluir para preservar o histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (subscriberToDelete) {
                  deleteMutation.mutate(subscriberToDelete.id);
                  setSubscriberToDelete(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}