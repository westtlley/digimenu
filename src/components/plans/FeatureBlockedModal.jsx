import React from 'react';
import UpgradeModal from './UpgradeModal';
import { PLAN_COPY } from '../../constants/planLimits';
import { trackPlanEvent, EVENT_NAMES } from '../../utils/planEvents';

const FEATURE_MESSAGES = {
  coupons: PLAN_COPY.feature_blocked.messageCoupon,
  promotions: PLAN_COPY.feature_blocked.messagePromo,
  pizza_config: PLAN_COPY.feature_blocked.messagePizza,
  inventory: PLAN_COPY.feature_blocked.messageInventory,
  pdv: PLAN_COPY.feature_blocked.messagePdv,
  caixa: PLAN_COPY.feature_blocked.messagePdv,
  default: PLAN_COPY.feature_blocked.messageGeneric,
};

export default function FeatureBlockedModal({
  open,
  onOpenChange,
  feature = 'default',
  onUpgradeClick,
  onViewPlansClick,
}) {
  React.useEffect(() => {
    if (open) {
      trackPlanEvent(EVENT_NAMES.feature_blocked_by_plan, { feature });
      trackPlanEvent(EVENT_NAMES.upgrade_modal_shown, { type: 'feature_blocked', feature });
    }
  }, [open, feature]);

  const message = FEATURE_MESSAGES[feature] || FEATURE_MESSAGES.default;

  return (
    <UpgradeModal
      open={open}
      onOpenChange={onOpenChange}
      title={PLAN_COPY.feature_blocked.title}
      description={message}
      ctaPrimary={PLAN_COPY.feature_blocked.ctaPrimary}
      ctaSecondary={PLAN_COPY.feature_blocked.ctaSecondary}
      onPrimaryClick={() => {
        trackPlanEvent(EVENT_NAMES.plan_upgrade_clicked, { from: 'feature_blocked', feature, target: 'pro' });
        if (onUpgradeClick) onUpgradeClick();
      }}
      onSecondaryClick={() => {
        trackPlanEvent(EVENT_NAMES.plan_upgrade_clicked, { from: 'feature_blocked', action: 'view_plans' });
        if (onViewPlansClick) onViewPlansClick();
      }}
    />
  );
}
