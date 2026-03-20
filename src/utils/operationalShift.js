export const DEFAULT_OPERATIONAL_DAY_CUTOFF_TIME = '05:00';

function pad2(value) {
  return String(value).padStart(2, '0');
}

function toDateKey(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function shiftOperationalDate(dateKey, days) {
  if (!dateKey) return null;
  const [year, month, day] = String(dateKey).split('-').map((part) => parseInt(part, 10));
  const utcDate = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  utcDate.setUTCDate(utcDate.getUTCDate() + Number(days || 0));
  return toDateKey(utcDate.getUTCFullYear(), utcDate.getUTCMonth() + 1, utcDate.getUTCDate());
}

export function normalizeOperationalDayCutoffTime(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return DEFAULT_OPERATIONAL_DAY_CUTOFF_TIME;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return DEFAULT_OPERATIONAL_DAY_CUTOFF_TIME;
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return DEFAULT_OPERATIONAL_DAY_CUTOFF_TIME;
  }
  return `${pad2(hours)}:${pad2(minutes)}`;
}

export function parseOperationalCutoffMinutes(value) {
  const [hours, minutes] = normalizeOperationalDayCutoffTime(value).split(':').map((part) => parseInt(part, 10));
  return (hours * 60) + minutes;
}

function getReferenceDate(record = {}) {
  return (
    record?.opened_at ||
    record?.opening_date ||
    record?.date ||
    record?.created_at ||
    record?.created_date ||
    null
  );
}

function roundMoney(value) {
  return Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;
}

export function resolveOperationalDate(dateLike = new Date(), cutoffTime = DEFAULT_OPERATIONAL_DAY_CUTOFF_TIME) {
  const reference = dateLike instanceof Date ? dateLike : new Date(dateLike || Date.now());
  if (Number.isNaN(reference.getTime())) return null;

  const minutesOfDay = (reference.getHours() * 60) + reference.getMinutes();
  const dateKey = toDateKey(reference.getFullYear(), reference.getMonth() + 1, reference.getDate());
  if (minutesOfDay < parseOperationalCutoffMinutes(cutoffTime)) {
    return shiftOperationalDate(dateKey, -1);
  }
  return dateKey;
}

export function getEntityOperationalDate(record = {}, cutoffTime = DEFAULT_OPERATIONAL_DAY_CUTOFF_TIME) {
  if (record?.operational_date) {
    return String(record.operational_date).slice(0, 10);
  }
  const reference = getReferenceDate(record);
  return reference ? resolveOperationalDate(reference, cutoffTime) : null;
}

export function getCaixaOpenedAt(caixa = {}) {
  return caixa?.opened_at || caixa?.opening_date || caixa?.created_at || null;
}

export function getCaixaClosedAt(caixa = {}) {
  return caixa?.closed_at || caixa?.closing_date || null;
}

export function formatOperationalDateLabel(dateKey) {
  if (!dateKey) return '-';
  const [year, month, day] = String(dateKey).split('-');
  return `${day}/${month}/${year}`;
}

export function isOperationalDateBetween(dateKey, startKey, endKey) {
  if (!dateKey || !startKey || !endKey) return false;
  return dateKey >= startKey && dateKey <= endKey;
}

export function buildCustomOperationalRange(startDate, endDate, cutoffTime = DEFAULT_OPERATIONAL_DAY_CUTOFF_TIME) {
  if (!startDate || !endDate) {
    return { startKey: null, endKey: null };
  }

  const startKey = resolveOperationalDate(new Date(startDate), cutoffTime);
  const endBase = new Date(endDate);
  endBase.setHours(23, 59, 59, 999);
  const endKey = resolveOperationalDate(endBase, cutoffTime);
  return { startKey, endKey };
}

export function isRecordInOperationalRange(record, startKey, endKey, cutoffTime = DEFAULT_OPERATIONAL_DAY_CUTOFF_TIME) {
  if (!startKey || !endKey) return true;
  const recordDateKey = getEntityOperationalDate(record, cutoffTime);
  return isOperationalDateBetween(recordDateKey, startKey, endKey);
}

export function buildOperationalRange(periodFilter, cutoffTime = DEFAULT_OPERATIONAL_DAY_CUTOFF_TIME) {
  const todayKey = resolveOperationalDate(new Date(), cutoffTime);
  if (!todayKey) return { startKey: null, endKey: null };

  switch (periodFilter) {
    case 'today':
      return { startKey: todayKey, endKey: todayKey };
    case 'week':
      return { startKey: shiftOperationalDate(todayKey, -6), endKey: todayKey };
    case 'month':
      return { startKey: shiftOperationalDate(todayKey, -29), endKey: todayKey };
    case 'all':
    default:
      return { startKey: null, endKey: null };
  }
}

export function buildCaixaShiftSummary({
  caixa = null,
  operations = [],
  closingBalance = null,
  canceledCount = 0,
  canceledAmount = 0,
  cutoffTime = DEFAULT_OPERATIONAL_DAY_CUTOFF_TIME,
} = {}) {
  const shiftId = String(caixa?.id || '');
  const relevantOperations = Array.isArray(operations)
    ? operations.filter((operation) => {
        if (!shiftId) return true;
        return (
          String(operation?.shift_id || operation?.caixa_id || '') === shiftId ||
          String(operation?.caixa_id || '') === shiftId
        );
      })
    : [];

  const sales = relevantOperations.filter((operation) => operation?.type === 'venda_pdv');
  const sangrias = relevantOperations.filter((operation) => operation?.type === 'sangria');
  const suprimentos = relevantOperations.filter((operation) => operation?.type === 'suprimento');

  const paymentTotals = {
    cash: roundMoney(sales.filter((operation) => operation?.payment_method === 'dinheiro').reduce((sum, operation) => sum + Number(operation?.amount || 0), 0)),
    pix: roundMoney(sales.filter((operation) => operation?.payment_method === 'pix').reduce((sum, operation) => sum + Number(operation?.amount || 0), 0)),
    debit: roundMoney(sales.filter((operation) => operation?.payment_method === 'debito').reduce((sum, operation) => sum + Number(operation?.amount || 0), 0)),
    credit: roundMoney(sales.filter((operation) => operation?.payment_method === 'credito').reduce((sum, operation) => sum + Number(operation?.amount || 0), 0)),
    other: roundMoney(sales.filter((operation) => operation?.payment_method === 'outro').reduce((sum, operation) => sum + Number(operation?.amount || 0), 0)),
  };

  const openingBalance = roundMoney(
    caixa?.opening_balance != null ? caixa.opening_balance : caixa?.opening_amount_cash
  );
  const totalSuprimentos = roundMoney(suprimentos.reduce((sum, operation) => sum + Number(operation?.amount || 0), 0));
  const totalSangrias = roundMoney(sangrias.reduce((sum, operation) => sum + Number(operation?.amount || 0), 0));
  const totalSales = roundMoney(
    paymentTotals.cash + paymentTotals.pix + paymentTotals.debit + paymentTotals.credit + paymentTotals.other
  );
  const expectedBalance = roundMoney(openingBalance + paymentTotals.cash + totalSuprimentos - totalSangrias);
  const normalizedClosingBalance = closingBalance == null ? null : roundMoney(closingBalance);
  const differenceAmount = normalizedClosingBalance == null
    ? roundMoney(caixa?.difference_amount || 0)
    : roundMoney(normalizedClosingBalance - expectedBalance);

  return {
    shiftId: caixa?.id || null,
    operationalDate: getEntityOperationalDate(caixa, cutoffTime),
    turnLabel: caixa?.turn_label || null,
    openingBalance,
    closingBalance: normalizedClosingBalance,
    expectedBalance,
    differenceAmount,
    totalSales,
    salesCount: sales.length,
    canceledCount: Number(canceledCount || 0),
    canceledAmount: roundMoney(canceledAmount || 0),
    totalSangrias,
    totalSuprimentos,
    totalChange: roundMoney(sales.reduce((sum, operation) => sum + Number(operation?.change || 0), 0)),
    paymentTotals,
    sales,
    sangrias,
    suprimentos,
  };
}
