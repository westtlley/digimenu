import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';

/**
 * Modal de Ajuda com Atalhos (F1)
 * Exibe tabela completa de atalhos disponíveis no PDV
 */
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
          {/* Barra Principal */}
          <div>
            <h3 className="font-bold text-lg mb-3 text-blue-600 dark:text-blue-400">Barra Principal</h3>
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="text-left p-2 border">Tecla</th>
                  <th className="text-left p-2 border">Função</th>
                  <th className="text-left p-2 border">Descrição</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border"><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">F1</kbd></td>
                  <td className="p-2 border font-semibold">Ajuda</td>
                  <td className="p-2 border">Abre este modal de atalhos</td>
                </tr>
                <tr>
                  <td className="p-2 border"><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">F2</kbd></td>
                  <td className="p-2 border font-semibold">Menu de Vendas</td>
                  <td className="p-2 border">Abre menu com Suprimento, Sangria, Reimpressão, Fechamento, etc.</td>
                </tr>
                <tr>
                  <td className="p-2 border"><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">F4</kbd></td>
                  <td className="p-2 border font-semibold">Fechamento</td>
                  <td className="p-2 border">Abre relatório de fechamento de caixa</td>
                </tr>
                <tr>
                  <td className="p-2 border"><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">F9</kbd></td>
                  <td className="p-2 border font-semibold">Cancelar Venda</td>
                  <td className="p-2 border">Cancela a venda atual (limpa carrinho)</td>
                </tr>
                <tr>
                  <td className="p-2 border"><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">F11</kbd></td>
                  <td className="p-2 border font-semibold">Recebimento</td>
                  <td className="p-2 border">Abre tela de pagamento para finalizar venda</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Menu de Vendas (quando F2 está aberto) */}
          <div>
            <h3 className="font-bold text-lg mb-3 text-green-600 dark:text-green-400">Menu de Vendas (F2)</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Atalhos disponíveis quando o Menu de Vendas está aberto:</p>
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="text-left p-2 border">Tecla</th>
                  <th className="text-left p-2 border">Função</th>
                  <th className="text-left p-2 border">Descrição</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border"><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">F2</kbd></td>
                  <td className="p-2 border font-semibold">Suprimento</td>
                  <td className="p-2 border">Entrada de dinheiro no caixa</td>
                </tr>
                <tr>
                  <td className="p-2 border"><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">F3</kbd></td>
                  <td className="p-2 border font-semibold">Sangria</td>
                  <td className="p-2 border">Retirada de dinheiro do caixa</td>
                </tr>
                <tr>
                  <td className="p-2 border"><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">F4</kbd></td>
                  <td className="p-2 border font-semibold">Reimpressão Venda</td>
                  <td className="p-2 border">Reimprimir cupom/nota de venda anterior</td>
                </tr>
                <tr>
                  <td className="p-2 border"><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">F5</kbd></td>
                  <td className="p-2 border font-semibold">Fechamento Caixa</td>
                  <td className="p-2 border">Fechar caixa e gerar relatório</td>
                </tr>
                <tr>
                  <td className="p-2 border"><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">F6</kbd></td>
                  <td className="p-2 border font-semibold">Abertura Caixa</td>
                  <td className="p-2 border">Abrir caixa (desabilitado quando já aberto)</td>
                </tr>
                <tr>
                  <td className="p-2 border"><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">F7</kbd></td>
                  <td className="p-2 border font-semibold">Cancelar Venda</td>
                  <td className="p-2 border">Cancela venda inteira</td>
                </tr>
                <tr>
                  <td className="p-2 border"><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">ESC</kbd></td>
                  <td className="p-2 border font-semibold">Sair</td>
                  <td className="p-2 border">Fechar menu</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Atalhos com Alt */}
          <div>
            <h3 className="font-bold text-lg mb-3 text-purple-600 dark:text-purple-400">Atalhos com Alt</h3>
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="text-left p-2 border">Atalho</th>
                  <th className="text-left p-2 border">Função</th>
                  <th className="text-left p-2 border">Descrição</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border"><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Alt+D</kbd></td>
                  <td className="p-2 border font-semibold">Descontos/Acréscimos</td>
                  <td className="p-2 border">Aplicar desconto ou acréscimo na venda</td>
                </tr>
                <tr>
                  <td className="p-2 border"><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Alt+G</kbd></td>
                  <td className="p-2 border font-semibold">Abrir Gaveta</td>
                  <td className="p-2 border">Comando para abrir gaveta de dinheiro</td>
                </tr>
                <tr>
                  <td className="p-2 border"><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Alt+I</kbd></td>
                  <td className="p-2 border font-semibold">Observação</td>
                  <td className="p-2 border">Adicionar observação no item selecionado</td>
                </tr>
              </tbody>
            </table>
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
