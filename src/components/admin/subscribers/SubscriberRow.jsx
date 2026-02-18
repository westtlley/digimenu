import React from 'react';
import {
  Mail,
  Check,
  X,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  CheckSquare,
  Square,
  ExternalLink,
  Package,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatBrazilianDate } from '@/components/utils/dateUtils';
import ExpirationProgressBar from './ExpirationProgressBar';

/**
 * Linha compacta de um assinante: seleção | nome/email | plano | status | expira | senha (ícone) | ações (dropdown).
 * Não exibe token/link de senha.
 */
export default function SubscriberRow({
  subscriber,
  isSelected,
  onToggleSelect,
  getPlanLabel,
  getPlanColor,
  onEdit,
  onToggleStatus,
  onViewData,
  onDuplicate,
  onDelete,
  regenerateToken,
  generateTokenPending,
}) {
  const hasPassword = !!subscriber.has_password;

  return (
    <div
      className={cn(
        'flex items-center gap-3 py-2 px-3 border-b border-border last:border-0 hover:bg-muted/50',
        isSelected && 'bg-primary/10 border-l-2 border-l-primary'
      )}
      role="row"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onToggleSelect(subscriber.id)}
          aria-label={isSelected ? 'Desmarcar' : 'Selecionar'}
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-primary" />
          ) : (
            <Square className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-foreground truncate">
              {subscriber.name || subscriber.email}
            </p>
            <Badge className={cn('text-xs shrink-0', getPlanColor(subscriber.plan))}>
              {getPlanLabel(subscriber.plan)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">{subscriber.email}</p>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-2 shrink-0">
        <Badge
          className={cn(
            'text-xs',
            subscriber.status === 'active'
              ? 'bg-green-500/15 text-green-700 dark:text-green-300'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {subscriber.status === 'active' ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      <div className="hidden md:block shrink-0 max-w-[140px]">
        {subscriber.expires_at ? (
          <ExpirationProgressBar expiresAt={subscriber.expires_at} className="text-xs" />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      <div className="shrink-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center">
                {hasPassword ? (
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" aria-label="Senha definida" />
                ) : (
                  <Lock className="w-4 h-4 text-amber-500" aria-label="Senha pendente" />
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{hasPassword ? 'Senha já definida' : 'Senha pendente'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Menu de opções">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {subscriber.slug && (
            <DropdownMenuItem onClick={() => window.open(`/s/${subscriber.slug}`, '_blank', 'noopener')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir cardápio
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => onViewData(subscriber)}>
            <Package className="w-4 h-4 mr-2" />
            Ver Dados Completos
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(subscriber)}>
            <Edit className="w-4 h-4 mr-2" />
            Editar Assinatura
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onToggleStatus(subscriber)}>
            {subscriber.status === 'active' ? (
              <>
                <X className="w-4 h-4 mr-2" />
                Desativar
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Ativar
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDuplicate(subscriber)}>
            <Copy className="w-4 h-4 mr-2" />
            Duplicar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => regenerateToken(subscriber)}
            disabled={generateTokenPending}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', generateTokenPending && 'animate-spin')} />
            Resetar Senha
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(subscriber)} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
