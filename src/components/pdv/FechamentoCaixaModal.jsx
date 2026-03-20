import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Lock, LogOut } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { printCashClosingReport } from '@/utils/thermalPrint';
import {
  buildCaixaShiftSummary,
  formatOperationalDateLabel,
  getCaixaClosedAt,
  getCaixaOpenedAt,
} from '@/utils/operationalShift';

/**
 * Modal de fechamento de caixa.
 * Mantem o layout anterior, mas usa o resumo operacional do turno.
 */
export default function FechamentoCaixaModal({
  open,
  onOpenChange,
  caixa,
  operations = [],
  storeName = 'Estabelecimento',
  operatorName = '',
  terminalName = '',
  canceledInScreenCount = 0,
  canceledInScreenTotal = 0,
  operationalCutoffTime = '05:00',
  onPrint,
  onFecharClick,
}) {
  if (!caixa) return null;

  const summary = buildCaixaShiftSummary({
    caixa,
    operations,
    closingBalance: caixa?.closing_balance ?? caixa?.closing_amount_cash ?? null,
    canceledCount: canceledInScreenCount,
    canceledAmount: canceledInScreenTotal,
    cutoffTime: operationalCutoffTime,
  });

  const totalCredito = summary.paymentTotals.credit;
  const totalDebito = summary.paymentTotals.debit;
  const totalDinheiro = summary.paymentTotals.cash;
  const totalPix = summary.paymentTotals.pix;
  const totalOutro = summary.paymentTotals.other;
  const qtdDinheiro = summary.sales.filter((operation) => operation.payment_method === 'dinheiro').length;
  const qtdCredito = summary.sales.filter((operation) => operation.payment_method === 'credito').length;
  const qtdDebito = summary.sales.filter((operation) => operation.payment_method === 'debito').length;
  const qtdPix = summary.sales.filter((operation) => operation.payment_method === 'pix').length;
  const qtdOutro = summary.sales.filter((operation) => operation.payment_method === 'outro').length;

  const dhInicial = getCaixaOpenedAt(caixa)
    ? new Date(getCaixaOpenedAt(caixa)).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '-';
  const dhFinal = caixa.status === 'closed' && getCaixaClosedAt(caixa)
    ? new Date(getCaixaClosedAt(caixa)).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '(CAIXA ABERTO)';
  const origemFechamento = String(caixa?.closing_source || '').toLowerCase() === 'pdv'
    ? 'PDV'
    : String(caixa?.closing_source || '').toLowerCase() === 'painel_assinante'
      ? 'PAINEL DO ASSINANTE'
      : '-';

  const refImprimir = React.useRef(null);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }

    printCashClosingReport({
      storeName,
      operatorName,
      terminalName,
      operationalDate: summary.operationalDate,
      turnLabel: caixa?.turn_label || summary.turnLabel,
      dhInicial,
      dhFinal,
      abertura: summary.openingBalance,
      totalVendas: summary.totalSales,
      qtdVendas: summary.salesCount,
      totalSangrias: summary.totalSangrias,
      qtdSangrias: summary.sangrias.length,
      totalSuprimentos: summary.totalSuprimentos,
      qtdSuprimentos: summary.suprimentos.length,
      saldoEmCaixa: summary.expectedBalance,
      expectedBalance: summary.expectedBalance,
      closingBalance: summary.closingBalance,
      differenceAmount: summary.differenceAmount,
      totalCredito,
      qtdCredito,
      totalDebito,
      qtdDebito,
      totalDinheiro,
      qtdDinheiro,
      totalPix,
      qtdPix,
      totalOutro,
      qtdOutro,
      totalTroco: summary.totalChange,
      totalDesconto: 0,
      totalAcrescimo: 0,
      qtdeCupons: summary.salesCount,
      canceladosEmTela: canceledInScreenCount,
      canceladosEmTelaValor: canceledInScreenTotal,
    }, 'css');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="text-xl">Fechamento de Caixa</DialogTitle>
        </DialogHeader>

        <div ref={refImprimir} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-sm">
          <div className="text-center font-bold text-base">RELATORIO DE FECHAMENTO</div>
          <div className="space-y-1">
            <p><strong>OPERADOR:</strong> {operatorName || caixa.opened_by || '-'}</p>
            <p><strong>CAIXA:</strong> {terminalName || caixa.terminal_name || caixa.id || '1'}</p>
            <p><strong>DIA OPERACIONAL:</strong> {formatOperationalDateLabel(summary.operationalDate)}</p>
            {caixa?.turn_label && <p><strong>TURNO:</strong> {caixa.turn_label}</p>}
            <p><strong>DH INICIAL:</strong> {dhInicial}</p>
            <p><strong>DH FINAL:</strong> {dhFinal}</p>
            {caixa.status === 'closed' && (
              <p><strong>ORIGEM FECHAMENTO:</strong> {origemFechamento}</p>
            )}
          </div>

          <div className="line" />
          <div className="font-semibold">MOVIMENTACOES</div>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td>(+) ABERTURA DE CAIXA</td>
                <td>1</td>
                <td className="text-right">{formatCurrency(summary.openingBalance)}</td>
              </tr>
              <tr>
                <td>(+) VENDAS EM DINHEIRO</td>
                <td>{qtdDinheiro}</td>
                <td className="text-right">{formatCurrency(totalDinheiro)}</td>
              </tr>
              {summary.totalSuprimentos > 0 && (
                <tr>
                  <td>(+) SUPRIMENTOS</td>
                  <td>{summary.suprimentos.length}</td>
                  <td className="text-right">{formatCurrency(summary.totalSuprimentos)}</td>
                </tr>
              )}
              {summary.totalSangrias > 0 && (
                <tr>
                  <td>(-) SANGRIAS</td>
                  <td>{summary.sangrias.length}</td>
                  <td className="text-right">-{formatCurrency(summary.totalSangrias)}</td>
                </tr>
              )}
              <tr className="font-bold">
                <td>(=) SALDO ESPERADO</td>
                <td></td>
                <td className="text-right">{formatCurrency(summary.expectedBalance)}</td>
              </tr>
              {summary.closingBalance != null && (
                <>
                  <tr>
                    <td>(=) SALDO INFORMADO</td>
                    <td></td>
                    <td className="text-right">{formatCurrency(summary.closingBalance)}</td>
                  </tr>
                  <tr className={`font-bold ${summary.differenceAmount === 0 ? '' : summary.differenceAmount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <td>(=) DIFERENCA</td>
                    <td></td>
                    <td className="text-right">{formatCurrency(summary.differenceAmount)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          <div className="line" />
          <div className="font-semibold">FORMA DE PAGAMENTO</div>
          <table className="w-full text-sm">
            <tbody>
              <tr><td>C. CREDITO</td><td>{qtdCredito}</td><td className="text-right">{formatCurrency(totalCredito)}</td></tr>
              <tr><td>C. DEBITO</td><td>{qtdDebito}</td><td className="text-right">{formatCurrency(totalDebito)}</td></tr>
              <tr><td>DINHEIRO</td><td>{qtdDinheiro}</td><td className="text-right">{formatCurrency(totalDinheiro)}</td></tr>
              <tr><td>PIX</td><td>{qtdPix}</td><td className="text-right">{formatCurrency(totalPix)}</td></tr>
              <tr><td>OUTROS</td><td>{qtdOutro}</td><td className="text-right">{formatCurrency(totalOutro)}</td></tr>
              <tr className="font-bold"><td>TOTAL</td><td></td><td className="text-right">{formatCurrency(summary.totalSales)}</td></tr>
            </tbody>
          </table>

          {(canceledInScreenCount > 0 || canceledInScreenTotal > 0) && (
            <>
              <div className="line" />
              <div className="font-semibold">CANCELAMENTOS EM TELA</div>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td>VENDAS CANCELADAS</td>
                    <td>{canceledInScreenCount}</td>
                    <td className="text-right">{formatCurrency(canceledInScreenTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          <div className="line" />
          <div className="font-semibold">ADICIONAIS</div>
          <table className="w-full text-sm">
            <tbody>
              <tr><td>TROCO</td><td className="text-right">{formatCurrency(summary.totalChange)}</td></tr>
              <tr><td>QTDE CUPONS</td><td className="text-right">{summary.salesCount}</td></tr>
            </tbody>
          </table>
        </div>

        <DialogFooter className="flex-wrap gap-2 border-t px-6 py-4 bg-background">
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
