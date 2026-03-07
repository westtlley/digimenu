/**
 * Utilitários de Impressão Térmica
 * Suporta impressão via CSS (window.print) e ESC/POS
 */

import { formatCurrency } from './formatters';
import { openThermalPrintWindow } from './printWindow';

/**
 * Imprime cupom de venda em formato térmico 80mm
 * @param {Object} saleData - Dados da venda
 * @param {Object} store - Dados da loja
 * @param {string} method - Método de impressão: 'css' ou 'escpos'
 */
export function printReceipt(saleData, store = {}, method = 'css') {
  const content = generateReceiptContent(saleData, store);
  
  if (method === 'escpos') {
    return printViaESCPOS(content, saleData, store);
  } else {
    return printViaCSS(content);
  }
}

/**
 * Imprime relatório de fechamento de caixa
 * @param {Object} reportData - Dados do relatório
 * @param {string} method - Método de impressão
 */
export function printCashClosingReport(reportData, method = 'css') {
  const content = generateClosingReportContent(reportData);
  
  if (method === 'escpos') {
    return printViaESCPOS(content, reportData);
  } else {
    return printViaCSS(content);
  }
}

/**
 * Gera conteúdo HTML do cupom de venda
 */
function toReadableLabel(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();

  if (Array.isArray(value)) {
    return value.map(toReadableLabel).filter(Boolean).join(', ');
  }

  if (typeof value === 'object') {
    if (value.name) return String(value.name).trim();
    if (value.label) return String(value.label).trim();
    if (value.title) return String(value.title).trim();
    if (typeof value.value === 'string' || typeof value.value === 'number') {
      return String(value.value).trim();
    }
  }

  return '';
}

function buildItemDetails(item = {}) {
  const details = [];

  if (item?.size?.name) details.push(String(item.size.name).trim());

  if (Array.isArray(item?.flavors) && item.flavors.length > 0) {
    const flavorText = item.flavors.map((flavor) => flavor?.name).filter(Boolean).join(' + ');
    if (flavorText) details.push(flavorText);
  }

  if (item?.edge?.name && item?.edge?.id !== 'none') {
    details.push(`Borda: ${String(item.edge.name).trim()}`);
  }

  if (Array.isArray(item?.extras) && item.extras.length > 0) {
    item.extras.forEach((extra) => {
      const label = toReadableLabel(extra);
      if (label) details.push(label);
    });
  }

  if (item?.selections && typeof item.selections === 'object') {
    Object.values(item.selections).forEach((selectionValue) => {
      if (Array.isArray(selectionValue)) {
        selectionValue.forEach((selectionItem) => {
          const label = toReadableLabel(selectionItem);
          if (label) details.push(label);
        });
      } else {
        const label = toReadableLabel(selectionValue);
        if (label) details.push(label);
      }
    });
  }

  const uniqueDetails = [...new Set(details.map((value) => String(value).trim()).filter(Boolean))];
  return uniqueDetails.length > 0 ? ` (${uniqueDetails.join(', ')})` : '';
}

function generateReceiptContent(saleData, store) {
  const orderCode = saleData?.orderCode || saleData?.order_code || saleData?.id || '---';
  const total = Number(saleData?.total ?? 0) || 0;
  const items = Array.isArray(saleData?.items) ? saleData.items : [];
  const date = saleData?.date || saleData?.created_date || saleData?.created_at;
  const customerName = saleData?.customerName || saleData?.customer_name || 'Cliente Balcão';
  const fallbackPayments = saleData?.payment_method
    ? [{
        method: saleData.payment_method,
        methodLabel: saleData.payment_method,
        amount: Number(saleData?.payment_amount ?? total) || 0,
      }]
    : [];
  const payments = Array.isArray(saleData?.payments) && saleData.payments.length > 0
    ? saleData.payments
    : fallbackPayments;
  const change = Number(saleData?.change ?? 0) || 0;
  const storeName = store?.name || 'ESTABELECIMENTO';
  const storeAddress = store?.address || '';
  const storePhone = store?.phone || '';
  
  // Calcular subtotal e desconto
  const itemsSubtotal = items.reduce((sum, item) => {
    const lineTotal = Number(item?.total_price);
    if (Number.isFinite(lineTotal)) return sum + lineTotal;

    const quantity = Number(item?.quantity ?? 1) || 1;
    const unitPrice = Number(item?.totalPrice ?? item?.unit_price ?? item?.price ?? 0) || 0;
    return sum + (unitPrice * quantity);
  }, 0);
  const subtotal = Number(saleData?.subtotal ?? itemsSubtotal) || 0;
  const discount = Number.isFinite(Number(saleData?.discount))
    ? (Number(saleData?.discount) || 0)
    : Math.max(0, subtotal - total);

  return `
    <div class="receipt">
      <div class="center bold">${storeName}</div>
      ${storeAddress ? `<div class="center small">${storeAddress}</div>` : ''}
      ${storePhone ? `<div class="center small">Tel: ${storePhone}</div>` : ''}
      
      <div class="line"></div>
      
      <div class="center bold">CUPOM NÃO FISCAL</div>
      <div class="center">PDV - Venda Presencial</div>
      
      <div class="line"></div>
      
      <div>Pedido: #${orderCode}</div>
      <div>Data: ${date ? new Date(date).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}</div>
      <div>Cliente: ${customerName}</div>
      
      <div class="line"></div>
      
      ${items.map(item => {
        const itemName = item.dish?.name || item.dish_name || item.name || 'Item';
        const details = buildItemDetails(item);
        const quantity = Number(item.quantity ?? 1) || 1;
        const itemTotal = Number.isFinite(Number(item.total_price))
          ? Number(item.total_price)
          : (Number(item.totalPrice ?? item.unit_price ?? item.price ?? 0) || 0) * quantity;
        
        return `
        <div class="item">
          <div>${quantity}x ${itemName}${details}</div>
          <div class="text-right">${formatCurrency(itemTotal)}</div>
        </div>
        `;
      }).join('')}
      
      <div class="line"></div>
      
      <div class="item">
        <div>Subtotal</div>
        <div class="text-right">${formatCurrency(subtotal)}</div>
      </div>
      
      ${discount > 0 ? `
      <div class="item">
        <div>Desconto</div>
        <div class="text-right">-${formatCurrency(discount)}</div>
      </div>
      ` : ''}
      
      <div class="item bold total">
        <div>TOTAL</div>
        <div class="text-right">${formatCurrency(total)}</div>
      </div>
      
      <div class="line"></div>
      
      <div class="bold">FORMA DE PAGAMENTO</div>
      ${payments.map((payment) => {
        const isCash = payment?.method === 'dinheiro';
        const receivedAmount = Number(payment?.tendered_amount ?? payment?.payment_amount ?? payment?.amount ?? 0) || 0;
        const appliedAmount = Number(payment?.amount ?? payment?.payment_amount ?? 0) || 0;
        const showReceived = isCash && receivedAmount > (appliedAmount + 0.001);
        const label = showReceived
          ? `${payment?.methodLabel || payment?.method || 'Dinheiro'} (Recebido)`
          : `${payment?.methodLabel || payment?.method || '-'}`;
        const value = showReceived ? receivedAmount : appliedAmount;

        return `
      <div class="item">
        <div>${label}</div>
        <div class="text-right">${formatCurrency(value)}</div>
      </div>
      `;
      }).join('')}
      
      ${change > 0 ? `
      <div class="item">
        <div>Troco</div>
        <div class="text-right">${formatCurrency(change)}</div>
      </div>
      ` : ''}
      
      <div class="line"></div>
      
      <div class="center small">Obrigado pela preferência!</div>
      <div class="center small">Volte sempre!</div>
    </div>
  `;
}

/**
 * Gera conteúdo HTML do relatório de fechamento
 */
function generateClosingReportContent(reportData) {
  const {
    operatorName,
    terminalName,
    dhInicial,
    dhFinal,
    abertura,
    totalVendas,
    qtdVendas,
    totalSangrias,
    qtdSangrias,
    totalSuprimentos,
    qtdSuprimentos,
    saldoEmCaixa,
    totalCredito,
    qtdCredito,
    totalDebito,
    qtdDebito,
    totalDinheiro,
    qtdDinheiro,
    totalPix,
    qtdPix,
    totalTroco,
    totalDesconto,
    totalAcrescimo,
    qtdeCupons,
    canceladosEmTela = 0,
    canceladosEmTelaValor = 0
  } = reportData;

  return `
    <div class="receipt">
      <div class="center bold">** RELATÓRIO DE FECHAMENTO **</div>
      
      <div class="line"></div>
      
      <div>OPERADOR: ${operatorName || '-'}</div>
      <div>CAIXA: ${terminalName || '1'}</div>
      <div>DH INICIAL: ${dhInicial || '-'}</div>
      <div>DH FINAL: ${dhFinal || '(CAIXA ABERTO)'}</div>
      
      <div class="line"></div>
      <div class="bold">MOVIMENTAÇÕES</div>
      <div class="line"></div>
      
      <div class="item-3col">
        <div>(+)ABERTURA DE CAIXA</div>
        <div class="text-right">1</div>
        <div class="text-right">${formatCurrency(abertura || 0)}</div>
      </div>
      <div class="item-3col">
        <div>(+)VENDA (VF)</div>
        <div class="text-right">${qtdVendas || 0}</div>
        <div class="text-right">${formatCurrency(totalVendas || 0)}</div>
      </div>
      ${qtdSangrias > 0 ? `
      <div class="item-3col">
        <div>(-)SANGRIA</div>
        <div class="text-right">${qtdSangrias}</div>
        <div class="text-right">-${formatCurrency(totalSangrias)}</div>
      </div>
      ` : ''}
      ${qtdSuprimentos > 0 ? `
      <div class="item-3col">
        <div>(+)SUPRIMENTO</div>
        <div class="text-right">${qtdSuprimentos}</div>
        <div class="text-right">${formatCurrency(totalSuprimentos)}</div>
      </div>
      ` : ''}
      <div class="item-3col bold">
        <div>(=)SALDO EM CAIXA</div>
        <div></div>
        <div class="text-right">${formatCurrency(saldoEmCaixa || 0)}</div>
      </div>
      
      <div class="line"></div>
      <div class="bold">FORMA DE PAGAMENTO</div>
      <div class="line"></div>
      
      <div class="item-3col">
        <div>C. CRÉDITO</div>
        <div class="text-right">${qtdCredito || 0}</div>
        <div class="text-right">${formatCurrency(totalCredito || 0)}</div>
      </div>
      <div class="item-3col">
        <div>C. DÉBITO</div>
        <div class="text-right">${qtdDebito || 0}</div>
        <div class="text-right">${formatCurrency(totalDebito || 0)}</div>
      </div>
      <div class="item-3col">
        <div>DINHEIRO</div>
        <div class="text-right">${qtdDinheiro || 0}</div>
        <div class="text-right">${formatCurrency(totalDinheiro || 0)}</div>
      </div>
      <div class="item-3col">
        <div>PIX</div>
        <div class="text-right">${qtdPix || 0}</div>
        <div class="text-right">${formatCurrency(totalPix || 0)}</div>
      </div>
      <div class="item-3col bold">
        <div>TOTAL</div>
        <div></div>
        <div class="text-right">${formatCurrency(totalVendas || 0)}</div>
      </div>
      
      <div class="line"></div>
      <div class="bold">VENDAS CANCELADAS</div>
      <div class="line"></div>
      
      <div class="item-3col">
        <div>VENDA</div>
        <div class="text-right">0</div>
        <div class="text-right">0,00</div>
      </div>
      
      ${canceladosEmTela > 0 ? `
      <div class="small">CANCELAMENTO EM TELA</div>
      <div class="item-3col">
        <div>VENDA</div>
        <div class="text-right">${canceladosEmTela}</div>
        <div class="text-right">${formatCurrency(canceladosEmTelaValor)}</div>
      </div>
      ` : ''}
      
      <div class="line"></div>
      <div class="bold">ADICIONAIS</div>
      <div class="line"></div>
      
      <div class="item">
        <div>TROCO</div>
        <div class="text-right">${formatCurrency(totalTroco || 0)}</div>
      </div>
      <div class="item">
        <div>DESCONTO</div>
        <div class="text-right">${formatCurrency(totalDesconto || 0)}</div>
      </div>
      <div class="item">
        <div>ACRÉSCIMO</div>
        <div class="text-right">${formatCurrency(totalAcrescimo || 0)}</div>
      </div>
      <div class="item">
        <div>QTDE CUPONS</div>
        <div class="text-right">${qtdeCupons || 0}</div>
      </div>
      
      <div class="line"></div>
    </div>
  `;
}

/**
 * Impressão via CSS (window.print) - Método padrão
 */
function printViaCSS(htmlContent) {
  return openThermalPrintWindow({
    title: 'Impressao',
    htmlContent,
  });
}

/**
async function printViaESCPOS(content, data, store) {
  // Verificar se Web Serial API está disponível
  if (!('serial' in navigator)) {
    console.warn('Web Serial API não disponível. Usando fallback CSS.');
    return printViaCSS(content);
  }

  try {
    // Solicitar porta serial
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });

    // Gerar comandos ESC/POS
    const commands = generateESCPOSCommands(data, store);
    
    // Enviar comandos
    const writer = port.writable.getWriter();
    await writer.write(commands);
    writer.releaseLock();
    
    // Fechar porta
    await port.close();
    
    return true;
  } catch (error) {
    console.error('Erro ao imprimir via ESC/POS:', error);
    console.warn('Usando fallback CSS.');
    return printViaCSS(content);
  }
}

/**
 * Gera comandos ESC/POS para impressora térmica
 * Comandos básicos ESC/POS:
 * ESC @ - Inicializar impressora
 * ESC a n - Alinhamento (0=esq, 1=centro, 2=dir)
 * ESC E n - Negrito (0=off, 1=on)
 * ESC d n - Avançar n linhas
 * GS V - Cortar papel
 */
function generateESCPOSCommands(data, store) {
  const ESC = '\x1B';
  const GS = '\x1D';
  
  let commands = '';
  
  // Inicializar
  commands += ESC + '@';
  
  // Cabeçalho centralizado
  commands += ESC + 'a' + '\x01'; // Centro
  commands += ESC + 'E' + '\x01'; // Negrito
  commands += (store?.name || 'ESTABELECIMENTO') + '\n';
  commands += ESC + 'E' + '\x00'; // Negrito off
  
  if (store?.address) {
    commands += store.address + '\n';
  }
  if (store?.phone) {
    commands += 'Tel: ' + store.phone + '\n';
  }
  
  commands += '\n';
  commands += '--------------------------------\n';
  commands += ESC + 'a' + '\x00'; // Esquerda
  
  // Adicionar conteúdo...
  // (Implementação completa dos comandos ESC/POS)
  
  // Cortar papel
  commands += '\n\n\n';
  commands += GS + 'V' + '\x00';
  
  // Converter para Uint8Array
  return new TextEncoder().encode(commands);
}
