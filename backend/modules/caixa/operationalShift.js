const DEFAULT_OPERATIONAL_DAY_CUTOFF_TIME = '05:00';
const DEFAULT_OPERATIONAL_TIMEZONE = process.env.OPERATIONAL_TIMEZONE || 'America/Sao_Paulo';

function pad2(value) {
  return String(value).padStart(2, '0');
}

function toDateKeyFromParts(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function shiftDateKey(dateKey, days) {
  if (!dateKey) return null;
  const [year, month, day] = String(dateKey).split('-').map((part) => parseInt(part, 10));
  const utcDate = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  utcDate.setUTCDate(utcDate.getUTCDate() + Number(days || 0));
  return toDateKeyFromParts(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth() + 1,
    utcDate.getUTCDate()
  );
}

export function normalizeOperationalDayCutoffTime(value) {
  const raw = String(value || '').trim();
  if (!raw) return DEFAULT_OPERATIONAL_DAY_CUTOFF_TIME;

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

export function parseCutoffTimeToMinutes(value) {
  const normalized = normalizeOperationalDayCutoffTime(value);
  const [hours, minutes] = normalized.split(':').map((part) => parseInt(part, 10));
  return (hours * 60) + minutes;
}

export function getTimeZoneParts(dateLike = new Date(), timeZone = DEFAULT_OPERATIONAL_TIMEZONE) {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike || Date.now());
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || DEFAULT_OPERATIONAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function resolveOperationalDate(dateLike = new Date(), cutoffTime, timeZone) {
  const parts = getTimeZoneParts(dateLike, timeZone);
  const localDateKey = toDateKeyFromParts(parts.year, parts.month, parts.day);
  const minutesOfDay = (parts.hour * 60) + parts.minute;
  if (minutesOfDay < parseCutoffTimeToMinutes(cutoffTime)) {
    return shiftDateKey(localDateKey, -1);
  }
  return localDateKey;
}

export function resolveTurnLabel({ operationalDate, terminalName = '', openedAt = null, timeZone } = {}) {
  const dateKey = operationalDate || resolveOperationalDate(openedAt || new Date(), null, timeZone);
  if (!terminalName) return `Turno ${dateKey}`;
  return `Turno ${dateKey} - ${String(terminalName).trim()}`;
}

export function getCaixaOpenedAt(caixa = {}) {
  return caixa?.opened_at || caixa?.opening_date || caixa?.created_at || null;
}

export function getCaixaClosedAt(caixa = {}) {
  return caixa?.closed_at || caixa?.closing_date || null;
}

export async function getStoreOperationalSettings({
  repo,
  db,
  usePostgreSQL,
  ownerEmail,
  ownerSubscriberId = null,
}) {
  let store = null;

  if (usePostgreSQL && ownerEmail) {
    const stores = await repo.listEntitiesForSubscriber('Store', ownerEmail, null);
    store = Array.isArray(stores) ? (stores[0] || null) : null;
  } else if (db?.entities?.Store) {
    const ownerNorm = String(ownerEmail || '').toLowerCase().trim();
    store = (db.entities.Store || []).find((item) => {
      const storeOwner = String(item?.owner_email || item?.subscriber_email || '').toLowerCase().trim();
      const storeSubscriberId = item?.subscriber_id != null ? String(item.subscriber_id) : null;
      return (
        (ownerNorm && storeOwner === ownerNorm) ||
        (ownerSubscriberId != null && storeSubscriberId === String(ownerSubscriberId))
      );
    }) || null;
  }

  return {
    store,
    cutoffTime: normalizeOperationalDayCutoffTime(store?.operational_day_cutoff_time),
    timeZone: String(store?.operational_timezone || DEFAULT_OPERATIONAL_TIMEZONE).trim() || DEFAULT_OPERATIONAL_TIMEZONE,
  };
}

export async function findOpenCaixaForTenant({
  repo,
  db,
  usePostgreSQL,
  ownerEmail,
  ownerSubscriberId = null,
}) {
  if (usePostgreSQL && ownerEmail) {
    const caixas = await repo.listEntitiesForSubscriber('Caixa', ownerEmail, '-opening_date');
    return Array.isArray(caixas)
      ? (caixas.find((item) => String(item?.status || '').toLowerCase().trim() === 'open') || null)
      : null;
  }

  const ownerNorm = String(ownerEmail || '').toLowerCase().trim();
  return (db?.entities?.Caixa || []).find((item) => {
    const status = String(item?.status || '').toLowerCase().trim();
    if (status !== 'open') return false;

    const caixaOwner = String(item?.owner_email || item?.subscriber_email || '').toLowerCase().trim();
    const caixaSubscriberId = item?.subscriber_id != null ? String(item.subscriber_id) : null;
    return (
      (ownerNorm && caixaOwner === ownerNorm) ||
      (ownerSubscriberId != null && caixaSubscriberId === String(ownerSubscriberId))
    );
  }) || null;
}

export function getShiftOperationalContext(caixa = {}, storeSettings = null, referenceDate = new Date()) {
  const cutoffTime = normalizeOperationalDayCutoffTime(
    caixa?.operational_day_cutoff_time || storeSettings?.cutoffTime
  );
  const timeZone = String(
    caixa?.operational_timezone || storeSettings?.timeZone || DEFAULT_OPERATIONAL_TIMEZONE
  ).trim() || DEFAULT_OPERATIONAL_TIMEZONE;
  const openedAt = getCaixaOpenedAt(caixa) || referenceDate;
  const operationalDate = caixa?.operational_date || resolveOperationalDate(openedAt, cutoffTime, timeZone);
  const turnLabel = caixa?.turn_label || resolveTurnLabel({
    operationalDate,
    terminalName: caixa?.terminal_name || caixa?.terminal_id || '',
    openedAt,
    timeZone,
  });

  return {
    cutoffTime,
    timeZone,
    operationalDate,
    turnLabel,
    openedAt,
  };
}

function roundMoney(value) {
  return Math.round(((Number(value) || 0) + Number.EPSILON) * 100) / 100;
}

export function buildCaixaShiftSummary({
  caixa = {},
  operations = [],
  closingBalance = null,
  cancelledCount = 0,
  cancelledAmount = 0,
} = {}) {
  const shiftId = String(caixa?.id || '');
  const normalizedOperations = Array.isArray(operations)
    ? operations.filter((operation) => {
        if (!shiftId) return true;
        return (
          String(operation?.shift_id || operation?.caixa_id || '') === shiftId ||
          String(operation?.caixa_id || '') === shiftId
        );
      })
    : [];

  const sales = normalizedOperations.filter((operation) => operation?.type === 'venda_pdv');
  const sangrias = normalizedOperations.filter((operation) => operation?.type === 'sangria');
  const suprimentos = normalizedOperations.filter((operation) => operation?.type === 'suprimento');

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
    operationalDate: caixa?.operational_date || null,
    turnLabel: caixa?.turn_label || null,
    openingBalance,
    closingBalance: normalizedClosingBalance,
    expectedBalance,
    differenceAmount,
    totalSales,
    salesCount: sales.length,
    cancelledCount: Number(cancelledCount || 0),
    cancelledAmount: roundMoney(cancelledAmount || 0),
    totalSuprimentos,
    suppliesCount: suprimentos.length,
    totalSangrias,
    withdrawalsCount: sangrias.length,
    totalChange: roundMoney(sales.reduce((sum, operation) => sum + Number(operation?.change || 0), 0)),
    paymentTotals,
    operations: normalizedOperations,
  };
}

export { DEFAULT_OPERATIONAL_DAY_CUTOFF_TIME, DEFAULT_OPERATIONAL_TIMEZONE };
