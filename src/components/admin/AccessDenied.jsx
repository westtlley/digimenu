/**
 * Componente de Acesso Negado Melhorado
 * Mostra mensagens claras ao invés de tela branca ou spinner eterno
 */

import { Lock, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import ErrorState from '@/components/ui/ErrorState';

export default function AccessDenied({ 
  message = "Esta funcionalidade não faz parte do seu plano.",
  title = "Acesso não permitido",
  showUpgrade = false,
  showContact = true,
  customAction = null,
  context = 'auto'
}) {
  const resolvedContext =
    context === 'auto'
      ? (() => {
          if (typeof window === 'undefined') return 'subscriber';
          const path = window.location.pathname.toLowerCase();
          if (path.includes('/admin')) return 'master';
          if (path.includes('/painelgerente')) return 'gerente';
          return 'subscriber';
        })()
      : context;

  const defaultBackPath =
    resolvedContext === 'master'
      ? '/Admin'
      : resolvedContext === 'gerente'
        ? '/PainelGerente'
        : '/PainelAssinante';

  const defaultActions = (
    <>
      {showContact && (
        <a 
          href="https://wa.me/5586988196114" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block"
        >
          <Button className="w-full bg-green-500 hover:bg-green-600">
            Falar no WhatsApp
          </Button>
        </a>
      )}
      <Link to={defaultBackPath} className="block">
        <Button variant="outline" className="w-full">
          Voltar ao Painel
        </Button>
      </Link>
    </>
  );

  return (
    <ErrorState
      icon={Lock}
      title={title}
      description={message}
      tone="danger"
      action={
        <>
          {showUpgrade && (
            <div className="mb-1 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Upgrade seu plano
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Esta funcionalidade está disponível em planos superiores.
                  </p>
                </div>
              </div>
            </div>
          )}
          {customAction || defaultActions}
        </>
      }
    />
  );
}

/**
 * Componente para erro de carregamento
 */
export function LoadingError({ 
  message = "Erro ao carregar dados.",
  title = "Erro ao carregar",
  onRetry = null
}) {
  return <ErrorState title={title} description={message} tone="warning" onRetry={onRetry} />;
}
