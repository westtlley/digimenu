import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LIMIT_BLOCK_COPY, formatLimitCopy } from '@/constants/planLimits';
import { trackPlanEvent, EVENT_NAMES } from '@/utils/planEvents';
import { useNavigate } from 'react-router-dom';

const PLAN_LABELS = { free: 'Grátis', basic: 'Básico', pro: 'Pro', ultra: 'Ultra' };

/**
 * Modal único de bloqueio por limite (pedidos, colaboradores, produtos, localizações).
 * Copy vem de constantes; suporta dark mode.
 */
export default function LimitBlockModal({
  open,
  onOpenChange,
  type = 'orders',
  plan = 'basic',
  limit,
  used,
  suggestion,
  onUpgradeClick,
  onAddVolumeClick,
}) {
  const copy = LIMIT_BLOCK_COPY[type];
  const planLabel = PLAN_LABELS[plan] || plan;
  const limitDisplay = limit === -1 ? 'ilimitado' : String(limit);
  const message = copy
    ? formatLimitCopy(copy.message, {
        PLANO: planLabel,
        LIMITE: limitDisplay,
        USADOS: String(used ?? 0),
      })
    : '';

  const navigate = useNavigate();

  const handleUpgrade = () => {
    trackPlanEvent(EVENT_NAMES.plan_upgrade_clicked, { from: `limit_block_${type}`, target: 'plans' });
    onOpenChange?.(false);
    onUpgradeClick?.();
    navigate('/assinar');
  };

  const handleAddVolume = () => {
    trackPlanEvent(EVENT_NAMES.plan_upgrade_clicked, { from: `limit_block_${type}`, action: 'add_volume' });
    onOpenChange?.(false);
    onAddVolumeClick?.();
    navigate('/assinar#addons');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
        aria-describedby="limit-block-desc"
      >
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-slate-100">
            {copy?.title ?? 'Limite atingido'}
          </DialogTitle>
          <DialogDescription id="limit-block-desc" className="text-slate-600 dark:text-slate-400">
            {message}
          </DialogDescription>
        </DialogHeader>
        {suggestion && (
          <div className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
            <span className="font-medium">Sugestão:</span> {suggestion}
          </div>
        )}
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleUpgrade}
            className="bg-primary text-primary-foreground hover:opacity-90"
          >
            {copy?.ctaPrimary ?? 'Fazer upgrade'}
          </Button>
          {type === 'orders' && copy?.ctaSecondary && (
            <Button variant="outline" onClick={handleAddVolume}>
              {copy.ctaSecondary}
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange?.(false)}>
            {copy?.ctaClose ?? 'Fechar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
