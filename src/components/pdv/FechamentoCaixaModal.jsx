import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Lock, LogOut } from 'lucide-react';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

/**
 * Modal de Fechamento de Caixa – modelo igual aos prints (relatório + formas de pagamento + adicionais).
 * Props: open, onOpenChange, caixa, operations (desta caixa), storeName, operatorName, terminalName,
 * onPrint, onFecharClick (parent deve envolver com requireAuthorization('fechar_caixa', ...))
 */
export default function FechamentoCaixaModal({
  open,
  onOpenChange,
  caixa,
  operations = [],
  storeName = 'Estabelecimento',
  operatorName = '',
  terminalName = '',
  onPrint,
  onFecharClick,
}) {
  if (!caixa) return null;

  const ops = operations.filter((op) => String(op.caixa_id) === String(caixa.id));
  const vendas = ops.filter((op) => op.type === 'venda_pdv');
  const sangrias = ops.filter((op) => op.type === 'sangria');
  const suprimentos = ops.filter((op) => op.type === 'suprimento');

  const totalCredito = vendas.filter((op) => op.payment_method === 'credito').reduce((s, op) => s + op.amount, 0);
  const totalDebito = vendas.filter((op) => op.payment_method === 'debito').reduce((s, op) => s + op.amount, 0);
  const totalDinheiro = vendas.filter((op) => op.payment_method === 'dinheiro').reduce((s, op) => s + op.amount, 0);
  const totalPix = vendas.filter((op) => op.payment_method === 'pix').reduce((s, op) => s + op.amount, 0);
  const totalOutro = vendas.filter((op) => op.payment_method === 'outro').reduce((s, op) => s + op.amount, 0);
  const totalVendas = totalCredito + totalDebito + totalDinheiro + totalPix + totalOutro;

  const abertura = Number(caixa.opening_amount_cash) || 0;
  const totalSangrias = sangrias.reduce((s, op) => s + op.amount, 0);
  const totalSuprimentos = suprimentos.reduce((s, op) => s + op.amount, 0);
  const saldoEmCaixa = abertura + totalVendas + totalSuprimentos - totalSangrias;

  const totalTroco = vendas.reduce((s, op) => s + (op.change || 0), 0);
  const qtdeCupons = vendas.length;

  const dhInicial = caixa.opening_date
    ? new Date(caixa.opening_date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '-';
  const dhFinal = caixa.status === 'closed' && caixa.closing_date
    ? new Date(caixa.closing_date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '(CAIXA ABERTO)';

  const refImprimir = React.useRef(null);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }
    const content = refImprimir.current;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>Fechamento de Caixa</title>
      <style>body{ font-family: monospace; padding: 16px; font-size: 12px; } .line{border-bottom:1px solid #000; margin:4px 0;} .center{text-align:center;} table{width:100%;} td:nth-child(2){text-align:right;}</style>
      </head><body>${content.innerHTML}</body></html>
    `);
    win.document.close();
    win.print();
    win.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Fechamento de Caixa</DialogTitle>
        </DialogHeader>

        <div ref={refImprimir} className="space-y-4 text-sm">
          <div className="text-center font-bold text-base">RELATÓRIO DE FECHAMENTO</div>
          <div className="space-y-1">
            <p><strong>OPERADOR:</strong> {operatorName || caixa.opened_by || '-'}</p>
            <p><strong>CAIXA:</strong> {terminalName || caixa.id || '1'}</p>
            <p><strong>DH INICIAL:</strong> {dhInicial}</p>
            <p><strong>DH FINAL:</strong> {dhFinal}</p>
          </div>

          <div className="line" />
          <div className="font-semibold">MOVIMENTAÇÕES</div>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td>(+) ABERTURA DE CAIXA</td>
                <td>1</td>
                <td className="text-right">{formatCurrency(abertura)}</td>
              </tr>
              <tr>
                <td>(+) VENDA (VF)</td>
                <td>{vendas.length}</td>
                <td className="text-right">{formatCurrency(totalVendas)}</td>
              </tr>
              <tr className="font-bold">
                <td>(=) SALDO EM CAIXA</td>
                <td></td>
                <td className="text-right">{formatCurrency(saldoEmCaixa)}</td>
              </tr>
            </tbody>
          </table>

          <div className="line" />
          <div className="font-semibold">FORMA DE PAGAMENTO</div>
          <table className="w-full text-sm">
            <tbody>
              <tr><td>C. CRÉDITO</td><td>{vendas.filter(o => o.payment_method === 'credito').length}</td><td className="text-right">{formatCurrency(totalCredito)}</td></tr>
              <tr><td>C. DÉBITO</td><td>{vendas.filter(o => o.payment_method === 'debito').length}</td><td className="text-right">{formatCurrency(totalDebito)}</td></tr>
              <tr><td>DINHEIRO</td><td>{vendas.filter(o => o.payment_method === 'dinheiro').length}</td><td className="text-right">{formatCurrency(totalDinheiro)}</td></tr>
              <tr><td>PIX</td><td>{vendas.filter(o => o.payment_method === 'pix').length}</td><td className="text-right">{formatCurrency(totalPix)}</td></tr>
              <tr className="font-bold"><td>TOTAL</td><td></td><td className="text-right">{formatCurrency(totalVendas)}</td></tr>
            </tbody>
          </table>

          <div className="line" />
          <div className="font-semibold">VENDAS CANCELADAS</div>
          <table className="w-full text-sm">
            <tbody>
              <tr><td>VENDA</td><td>0</td><td className="text-right">0,00</td></tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-500">CANCELAMENTO EM TELA</p>

          <div className="line" />
          <div className="font-semibold">ADICIONAIS</div>
          <table className="w-full text-sm">
            <tbody>
              <tr><td>TROCO</td><td className="text-right">{formatCurrency(totalTroco)}</td></tr>
              <tr><td>DESCONTO</td><td className="text-right">0,00</td></tr>
              <tr><td>ACRÉSCIMO</td><td className="text-right">0,00</td></tr>
              <tr><td>QTDE CUPONS</td><td className="text-right">{qtdeCupons}</td></tr>
            </tbody>
          </table>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          {caixa.status === 'open' && onFecharClick && (
            <Button type="button" className="bg-gray-900" onClick={onFecharClick}>
              <Lock className="w-4 h-4 mr-2" />
              Fechar
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
