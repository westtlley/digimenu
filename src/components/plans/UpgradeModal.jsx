import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';

/**
 * Modal reutilizável de upgrade com copy e CTAs
 */
export default function UpgradeModal({
  open,
  onOpenChange,
  title,
  description,
  ctaPrimary,
  ctaSecondary,
  ctaClose = 'Fechar',
  onPrimaryClick,
  onSecondaryClick,
  primaryPlan = 'pro',
  children,
}) {
  const handlePrimary = () => {
    onPrimaryClick?.();
    onOpenChange?.(false);
  };
  const handleSecondary = () => {
    onSecondaryClick?.();
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby="upgrade-modal-desc">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription id="upgrade-modal-desc">{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {ctaPrimary && (
            <Button onClick={handlePrimary} className="bg-primary text-primary-foreground hover:opacity-90">
              {ctaPrimary}
            </Button>
          )}
          {ctaSecondary && (
            <Button variant="outline" onClick={handleSecondary}>
              {ctaSecondary}
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange?.(false)}>
            {ctaClose}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
