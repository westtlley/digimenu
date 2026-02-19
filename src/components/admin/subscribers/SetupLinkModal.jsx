import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, Eye, EyeOff } from 'lucide-react';

/**
 * Modal exibido após criar assinante. Link não é exibido em texto puro por padrão (segurança).
 * Copiar só confirma "Link copiado" quando a cópia for bem-sucedida.
 */
export default function SetupLinkModal({ open, onClose, setupUrl, subscriberName }) {
  const [copied, setCopied] = useState(false);
  const [reveal, setReveal] = useState(false);

  const handleCopy = async () => {
    if (!setupUrl) return;
    try {
      await navigator.clipboard.writeText(setupUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setCopied(false);
    }
  };

  const handleReveal = () => {
    if (reveal) {
      setReveal(false);
      return;
    }
    if (window.confirm('Exibir o link de definição de senha na tela? Ele contém um token sensível.')) {
      setReveal(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw]" aria-describedby="setup-link-desc">
        <DialogHeader>
          <DialogTitle className="text-green-700 dark:text-green-400">
            Assinante criado com sucesso!
          </DialogTitle>
          <DialogDescription id="setup-link-desc" className="sr-only">Envie o link de definição de senha ao assinante.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {subscriberName && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>{subscriberName}</strong> foi cadastrado. Envie o link para que defina a senha.
            </p>
          )}
          {setupUrl ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="flex-1 px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500">
                  {reveal ? setupUrl : 'Link disponível — use Copiar ou Revelar'}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                  title="Copiar link"
                  aria-label="Copiar link"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleReveal}
                  className="shrink-0"
                  title={reveal ? 'Ocultar link' : 'Revelar link'}
                  aria-label={reveal ? 'Ocultar link' : 'Revelar link'}
                >
                  {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {copied && <p className="text-xs text-green-600 dark:text-green-400">Link copiado.</p>}
            </div>
          ) : (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Link de definição de senha não foi gerado. Use &quot;Resetar Senha&quot; na lista do assinante.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
