import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';

const shortcutSections = [
  {
    title: 'Leitura e foco',
    tone: 'text-orange-600 dark:text-orange-300',
    items: [
      { key: '? / F1', label: 'Ajuda', description: 'Abre este painel de atalhos.' },
      { key: 'F2', label: 'Focar codigo', description: 'Limpa o campo de codigo e prepara o PDV para digitacao ou scanner.' },
      { key: 'Esc', label: 'Estado pronto', description: 'Com o campo vazio e sem modal aberto, fecha sugestoes residuais e volta ao estado pronto.' },
    ],
  },
  {
    title: 'Operacao rapida',
    tone: 'text-emerald-600 dark:text-emerald-300',
    items: [
      { key: 'F3', label: 'Alternar comanda', description: 'Abre ou fecha a comanda em telas compactas.' },
      { key: 'F4', label: 'Pagamento', description: 'Abre o fluxo de pagamento quando a venda esta pronta.' },
      { key: 'Enter', label: 'Finalizar rapido', description: 'Fora de inputs, inicia o pagamento usando o mesmo fluxo normal do PDV.' },
    ],
  },
  {
    title: 'Carrinho',
    tone: 'text-sky-600 dark:text-sky-300',
    items: [
      { key: 'Ctrl + Backspace', label: 'Remover ultimo item', description: 'Remove o item mais recente da comanda.' },
      { key: '+', label: 'Aumentar quantidade', description: 'Soma 1 unidade ao ultimo item da comanda.' },
      { key: '-', label: 'Diminuir quantidade', description: 'Subtrai 1 unidade do ultimo item da comanda.' },
    ],
  },
  {
    title: 'Favoritos rapidos',
    tone: 'text-amber-600 dark:text-amber-300',
    items: [
      { key: '1-9', label: 'Adicionar favorito', description: 'Dispara o produto salvo em cada tecla rapida sem navegar pelo cardapio.' },
    ],
  },
];

export default function AtalhosHelpModal({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Keyboard className="w-6 h-6" />
            Atalhos do PDV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            Atalhos pensados para operacao rapida de caixa. O scanner continua com prioridade no campo de codigo e os atalhos nao disparam enquanto voce estiver digitando em formularios ou usando modais do PDV.
          </div>

          <div className="grid gap-4">
            {shortcutSections.map((section) => (
              <section key={section.title} className="rounded-xl border border-border bg-card p-4">
                <h3 className={`mb-3 text-base font-semibold ${section.tone}`}>{section.title}</h3>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div key={`${section.title}-${item.key}`} className="grid gap-1 rounded-lg border border-border/70 bg-muted/20 p-3 md:grid-cols-[180px_180px_1fr] md:items-center md:gap-3">
                      <div className="font-mono text-xs font-semibold uppercase tracking-wide text-foreground">{item.key}</div>
                      <div className="text-sm font-semibold text-foreground">{item.label}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
