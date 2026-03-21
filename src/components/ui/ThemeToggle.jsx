import React from 'react';
import { Button } from './button';
import { Sun, Moon } from 'lucide-react';
import { useAppTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';

/**
 * Theme Toggle Button
 * Botão reutilizável para alternar entre dark e light mode
 */
export default function ThemeToggle({ 
  className, 
  style,
  variant = 'ghost', 
  size = 'icon',
  showLabel = false 
}) {
  const { isDark, toggleTheme } = useAppTheme();

  return (
    <Button
      onClick={toggleTheme}
      variant={variant}
      size={size}
      className={cn(className)}
      style={style}
      title={isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
      aria-label={isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      {showLabel && (
        <span className="ml-2">
          {isDark ? 'Claro' : 'Escuro'}
        </span>
      )}
    </Button>
  );
}
