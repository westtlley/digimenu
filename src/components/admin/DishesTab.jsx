// ========= NOVO DISHESTAB - VERSÃO LIMPA E FUNCIONAL =========
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Upload, 
  Plus,
  Save,
  AlertCircle,
  Loader2,
  Settings
} from "lucide-react";

import { apiClient } from "@/api/apiClient";
import { uploadToCloudinary } from "@/utils/cloudinaryUpload";

// ========= FORMATADOR DE MOEDA =========
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
};

// ========= COMPONENTE PRINCIPAL =========
export default function DishesTabNew({ onNavigateToPizzas }) {
  console.log('🍽️ [DishesTabNew] Componente INICIADO');
  
  const queryClient = useQueryClient();
  const [expandedDishId, setExpandedDishId] = useState(null);

  // ========= BUSCAR PRATOS =========
  const { 
    data: dishes = [], 
    isLoading: dishesLoading,
    error: dishesError,
    refetch: refetchDishes
  } = useQuery({
    queryKey: ['dishes'],
    queryFn: async () => {
      console.log('📥 [DishesTabNew] Buscando pratos...');
      try {
        const result = await apiClient.entities.Dish.list();
        console.log('✅ [DishesTabNew] Pratos recebidos:', result?.length || 0);
        
        // Garantir que sempre retorne array
        if (!result) return [];
        if (Array.isArray(result)) return result;
        return [result];
      } catch (err) {
        console.error('❌ [DishesTabNew] Erro ao buscar pratos:', err);
        toast.error('Erro ao carregar pratos: ' + (err.message || 'Erro desconhecido'));
        return [];
      }
    },
    initialData: [],
    staleTime: 30000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });

  // ========= BUSCAR GRUPOS DE COMPLEMENTOS =========
  const { 
    data: complementGroups = [],
    isLoading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups
  } = useQuery({
    queryKey: ['complementGroups'],
    queryFn: async () => {
      console.log('📥 [DishesTabNew] Buscando grupos...');
      try {
        const result = await apiClient.entities.ComplementGroup.list('order');
        console.log('✅ [DishesTabNew] Grupos recebidos:', result?.length || 0);
        
        // Garantir que sempre retorne array
        if (!result) return [];
        if (Array.isArray(result)) return result;
        return [result];
      } catch (err) {
        console.error('❌ [DishesTabNew] Erro ao buscar grupos:', err);
        return [];
      }
    },
    initialData: [],
    staleTime: 30000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });

  // ========= MUTATION: ATUALIZAR GRUPO =========
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      console.log('💾 [DishesTabNew] Atualizando grupo:', id, data);
      return await apiClient.entities.ComplementGroup.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complementGroups'] });
      toast.success('Grupo atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('❌ [DishesTabNew] Erro ao atualizar grupo:', error);
      toast.error('Erro ao atualizar grupo: ' + (error.message || 'Erro desconhecido'));
    }
  });

  // ========= MUTATION: ATUALIZAR OPÇÃO =========
  const updateOptionMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      console.log('💾 [DishesTabNew] Atualizando opção:', id, data);
      return await apiClient.entities.ComplementOption.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complementGroups'] });
      toast.success('Opção atualizada!');
    },
    onError: (error) => {
      console.error('❌ [DishesTabNew] Erro ao atualizar opção:', error);
      toast.error('Erro ao atualizar opção: ' + (error.message || 'Erro desconhecido'));
    }
  });

  // ========= HANDLERS =========
  const handleToggleDish = (dishId) => {
    setExpandedDishId(expandedDishId === dishId ? null : dishId);
  };

  const handleUpdateGroupName = async (groupId, newName) => {
    if (!newName || newName.trim() === '') {
      toast.error('Nome do grupo não pode estar vazio');
      return;
    }
    
    updateGroupMutation.mutate({ 
      id: groupId, 
      data: { name: newName.trim() } 
    });
  };

  const handleUpdateOptionName = async (optionId, newName) => {
    if (!newName || newName.trim() === '') {
      toast.error('Nome da opção não pode estar vazio');
      return;
    }
    
    updateOptionMutation.mutate({ 
      id: optionId, 
      data: { name: newName.trim() } 
    });
  };

  const handleUpdateOptionPrice = async (optionId, newPrice) => {
    const priceValue = parseFloat(newPrice);
    
    if (isNaN(priceValue) || priceValue < 0) {
      toast.error('Preço inválido');
      return;
    }
    
    updateOptionMutation.mutate({ 
      id: optionId, 
      data: { price: priceValue } 
    });
  };

  const handleImageUpload = async (optionId, file) => {
    if (!file) return;

    try {
      toast.loading('Enviando imagem...');
      const imageUrl = await uploadToCloudinary(file, 'complements');
      
      updateOptionMutation.mutate({ 
        id: optionId, 
        data: { image: imageUrl } 
      });
      
      toast.dismiss();
      toast.success('Imagem enviada com sucesso!');
    } catch (err) {
      toast.dismiss();
      console.error('❌ [DishesTabNew] Erro ao enviar imagem:', err);
      toast.error('Erro ao enviar imagem: ' + (err.message || 'Erro desconhecido'));
    }
  };

  // ========= VALIDAÇÕES =========
  const safeDishes = Array.isArray(dishes) ? dishes : [];
  const safeGroups = Array.isArray(complementGroups) ? complementGroups : [];

  // ========= LOGS DE DEBUG =========
  useEffect(() => {
    console.log('🔍 [DishesTabNew] Estado:', {
      dishesCount: safeDishes.length,
      groupsCount: safeGroups.length,
      dishesLoading,
      groupsLoading,
      expandedDishId
    });
  }, [safeDishes.length, safeGroups.length, dishesLoading, groupsLoading, expandedDishId]);

  // ========= LOADING STATE =========
  if (dishesLoading || groupsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando pratos...</p>
        </div>
      </div>
    );
  }

  // ========= ERROR STATE =========
  if (dishesError || groupsError) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Erro ao carregar dados
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {dishesError?.message || groupsError?.message || 'Erro desconhecido'}
          </p>
          <Button 
            onClick={() => {
              refetchDishes();
              refetchGroups();
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  // ========= EMPTY STATE =========
  if (safeDishes.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Nenhum prato cadastrado
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Cadastre pratos no cardápio para configurar seus complementos aqui.
          </p>
          {onNavigateToPizzas && (
            <Button 
              onClick={onNavigateToPizzas}
              variant="outline"
              className="mr-2"
            >
              Configurar Pizzas
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ========= RENDER PRINCIPAL =========
  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Gerenciar Complementos dos Pratos
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Configure os complementos e opções disponíveis para cada prato
        </p>
      </div>

      {/* Lista de Pratos */}
      <div className="space-y-3">
        {safeDishes.map((dish) => {
          const isExpanded = expandedDishId === dish.id;
          const dishGroups = safeGroups.filter(group => {
            if (!dish.complement_groups || !Array.isArray(dish.complement_groups)) {
              return false;
            }
            return dish.complement_groups.some(cg => cg && cg.group_id === group.id);
          });

          return (
            <div 
              key={dish.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Header do Prato */}
              <button
                onClick={() => handleToggleDish(dish.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {dish.image && (
                    <img 
                      src={dish.image} 
                      alt={dish.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {dish.name}
                    </h3>
                    {dishGroups.length > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {dishGroups.length} grupo{dishGroups.length !== 1 ? 's' : ''} de complementos
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {formatCurrency(dish.price)}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </div>
              </button>

              {/* Conteúdo Expandido */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
                  {dishGroups.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      Este prato não possui grupos de complementos configurados
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {dishGroups.map((group) => {
                        const groupOptions = Array.isArray(group.options) ? group.options : [];
                        
                        return (
                          <div 
                            key={group.id}
                            className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800"
                          >
                            {/* Cabeçalho do Grupo */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex-1">
                                <Input
                                  value={group.name}
                                  onChange={(e) => handleUpdateGroupName(group.id, e.target.value)}
                                  onBlur={(e) => handleUpdateGroupName(group.id, e.target.value)}
                                  className="font-semibold text-base"
                                />
                              </div>
                              <Badge variant="outline" className="ml-2">
                                {groupOptions.length} opç{groupOptions.length !== 1 ? 'ões' : 'ão'}
                              </Badge>
                            </div>

                            {/* Opções do Grupo */}
                            {groupOptions.length === 0 ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                                Nenhuma opção cadastrada
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {groupOptions.map((option) => (
                                  <div 
                                    key={option.id}
                                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                                  >
                                    {/* Imagem */}
                                    <div className="relative">
                                      {option.image ? (
                                        <img 
                                          src={option.image}
                                          alt={option.name}
                                          className="w-16 h-16 rounded-lg object-cover"
                                        />
                                      ) : (
                                        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                          <Upload className="w-6 h-6 text-gray-400" />
                                        </div>
                                      )}
                                      <label className="absolute inset-0 cursor-pointer hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                              handleImageUpload(option.id, e.target.files[0]);
                                            }
                                          }}
                                        />
                                      </label>
                                    </div>

                                    {/* Nome */}
                                    <div className="flex-1">
                                      <Input
                                        value={option.name}
                                        onChange={(e) => handleUpdateOptionName(option.id, e.target.value)}
                                        onBlur={(e) => handleUpdateOptionName(option.id, e.target.value)}
                                        placeholder="Nome da opção"
                                      />
                                    </div>

                                    {/* Preço */}
                                    <div className="w-32">
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={option.price || 0}
                                        onChange={(e) => handleUpdateOptionPrice(option.id, e.target.value)}
                                        onBlur={(e) => handleUpdateOptionPrice(option.id, e.target.value)}
                                        placeholder="Preço"
                                        className="text-right"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
