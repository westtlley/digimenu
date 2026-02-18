import React from 'react';
import UpgradeModal from './UpgradeModal';
import { PLAN_COPY } from '../../constants/planLimits';
import { trackPlanEvent, EVENT_NAMES } from '../../utils/planEvents';

/**
 * Modal exibido quando o limite de colaboradores foi atingido
 */
export default function CollaboratorsLimitModal({ open, onOpenChange, onUpgradeClick, onViewPlansClick }) {
  React.useEffect(() => {
    if (open) {
      trackPlanEvent(EVENT_NAMES.feature_blocked_by_plan, { feature: 'collaborators_limit' });
      trackPlanEvent(EVENT_NAMES.upgrade_modal_shown, { type: 'collaborators_limit' });
    }
  }, [open]);

  return (
    <UpgradeModal
      open={open}
      onOpenChange={onOpenChange}
      title={PLAN_COPY.collaborators_limit.title}
      description={PLAN_COPY.collaborators_limit.message}
      ctaPrimary={PLAN_COPY.collaborators_limit.ctaPrimary}
      ctaSecondary={PLAN_COPY.collaborators_limit.ctaSecondary}
      onPrimaryClick={() => {
        trackPlanEvent(EVENT_NAMES.plan_upgrade_clicked, { from: 'collaborators_limit', target: 'pro' });
        onUpgradeClick?.();
      }}
      onSecondaryClick={() => {
        trackPlanEvent(EVENT_NAMES.plan_upgrade_clicked, { from: 'collaborators_limit', action: 'view_plans' });
        onViewPlansClick?.();
      }}
    />
  );
}
