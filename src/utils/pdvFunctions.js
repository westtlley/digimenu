import React from 'react';

/**
 * Funções e atalhos do PDV - baseado em REFERENCIAS_PDV_FARMACIA.md
 * Atalhos principais: F1-F11, Alt+D/G/I
 * Context-aware: diferentes atalhos quando Menu de Vendas está aberto
 */

export const PDV_HOTKEYS = {
  F1: 'help',
  F2: 'menu_vendas',
  F3: 'calculator',
  F4: 'fechamento',
  F5: 'orcamento',
  F6: 'cliente',
  F7: 'produto',
  F8: 'cancel_item',
  F9: 'cancel_sale',
  F10: 'tabela_precos',
  F11: 'finish_sale',
  F12: 'pbms',
  'Alt+D': 'descontos',
  'Alt+G': 'gaveta',
  'Alt+I': 'observacao'
};

/**
 * Hook de atalhos do PDV
 * @param {Object} handlers - Objeto com handlers para cada ação
 * @param {boolean} menuVendasOpen - Se o Menu de Vendas está aberto (muda contexto dos atalhos)
 */
export function usePDVHotkeys(handlers, menuVendasOpen = false) {
  const ref = React.useRef(handlers);
  ref.current = handlers;

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignorar se estiver digitando em input/textarea (exceto Alt+)
      const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
      if (isTyping && !e.altKey) return;

      // Se Menu de Vendas está aberto, usar atalhos específicos
      // (Os atalhos F2-F7 e ESC do menu são tratados no próprio MenuVendasModal)
      if (menuVendasOpen) return;

      // Atalhos gerais do PDV
      switch (e.key) {
        case 'F1':
          e.preventDefault();
          ref.current?.onOpenHelp?.();
          break;
        case 'F2':
          e.preventDefault();
          ref.current?.onOpenMenuVendas?.();
          break;
        case 'F3':
          e.preventDefault();
          ref.current?.onOpenCalculator?.();
          break;
        case 'F4':
          e.preventDefault();
          ref.current?.onOpenFechamento?.();
          break;
        case 'F5':
          e.preventDefault();
          ref.current?.onOpenOrcamento?.();
          break;
        case 'F6':
          e.preventDefault();
          ref.current?.onOpenCliente?.();
          break;
        case 'F7':
          e.preventDefault();
          ref.current?.onOpenProduto?.();
          break;
        case 'F8':
          e.preventDefault();
          ref.current?.onCancelItem?.();
          break;
        case 'F9':
          e.preventDefault();
          ref.current?.onCancelSale?.();
          break;
        case 'F10':
          e.preventDefault();
          ref.current?.onOpenTabelaPrecos?.();
          break;
        case 'F11':
          e.preventDefault();
          ref.current?.onFinishSale?.();
          break;
        case 'F12':
          e.preventDefault();
          ref.current?.onOpenPBMs?.();
          break;
        default:
          break;
      }

      // Atalhos com Alt
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'd':
            e.preventDefault();
            ref.current?.onDescontos?.();
            break;
          case 'g':
            e.preventDefault();
            ref.current?.onAbrirGaveta?.();
            break;
          case 'i':
            e.preventDefault();
            ref.current?.onObservacao?.();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuVendasOpen]);
}
