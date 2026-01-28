import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

export default function FieldWithTooltip({ 
  label, 
  tooltip, 
  required = false,
  children 
}) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium flex items-center gap-2">
          {label}
          {required && <span className="text-red-500">*</span>}
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </label>
      )}
      {children}
    </div>
  );
}
