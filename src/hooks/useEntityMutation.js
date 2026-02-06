/**
 * Hook useEntityMutation - Mutation padrão com tratamento de erro unificado
 * Invalidação de cache automática e toast notifications
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { log } from '@/utils/logger';
import toast from 'react-hot-toast';
import { usePermission } from '@/components/permissions/usePermission';

/**
 * Hook genérico para mutations de entidades
 * 
 * @param {Object} config - Configuração da mutation
 * @param {Function} config.mutationFn - Função da mutation
 * @param {string|Array} config.entityType - Tipo da entidade (para invalidar cache)
 * @param {string} config.successMessage - Mensagem de sucesso
 * @param {string} config.errorMessage - Mensagem de erro padrão
 * @param {Function} config.onSuccess - Callback adicional de sucesso
 * @param {Function} config.onError - Callback adicional de erro
 * @returns {Object} Mutation object do React Query
 */
export function useEntityMutation({
  mutationFn,
  entityType,
  successMessage = 'Operação realizada com sucesso!',
  errorMessage = 'Erro ao realizar operação',
  onSuccess: customOnSuccess,
  onError: customOnError,
  invalidateQueries = true,
}) {
  const queryClient = useQueryClient();
  const { menuContext } = usePermission();

  return useMutation({
    mutationFn: async (...args) => {
      try {
        log.api.log(`🔄 [useEntityMutation] Executando mutation para ${entityType}...`);
        const result = await mutationFn(...args);
        log.api.log(`✅ [useEntityMutation] Mutation bem-sucedida para ${entityType}`);
        return result;
      } catch (error) {
        log.api.error(`❌ [useEntityMutation] Erro na mutation para ${entityType}:`, error);
        throw error;
      }
    },
    onSuccess: (data, variables, context) => {
      // Invalidar cache automaticamente
      if (invalidateQueries) {
        const queryKeys = Array.isArray(entityType) ? entityType : [entityType];
        queryKeys.forEach(key => {
          // Invalidar com contexto se disponível
          if (menuContext) {
            queryClient.invalidateQueries({ 
              queryKey: [key, menuContext.type, menuContext.value] 
            });
          }
          // Também invalidar sem contexto (para compatibilidade)
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }

      // Toast de sucesso
      if (successMessage) {
        toast.success(successMessage, {
          duration: 3000,
          position: 'top-center'
        });
      }

      // Callback customizado
      if (customOnSuccess) {
        customOnSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      // Mensagem de erro padronizada
      const errorMsg = error?.message || errorMessage;
      toast.error(errorMsg, {
        duration: 5000,
        position: 'top-center'
      });

      // Callback customizado
      if (customOnError) {
        customOnError(error, variables, context);
      }
    }
  });
}

/**
 * Hook específico para criar entidade
 */
export function useCreateEntity(entityType, createFn, options = {}) {
  return useEntityMutation({
    mutationFn: createFn,
    entityType,
    successMessage: options.successMessage || `${entityType} criado com sucesso!`,
    errorMessage: options.errorMessage || `Erro ao criar ${entityType}`,
    ...options
  });
}

/**
 * Hook específico para atualizar entidade
 */
export function useUpdateEntity(entityType, updateFn, options = {}) {
  return useEntityMutation({
    mutationFn: updateFn,
    entityType,
    successMessage: options.successMessage || `${entityType} atualizado com sucesso!`,
    errorMessage: options.errorMessage || `Erro ao atualizar ${entityType}`,
    ...options
  });
}

/**
 * Hook específico para deletar entidade
 */
export function useDeleteEntity(entityType, deleteFn, options = {}) {
  return useEntityMutation({
    mutationFn: deleteFn,
    entityType,
    successMessage: options.successMessage || `${entityType} excluído com sucesso!`,
    errorMessage: options.errorMessage || `Erro ao excluir ${entityType}`,
    ...options
  });
}
