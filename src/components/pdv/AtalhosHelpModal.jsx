import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';
import { uiText } from '@/i18n/pt-BR/uiText';

const pdvShortcutsText = uiText.pdvShortcuts;

const shortcutSections = [
  {
    title: pdvShortcutsText.readAndFocusTitle,
    tone: 'text-orange-600 dark:text-orange-300',
    items: [
      { key: '? / F1', label: 'Ajuda', description: 'Abre este painel de atalhos.' },
      { key: 'F2', label: pdvShortcutsText.focusCode, description: pdvShortcutsText.focusCodeDescription },
      { key: 'Esc', label: 'Estado pronto', description: pdvShortcutsText.readyStateDescription },
    ],
  },
  {
    title: pdvShortcutsText.fastOperationTitle,
    tone: 'text-emerald-600 dark:text-emerald-300',
    items: [
      { key: 'F3', label: 'Alternar comanda', description: 'Abre ou fecha a comanda em telas compactas.' },
      { key: 'F4', label: 'Pagamento', description: pdvShortcutsText.paymentDescription },
      { key: 'Enter', label: 'Finalizar rápido', description: pdvShortcutsText.fastFinishDescription },
    ],
  },
  {
    title: 'Carrinho',
    tone: 'text-sky-600 dark:text-sky-300',
    items: [
      { key: 'Ctrl + Backspace', label: pdvShortcutsText.removeLastItem, description: 'Remove o item mais recente da comanda.' },
      { key: '+', label: 'Aumentar quantidade', description: 'Soma 1 unidade ao último item da comanda.' },
      { key: '-', label: 'Diminuir quantidade', description: 'Subtrai 1 unidade do último item da comanda.' },
    ],
  },
  {
    title: pdvShortcutsText.fastFavoritesTitle,
    tone: 'text-amber-600 dark:text-amber-300',
    items: [
      { key: '1-9', label: 'Adicionar favorito', description: pdvShortcutsText.favoriteDescription },
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
            {pdvShortcutsText.intro}
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
