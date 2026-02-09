import React from 'react';

/**
 * Funções e atalhos do PDV - baseado em REFERENCIAS_PDV_FARMACIA.md
 * F9=Cancelar venda | F11=Finalizar/Recebimento
 */

export const PDV_HOTKEYS = {
  F2: 'menu_vendas',
  F4: 'fechamento',
  F9: 'cancel_sale',
  F11: 'finish_sale',
};

export function usePDVHotkeys(handlers) {
  const ref = React.useRef(handlers);
  ref.current = handlers;

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case 'F2':
          e.preventDefault();
          ref.current?.onOpenMenuVendas?.();
          break;
        case 'F4':
          e.preventDefault();
          ref.current?.onOpenFechamento?.();
          break;
        case 'F9':
          e.preventDefault();
          ref.current?.onCancelSale?.();
          break;
        case 'F11':
          e.preventDefault();
          ref.current?.onFinishSale?.();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
