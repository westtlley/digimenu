/**
 * ExportaÃ§Ã£o e impressÃ£o do Gestor de Pedidos
 * - CSV de pedidos
 * - PDF relatÃ³rio do dia
 * - Fila de impressÃ£o (comandas)
 */

import { formatBrazilianDateTime, formatScheduledDateTime } from '@/components/utils/dateUtils';
import { formatCurrency } from './formatters';
import { thermalPrint } from './thermalPrint';
import jsPDF from 'jspdf';

const PAYMENT_LABELS = { pix: 'PIX', dinheiro: 'Dinheiro', cartao_credito: 'CartÃ£o de CrÃ©dito', cartao_debito: 'CartÃ£o de DÃ©bito' };

/** EndereÃ§o completo (evita cortes) - igual ao WhatsApp - exportado para uso em PDF/impressÃ£o */
export function getFullAddress(order) {
  if (!order || order.delivery_method !== 'delivery') return '';
  if (order.address && order.address.length > 10) return order.address;
  const parts = [
    order.address_street,
    order.address_number,
    order.address_complement,
    order.neighborhood,
    order.city,
    order.state
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : (order.address || '');
}

const DASH_LINE = '--------------------------------';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeItemTotal(item) {
  const explicit = Number(item?.total_price ?? item?.totalPrice);
  if (Number.isFinite(explicit)) return explicit;
  const qty = Number(item?.quantity ?? 1) || 1;
  const unit = Number(item?.unit_price ?? item?.unitPrice ?? item?.price ?? 0) || 0;
  return unit * qty;
}

function buildItemsHtml(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (items.length === 0) {
    return `<div class="small">Sem itens</div>`;
  }

  return items.map((item) => {
    const itemName = item?.dish?.name || item?.dish_name || item?.name || 'Item';
    const qty = Number(item?.quantity ?? 1) || 1;
    const total = normalizeItemTotal(item);
    const detailLines = [];

    if (item?.size?.name) detailLines.push(`Tam: ${item.size.name}`);
    if (Array.isArray(item?.flavors) && item.flavors.length > 0) {
      detailLines.push(`Sabores: ${item.flavors.map((f) => f?.name).filter(Boolean).join(' + ')}`);
    }
    if (item?.edge?.name) detailLines.push(`Borda: ${item.edge.name}`);
    if (Array.isArray(item?.extras) && item.extras.length > 0) {
      detailLines.push(`Extras: ${item.extras.map((e) => e?.name).filter(Boolean).join(', ')}`);
    }
    if (item?.selections && typeof item.selections === 'object') {
      Object.values(item.selections).forEach((selectionValue) => {
        if (Array.isArray(selectionValue)) {
          selectionValue.forEach((entry) => {
            const label = entry?.name || entry?.label || entry?.title || entry?.value;
            if (label) detailLines.push(String(label));
          });
        } else {
          const label = selectionValue?.name || selectionValue?.label || selectionValue?.title || selectionValue?.value;
          if (label) detailLines.push(String(label));
        }
      });
    }
    if (item?.specifications) detailLines.push(`Obs: ${item.specifications}`);
    if (item?.observations) detailLines.push(`Obs: ${item.observations}`);

    const uniqueDetails = [...new Set(detailLines.map((line) => String(line).trim()).filter(Boolean))];

    return `
      <div class="itemRow">
        <div class="itemLabel">${qty}x ${escapeHtml(itemName)}</div>
        <div class="itemValue">${formatCurrency(total)}</div>
      </div>
      ${uniqueDetails.map((line) => `<div class="small">  - ${escapeHtml(line)}</div>`).join('')}
    `;
  }).join('');
}

const COMANDA_STYLE = `
*{color:#000!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;opacity:1!important;text-shadow:none!important;}
.center{text-align:center;}
.bold{font-weight:700;}
.small{font-size:.9em;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;}
.lineText{white-space:pre;letter-spacing:.3px;overflow:hidden;margin:6px 0;}
.itemRow{display:flex;justify-content:space-between;font-family:"Courier New",monospace;gap:var(--item-gap,8px);margin:2px 0;}
.itemLabel{flex:1;min-width:0;padding-right:8px;word-break:break-word;overflow-wrap:anywhere;}
.itemValue{min-width:var(--item-value-width,74px);text-align:right;white-space:nowrap;}
.page-break{page-break-after:always;}
`;

/**
 * Gera o conteudo HTML (body) de uma comanda para impressao
 */
export function buildComandaBody(order) {
  const code = order?.order_code || String(order?.id || '').slice(-6).toUpperCase();
  const orderDate = order?.created_at || order?.created_date;
  const fullAddress = getFullAddress(order);

  const storeName = order?.store_name || order?.store?.name || 'ESTABELECIMENTO';
  const storeAddress = order?.store_address || order?.store?.address || '';

  const subtotal = Number(order?.subtotal ?? order?.total ?? 0) || 0;
  const discount = Number(order?.discount ?? 0) || 0;
  const total = Number(order?.total ?? subtotal) || 0;

  const paymentList = Array.isArray(order?.payments) && order.payments.length > 0
    ? order.payments.map((p) => ({
        method: p?.method || p?.payment_method || 'outro',
        amount: Number(p?.amount ?? p?.payment_amount ?? 0) || 0,
      }))
    : [{
        method: order?.payment_method || '-',
        amount: total,
      }];

  const changeFromCash = Number(order?.change ?? 0) || 0;
  const changeFromNeedsChange = order?.needs_change && Number(order?.change_amount) > total
    ? (Number(order.change_amount) - total)
    : 0;
  const change = changeFromCash > 0 ? changeFromCash : changeFromNeedsChange;

  return `
    <div class="center bold">${escapeHtml(storeName)}</div>
    ${storeAddress ? `<div class="center small">${escapeHtml(storeAddress)}</div>` : ''}
    <div class="lineText">${DASH_LINE}</div>

    <div class="center bold">COMANDA</div>
    <div class="lineText">${DASH_LINE}</div>

    <div>Pedido: #${escapeHtml(code)}</div>
    <div>Data: ${orderDate ? formatBrazilianDateTime(orderDate) : formatBrazilianDateTime(new Date().toISOString())}</div>
    <div>Cliente: ${escapeHtml(order?.customer_name || 'Cliente Balcao')}</div>
    <div>Tipo: ${order?.delivery_method === 'delivery' ? 'Entrega' : 'Retirada'}</div>
    ${fullAddress ? `<div class="small">Endereco: ${escapeHtml(fullAddress)}</div>` : ''}
    ${order?.scheduled_date && order?.scheduled_time ? `<div class="small">Agendado: ${escapeHtml(formatScheduledDateTime(order.scheduled_date, order.scheduled_time))}</div>` : ''}

    <div class="lineText">${DASH_LINE}</div>
    ${buildItemsHtml(order)}

    <div class="lineText">${DASH_LINE}</div>
    <div class="itemRow"><div class="itemLabel">Subtotal</div><div class="itemValue">${formatCurrency(subtotal)}</div></div>
    ${discount > 0 ? `<div class="itemRow"><div class="itemLabel">Desconto</div><div class="itemValue">-${formatCurrency(discount)}</div></div>` : ''}
    ${Number(order?.delivery_fee) > 0 ? `<div class="itemRow"><div class="itemLabel">Taxa Entrega</div><div class="itemValue">${formatCurrency(order.delivery_fee)}</div></div>` : ''}
    <div class="itemRow bold"><div class="itemLabel">TOTAL</div><div class="itemValue">${formatCurrency(total)}</div></div>

    <div class="lineText">${DASH_LINE}</div>
    <div class="bold">Pagamentos</div>
    ${paymentList.map((p) => `<div class="itemRow"><div class="itemLabel">${escapeHtml(PAYMENT_LABELS[p.method] || p.method)}</div><div class="itemValue">${formatCurrency(p.amount)}</div></div>`).join('')}
    ${change > 0 ? `<div class="itemRow"><div class="itemLabel">Troco</div><div class="itemValue">${formatCurrency(change)}</div></div>` : ''}

    <div class="lineText">${DASH_LINE}</div>
    <div class="center small">Obrigado pela preferencia!</div>
  `;
}

/**
 * Gera HTML completo de uma comanda (para janela unica)
 */
export function buildComandaHtml(order) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comanda #${order?.order_code || order?.id || ''}</title><style>${COMANDA_STYLE}</style></head><body>${buildComandaBody(order)}</body></html>`;
}

function buildComandasMarkup(list) {
  const bodies = list
    .map((order, index) => `${buildComandaBody(order)}${index < list.length - 1 ? '<div class="page-break"></div>' : ''}`)
    .join('');

  return `<style>${COMANDA_STYLE}</style>${bodies}`;
}

export function printComanda(order, options = {}) {
  if (!order) return false;
  return thermalPrint({
    title: `Comanda #${order.order_code || order.id || ''}`,
    jobType: 'comanda',
    htmlContent: buildComandasMarkup([order]),
    ...options,
  });
}

/**
 * Imprime comandas de uma fila
 */
export function printOrdersInQueue(orders, ids, options = {}) {
  const list = ids.map((id) => orders.find((o) => String(o.id) === String(id))).filter(Boolean);
  if (list.length === 0) return false;
  return thermalPrint({
    title: list.length > 1 ? `Comandas (${list.length})` : `Comanda #${list[0].order_code || list[0].id || ''}`,
    jobType: 'comanda',
    htmlContent: buildComandasMarkup(list),
    ...options,
  });
}

/**
 * Exporta pedidos para CSV
 */
export function exportOrdersToCSV(orders) {
  const headers = ['CÃ³digo', 'Cliente', 'Telefone', 'Status', 'Total', 'Data', 'Pagamento', 'Tipo'];
  const rows = orders.map(o => [
    o.order_code || o.id,
    (o.customer_name || '').replace(/"/g, '""'),
    o.customer_phone || '',
    o.status || '',
    String(o.total || 0).replace('.', ','),
    (o.created_at || o.created_date) ? formatBrazilianDateTime(o.created_at || o.created_date) : '',
    PAYMENT_LABELS[o.payment_method] || o.payment_method || '',
    o.delivery_method === 'delivery' ? 'Entrega' : 'Retirada'
  ].map(c => `"${String(c)}"`).join(','));
  return '\ufeff' + [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
}

/**
 * ForÃ§a download do CSV
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
 * Gera e baixa PDF do relatÃ³rio (dia, semana ou mÃªs)
 * @param {Array} orders - lista de pedidos
 * @param {'today'|'week'|'month'} period - perÃ­odo do relatÃ³rio
 */
export function exportGestorReportPDF(orders, period = 'today') {
  const now = new Date();
  let startDate;
  let title = 'RelatÃ³rio do Dia';
  if (period === 'week') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
    title = 'RelatÃ³rio - Ãšltimos 7 dias';
  } else if (period === 'month') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 30);
    title = 'RelatÃ³rio - Ãšltimos 30 dias';
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    title = 'RelatÃ³rio do Dia';
  }
  const list = orders.filter(o => {
    const dt = o.created_at || o.created_date;
    if (!dt || o.status === 'cancelled') return false;
    const d = new Date(dt);
    return !isNaN(d.getTime()) && d >= startDate;
  });
  const totalRevenue = list.reduce((s, o) => s + (o.total || 0), 0);
  const byStatus = list.reduce((a, o) => { a[o.status] = (a[o.status]||0)+1; return a; }, {});
  const byPay = list.reduce((a, o) => {
    const m = PAYMENT_LABELS[o.payment_method] || o.payment_method || 'Outro';
    a[m] = (a[m]||0) + (o.total||0); return a;
  }, {});

  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(`${title} - Gestor de Pedidos`, 14, 20);
  doc.setFontSize(10);
  doc.text(formatBrazilianDateTime(new Date().toISOString()), 14, 28);
  doc.setFontSize(12);
  doc.text(`Faturamento: ${formatCurrency(totalRevenue)}`, 14, 38);
  doc.text(`Pedidos: ${list.length}`, 14, 45);
  doc.text(`Ticket mÃ©dio: ${formatCurrency(list.length ? totalRevenue / list.length : 0)}`, 14, 52);
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
  const suffix = period === 'today' ? new Date().toISOString().slice(0, 10) : `${period}_${new Date().toISOString().slice(0, 10)}`;
  doc.save(`relatorio_gestor_${suffix}.pdf`);
}

