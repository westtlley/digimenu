/**
 * Design Tokens - Sistema de Design Centralizado
 * Define todas as variáveis de design do sistema
 */

export const designTokens = {
  colors: {
    primary: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316', // Principal
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    },
    success: {
      50: '#ecfdf5',
      100: '#d1fae5',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
    },
    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
  },
  borderRadius: {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.5rem', // 24px
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  },
  transitions: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['Fira Code', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};

// Gradientes pré-definidos
export const gradients = {
  primary: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  error: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  info: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  subtle: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
  dark: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
};

// Classes CSS utilitárias
export const utilityClasses = {
  // Transições
  transition: {
    all: 'transition-all duration-200 ease-in-out',
    colors: 'transition-colors duration-200 ease-in-out',
    transform: 'transition-transform duration-200 ease-in-out',
    opacity: 'transition-opacity duration-200 ease-in-out',
  },
  // Hover effects
  hover: {
    lift: 'hover:-translate-y-1 hover:shadow-lg transition-all duration-200',
    scale: 'hover:scale-105 transition-transform duration-200',
    glow: 'hover:shadow-xl hover:shadow-orange-500/20 transition-shadow duration-200',
  },
  // Focus states
  focus: {
    ring: 'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2',
    ringOffset: 'focus:ring-offset-2 focus:ring-offset-white',
  },
};

export default designTokens;
