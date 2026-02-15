import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Receipt, Lock, Unlock, X as XIcon, Printer } from 'lucide-react';

/**
 * Menu de Vendas (F2) - Modal com opções de gestão do caixa
 * Atalhos específicos quando aberto: F2-F7 e ESC
 */
export default function MenuVendasModal({
  open,
  onOpenChange,
  onSuprimento,
  onSangria,
  onReimpressao,
  onFechamento,
  onAbertura,
  onCancelarVenda,
  caixaAberto = false
}) {
  // Atalhos específicos quando o menu está aberto
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'F2':
          e.preventDefault();
          onSuprimento?.();
          break;
        case 'F3':
          e.preventDefault();
          onSangria?.();
          break;
        case 'F4':
          e.preventDefault();
          onReimpressao?.();
          break;
        case 'F5':
          e.preventDefault();
          onFechamento?.();
          break;
        case 'F6':
          e.preventDefault();
          onAbertura?.();
          break;
        case 'F7':
          e.preventDefault();
          onCancelarVenda?.();
          break;
        case 'Escape':
          e.preventDefault();
          onOpenChange?.(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onSuprimento, onSangria, onReimpressao, onFechamento, onAbertura, onCancelarVenda, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">Menu de Vendas</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 p-4">
          {/* Suprimento */}
          <Button
            onClick={onSuprimento}
            className="h-24 flex flex-col items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white"
          >
            <TrendingUp className="w-8 h-8" />
            <span className="text-lg font-bold">Suprimento</span>
            <kbd className="text-xs px-2 py-1 bg-green-900 rounded">F2</kbd>
          </Button>

          {/* Sangria */}
          <Button
            onClick={onSangria}
            className="h-24 flex flex-col items-center justify-center gap-2 bg-red-700 hover:bg-red-800 text-white"
          >
            <TrendingDown className="w-8 h-8" />
            <span className="text-lg font-bold">Sangria</span>
            <kbd className="text-xs px-2 py-1 bg-red-900 rounded">F3</kbd>
          </Button>

          {/* Reimpressão */}
          <Button
            onClick={onReimpressao}
            className="h-24 flex flex-col items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white"
          >
            <Receipt className="w-8 h-8" />
            <span className="text-lg font-bold">Reimpressão Venda</span>
            <kbd className="text-xs px-2 py-1 bg-blue-900 rounded">F4</kbd>
          </Button>

          {/* Fechamento */}
          <Button
            onClick={onFechamento}
            disabled={!caixaAberto}
            className="h-24 flex flex-col items-center justify-center gap-2 bg-gray-700 hover:bg-gray-800 text-white disabled:opacity-50"
          >
            <Lock className="w-8 h-8" />
            <span className="text-lg font-bold">Fechamento Caixa</span>
            <kbd className="text-xs px-2 py-1 bg-gray-900 rounded">F5</kbd>
          </Button>

          {/* Abertura */}
          <Button
            onClick={onAbertura}
            disabled={caixaAberto}
            className="h-24 flex flex-col items-center justify-center gap-2 bg-yellow-700 hover:bg-yellow-800 text-white disabled:opacity-50"
          >
            <Unlock className="w-8 h-8" />
            <span className="text-lg font-bold">Abertura Caixa</span>
            <kbd className="text-xs px-2 py-1 bg-yellow-900 rounded">F6</kbd>
          </Button>

          {/* Cancelar Venda */}
          <Button
            onClick={onCancelarVenda}
            className="h-24 flex flex-col items-center justify-center gap-2 bg-orange-700 hover:bg-orange-800 text-white"
          >
            <XIcon className="w-8 h-8" />
            <span className="text-lg font-bold">Cancelar Venda</span>
            <kbd className="text-xs px-2 py-1 bg-orange-900 rounded">F7</kbd>
          </Button>
        </div>

        <div className="text-center text-sm text-gray-400 pb-2">
          Pressione <kbd className="px-2 py-1 bg-gray-800 rounded">ESC</kbd> para sair
        </div>
      </DialogContent>
    </Dialog>
  );
}
