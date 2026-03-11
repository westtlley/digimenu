import React from 'react';
import UIEmptyState from '@/components/ui/EmptyState';

/**
 * Compat wrapper para pontos antigos.
 * Mantém props legadas (onAction/actionLabel) usando a base visual de ui/EmptyState.
 */
export default function EmptyState(props) {
  return <UIEmptyState {...props} onAction={props.onAction} actionLabel={props.actionLabel} />;
}
