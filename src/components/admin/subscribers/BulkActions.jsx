import React, { useState } from 'react';
import { CheckSquare, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Check, X, Trash2, RefreshCw, Download } from 'lucide-react';

/**
 * Componente para ações em lote em assinantes
 */
export default function BulkActions({ 
  subscribers = [], 
  selectedIds = [], 
  onSelectionChange,
  onBulkAction,
  disabled = false
}) {
  const isAllSelected = subscribers.length > 0 && selectedIds.length === subscribers.length;
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(subscribers.map(s => s.id));
    }
  };

  const handleBulkAction = async (action) => {
    if (!selectedIds.length) {
      return;
    }

    const selectedSubscribers = subscribers.filter(s => selectedIds.includes(s.id));
    
    switch (action) {
      case 'activate':
        await onBulkAction?.('activate', selectedSubscribers);
        break;
      case 'deactivate':
        await onBulkAction?.('deactivate', selectedSubscribers);
        break;
      case 'delete':
        if (confirm(`Tem certeza que deseja excluir ${selectedIds.length} assinante(s)?`)) {
          await onBulkAction?.('delete', selectedSubscribers);
        }
        break;
      case 'export':
        await onBulkAction?.('export', selectedSubscribers);
        break;
      default:
        break;
    }
  };

  if (subscribers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-border bg-muted/50 px-4 rounded-t-lg">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSelectAll}
          className="gap-2 h-8"
          disabled={disabled}
        >
          {isAllSelected ? (
            <CheckSquare className="w-4 h-4" />
          ) : isSomeSelected ? (
            <div className="w-4 h-4 border-2 border-muted-foreground rounded bg-background">
              <div className="w-2 h-2 bg-primary rounded m-0.5" />
            </div>
          ) : (
            <Square className="w-4 h-4" />
          )}
          <span className="text-sm">
            {isAllSelected ? 'Desmarcar todos' : 'Selecionar todos'}
          </span>
        </Button>

        {selectedIds.length > 0 && (
          <Badge variant="secondary" className="gap-1">
            {selectedIds.length} selecionado{selectedIds.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {selectedIds.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-8">
              Ações em Lote
              <Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-xs">
                {selectedIds.length}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleBulkAction('activate')}>
              <Check className="w-4 h-4 mr-2" />
              Ativar {selectedIds.length} assinante(s)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleBulkAction('deactivate')}>
              <X className="w-4 h-4 mr-2" />
              Desativar {selectedIds.length} assinante(s)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleBulkAction('export')}>
              <Download className="w-4 h-4 mr-2" />
              Exportar {selectedIds.length} assinante(s)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleBulkAction('delete')}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir {selectedIds.length} assinante(s)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
