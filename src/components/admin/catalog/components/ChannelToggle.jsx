import React from 'react';
import { Button } from "@/components/ui/button";

export default function ChannelToggle({
  enabled = false,
  onToggle,
  disabled = false,
  loading = false,
  title,
  activeLabel = 'ON',
  inactiveLabel = 'OFF',
  loadingLabel = 'Salvando...',
  className = '',
}) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled || loading}
      onClick={onToggle}
      title={title || (enabled ? 'Desativar no canal' : 'Ativar no canal')}
      className={`h-9 min-w-[76px] rounded-full border px-3 text-xs font-semibold transition-colors ${
        enabled
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
      } ${className}`}
    >
      <span
        className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${
          enabled ? 'bg-emerald-500' : 'bg-slate-400'
        } ${loading ? 'animate-pulse' : ''}`}
      />
      {loading ? loadingLabel : (enabled ? activeLabel : inactiveLabel)}
    </Button>
  );
}
