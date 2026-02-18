import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PLAN_COPY } from '@/constants/planLimits';
import { trackPlanEvent, EVENT_NAMES } from '@/utils/planEvents';
import { canShowLimit80Warning, markLimit80Shown } from '@/utils/limitCooldown';

/**
 * Banner discreto quando uso atinge >= 80% do limite de pedidos (não bloqueia).
 * Cooldown: máx 1x por dia por tipo (localStorage).
 */
export default function LimitBanner80({
  onViewPlans,
  className,
  percentUsed,
  suggestion = 'Dica: Pro libera até 3.000 pedidos/mês.',
}) {
  const [show, setShow] = useState(false);
  const percent = percentUsed ?? 0;
  const canShow = canShowLimit80Warning('orders');

  useEffect(() => {
    if (percent >= 80 && percent < 100 && canShow) {
      setShow(true);
      markLimit80Shown('orders');
      trackPlanEvent(EVENT_NAMES.limit_orders_80_percent, { percent });
    } else {
      setShow(false);
    }
  }, [percent, canShow]);

  if (!show) return null;

  const message =
    typeof percent === 'number'
      ? `Você já usou ${percent}% do seu limite de pedidos/mês. ${suggestion}`
      : PLAN_COPY.limit_orders_80.banner;

  return (
    <div
      role="alert"
      className={
        className ||
        'flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/10 dark:border-amber-500/40 px-3 py-2 text-sm text-foreground dark:text-slate-100'
      }
    >
      <span className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>{message}</span>
      </span>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => {
          trackPlanEvent(EVENT_NAMES.plan_upgrade_clicked, { from: 'banner_80', action: 'view_plans' });
          onViewPlans?.();
        }}
      >
        {PLAN_COPY.limit_orders_80.cta}
      </Button>
    </div>
  );
}
