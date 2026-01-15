import { ThemeProvider } from '@/components/theme/ThemeProvider';

export default function Layout({ children }) {
  return (
    <ThemeProvider>
      <style>{`
        :root {
          /* Variáveis CSS serão definidas dinamicamente pelo ThemeProvider */
          --bg-primary: #ffffff;
          --bg-secondary: #f8f9fa;
          --bg-tertiary: #f1f3f5;
          --bg-card: #ffffff;
          --bg-input: #ffffff;
          --bg-hover: #f5f5f5;
          --text-primary: #1a1a1a;
          --text-secondary: #4a5568;
          --text-muted: #718096;
          --text-disabled: #a0aec0;
          --border-color: #e2e8f0;
          --border-hover: #cbd5e0;
          --border-focus: #f97316;
          --accent: #f97316;
          --accent-hover: #ea580c;
          --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        body {
          background-color: var(--bg-primary);
          color: var(--text-primary);
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        /* Inputs - Garantir visibilidade e contraste em ambos os modos */
        input, textarea, select {
          background-color: var(--bg-input) !important;
          color: var(--text-primary) !important;
          border-color: var(--border-color) !important;
          border-width: 1px !important;
        }

        input:focus, textarea:focus, select:focus {
          border-color: var(--border-focus) !important;
          outline-color: var(--border-focus) !important;
          outline-width: 2px !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 3px var(--border-focus)20 !important;
        }

        input::placeholder, textarea::placeholder {
          color: var(--text-muted) !important;
          opacity: 0.7 !important;
        }

        /* Cards - Melhor contraste e visibilidade */
        .card, [class*="card"], [class*="Card"] {
          background-color: var(--bg-card) !important;
          color: var(--text-primary) !important;
          border-color: var(--border-color) !important;
        }

        /* Linhas e bordas - Garantir visibilidade */
        hr, .border, [class*="border"] {
          border-color: var(--border-color) !important;
        }

        /* Textos - Melhor contraste */
        .text-gray-900, .dark .text-gray-900 {
          color: var(--text-primary) !important;
        }

        .text-gray-800, .dark .text-gray-800 {
          color: var(--text-primary) !important;
        }

        .text-gray-700, .dark .text-gray-700 {
          color: var(--text-secondary) !important;
        }

        .text-gray-600, .dark .text-gray-600 {
          color: var(--text-secondary) !important;
        }

        .text-gray-500, .dark .text-gray-500 {
          color: var(--text-muted) !important;
        }

        .text-gray-400, .dark .text-gray-400 {
          color: var(--text-muted) !important;
        }

        .text-gray-300, .dark .text-gray-300 {
          color: var(--text-muted) !important;
          opacity: 0.8;
        }

        /* Backgrounds - Garantir contraste adequado */
        .bg-white, .dark .bg-white {
          background-color: var(--bg-card) !important;
        }

        .bg-gray-50, .dark .bg-gray-50 {
          background-color: var(--bg-secondary) !important;
        }

        .bg-gray-100, .dark .bg-gray-100 {
          background-color: var(--bg-tertiary) !important;
        }

        .bg-gray-200, .dark .bg-gray-200 {
          background-color: var(--bg-tertiary) !important;
        }

        /* Borders - Visibilidade garantida */
        .border-gray-200, .dark .border-gray-200 {
          border-color: var(--border-color) !important;
        }

        .border-gray-300, .dark .border-gray-300 {
          border-color: var(--border-color) !important;
        }

        .border-gray-400, .dark .border-gray-400 {
          border-color: var(--border-hover) !important;
        }

        /* Scrollbar - Estilização melhorada */
        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        ::-webkit-scrollbar-track {
          background: var(--bg-secondary);
          border-radius: 5px;
        }

        ::-webkit-scrollbar-thumb {
          background: var(--bg-tertiary);
          border-radius: 5px;
          border: 2px solid var(--bg-secondary);
        }

        ::-webkit-scrollbar-thumb:hover {
          background: var(--border-hover);
        }

        /* Links - Melhor visibilidade */
        a {
          color: var(--accent);
          transition: color 0.2s ease;
        }

        a:hover {
          color: var(--accent-hover);
        }

        /* Botões - Contraste melhorado */
        button {
          transition: all 0.2s ease;
        }

        /* Tabelas - Linhas visíveis */
        table, thead, tbody, tr, td, th {
          border-color: var(--border-color) !important;
        }

        /* Dividers - Visibilidade */
        .divide-y > :not([hidden]) ~ :not([hidden]) {
          border-top-color: var(--border-color) !important;
        }

        .divide-x > :not([hidden]) ~ :not([hidden]) {
          border-left-color: var(--border-color) !important;
        }

        /* Seleção de texto */
        ::selection {
          background-color: var(--accent);
          color: white;
        }

        ::-moz-selection {
          background-color: var(--accent);
          color: white;
        }

        /* Focus visible - Acessibilidade */
        *:focus-visible {
          outline: 2px solid var(--border-focus);
          outline-offset: 2px;
        }

        /* Transições suaves */
        * {
          transition-property: background-color, border-color, color, fill, stroke;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 150ms;
        }
      `}</style>
      {children}
    </ThemeProvider>
  );
}
