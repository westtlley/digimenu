import React from 'react';
import ComplementsTab from '../ComplementsTab';

export default function ComplementsView({ onBackToMenu, onOpenTemplates }) {
  return (
    <ComplementsTab
      onSwitchToCategories={onBackToMenu}
      onOpenTemplates={onOpenTemplates}
    />
  );
}
