/**
 * Utilitários de Impressão Térmica
 * Suporta impressão via CSS (window.print) e ESC/POS
 */

import { formatCurrency } from './formatters';

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
function generateReceiptContent(saleData, store) {
  const { orderCode, total, payments = [], change = 0, items = [], customerName, date } = saleData;
  const storeName = store?.name || 'ESTABELECIMENTO';
  const storeAddress = store?.address || '';
  const storePhone = store?.phone || '';
  
  // Calcular subtotal e desconto
  const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || item.unit_price || 0) * item.quantity, 0);
  const discount = subtotal - total;

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
        const itemName = item.dish?.name || item.name || 'Item';
        const details = item.flavors?.length 
          ? ` (${item.size?.name || ''} ${item.flavors.map(f => f.name).join(' + ')})`
          : item.selections ? ` (${Object.values(item.selections).filter(Boolean).join(', ')})` : '';
        const unitPrice = item.totalPrice || item.unit_price || 0;
        const itemTotal = unitPrice * item.quantity;
        
        return `
        <div class="item">
          <div>${item.quantity}x ${itemName}${details}</div>
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
      ${payments.map(p => `
      <div class="item">
        <div>${p.methodLabel || p.method}</div>
        <div class="text-right">${formatCurrency(p.amount)}</div>
      </div>
      `).join('')}
      
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
  const printWindow = window.open('', '_blank', 'width=300,height=600');
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Impressão</title>
        <style>
          @page { 
            size: 80mm auto; 
            margin: 5mm; 
          }
          
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 12px;
            line-height: 1.4;
            padding: 0;
            margin: 0;
            max-width: 80mm;
          }
          
          .receipt {
            padding: 5mm;
          }
          
          .center { 
            text-align: center; 
          }
          
          .bold { 
            font-weight: bold; 
          }
          
          .small {
            font-size: 10px;
          }
          
          .line { 
            border-top: 1px dashed #000; 
            margin: 5px 0; 
          }
          
          .item { 
            display: flex; 
            justify-content: space-between;
            margin: 3px 0;
          }
          
          .item-3col {
            display: grid;
            grid-template-columns: 1fr auto auto;
            gap: 8px;
            margin: 3px 0;
          }
          
          .text-right {
            text-align: right;
          }
          
          .total { 
            font-size: 14px;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  
  // Aguardar carregamento e imprimir
  setTimeout(() => {
    printWindow.print();
    // Fechar após impressão (opcional)
    setTimeout(() => {
      printWindow.close();
    }, 500);
  }, 250);
}

/**
 * Impressão via ESC/POS (Web Serial API ou backend)
 * Nota: Requer implementação adicional e suporte do navegador
 */
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
