/**
 * Componente de Acesso Negado Melhorado
 * Mostra mensagens claras ao invés de tela branca ou spinner eterno
 */

import { Lock, AlertCircle, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';

export default function AccessDenied({ 
  message = "Esta funcionalidade não faz parte do seu plano.",
  title = "Acesso não permitido",
  showUpgrade = false,
  showContact = true,
  customAction = null
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="p-8 rounded-xl shadow-lg text-center max-w-md w-full" 
           style={{ backgroundColor: 'var(--bg-card)', border: `1px solid var(--border-color)` }}>
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-red-500" />
        </div>
        
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </p>

        {showUpgrade && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
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

        <div className="space-y-3">
          {customAction || (
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
              <Link to="/Admin" className="block">
                <Button variant="outline" className="w-full">
                  Voltar ao Painel
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
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
  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="p-8 rounded-xl shadow-lg text-center max-w-md w-full" 
           style={{ backgroundColor: 'var(--bg-card)', border: `1px solid var(--border-color)` }}>
        <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-orange-500" />
        </div>
        
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </p>

        {onRetry && (
          <Button onClick={onRetry} className="w-full">
            Tentar Novamente
          </Button>
        )}
      </div>
    </div>
  );
}
