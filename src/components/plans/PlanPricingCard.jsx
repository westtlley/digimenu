import React from 'react';
import { PLAN_PRICING } from '../../constants/planLimits';
import { Button } from '../ui/button';

/**
 * Card de preço do plano (mensal/anual) para exibição e upgrade
 */
export default function PlanPricingCard({ plan, variant = 'monthly', onSelect, label = 'Ativar' }) {
  const pricing = PLAN_PRICING[plan];
  if (!pricing) return null;

  const price = variant === 'yearly' ? pricing.yearly : pricing.monthly;
  const yearlyLabel = pricing.yearlyLabel;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-2xl font-bold text-foreground">
        {price === 0 ? 'Grátis' : `R$ ${price}`}
        {price > 0 && <span className="text-sm font-normal text-muted-foreground">/mês</span>}
      </p>
      {variant === 'yearly' && yearlyLabel && (
        <p className="text-xs text-muted-foreground mt-1">{yearlyLabel}</p>
      )}
      {onSelect && (
        <Button
          className="mt-3 w-full bg-primary text-primary-foreground hover:opacity-90"
          size="sm"
          onClick={() => onSelect(plan)}
        >
          {label}
        </Button>
      )}
    </div>
  );
}
