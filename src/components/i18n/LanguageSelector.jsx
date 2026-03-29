import React from 'react';
import { Languages } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

export default function LanguageSelector({
  className,
  compact = false,
}) {
  const { language, setLanguage, availableLanguages, t } = useLanguage();
  const settingsText = t('settings.language');

  const getLanguageLabel = (code, defaultLabel) => {
    if (code === 'pt-BR') return settingsText.portuguese || defaultLabel;
    if (code === 'en-US') return settingsText.english || defaultLabel;
    return defaultLabel;
  };

  return (
    <div className={cn('rounded-lg border border-border bg-card p-3', className)}>
      <div className={cn('flex items-start gap-2', compact && 'mb-2')}>
        <Languages className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">
            {settingsText.label}
          </p>
          {!compact ? (
            <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
              {settingsText.description}
            </p>
          ) : null}
        </div>
      </div>

      <Select value={language} onValueChange={setLanguage}>
        <SelectTrigger
          className={cn(
            'mt-2 h-10 w-full text-left',
            compact && 'mt-0'
          )}
          aria-label={settingsText.label}
        >
          <SelectValue placeholder={settingsText.placeholder} />
        </SelectTrigger>
        <SelectContent align="end">
          {availableLanguages.map((option) => (
            <SelectItem key={option.code} value={option.code}>
              {getLanguageLabel(option.code, option.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
