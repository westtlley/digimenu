import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, HelpCircle, AlertCircle } from 'lucide-react';

/**
 * ContextualTooltip - Tooltip contextual com ícone
 * Exibe informações úteis sobre campos e funcionalidades
 */
export function ContextualTooltip({ 
  content, 
  children,
  icon = 'info',
  side = 'top',
  variant = 'default'
}) {
  const iconMap = {
    info: Info,
    help: HelpCircle,
    warning: AlertCircle,
  };

  const Icon = iconMap[icon] || Info;

  const variantStyles = {
    default: 'bg-gray-900 text-white',
    info: 'bg-blue-600 text-white',
    warning: 'bg-yellow-600 text-white',
    error: 'bg-red-600 text-white',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1">
            {children}
            <Icon className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side={side}
          className={variantStyles[variant]}
        >
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * FieldTooltip - Tooltip específico para campos de formulário
 */
export function FieldTooltip({ 
  label,
  description,
  required = false,
  error = null
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {description && (
        <ContextualTooltip content={description} icon="help" />
      )}
      {error && (
        <ContextualTooltip 
          content={error} 
          icon="warning" 
          variant="error"
        />
      )}
    </div>
  );
}
