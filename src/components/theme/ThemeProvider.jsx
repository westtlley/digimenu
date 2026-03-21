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

// Alias explicito para separar o dominio do tema do app do tema da loja publica.
export const useAppTheme = useTheme;
export const APP_THEME_PRESETS = THEME_PRESETS;

function parseColorToRgb(input) {
  const value = String(input || '').trim();
  if (!value) return null;

  if (value.startsWith('#')) {
    const hex = value.slice(1);
    if (hex.length === 3) {
      const r = parseInt(`${hex[0]}${hex[0]}`, 16);
      const g = parseInt(`${hex[1]}${hex[1]}`, 16);
      const b = parseInt(`${hex[2]}${hex[2]}`, 16);
      if ([r, g, b].every((n) => Number.isFinite(n))) return { r, g, b };
      return null;
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if ([r, g, b].every((n) => Number.isFinite(n))) return { r, g, b };
    }
    return null;
  }

  const rgbMatch = value.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgbMatch) return null;
  const parts = rgbMatch[1].split(',').map((p) => Number(p.trim()));
  if (parts.length < 3 || parts.slice(0, 3).some((n) => !Number.isFinite(n))) return null;
  return {
    r: Math.max(0, Math.min(255, parts[0])),
    g: Math.max(0, Math.min(255, parts[1])),
    b: Math.max(0, Math.min(255, parts[2])),
  };
}

function rgbToHslChannels({ r, g, b }) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rr) h = ((gg - bb) / delta) % 6;
    else if (max === gg) h = (bb - rr) / delta + 2;
    else h = (rr - gg) / delta + 4;
  }
  h = Math.round((h * 60 + 360) % 360);

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return `${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function colorToHslChannels(color, fallback) {
  const rgb = parseColorToRgb(color);
  return rgb ? rgbToHslChannels(rgb) : fallback;
}

function getReadableForegroundFor(color) {
  const rgb = parseColorToRgb(color);
  if (!rgb) return '0 0% 98%';
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 145 ? '0 0% 9%' : '0 0% 98%';
}

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = window.localStorage.getItem('theme');
    if (saved && THEME_PRESETS[saved]) {
      return saved;
    }
    return 'dark'; // Default dark
  });

  const [customTheme, setCustomTheme] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = window.localStorage.getItem('customTheme');
      return saved ? JSON.parse(saved) : null;
    } catch (_error) {
      return null;
    }
  });

  const activeTheme = customTheme || THEME_PRESETS[currentTheme];
  const isDark = activeTheme.mode === 'dark';

  useEffect(() => {
    if (typeof window === 'undefined') return;

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

    // Sincronizar tokens HSL usados por Tailwind/shadcn para evitar temas conflitantes.
    const hslTokens = {
      '--background': colorToHslChannels(colors.bgPrimary, isDark ? '220 39% 9%' : '0 0% 100%'),
      '--foreground': colorToHslChannels(colors.textPrimary, isDark ? '220 33% 93%' : '0 0% 4%'),
      '--card': colorToHslChannels(colors.bgCard, isDark ? '224 38% 13%' : '0 0% 100%'),
      '--card-foreground': colorToHslChannels(colors.textPrimary, isDark ? '220 33% 93%' : '0 0% 4%'),
      '--popover': colorToHslChannels(colors.bgTertiary || colors.bgCard, isDark ? '224 41% 18%' : '0 0% 100%'),
      '--popover-foreground': colorToHslChannels(colors.textPrimary, isDark ? '220 33% 93%' : '0 0% 4%'),
      '--primary': colorToHslChannels(colors.accent, '24 95% 53%'),
      '--primary-foreground': getReadableForegroundFor(colors.accent),
      '--secondary': colorToHslChannels(colors.bgSecondary, isDark ? '224 35% 15%' : '0 0% 96%'),
      '--secondary-foreground': colorToHslChannels(colors.textSecondary, isDark ? '224 27% 68%' : '0 0% 9%'),
      '--muted': colorToHslChannels(colors.bgTertiary, isDark ? '220 30% 14%' : '0 0% 96%'),
      '--muted-foreground': colorToHslChannels(colors.textMuted, isDark ? '220 9% 46%' : '0 0% 45%'),
      '--accent': colorToHslChannels(colors.bgHover || colors.bgSecondary, isDark ? '220 28% 16%' : '0 0% 96%'),
      '--accent-foreground': colorToHslChannels(colors.textPrimary, isDark ? '220 33% 93%' : '0 0% 9%'),
      '--border': colorToHslChannels(colors.borderColor, isDark ? '220 22% 18%' : '0 0% 90%'),
      '--input': colorToHslChannels(colors.bgInput || colors.borderColor, isDark ? '220 28% 16%' : '0 0% 90%'),
      '--ring': colorToHslChannels(colors.borderFocus || colors.accent, '24 95% 53%'),
      '--sidebar-background': colorToHslChannels(colors.bgSecondary, isDark ? '220 36% 11%' : '0 0% 98%'),
      '--sidebar-foreground': colorToHslChannels(colors.textSecondary, isDark ? '220 27% 68%' : '240 5% 26%'),
      '--sidebar-primary': colorToHslChannels(colors.accent, '24 95% 53%'),
      '--sidebar-primary-foreground': getReadableForegroundFor(colors.accent),
      '--sidebar-accent': colorToHslChannels(colors.bgHover || colors.bgTertiary, isDark ? '220 28% 15%' : '240 5% 96%'),
      '--sidebar-accent-foreground': colorToHslChannels(colors.textPrimary, isDark ? '220 33% 93%' : '240 6% 10%'),
      '--sidebar-border': colorToHslChannels(colors.borderColor, isDark ? '220 22% 18%' : '220 13% 91%'),
      '--sidebar-ring': colorToHslChannels(colors.borderFocus || colors.accent, '24 95% 53%'),
    };
    Object.entries(hslTokens).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Aplicar classe dark/light
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    root.style.colorScheme = isDark ? 'dark' : 'light';
  }, [currentTheme, customTheme, activeTheme, isDark]);

  const setTheme = (themeName) => {
    if (!THEME_PRESETS[themeName]) return;
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
