import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

// Temas pré-definidos
export const THEME_PRESETS = {
  light: {
    name: 'Claro',
    mode: 'light',
    colors: {
      bgPrimary: '#ffffff',
      bgSecondary: '#f8f9fa',
      bgTertiary: '#f1f3f5',
      bgCard: '#ffffff',
      bgInput: '#ffffff',
      bgHover: '#f5f5f5',
      textPrimary: '#1a1a1a',
      textSecondary: '#4a5568',
      textMuted: '#718096',
      textDisabled: '#a0aec0',
      borderColor: '#e2e8f0',
      borderHover: '#cbd5e0',
      borderFocus: '#f97316',
      accent: '#f97316',
      accentHover: '#ea580c',
    }
  },
  dark: {
    name: 'Escuro',
    mode: 'dark',
    colors: {
      bgPrimary: '#0f172a',
      bgSecondary: '#1e293b',
      bgTertiary: '#334155',
      bgCard: '#1e293b',
      bgInput: '#334155',
      bgHover: '#475569',
      textPrimary: '#f8fafc',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      textDisabled: '#64748b',
      borderColor: '#334155',
      borderHover: '#475569',
      borderFocus: '#f97316',
      accent: '#f97316',
      accentHover: '#ea580c',
    }
  },
  darkBlue: {
    name: 'Azul Escuro',
    mode: 'dark',
    colors: {
      bgPrimary: '#0a1628',
      bgSecondary: '#1a2332',
      bgTertiary: '#2a3441',
      bgCard: '#1a2332',
      bgInput: '#2a3441',
      bgHover: '#3a4450',
      textPrimary: '#e2e8f0',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      textDisabled: '#64748b',
      borderColor: '#2a3441',
      borderHover: '#3a4450',
      borderFocus: '#3b82f6',
      accent: '#3b82f6',
      accentHover: '#2563eb',
    }
  },
  darkGreen: {
    name: 'Verde Escuro',
    mode: 'dark',
    colors: {
      bgPrimary: '#0a1f0a',
      bgSecondary: '#1a2f1a',
      bgTertiary: '#2a3f2a',
      bgCard: '#1a2f1a',
      bgInput: '#2a3f2a',
      bgHover: '#3a4f3a',
      textPrimary: '#e2f0e2',
      textSecondary: '#cbd5cb',
      textMuted: '#94a394',
      textDisabled: '#647464',
      borderColor: '#2a3f2a',
      borderHover: '#3a4f3a',
      borderFocus: '#22c55e',
      accent: '#22c55e',
      accentHover: '#16a34a',
    }
  },
  lightWarm: {
    name: 'Claro Quente',
    mode: 'light',
    colors: {
      bgPrimary: '#fef7ed',
      bgSecondary: '#fff7ed',
      bgTertiary: '#ffedd5',
      bgCard: '#ffffff',
      bgInput: '#ffffff',
      bgHover: '#ffedd5',
      textPrimary: '#1c1917',
      textSecondary: '#57534e',
      textMuted: '#78716c',
      textDisabled: '#a8a29e',
      borderColor: '#e7d5c4',
      borderHover: '#d4c4b0',
      borderFocus: '#f97316',
      accent: '#f97316',
      accentHover: '#ea580c',
    }
  },
  darkPurple: {
    name: 'Roxo Escuro',
    mode: 'dark',
    colors: {
      bgPrimary: '#1a0a2e',
      bgSecondary: '#2a1a3e',
      bgTertiary: '#3a2a4e',
      bgCard: '#2a1a3e',
      bgInput: '#3a2a4e',
      bgHover: '#4a3a5e',
      textPrimary: '#f3e8ff',
      textSecondary: '#e9d5ff',
      textMuted: '#c084fc',
      textDisabled: '#a78bfa',
      borderColor: '#3a2a4e',
      borderHover: '#4a3a5e',
      borderFocus: '#a855f7',
      accent: '#a855f7',
      accentHover: '#9333ea',
    }
  },
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved && THEME_PRESETS[saved]) {
      return saved;
    }
    return 'dark'; // Default dark
  });

  const [customTheme, setCustomTheme] = useState(() => {
    const saved = localStorage.getItem('customTheme');
    return saved ? JSON.parse(saved) : null;
  });

  const activeTheme = customTheme || THEME_PRESETS[currentTheme];
  const isDark = activeTheme.mode === 'dark';

  useEffect(() => {
    localStorage.setItem('theme', currentTheme);
    if (customTheme) {
      localStorage.setItem('customTheme', JSON.stringify(customTheme));
    } else {
      localStorage.removeItem('customTheme');
    }

    // Aplicar tema no documento
    const root = document.documentElement;
    const colors = activeTheme.colors;

    // Aplicar variáveis CSS
    Object.entries(colors).forEach(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--${cssKey}`, value);
    });

    // Aplicar classe dark/light
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [currentTheme, customTheme, activeTheme, isDark]);

  const setTheme = (themeName) => {
    setCurrentTheme(themeName);
    setCustomTheme(null); // Limpar tema customizado ao escolher um preset
  };

  const setCustomThemeColors = (colors) => {
    const newCustomTheme = {
      name: 'Personalizado',
      mode: isDark ? 'dark' : 'light',
      colors: { ...activeTheme.colors, ...colors }
    };
    setCustomTheme(newCustomTheme);
  };

  const resetToPreset = () => {
    setCustomTheme(null);
  };

  const toggleTheme = () => {
    const newMode = isDark ? 'light' : 'dark';
    if (customTheme) {
      setCustomTheme({
        ...customTheme,
        mode: newMode,
        colors: {
          ...customTheme.colors,
          // Ajustar cores básicas baseado no modo
          bgPrimary: newMode === 'dark' ? '#0f172a' : '#ffffff',
          bgSecondary: newMode === 'dark' ? '#1e293b' : '#f8f9fa',
          textPrimary: newMode === 'dark' ? '#f8fafc' : '#1a1a1a',
          textSecondary: newMode === 'dark' ? '#cbd5e1' : '#4a5568',
        }
      });
    } else {
      setTheme(newMode === 'dark' ? 'dark' : 'light');
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      isDark, 
      currentTheme,
      activeTheme,
      customTheme,
      toggleTheme,
      setTheme,
      setCustomThemeColors,
      resetToPreset,
      themes: THEME_PRESETS
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
