import React from 'react';
import UpgradeModal from './UpgradeModal';
import { PLAN_COPY } from '../../constants/planLimits';
import { trackPlanEvent, EVENT_NAMES } from '../../utils/planEvents';

export default function LimitOrdersReachedModal({ open, onOpenChange, onUpgradeClick, onViewPlansClick }) {
  React.useEffect(() => {
    if (open) {
      trackPlanEvent(EVENT_NAMES.limit_orders_reached, { plan: 'basic' });
      trackPlanEvent(EVENT_NAMES.upgrade_modal_shown, { type: 'limit_orders_reached' });
    }
  }, [open]);

  return (
    <UpgradeModal
      open={open}
      onOpenChange={onOpenChange}
      title={PLAN_COPY.limit_orders_reached.title}
      description={PLAN_COPY.limit_orders_reached.message}
      ctaPrimary={PLAN_COPY.limit_orders_reached.ctaPrimary}
      ctaSecondary={PLAN_COPY.limit_orders_reached.ctaSecondary}
      ctaClose={PLAN_COPY.limit_orders_reached.ctaClose}
      onPrimaryClick={() => {
        trackPlanEvent(EVENT_NAMES.plan_upgrade_clicked, { from: 'limit_orders_reached', target: 'pro' });
        if (onUpgradeClick) onUpgradeClick();
      }}
      onSecondaryClick={() => {
        trackPlanEvent(EVENT_NAMES.plan_upgrade_clicked, { from: 'limit_orders_reached', action: 'view_plans' });
        if (onViewPlansClick) onViewPlansClick();
      }}
    />
  );
}
