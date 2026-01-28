/**
 * Exportação e impressão do Gestor de Pedidos
 * - CSV de pedidos
 * - PDF relatório do dia
 * - Fila de impressão (comandas)
 */

import { formatBrazilianDateTime, formatScheduledDateTime } from '@/components/utils/dateUtils';
import jsPDF from 'jspdf';

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const PAYMENT_LABELS = { pix: 'PIX', dinheiro: 'Dinheiro', cartao_credito: 'Cartão de Crédito', cartao_debito: 'Cartão de Débito' };

function buildItemsHtml(order) {
  let html = '';
  (order.items || []).forEach((item, idx) => {
    const isPizza = item.dish?.product_type === 'pizza';
    html += `<div style="margin-bottom:12px;border-left:3px solid #666;padding-left:8px;">`;
    html += `<p style="margin:0;font-weight:bold;">#${idx + 1} - ${item.dish?.name || 'Item'} x${item.quantity || 1}</p>`;
    if (isPizza && item.size) {
      html += `<p style="margin:4px 0 0 12px;font-size:10px;">🍕 ${item.size.name} (${item.size.slices} fatias)</p>`;
      if (item.flavors?.length) {
        const f = item.flavors.reduce((a, x) => { a[x.name] = (a[x.name]||0)+1; return a; }, {});
        Object.entries(f).forEach(([n, c]) => { html += `<p style="margin:2px 0 0 24px;font-size:10px;">• ${c}/${item.size.slices} ${n}</p>`; });
      }
      if (item.edge) html += `<p style="margin:2px 0 0 12px;font-size:10px;">🧀 Borda: ${item.edge.name}</p>`;
      if (item.extras?.length) item.extras.forEach(e => { html += `<p style="margin:2px 0 0 24px;font-size:10px;">• ${e.name}</p>`; });
    } else if (item.selections && Object.keys(item.selections).length > 0) {
      Object.values(item.selections).flat().filter(Boolean).forEach(s => { html += `<p style="margin:2px 0 0 12px;font-size:10px;">• ${s.name || s}</p>`; });
    }
    if (item.observations) html += `<p style="margin:2px 0 0 12px;font-size:10px;font-style:italic;">📝 ${item.observations}</p>`;
    html += `<p style="margin:4px 0 0 0;">Valor: ${formatCurrency((item.totalPrice || 0) * (item.quantity || 1))}</p></div>`;
  });
  return html;
}

const COMANDA_STYLE = `body{font-family:'Courier New',monospace;font-size:12px;line-height:1.4;padding:10mm;margin:0;width:80mm;}
h1{text-align:center;font-size:16px;margin:0 0 5px 0;}
.header{text-align:center;margin-bottom:10px;padding-bottom:10px;border-bottom:2px dashed #000;}
.section{margin:10px 0;}
.total{border-top:2px solid #000;margin-top:10px;padding-top:10px;font-weight:bold;font-size:14px;}
.code-box{background:#fff3cd;border:2px solid #ff9800;padding:10px;margin:10px 0;text-align:center;}
.code-box .code{font-size:24px;font-weight:bold;letter-spacing:5px;}
@media print{.page-break{page-break-after:always;}}`;

/**
 * Gera o conteúdo HTML (body) de uma comanda para impressão
 */
export function buildComandaBody(order) {
  const paymentLabel = PAYMENT_LABELS[order.payment_method] || order.payment_method;
  const itemsHTML = buildItemsHtml(order);
  const code = order.order_code || String(order.id || '').slice(-6).toUpperCase();
  return `<div class="header"><h1>COMANDA</h1><p style="margin:0;">Pedido #${code}</p><p style="margin:0;font-size:11px;">${formatBrazilianDateTime(order.created_date)}</p></div>
<div class="section">
<p style="margin:0;"><strong>Cliente:</strong> ${order.customer_name || ''}</p>
<p style="margin:0;"><strong>Contato:</strong> ${order.customer_phone || ''}</p>
<p style="margin:0;"><strong>Tipo:</strong> ${order.delivery_method === 'delivery' ? 'Entrega 🚴' : 'Retirada 🏪'}</p>
${order.address ? `<p style="margin:0;"><strong>Endereço:</strong> ${order.address}</p>` : ''}
<p style="margin:0;"><strong>Pagamento:</strong> ${paymentLabel}</p>
${order.payment_method === 'dinheiro' && order.needs_change && order.change_amount ? `<p style="margin:0;"><strong>Troco para:</strong> ${formatCurrency(order.change_amount)}</p>` : ''}
${order.scheduled_date && order.scheduled_time ? `<p style="margin:0;color:#0066cc;font-weight:bold;">⏰ AGENDADO: ${formatScheduledDateTime(order.scheduled_date, order.scheduled_time)}</p>` : ''}
${order.customer_change_request ? `<p style="margin:4px 0 0 0;padding:6px;background:#fef3c7;border:1px solid #f59e0b;"><strong>✏️ Alteração:</strong> ${order.customer_change_request}</p>` : ''}
</div>
<div class="section"><p style="margin:0;font-weight:bold;border-bottom:1px solid #000;padding-bottom:5px;">--- Pedido ---</p>${itemsHTML}</div>
<div class="total">
<p style="margin:0;">Subtotal: ${formatCurrency(order.subtotal)}</p>
${order.delivery_fee > 0 ? `<p style="margin:0;">Taxa: ${formatCurrency(order.delivery_fee)}</p>` : ''}
${order.discount > 0 ? `<p style="margin:0;color:green;">Desconto: -${formatCurrency(order.discount)}</p>` : ''}
<p style="margin:5px 0 0 0;font-size:16px;">TOTAL: ${formatCurrency(order.total)}</p>
</div>
${(order.pickup_code || order.delivery_code) ? `<div class="code-box"><p style="margin:0;font-size:10px;">Cód. Retirada</p><p class="code">${order.pickup_code || order.delivery_code || ''}</p></div>` : ''}
<div style="text-align:center;margin-top:15px;font-size:10px;color:#666;">${formatBrazilianDateTime(order.created_date)}</div>`;
}

/**
 * Gera HTML completo de uma comanda (para janela única)
 */
export function buildComandaHtml(order) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comanda #${order.order_code || order.id}</title><style>${COMANDA_STYLE}</style></head><body>${buildComandaBody(order)}</body></html>`;
}

/**
 * Imprime comandas de uma fila (abre uma janela com todas)
 */
export function printOrdersInQueue(orders, ids) {
  const list = ids.map(id => orders.find(o => String(o.id) === String(id))).filter(Boolean);
  if (list.length === 0) return;
  const bodies = list.map(o => `<div class="comanda-sheet">${buildComandaBody(o)}</div><div class="page-break"></div>`).join('');
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comandas</title><style>${COMANDA_STYLE} .comanda-sheet{margin:0;}.page-break{page-break-after:always;}</style></head><body>${bodies}</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); win.close(); }, 300);
}

/**
 * Exporta pedidos para CSV
 */
export function exportOrdersToCSV(orders) {
  const headers = ['Código', 'Cliente', 'Telefone', 'Status', 'Total', 'Data', 'Pagamento', 'Tipo'];
  const rows = orders.map(o => [
    o.order_code || o.id,
    (o.customer_name || '').replace(/"/g, '""'),
    o.customer_phone || '',
    o.status || '',
    String(o.total || 0).replace('.', ','),
    o.created_date ? formatBrazilianDateTime(o.created_date) : '',
    PAYMENT_LABELS[o.payment_method] || o.payment_method || '',
    o.delivery_method === 'delivery' ? 'Entrega' : 'Retirada'
  ].map(c => `"${String(c)}"`).join(','));
  return '\ufeff' + [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
}

/**
 * Força download do CSV
 */
export function downloadOrdersCSV(orders, filename) {
  const csv = exportOrdersToCSV(orders);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `pedidos_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Gera e baixa PDF do relatório do dia
 */
export function exportGestorReportPDF(orders) {
  const today = new Date().toDateString();
  const list = orders.filter(o => new Date(o.created_date).toDateString() === today && o.status !== 'cancelled');
  const totalRevenue = list.reduce((s, o) => s + (o.total || 0), 0);
  const byStatus = list.reduce((a, o) => { a[o.status] = (a[o.status]||0)+1; return a; }, {});
  const byPay = list.reduce((a, o) => {
    const m = PAYMENT_LABELS[o.payment_method] || o.payment_method || 'Outro';
    a[m] = (a[m]||0) + (o.total||0); return a;
  }, {});

  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('Relatório do Dia - Gestor de Pedidos', 14, 20);
  doc.setFontSize(10);
  doc.text(formatBrazilianDateTime(new Date().toISOString()), 14, 28);
  doc.setFontSize(12);
  doc.text(`Faturamento: ${formatCurrency(totalRevenue)}`, 14, 38);
  doc.text(`Pedidos: ${list.length}`, 14, 45);
  doc.text(`Ticket médio: ${formatCurrency(list.length ? totalRevenue / list.length : 0)}`, 14, 52);
  let y = 62;
  doc.text('Por status:', 14, y); y += 6;
  Object.entries(byStatus).forEach(([k, v]) => { doc.text(`  ${k}: ${v}`, 14, y); y += 5; });
  y += 4;
  doc.text('Por pagamento:', 14, y); y += 6;
  Object.entries(byPay).forEach(([k, v]) => { doc.text(`  ${k}: ${formatCurrency(v)}`, 14, y); y += 5; });
  y += 8;
  doc.text('--- Pedidos ---', 14, y); y += 6;
  list.slice(0, 30).forEach((o, i) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.text(`${i+1}. #${o.order_code || o.id} | ${(o.customer_name||'').slice(0,20)} | ${o.status} | ${formatCurrency(o.total)}`, 14, y);
    y += 5;
  });
  if (list.length > 30) doc.text(`... e mais ${list.length - 30} pedidos`, 14, y);
  doc.save(`relatorio_gestor_${new Date().toISOString().slice(0, 10)}.pdf`);
}
