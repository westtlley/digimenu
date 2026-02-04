import { useMemo } from 'react';
import { 
  adaptPrimaryColorForDark, 
  getTextColorForDark, 
  getSecondaryTextColorForDark,
  adaptBackgroundForDark 
} from '@/utils/themeColors';

/**
 * Detecta se está em modo escuro
 */
function isDarkMode() {
  if (typeof window === 'undefined') return false;
  return document.documentElement.classList.contains('dark') || 
         window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Hook para adaptar cores do tema ao modo escuro
 * Garante contraste adequado mantendo a identidade das cores
 */
export function useAdaptedTheme(storeTheme) {
  const isDark = isDarkMode();
  
  const primaryColor = storeTheme?.theme_primary_color || '#f97316';
  const secondaryColor = storeTheme?.theme_secondary_color || '#1f2937';
  const accentColor = storeTheme?.theme_accent_color || '#eab308';
  
  return useMemo(() => {
    if (!isDark) {
      // Modo claro: usa cores originais
      return {
        primary: primaryColor,
        secondary: secondaryColor,
        accent: accentColor,
        textPrimary: '#1a1a1a',
        textSecondary: '#4a5568',
        textMuted: '#718096',
        background: '#ffffff',
      };
    }
    
    // Modo escuro: adapta cores mantendo identidade
    const darkBg = adaptBackgroundForDark(primaryColor);
    
    return {
      primary: adaptPrimaryColorForDark(primaryColor, darkBg),
      secondary: adaptPrimaryColorForDark(secondaryColor, darkBg),
      accent: adaptPrimaryColorForDark(accentColor, darkBg),
      textPrimary: getTextColorForDark(primaryColor, darkBg), // Títulos, preços
      textSecondary: getSecondaryTextColorForDark(primaryColor, darkBg), // Descrições
      textMuted: '#94a3b8', // Textos menos importantes
      background: darkBg,
    };
  }, [isDark, primaryColor, secondaryColor, accentColor]);
}
