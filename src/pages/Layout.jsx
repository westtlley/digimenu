
import { ThemeProvider } from '@/components/theme/ThemeProvider';

export default function Layout({ children }) {
  return (
    <ThemeProvider>
      <style>{`
        :root {
          /* Light Mode - Cores melhoradas com melhor contraste */
          --bg-primary: #ffffff;
          --bg-secondary: #f8f9fa;
          --bg-tertiary: #f1f3f5;
          --bg-card: #ffffff;
          --bg-input: #ffffff;
          --bg-hover: #f8f9fa;
          --text-primary: #1a1a1a;
          --text-secondary: #4a5568;
          --text-muted: #718096;
          --text-disabled: #a0aec0;
          --border-color: #e2e8f0;
          --border-hover: #cbd5e0;
          --border-focus: #f97316;
          --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .dark {
          /* Dark Mode - Cores melhoradas com melhor contraste */
          --bg-primary: #0f172a;
          --bg-secondary: #1e293b;
          --bg-tertiary: #334155;
          --bg-card: #1e293b;
          --bg-input: #334155;
          --bg-hover: #334155;
          --text-primary: #f8fafc;
          --text-secondary: #cbd5e1;
          --text-muted: #94a3b8;
          --text-disabled: #64748b;
          --border-color: #334155;
          --border-hover: #475569;
          --border-focus: #f97316;
          --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
        }

        body {
          background-color: var(--bg-primary);
          color: var(--text-primary);
          transition: background-color 0.2s ease, color 0.2s ease;
        }

        /* Inputs - Garantir visibilidade em ambos os modos */
        input, textarea, select {
          background-color: var(--bg-input) !important;
          color: var(--text-primary) !important;
          border-color: var(--border-color) !important;
        }

        input:focus, textarea:focus, select:focus {
          border-color: var(--border-focus) !important;
          outline-color: var(--border-focus) !important;
        }

        input::placeholder, textarea::placeholder {
          color: var(--text-muted) !important;
        }

        /* Cards - Melhor contraste */
        .card, [class*="card"] {
          background-color: var(--bg-card) !important;
          color: var(--text-primary) !important;
          border-color: var(--border-color) !important;
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: var(--bg-secondary);
        }
        ::-webkit-scrollbar-thumb {
          background: var(--bg-tertiary);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: var(--border-hover);
        }

        /* Garantir que textos em cards sejam visíveis */
        .dark .text-gray-900 {
          color: var(--text-primary) !important;
        }

        .dark .text-gray-700 {
          color: var(--text-secondary) !important;
        }

        .dark .text-gray-500 {
          color: var(--text-muted) !important;
        }

        .dark .text-gray-400 {
          color: var(--text-muted) !important;
        }

        /* Garantir que backgrounds brancos no dark mode sejam escuros */
        .dark .bg-white {
          background-color: var(--bg-card) !important;
        }

        .dark .bg-gray-50 {
          background-color: var(--bg-secondary) !important;
        }

        .dark .bg-gray-100 {
          background-color: var(--bg-tertiary) !important;
        }

        /* Borders visíveis */
        .dark .border-gray-200 {
          border-color: var(--border-color) !important;
        }

        .dark .border-gray-300 {
          border-color: var(--border-color) !important;
        }
      `}</style>
      {children}
    </ThemeProvider>
  );
}
