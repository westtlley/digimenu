import React from 'react';
import { Button } from "@/components/ui/button";
import { Pause, Play } from 'lucide-react';

export default function DishStatusToggle({
  isActive = true,
  onToggle,
  disabled = false,
  title,
  className = '',
}) {
  const active = isActive !== false;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={`h-9 w-9 rounded-full border transition-colors ${
        active
          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
      } ${className}`}
      onClick={onToggle}
      disabled={disabled}
      title={title || (active ? 'Pausar item' : 'Ativar item')}
    >
      {active ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
    </Button>
  );
}
