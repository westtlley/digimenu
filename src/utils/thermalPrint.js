/**
 * UtilitÃ¡rios de ImpressÃ£o TÃ©rmica
 * Suporta impressÃ£o via CSS (window.print) e ESC/POS
 */

import { formatCurrency } from './formatters';
import { openThermalPrintWindow } from './printWindow';
import {
  isBridgeLikelyAvailableSync,
  primeBridgeAvailability,
  printViaBridge,
} from './printBridgeClient';
import { getScopedStorageKey } from './tenantScope';

const DASH_LINE = '--------------------------------';
const PRINT_LOG_PREFIX = '[print]';
const DEFAULT_DEDUPE_WINDOW_MS = 12000;
const printGuard = new Map();

function cleanupPrintGuard(now = Date.now()) {
  for (const [key, entry] of printGuard.entries()) {
    const windowMs = Number(entry?.windowMs) || DEFAULT_DEDUPE_WINDOW_MS;
    if (now - Number(entry?.lastAt || 0) > Math.max(windowMs, DEFAULT_DEDUPE_WINDOW_MS * 2)) {
      printGuard.delete(key);
    }
  }
}

function beginPrintGuard(printKey, windowMs) {
  if (!printKey) return true;
  const now = Date.now();
  cleanupPrintGuard(now);

  const previous = printGuard.get(printKey);
  if (previous) {
    const previousWindow = Number(previous.windowMs) || DEFAULT_DEDUPE_WINDOW_MS;
    const elapsed = now - Number(previous.lastAt || 0);
    if (previous.status === 'inflight' || elapsed < previousWindow) {
      return false;
    }
  }

  printGuard.set(printKey, {
    status: 'inflight',
    lastAt: now,
    windowMs,
  });
  return true;
}

function markPrintGuardDone(printKey, windowMs) {
  if (!printKey) return;
  printGuard.set(printKey, {
    status: 'done',
    lastAt: Date.now(),
    windowMs,
  });
}

function clearPrintGuard(printKey) {
  if (!printKey) return;
  printGuard.delete(printKey);
}

function getConfiguredPrinterName() {
  if (typeof window === 'undefined') return '';
  try {
    const raw =
      localStorage.getItem(getScopedStorageKey('printerConfigLocal', null, 'global')) ||
      localStorage.getItem('printerConfigLocal');
    const parsed = raw ? JSON.parse(raw) : null;
    return String(parsed?.printer_name || '').trim();
  } catch (_error) {
    return '';
  }
}

function inferBridgeJobType(title = '') {
  const normalized = String(title || '').toLowerCase();
  if (normalized.includes('comanda')) return 'comanda';
  if (normalized.includes('fechamento')) return 'fechamento-caixa';
  if (normalized.includes('cupom')) return 'cupom';
  if (normalized.includes('teste')) return 'teste-impressao';
  return 'documento';
}

export function thermalPrint({
  title = 'Impressao',
  htmlContent = '',
  jobType,
  jobId,
  dedupeKey,
  dedupeWindowMs = DEFAULT_DEDUPE_WINDOW_MS,
  copies = 1,
  bridgeTimeoutMs,
  paperWidth,
  marginTop,
  marginRight,
  marginBottom,
  marginLeft,
  fontSize,
  lineSpacing,
  autoClose,
} = {}) {
  const resolvedJobType = jobType || inferBridgeJobType(title);
  const resolvedJobId = String(jobId || `web-${Date.now()}`);
  const printKey = dedupeKey || (jobId ? `job:${jobId}` : '');
  const safeDedupeWindowMs = Math.max(1000, Number(dedupeWindowMs) || DEFAULT_DEDUPE_WINDOW_MS);

  if (!beginPrintGuard(printKey, safeDedupeWindowMs)) {
    console.info(`${PRINT_LOG_PREFIX} skip-duplicate`, {
      jobType: resolvedJobType,
      jobId: resolvedJobId,
      printKey,
    });
    return true;
  }

  const browserFallback = (reason = 'fallback') => {
    const printed = openThermalPrintWindow({
    title,
    htmlContent,
    paperWidth,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    fontSize,
    lineSpacing,
    autoClose,
  });
    console.info(`${PRINT_LOG_PREFIX} browser-fallback`, {
      reason,
      jobType: resolvedJobType,
      jobId: resolvedJobId,
      printKey,
      printed,
    });
    if (printed) {
      markPrintGuardDone(printKey, safeDedupeWindowMs);
    } else {
      clearPrintGuard(printKey);
    }
    return printed;
  };

  if (typeof window === 'undefined') {
    clearPrintGuard(printKey);
    return false;
  }

  // Atualiza status em background para os próximos cliques.
  primeBridgeAvailability();

  if (!isBridgeLikelyAvailableSync()) {
    return browserFallback('bridge-unavailable-cache');
  }

  const printerName = getConfiguredPrinterName();
  console.info(`${PRINT_LOG_PREFIX} bridge-attempt`, {
    jobType: resolvedJobType,
    jobId: resolvedJobId,
    printKey,
    printerName: printerName || '(auto)',
  });

  void printViaBridge({
    printerName,
    jobType: resolvedJobType,
    contentType: 'html',
    content: htmlContent,
    copies,
    jobId: resolvedJobId,
    timeoutMs: bridgeTimeoutMs,
  }).then(() => {
    console.info(`${PRINT_LOG_PREFIX} bridge-success`, {
      jobType: resolvedJobType,
      jobId: resolvedJobId,
      printKey,
    });
    markPrintGuardDone(printKey, safeDedupeWindowMs);
  }).catch((error) => {
    const message = error?.message || String(error || 'bridge error');
    console.warn(`${PRINT_LOG_PREFIX} bridge-error`, {
      jobType: resolvedJobType,
      jobId: resolvedJobId,
      printKey,
      code: error?.code,
      uncertainPrinted: Boolean(error?.uncertainPrinted),
      message,
    });

    // Timeout do /print pode ter impresso no bridge. Evita duplicar no fallback.
    if (error?.uncertainPrinted) {
      markPrintGuardDone(printKey, safeDedupeWindowMs);
      return;
    }

    const printed = browserFallback('bridge-error');
    if (!printed) {
      clearPrintGuard(printKey);
    }
  });

  return true;
}

/**
 * Imprime cupom de venda em formato tÃ©rmico 80mm
 * @param {Object} saleData - Dados da venda
 * @param {Object} store - Dados da loja
 * @param {string} method - MÃ©todo de impressÃ£o: 'css' ou 'escpos'
 */
export function printReceipt(saleData, store = {}, method = 'css', options = {}) {
  const content = generateReceiptContent(saleData, store);
  
  if (method === 'escpos') {
    return printViaESCPOS(content, saleData, store);
  } else {
    return printViaCSS(content, 'cupom', options);
  }
}

/**
 * Imprime relatÃ³rio de fechamento de caixa
 * @param {Object} reportData - Dados do relatÃ³rio
 * @param {string} method - MÃ©todo de impressÃ£o
 */
export function printCashClosingReport(reportData, method = 'css', options = {}) {
  const content = generateClosingReportContent(reportData);
  
  if (method === 'escpos') {
    return printViaESCPOS(content, reportData);
  } else {
    return printViaCSS(content, 'fechamento-caixa', options);
  }
}

/**
 * Gera conteÃºdo HTML do cupom de venda
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
  const customerName = saleData?.customerName || saleData?.customer_name || 'Cliente BalcÃ£o';
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
      
      <div class="lineText">${DASH_LINE}</div>
      
      <div class="center bold">CUPOM NÃƒO FISCAL</div>
      <div class="center">PDV - Venda Presencial</div>
      
      <div class="lineText">${DASH_LINE}</div>
      
      <div>Pedido: #${orderCode}</div>
      <div>Data: ${date ? new Date(date).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}</div>
      <div>Cliente: ${customerName}</div>
      
      <div class="lineText">${DASH_LINE}</div>
      
      ${items.map(item => {
        const itemName = item.dish?.name || item.dish_name || item.name || 'Item';
        const details = buildItemDetails(item);
        const quantity = Number(item.quantity ?? 1) || 1;
        const itemTotal = Number.isFinite(Number(item.total_price))
          ? Number(item.total_price)
          : (Number(item.totalPrice ?? item.unit_price ?? item.price ?? 0) || 0) * quantity;
        
        return `
        <div class="itemRow">
          <div class="itemLabel">${quantity}x ${itemName}${details}</div>
          <div class="itemValue">${formatCurrency(itemTotal)}</div>
        </div>
        `;
      }).join('')}
      
      <div class="lineText">${DASH_LINE}</div>
      
      <div class="itemRow">
        <div class="itemLabel">Subtotal</div>
        <div class="itemValue">${formatCurrency(subtotal)}</div>
      </div>
      
      ${discount > 0 ? `
      <div class="itemRow">
        <div class="itemLabel">Desconto</div>
        <div class="itemValue">-${formatCurrency(discount)}</div>
      </div>
      ` : ''}
      
      <div class="itemRow bold total">
        <div class="itemLabel">TOTAL</div>
        <div class="itemValue">${formatCurrency(total)}</div>
      </div>
      
      <div class="lineText">${DASH_LINE}</div>
      
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
      <div class="itemRow">
        <div class="itemLabel">${label}</div>
        <div class="itemValue">${formatCurrency(value)}</div>
      </div>
      `;
      }).join('')}
      
      ${change > 0 ? `
      <div class="itemRow">
        <div class="itemLabel">Troco</div>
        <div class="itemValue">${formatCurrency(change)}</div>
      </div>
      ` : ''}
      
      <div class="lineText">${DASH_LINE}</div>
      
      <div class="center small">Obrigado pela preferÃªncia!</div>
      <div class="center small">Volte sempre!</div>
    </div>
  `;
}

/**
 * Gera conteÃºdo HTML do relatÃ³rio de fechamento
 */
function generateClosingReportContent(reportData) {
  const {
    storeName,
    operatorName,
    terminalName,
    operationalDate,
    turnLabel,
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
    totalOutro,
    qtdOutro,
    totalTroco,
    totalDesconto,
    totalAcrescimo,
    qtdeCupons,
    expectedBalance,
    closingBalance,
    differenceAmount,
    canceladosEmTela = 0,
    canceladosEmTelaValor = 0
  } = reportData;

  return `
    <div class="receipt">
      <div class="center bold">** RELATÃ“RIO DE FECHAMENTO **</div>
      
      <div class="lineText">${DASH_LINE}</div>
      
      ${storeName ? `<div class="center bold">${storeName}</div>` : ''}
      <div>OPERADOR: ${operatorName || '-'}</div>
      <div>CAIXA: ${terminalName || '1'}</div>
      ${operationalDate ? `<div>DIA OPERACIONAL: ${operationalDate}</div>` : ''}
      ${turnLabel ? `<div>TURNO: ${turnLabel}</div>` : ''}
      <div>DH INICIAL: ${dhInicial || '-'}</div>
      <div>DH FINAL: ${dhFinal || '(CAIXA ABERTO)'}</div>
      
      <div class="lineText">${DASH_LINE}</div>
      <div class="bold">MOVIMENTAÃ‡Ã•ES</div>
      <div class="lineText">${DASH_LINE}</div>
      
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
        <div>(=)SALDO ESPERADO</div>
        <div></div>
        <div class="text-right">${formatCurrency(expectedBalance ?? saldoEmCaixa ?? 0)}</div>
      </div>
      ${closingBalance != null ? `
      <div class="item-3col">
        <div>(=)SALDO INFORMADO</div>
        <div></div>
        <div class="text-right">${formatCurrency(closingBalance)}</div>
      </div>
      <div class="item-3col bold">
        <div>(=)DIFERENCA</div>
        <div></div>
        <div class="text-right">${formatCurrency(differenceAmount || 0)}</div>
      </div>
      ` : ''}
      
      <div class="lineText">${DASH_LINE}</div>
      <div class="bold">FORMA DE PAGAMENTO</div>
      <div class="lineText">${DASH_LINE}</div>
      
      <div class="item-3col">
        <div>C. CRÃ‰DITO</div>
        <div class="text-right">${qtdCredito || 0}</div>
        <div class="text-right">${formatCurrency(totalCredito || 0)}</div>
      </div>
      <div class="item-3col">
        <div>C. DÃ‰BITO</div>
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
      ${(Number(totalOutro) || 0) > 0 ? `
      <div class="item-3col">
        <div>OUTROS</div>
        <div class="text-right">${qtdOutro || 0}</div>
        <div class="text-right">${formatCurrency(totalOutro || 0)}</div>
      </div>
      ` : ''}
      <div class="item-3col bold">
        <div>TOTAL</div>
        <div></div>
        <div class="text-right">${formatCurrency(totalVendas || 0)}</div>
      </div>
      
      <div class="lineText">${DASH_LINE}</div>
      <div class="bold">VENDAS CANCELADAS</div>
      <div class="lineText">${DASH_LINE}</div>
      
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
      
      <div class="lineText">${DASH_LINE}</div>
      <div class="bold">ADICIONAIS</div>
      <div class="lineText">${DASH_LINE}</div>
      
      <div class="itemRow">
        <div class="itemLabel">TROCO</div>
        <div class="itemValue">${formatCurrency(totalTroco || 0)}</div>
      </div>
      <div class="itemRow">
        <div class="itemLabel">DESCONTO</div>
        <div class="itemValue">${formatCurrency(totalDesconto || 0)}</div>
      </div>
      <div class="itemRow">
        <div class="itemLabel">ACRÃ‰SCIMO</div>
        <div class="itemValue">${formatCurrency(totalAcrescimo || 0)}</div>
      </div>
      <div class="itemRow">
        <div class="itemLabel">QTDE CUPONS</div>
        <div class="itemValue">${qtdeCupons || 0}</div>
      </div>
      
      <div class="lineText">${DASH_LINE}</div>
    </div>
  `;
}

/**
 * ImpressÃ£o via CSS (window.print) - MÃ©todo padrÃ£o
 */
function printViaCSS(htmlContent, jobType = 'documento', options = {}) {
  return thermalPrint({
    title: 'Impressao',
    htmlContent,
    jobType,
    ...options,
  });
}

/**
async function printViaESCPOS(content, data, store) {
  // Verificar se Web Serial API estÃ¡ disponÃ­vel
  if (!('serial' in navigator)) {
    console.warn('Web Serial API nÃ£o disponÃ­vel. Usando fallback CSS.');
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
 * Gera comandos ESC/POS para impressora tÃ©rmica
 * Comandos bÃ¡sicos ESC/POS:
 * ESC @ - Inicializar impressora
 * ESC a n - Alinhamento (0=esq, 1=centro, 2=dir)
 * ESC E n - Negrito (0=off, 1=on)
 * ESC d n - AvanÃ§ar n linhas
 * GS V - Cortar papel
 */
function generateESCPOSCommands(data, store) {
  const ESC = '\x1B';
  const GS = '\x1D';
  
  let commands = '';
  
  // Inicializar
  commands += ESC + '@';
  
  // CabeÃ§alho centralizado
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
  
  // Adicionar conteÃºdo...
  // (ImplementaÃ§Ã£o completa dos comandos ESC/POS)
  
  // Cortar papel
  commands += '\n\n\n';
  commands += GS + 'V' + '\x00';
  
  // Converter para Uint8Array
  return new TextEncoder().encode(commands);
}

