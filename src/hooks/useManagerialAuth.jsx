/**
 * Hook para exigir autorização (matrícula + senha) antes de executar ações sensíveis.
 * Retorna requireAuthorization(actionName, onSuccess) que abre o modal; ao validar, chama onSuccess().
 */
import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient as base44 } from '@/api/apiClient';
import { usePermission } from '@/components/permissions/usePermission';
import ManagerialAuthModal from '@/components/admin/ManagerialAuthModal';
import toast from 'react-hot-toast';

const ACTION_LABELS = {
  abrir_caixa: { title: 'Abrir caixa', description: 'Informe sua matrícula e senha para abrir o caixa.' },
  fechar_caixa: { title: 'Fechar caixa', description: 'Informe sua matrícula e senha para fechar o caixa.' },
  sangria: { title: 'Sangria (retirada)', description: 'Informe sua matrícula e senha para realizar retirada do caixa.' },
  suprimento: { title: 'Suprimento (adicionar troco)', description: 'Informe sua matrícula e senha para adicionar troco ao caixa.' },
  editar: { title: 'Editar', description: 'Informe sua matrícula e senha para confirmar a edição.' },
  duplicar: { title: 'Duplicar', description: 'Informe sua matrícula e senha para duplicar.' },
  excluir: { title: 'Excluir', description: 'Informe sua matrícula e senha para confirmar a exclusão.' },
  importar: { title: 'Importar', description: 'Informe sua matrícula e senha para importar dados.' },
  exportar: { title: 'Exportar', description: 'Informe sua matrícula e senha para exportar dados.' },
  funcoes_financeiras: { title: 'Funções financeiras', description: 'Informe sua matrícula e senha para esta ação.' },
  default: { title: 'Confirmação necessária', description: 'Informe sua matrícula e senha para autorizar esta ação.' },
};

export function useManagerialAuth() {
  const { user, menuContext } = usePermission();
  const asSub = menuContext?.type === 'subscriber' ? menuContext.value : (user?.subscriber_email || user?.email);
  const roles = user?.profile_roles?.length ? user.profile_roles : user?.profile_role ? [user.profile_role] : [];
  const isGerente = roles.includes('gerente');
  const isMaster = !!user?.is_master;

  const pendingSuccessRef = useRef(null);
  const [modalState, setModalState] = useState({
    open: false,
    actionName: 'default',
  });

  const { data: authConfig } = useQuery({
    queryKey: ['managerial-auth', asSub],
    queryFn: () => base44.get('/managerial-auth', asSub ? { as_subscriber: asSub } : {}),
    enabled: !!asSub && !isMaster,
  });

  const configured = isMaster
    ? true
    : isGerente
      ? !!authConfig?.gerente?.configured
      : !!authConfig?.assinante?.configured;

  const validate = useCallback(
    async ({ matricula, password }) => {
      const res = await base44.post('/managerial-auth/validate', { matricula, password });
      return !!res?.valid;
    },
    []
  );

  const requireAuthorization = useCallback(
    (actionName, onSuccess) => {
      if (isMaster) {
        onSuccess?.();
        return;
      }
      if (!configured) {
        toast.error('Configure a autorização gerencial em Sistema > Autorização gerencial para usar esta ação.');
        return;
      }
      pendingSuccessRef.current = typeof onSuccess === 'function' ? onSuccess : null;
      setModalState({
        open: true,
        actionName: actionName || 'default',
      });
    },
    [configured, isMaster]
  );

  const handleValidate = async (credentials) => {
    const valid = await validate(credentials);
    const onSuccess = pendingSuccessRef.current;
    if (valid && onSuccess) {
      pendingSuccessRef.current = null;
      try {
        onSuccess();
      } catch (e) {
        toast.error(e?.message || 'Erro ao executar a ação.');
      }
    }
    return valid;
  };

  const modalLabel = ACTION_LABELS[modalState.actionName] || ACTION_LABELS.default;

  const modal = (
    <ManagerialAuthModal
      open={modalState.open}
      onOpenChange={(open) => setModalState((s) => ({ ...s, open }))}
      title={modalLabel.title}
      description={modalLabel.description}
      onValidate={handleValidate}
      actionLabel="Validar"
    />
  );

  return { requireAuthorization, configured, isMaster, modal };
}
