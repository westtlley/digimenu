import { useMemo, useState, useEffect } from 'react';
import { 
  adaptPrimaryColorForDark, 
  getTextColorForDark, 
  getSecondaryTextColorForDark,
  adaptBackgroundForDark 
} from '@/utils/themeColors';

/**
 * Hook para adaptar cores do tema ao modo escuro
 * Garante contraste adequado mantendo a identidade das cores
 */
export function useAdaptedTheme(storeTheme) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark') || 
           window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Observar mudanças na classe dark do documento
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Observar mudanças na preferência do sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!document.documentElement.classList.contains('dark') && 
          !document.documentElement.classList.contains('light')) {
        setIsDark(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);
  
  // theme_* vem do Admin (ThemeTab); primary_color é legado
  const primaryColor = storeTheme?.theme_primary_color || storeTheme?.primary_color || '#f97316';
  const secondaryColor = storeTheme?.theme_secondary_color || storeTheme?.secondary_color || '#1f2937';
  const accentColor = storeTheme?.theme_accent_color || storeTheme?.accent_color || '#eab308';
  
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
