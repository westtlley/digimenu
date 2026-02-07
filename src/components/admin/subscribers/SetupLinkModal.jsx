import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

/**
 * Modal exibido após criar assinante, com opção de copiar link de definição de senha.
 * Substitui o alert() por UX mais profissional e segura.
 */
export default function SetupLinkModal({ open, onClose, setupUrl, subscriberName }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!setupUrl) return;
    try {
      await navigator.clipboard.writeText(setupUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-w-[95vw]">
        <DialogHeader>
          <DialogTitle className="text-green-700 dark:text-green-400">
            Assinante criado com sucesso!
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {subscriberName && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>{subscriberName}</strong> foi cadastrado. Envie o link abaixo para que defina a senha.
            </p>
          )}
          {setupUrl ? (
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={setupUrl}
                className="flex-1 px-3 py-2 text-sm border rounded-lg bg-gray-50 dark:bg-gray-800 font-mono truncate"
                aria-label="Link de definição de senha"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
                title="Copiar link"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Link de definição de senha não foi gerado. Verifique os logs do backend ou use "Resetar Senha" na lista.
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
