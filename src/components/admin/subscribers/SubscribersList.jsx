import React from 'react';
import { Users, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/ui/EmptyState';
import BulkActions from './BulkActions';
import SubscriberRow from './SubscriberRow';
import PaginationBar from './PaginationBar';
import toast from 'react-hot-toast';

/**
 * Lista de assinantes: bulk actions, linhas, empty/loading/error, paginação.
 */
export default function SubscribersList({
  filteredSubscribers = [],
  rawSubscribers = [],
  selectedIds,
  onSelectionChange,
  selection,
  getPlanLabel,
  getPlanColor,
  onEdit,
  onToggleStatus,
  onViewData,
  onDuplicate,
  onDelete,
  regenerateToken,
  generateTokenPending,
  updateMutation,
  deleteMutation,
  pagination,
  page,
  limit,
  onPagePrev,
  onPageNext,
  isLoading,
  searchTerm,
  onAddClick,
  onRefetch,
  isError,
  errorMessage,
  serverWarming,
  loadingStuck,
}) {
  const selectedIdsArray = Array.isArray(selectedIds) ? selectedIds : Array.from(selectedIds || []);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-destructive font-medium mb-2">Erro ao carregar assinantes</p>
        <p className="text-muted-foreground text-sm mb-4 max-w-md">{errorMessage}</p>
        <Button onClick={onRefetch} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (serverWarming) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" aria-hidden />
        <p className="text-foreground font-medium">Iniciando servidor...</p>
        <p className="text-muted-foreground text-sm mt-1">Aguarde até 60 segundos na primeira vez</p>
      </div>
    );
  }

  if (isLoading && loadingStuck) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-3" aria-hidden />
        <p className="text-foreground font-medium mb-2">Demorou mais do que o esperado</p>
        <p className="text-muted-foreground text-sm mb-4">Cold start pode levar até 2 min. Aguarde ou tente novamente.</p>
        <Button onClick={onRefetch} variant="outline" className="gap-2 border-amber-400">
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" aria-hidden />
        <p className="text-foreground">Carregando assinantes...</p>
        <p className="text-muted-foreground text-xs mt-1">Cold start: até 2 min na primeira vez</p>
      </div>
    );
  }

  if (filteredSubscribers.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Nenhum assinante encontrado"
        description={
          searchTerm
            ? `Nenhum resultado para "${searchTerm}". Tente outros termos.`
            : 'Adicione seu primeiro assinante para começar.'
        }
        action={onAddClick}
        actionLabel="Adicionar Assinante"
      />
    );
  }

  return (
    <>
      <BulkActions
        subscribers={filteredSubscribers}
        selectedIds={selectedIdsArray}
        onSelectionChange={onSelectionChange}
        onBulkAction={async (action, selectedSubscribers) => {
          try {
            switch (action) {
              case 'activate':
                await Promise.all(
                  selectedSubscribers.map((sub) =>
                    updateMutation.mutateAsync({
                      id: sub.id,
                      data: { ...sub, status: 'active' },
                      originalData: sub,
                    })
                  )
                );
                toast.success(`${selectedSubscribers.length} assinante(s) ativado(s)!`);
                break;
              case 'deactivate':
                await Promise.all(
                  selectedSubscribers.map((sub) =>
                    updateMutation.mutateAsync({
                      id: sub.id,
                      data: { ...sub, status: 'inactive' },
                      originalData: sub,
                    })
                  )
                );
                toast.success(`${selectedSubscribers.length} assinante(s) desativado(s)!`);
                break;
              case 'delete':
                await Promise.all(selectedSubscribers.map((sub) => deleteMutation.mutateAsync(sub.id)));
                toast.success(`${selectedSubscribers.length} assinante(s) excluído(s)!`);
                break;
              case 'export':
                const { exportSubscribersToCSV, downloadCSV } = await import('@/utils/csvUtils');
                const csvContent = exportSubscribersToCSV(selectedSubscribers);
                const dateStr = new Date().toISOString().split('T')[0];
                downloadCSV(csvContent, `assinantes_selecionados_${dateStr}.csv`);
                toast.success(`${selectedSubscribers.length} assinante(s) exportado(s)!`);
                break;
              default:
                break;
            }
            selection?.clear();
          } catch (err) {
            throw err;
          }
        }}
      />
      <div className="divide-y divide-border" role="list">
        {filteredSubscribers.map((subscriber) => (
          <SubscriberRow
            key={subscriber.id}
            subscriber={subscriber}
            isSelected={selection?.isSelected(subscriber.id)}
            onToggleSelect={selection?.toggle}
            getPlanLabel={getPlanLabel}
            getPlanColor={getPlanColor}
            onEdit={onEdit}
            onToggleStatus={onToggleStatus}
            onViewData={onViewData}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            regenerateToken={regenerateToken}
            generateTokenPending={generateTokenPending}
          />
        ))}
      </div>
      {pagination && pagination.totalPages > 1 && (
        <PaginationBar
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={limit}
          isLoading={isLoading}
          onPrev={onPagePrev}
          onNext={onPageNext}
        />
      )}
    </>
  );
}
