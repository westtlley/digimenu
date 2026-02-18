import React, { useState, useEffect } from 'react';
import { apiClient as base44 } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  Package,
  Edit,
  Link2,
  Phone,
  Building2,
  Tag,
  ArrowLeft,
  Users,
  Search,
  MoreVertical,
  Lock,
  Copy,
  RefreshCw,
  CheckSquare,
  Square,
  BarChart3,
  ExternalLink,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { createPageUrl } from '@/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatBrazilianDate } from '../components/utils/dateUtils';
import PermissionsEditor from '../components/permissions/PermissionsEditor';
import SubscriberDataViewer from '../components/admin/SubscriberDataViewer';
import ExpirationProgressBar from '../components/admin/subscribers/ExpirationProgressBar';
import SetupLinkModal from '../components/admin/subscribers/SetupLinkModal';
import PlanTemplates from '../components/admin/subscribers/PlanTemplates';
import { getPlanPermissions } from '../components/permissions/PlanPresets';
import { getPlanLimits, ADDONS_ORDERS_OPTIONS, UNLIMITED } from '@/constants/planLimits';
import toast from 'react-hot-toast';
import { logger } from '@/utils/logger';
import { useSubscribersList } from '@/hooks/useSubscribersList';
import { useSubscribersFilters } from '@/hooks/useSubscribersFilters';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import SubscribersHeader from '../components/admin/subscribers/SubscribersHeader';
import SubscribersStats from '../components/admin/subscribers/SubscribersStats';
import SubscribersToolbar from '../components/admin/subscribers/SubscribersToolbar';
import SubscribersList from '../components/admin/subscribers/SubscribersList';

export default function Assinantes() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState(null);
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
  const [passwordTokens, setPasswordTokens] = useState({});
  const [setupLinkModal, setSetupLinkModal] = useState({ open: false, url: null, name: null });
  const [subscriberToDelete, setSubscriberToDelete] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 50;

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
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

  const {
    subscribers,
    pagination,
    isLoading: subscribersLoading,
    isError: subscribersError,
    error: subscribersErrorDetails,
    refetch: refetchSubscribers,
    serverWarming,
    loadingStuck,
  } = useSubscribersList({ page, limit, enabled: !!user?.is_master });

  const {
    filteredSubscribers,
    stats,
    searchTerm,
    setSearchTerm,
    advancedFiltered,
    setAdvancedFiltered,
    setQuickFilter,
  } = useSubscribersFilters(subscribers);

  const selection = useBulkSelection(filteredSubscribers, (s) => s.id);

  useEffect(() => {
    const tokensMap = {};
    subscribers.forEach((sub) => {
      if (sub.setup_url || sub.password_token) {
        tokensMap[sub.id || sub.email] = {
          token: sub.password_token,
          setup_url: sub.setup_url,
          expires_at: sub.token_expires_at
        };
      }
    });
    setPasswordTokens(tokensMap);
  }, [subscribers]);

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
      const qk = ['subscribers', page, limit];
      await queryClient.cancelQueries({ queryKey: ['subscribers'] });
      const prev = queryClient.getQueryData(qk);
      const optimisticSubscriber = {
        id: `temp-${Date.now()}`,
        ...newSubscriberData,
        status: newSubscriberData.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _optimistic: true
      };
      queryClient.setQueryData(qk, (old) => {
        const list = Array.isArray(old) ? old : (old?.subscribers ?? []);
        const next = { subscribers: [...list, optimisticSubscriber], pagination: old?.pagination ?? null };
        return next;
      });
      return { previousData: prev };
    },
    mutationFn: async (data) => {
      try {
        const response = await base44.post('/establishments/subscribers', data);
        if (response?.data?.error) throw new Error(response.data.error);
        if (!response?.data?.subscriber) {
          throw new Error('Resposta inválida do servidor. Subscriber não encontrado.');
        }
        return {
          ...response.data.subscriber,
          setup_url: response.data.setup_url,
          password_token: response.data.password_token
        };
      } catch (error) {
        logger.debug('createSubscriber error', error?.message);
        throw error;
      }
    },
    onSuccess: async (data) => {
      setShowAddModal(false);
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
      let copied = false;
      if (setupUrl) {
        try {
          await navigator.clipboard.writeText(setupUrl);
          copied = true;
        } catch (err) {
          logger.debug('Clipboard copy failed', err?.message);
        }
      }
      toast.success(copied ? 'Assinante criado! Link copiado.' : 'Assinante criado com sucesso!');
      setSetupLinkModal({ open: true, url: setupUrl, name: data.name || data.email });
    },
    onError: (error, newSubscriberData, context) => {
      if (context?.previousData != null) {
        queryClient.setQueryData(['subscribers', page, limit], context.previousData);
      }
      
      logger.error('❌ Erro completo ao criar assinante:', error);
      const errorMessage = error?.message || error?.toString() || 'Erro desconhecido';
      toast.error(`Erro ao adicionar assinante: ${errorMessage}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
    }
  });

  const updateMutation = useMutation({
    onMutate: async ({ id, data }) => {
      const qk = ['subscribers', page, limit];
      await queryClient.cancelQueries({ queryKey: ['subscribers'] });
      const prev = queryClient.getQueryData(qk);
      queryClient.setQueryData(qk, (old) => {
        const list = Array.isArray(old) ? old : (old?.subscribers ?? []);
        const next = list.map(sub => sub.id === id ? { ...sub, ...data, _optimistic: true } : sub);
        return { subscribers: next, pagination: old?.pagination ?? null };
      });
      return { previousData: prev };
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
      if (context?.previousData != null) {
        queryClient.setQueryData(['subscribers', page, limit], context.previousData);
      }
      const errorMessage = error?.message || error?.toString() || 'Erro ao atualizar assinante';
      toast.error(errorMessage);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
    }
  });

  const deleteMutation = useMutation({
    onMutate: async (id) => {
      const qk = ['subscribers', page, limit];
      await queryClient.cancelQueries({ queryKey: ['subscribers'] });
      const prev = queryClient.getQueryData(qk);
      queryClient.setQueryData(qk, (old) => {
        const list = Array.isArray(old) ? old : (old?.subscribers ?? []);
        const next = list.filter(sub => sub.id !== id);
        return { subscribers: next, pagination: old?.pagination ?? null };
      });
      return { previousData: prev };
    },
    mutationFn: async (id) => {
      const response = await base44.functions.invoke('deleteSubscriber', { id });
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
    onError: (error, id, context) => {
      if (context?.previousData != null) {
        queryClient.setQueryData(['subscribers', page, limit], context.previousData);
      }
      toast.error('Erro ao excluir assinante');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
    }
  });

  const generateTokenMutation = useMutation({
    mutationFn: async ({ subscriber_id, email }) => {
      const response = await base44.functions.invoke('generatePasswordTokenForSubscriber', {
        subscriber_id,
        email
      });
      if (response.data.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: async (data, variables) => {
      const key = variables.subscriber_id || variables.email;
      const tokenInfo = {
        token: data.token || data.data?.token,
        setup_url: data.setup_url || data.data?.setup_url,
        expires_at: data.expires_at || data.data?.expires_at
      };
      setPasswordTokens((prev) => ({ ...prev, [key]: tokenInfo }));
      const setupUrl = data.setup_url || data.data?.setup_url;
      if (setupUrl) {
        try {
          await navigator.clipboard.writeText(setupUrl);
          toast.success('Link copiado para a área de transferência.');
        } catch (err) {
          toast.success('Token de senha gerado. Use o botão Copiar no modal se precisar do link.');
        }
      } else {
        toast.success('Token de senha gerado com sucesso.');
      }
    },
    onError: (error) => {
      logger.debug('generateToken error', error?.message);
      toast.error(error?.message || 'Erro ao gerar token de senha');
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
      (s) => s.email?.toLowerCase() === trimmedEmail && s.id !== newSubscriber.id
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
    const addons = subscriber.addons && typeof subscriber.addons === 'object'
      ? subscriber.addons
      : { orders: 0 };
    const initialState = {
      ...subscriber,
      permissions: subscriber.permissions || {},
      plan: subscriber.plan || 'basic', // ✅ Garantir que plan sempre tenha valor
      status: subscriber.status || 'active', // ✅ Garantir que status sempre tenha valor
      addons: { ...addons, orders: Number(addons.orders) || 0 }
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
      tags: Array.isArray(editingSubscriber.tags) ? editingSubscriber.tags : [],
      addons: editingSubscriber.addons && typeof editingSubscriber.addons === 'object'
        ? { orders: Number(editingSubscriber.addons.orders) || 0 }
        : { orders: 0 }
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




  const getPlanLabel = (slug) => {
    if (slug === 'custom') return 'Personalizado';
    const plan = plans.find(p => p.slug === slug);
    return plan?.name || slug;
  };

  const getPlanColor = (slug) => {
    if (slug === 'custom') return 'bg-primary/20 text-primary';
    if (slug === 'free') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
    if (slug === 'basic') return 'bg-blue-500/15 text-blue-700 dark:text-blue-300';
    if (slug === 'pro') return 'bg-primary/20 text-primary';
    if (slug === 'ultra') return 'bg-purple-500/15 text-purple-700 dark:text-purple-300';
    return 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user?.is_master) {
    return null;
  }

  // Se está visualizando dados completos de um assinante
  if (viewingSubscriber) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <SubscriberDataViewer 
            subscriber={viewingSubscriber}
            onBack={() => setViewingSubscriber(null)}
          />
        </div>
      </div>
    );
  }

  const errorMessage =
    subscribersErrorDetails?.message != null
      ? (() => {
          const msg = String(subscribersErrorDetails.message);
          const is403 =
            msg.includes('Acesso negado') ||
            msg.includes('MASTER_ONLY') ||
            msg.includes('administradores master');
          return is403
            ? 'Acesso negado. Verifique se sua conta possui permissão de Admin Master.'
            : msg || 'Verifique sua conexão ou tente novamente em instantes.';
        })()
      : 'Verifique sua conexão ou tente novamente em instantes.';

  return (
    <div className="min-h-screen min-h-screen-mobile bg-background">
      <SubscribersHeader
        onAddClick={() => setShowAddModal(true)}
        onImport={async (toImport) => {
          let successCount = 0;
          let errorCount = 0;
          for (const sub of toImport) {
            try {
              await createMutation.mutateAsync(sub);
              successCount++;
            } catch (err) {
              logger.debug('Import error', sub?.email, err?.message);
              errorCount++;
            }
          }
          if (errorCount > 0) toast.error(`${errorCount} assinante(s) não puderam ser importado(s)`);
          if (successCount > 0) toast.success(`${successCount} assinante(s) importado(s) com sucesso!`);
        }}
        subscribers={subscribers}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        {!subscribersLoading && <SubscribersStats subscribers={subscribers} />}
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <SubscribersToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          subscribers={subscribers}
          advancedFiltered={advancedFiltered}
          onAdvancedFilterChange={setAdvancedFiltered}
          stats={stats}
          onQuickFilter={setQuickFilter}
        />
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <SubscribersList
            filteredSubscribers={filteredSubscribers}
            rawSubscribers={subscribers}
            selectedIds={selection.selectedIds}
            onSelectionChange={(ids) => selection.setSelectedIds(ids)}
            selection={selection}
            getPlanLabel={getPlanLabel}
            getPlanColor={getPlanColor}
            onEdit={openEditModal}
            onToggleStatus={handleToggleStatus}
            onViewData={setViewingSubscriber}
            onDuplicate={(sub) => {
              setNewSubscriber({
                email: '',
                linked_user_email: sub.linked_user_email || '',
                name: sub.name ? `${sub.name} (cópia)` : '',
                slug: '',
                plan: sub.plan || 'basic',
                status: sub.status || 'active',
                expires_at: sub.expires_at || '',
                permissions: sub.permissions || getPlanPermissions(sub.plan || 'basic'),
                phone: sub.phone || '',
                cnpj_cpf: sub.cnpj_cpf || '',
                origem: sub.origem || 'manual',
                tags: Array.isArray(sub.tags) ? [...sub.tags] : [],
                notes: sub.notes || ''
              });
              setShowAddModal(true);
              toast.success('Dados copiados. Informe um novo email e salve.');
            }}
            onDelete={setSubscriberToDelete}
            regenerateToken={regenerateToken}
            generateTokenPending={generateTokenMutation.isPending}
            updateMutation={updateMutation}
            deleteMutation={deleteMutation}
            pagination={pagination}
            page={page}
            limit={limit}
            onPagePrev={() => setPage((p) => Math.max(1, p - 1))}
            onPageNext={() => setPage((p) => Math.min(pagination?.totalPages ?? 1, p + 1))}
            isLoading={subscribersLoading}
            searchTerm={searchTerm}
            onAddClick={() => setShowAddModal(true)}
            onRefetch={refetchSubscribers}
            isError={subscribersError}
            errorMessage={errorMessage}
            serverWarming={serverWarming}
            loadingStuck={loadingStuck}
          />
        </div>
      </div>

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-200" aria-describedby="add-subscriber-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Adicionar Assinante
            </DialogTitle>
            <DialogDescription id="add-subscriber-desc">
              Preencha os dados do novo assinante. Campos com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>

          <TooltipProvider>
            <div className="space-y-4 py-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-foreground">Email da Assinatura *</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
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
                <p className="text-xs text-muted-foreground mt-1">
                  Email do titular da assinatura
                </p>
              </div>
              
              <div data-field="email-acesso" className="border-l-2 border-primary/30 pl-3">
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-foreground" htmlFor="linked_user_email">Email de Acesso / Email personalizado (opcional)</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
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
                <p className="text-xs text-muted-foreground mt-1">
                  Se diferente, informe o email do usuário que terá acesso ao painel
                </p>
              </div>
              
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-foreground">Nome</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
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
                  <label className="text-sm font-medium text-foreground mb-1 block">Status</label>
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
                  <label className="text-sm font-medium text-foreground mb-1 block flex items-center gap-1">
                    <Phone className="w-4 h-4 text-primary" />
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
                  <label className="text-sm font-medium text-foreground mb-1 block flex items-center gap-1">
                    <Building2 className="w-4 h-4 text-primary" />
                    CNPJ/CPF
                  </label>
                  <Input
                    placeholder="00.000.000/0001-00"
                    value={newSubscriber.cnpj_cpf || ''}
                    onChange={(e) => setNewSubscriber({...newSubscriber, cnpj_cpf: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Origem</label>
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
                  <label className="text-sm font-medium text-foreground flex items-center gap-1">
                    <Link2 className="w-4 h-4 text-primary" />
                    Link do cardápio
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
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
                <p className="text-xs text-muted-foreground mt-1">URL: /s/<span className="font-mono">{normalizeSlug(newSubscriber.slug) || '...'}</span></p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block flex items-center gap-1">
                  <Tag className="w-4 h-4 text-primary" />
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
                    <label className="text-sm font-medium text-foreground">Data de Expiração</label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
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
                  <label className="text-sm font-medium text-foreground mb-1 block">Observações</label>
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
              className="bg-primary text-primary-foreground hover:opacity-90"
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
        <DialogContent size="large" className="max-h-[90vh] flex flex-col" aria-describedby="edit-subscriber-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Editar Assinante
            </DialogTitle>
            <DialogDescription id="edit-subscriber-desc">
              Edite as informações e permissões do assinante
            </DialogDescription>
          </DialogHeader>

          {editingSubscriber && (
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Email da Assinatura</label>
                  <Input
                    type="email"
                    value={editingSubscriber.email}
                    disabled
                    className="bg-muted"
                  />
                </div>
                
                <div data-field="email-acesso" className="border-l-2 border-primary/30 pl-3">
                  <label className="text-sm font-medium text-foreground mb-1 block" htmlFor="edit-linked_user_email">Email de Acesso / Email personalizado</label>
                  <Input
                    id="edit-linked_user_email"
                    type="email"
                    placeholder="Se diferente do email da assinatura"
                    value={editingSubscriber.linked_user_email || ''}
                    onChange={(e) => setEditingSubscriber({...editingSubscriber, linked_user_email: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email do usuário que terá acesso ao painel (deixe vazio se for o mesmo da assinatura)
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Nome</label>
                  <Input
                    value={editingSubscriber.name || ''}
                    onChange={(e) => setEditingSubscriber({...editingSubscriber, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block flex items-center gap-1">
                    <Link2 className="w-4 h-4 text-primary" />
                    Link do cardápio
                  </label>
                  <Input
                    placeholder="ex: meu-restaurante"
                    value={editingSubscriber.slug || ''}
                    onChange={(e) => setEditingSubscriber({...editingSubscriber, slug: e.target.value})}
                    onBlur={(e) => setEditingSubscriber(prev => ({...prev, slug: normalizeSlug(prev.slug)}))}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">URL: /s/<span className="font-mono">{normalizeSlug(editingSubscriber.slug) || '...'}</span></p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block flex items-center gap-1">
                    <Phone className="w-4 h-4 text-primary" />
                    Telefone
                  </label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={editingSubscriber.phone || ''}
                    onChange={(e) => setEditingSubscriber({...editingSubscriber, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block flex items-center gap-1">
                    <Building2 className="w-4 h-4 text-primary" />
                    CNPJ/CPF
                  </label>
                  <Input
                    placeholder="00.000.000/0001-00"
                    value={editingSubscriber.cnpj_cpf || ''}
                    onChange={(e) => setEditingSubscriber({...editingSubscriber, cnpj_cpf: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Origem</label>
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
                  <label className="text-sm font-medium text-foreground mb-1 block flex items-center gap-1">
                    <Tag className="w-4 h-4 text-primary" />
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
                  <label className="text-sm font-medium text-foreground mb-1 block">Status</label>
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
                  <label className="text-sm font-medium text-foreground mb-1 block">Data de Expiração</label>
                  <Input
                    type="date"
                    value={editingSubscriber.expires_at || ''}
                    onChange={(e) => setEditingSubscriber({...editingSubscriber, expires_at: e.target.value})}
                  />
                </div>
              </div>

              {/* Limites efetivos e add-on de pedidos (Monetização 2.0) */}
              {editingSubscriber.plan && editingSubscriber.plan !== 'custom' && (() => {
                const base = getPlanLimits(editingSubscriber.plan);
                const addonsOrders = Number(editingSubscriber.addons?.orders) || 0;
                const effectiveOrders = base && base.orders_per_month !== UNLIMITED
                  ? base.orders_per_month + addonsOrders
                  : (base?.orders_per_month === UNLIMITED ? 'Ilimitado' : '-');
                return (
                  <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                    <h4 className="text-sm font-semibold text-foreground">Limites e add-ons</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-muted-foreground">Pedidos/mês (efetivo):</div>
                      <div className="font-medium">{effectiveOrders}</div>
                      <div className="text-muted-foreground">Produtos:</div>
                      <div className="font-medium">{base?.products === UNLIMITED ? 'Ilimitado' : base?.products ?? '-'}</div>
                      <div className="text-muted-foreground">Colaboradores:</div>
                      <div className="font-medium">{base?.collaborators ?? '-'}</div>
                      <div className="text-muted-foreground">Unidades:</div>
                      <div className="font-medium">{base?.locations ?? '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Volume extra de pedidos/mês</label>
                      <Select
                        value={String(Number(editingSubscriber.addons?.orders) || 0)}
                        onValueChange={(v) => setEditingSubscriber(prev => ({
                          ...prev,
                          addons: { ...(prev.addons || {}), orders: Number(v) || 0 }
                        }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ADDONS_ORDERS_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })()}

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
                  <label className="text-sm font-medium text-foreground mb-2 block">Histórico de Alterações</label>
                  <div className="bg-muted rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                    {permissionLogs.map(log => (
                      <div key={log.id} className="text-xs bg-white p-2 rounded border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">{log.description}</span>
                          <span className="text-muted-foreground">
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
                        <p className="text-muted-foreground">Por: {log.changed_by}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Observações</label>
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
              className="bg-primary text-primary-foreground hover:opacity-90"
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