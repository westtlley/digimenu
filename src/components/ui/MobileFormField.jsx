import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Campo de formulário otimizado para mobile
 * - Label acima do input
 * - Altura mínima de toque (44px)
 * - Espaçamento adequado
 * - Validação inline
 */
export function MobileFormField({
  label,
  error,
  required = false,
  hint,
  className,
  children,
  ...props
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      {hint && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}
      {children}
      {error && (
        <p className="text-red-500 text-xs flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Input otimizado para mobile
 */
export function MobileInput({ className, ...props }) {
  return (
    <Input
      className={cn("min-h-touch text-base", className)}
      {...props}
    />
  );
}

/**
 * Textarea otimizado para mobile
 */
export function MobileTextarea({ className, ...props }) {
  return (
    <Textarea
      className={cn("min-h-[100px] text-base", className)}
      {...props}
    />
  );
}

/**
 * Select otimizado para mobile
 */
export function MobileSelect({ className, children, ...props }) {
  return (
    <Select {...props}>
      <SelectTrigger className={cn("min-h-touch text-base", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {children}
      </SelectContent>
    </Select>
  );
}
