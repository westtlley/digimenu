import {
  buildCaixaShiftSummary,
  getShiftOperationalContext,
  getStoreOperationalSettings,
} from './operationalShift.js';

function createHttpError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value) {
  return Math.round((toNumber(value, 0) + Number.EPSILON) * 100) / 100;
}

function normalizeLower(value = '') {
  return String(value || '').toLowerCase().trim();
}

function ensurePositiveMoney(value, fieldName) {
  const parsed = roundMoney(value);
  if (parsed < 0) {
    throw createHttpError(400, `${fieldName} invalido.`, 'INVALID_MONEY_VALUE');
  }
  return parsed;
}

async function listShiftOperations(repo, reqUser, caixaId) {
  const result = await repo.listEntities(
    'CaixaOperation',
    { caixa_id: String(caixaId) },
    '-date',
    reqUser,
    { page: 1, limit: 5000 }
  );
  return Array.isArray(result?.items) ? result.items : [];
}

function ensureOpenCaixa(caixa) {
  if (!caixa) {
    throw createHttpError(404, 'Caixa nao encontrado.', 'CAIXA_NOT_FOUND');
  }
  if (normalizeLower(caixa.status) !== 'open') {
    throw createHttpError(409, 'O caixa informado nao esta aberto.', 'CAIXA_NOT_OPEN');
  }
}

export function createCaixaShiftHandlers({
  repo,
  db,
  usePostgreSQL,
  applyRequestedTenantScope,
  enforceEntityWriteAccess,
}) {
  async function openShift(req, res) {
    const payload = req.body || {};
    const asSub = payload.as_subscriber || req.query?.as_subscriber;
    const asSubId = payload.as_subscriber_id || req.query?.as_subscriber_id;

    await applyRequestedTenantScope(req, {
      subscriberId: asSubId,
      subscriberEmail: asSub,
    });

    const guard = await enforceEntityWriteAccess(req, res, 'Caixa', 'POST', payload);
    if (!guard.allowed) return;

    const ownerEmail = guard.ownerEmail || guard.subscriber?.email;
    const ownerSubscriberId = guard.subscriber?.id || req.user?._contextForSubscriberId || null;

    const openCaixasResult = await repo.listEntities(
      'Caixa',
      { status: 'open' },
      '-opening_date',
      req.user,
      { page: 1, limit: 10 }
    );
    const openCaixas = Array.isArray(openCaixasResult?.items) ? openCaixasResult.items : [];
    if (openCaixas.length > 0) {
      return res.status(409).json({
        error: 'Ja existe um caixa aberto para este estabelecimento.',
        code: 'CAIXA_ALREADY_OPEN',
        caixa: openCaixas[0],
      });
    }

    const openingBalance = ensurePositiveMoney(
      payload.opening_amount_cash ?? payload.opening_balance ?? 0,
      'opening_amount_cash'
    );
    const nowIso = new Date().toISOString();
    const storeSettings = await getStoreOperationalSettings({
      repo,
      db,
      usePostgreSQL,
      ownerEmail,
      ownerSubscriberId,
    });
    const shiftContext = getShiftOperationalContext(
      {
        opened_at: nowIso,
        opening_date: nowIso,
        terminal_id: payload.terminal_id || null,
        terminal_name: payload.terminal_name || null,
      },
      storeSettings,
      nowIso
    );

    const caixaPayload = {
      owner_email: ownerEmail,
      subscriber_email: ownerEmail,
      subscriber_id: ownerSubscriberId,
      status: 'open',
      opening_amount_cash: openingBalance,
      opening_balance: openingBalance,
      opened_at: nowIso,
      opening_date: nowIso,
      closed_at: null,
      closing_date: null,
      closing_balance: null,
      closing_amount_cash: null,
      expected_balance: openingBalance,
      difference_amount: null,
      total_cash: 0,
      total_pix: 0,
      total_debit: 0,
      total_credit: 0,
      total_other: 0,
      total_sales_amount: 0,
      total_sales_count: 0,
      total_cancelled_amount: 0,
      total_cancelled_count: 0,
      withdrawals: 0,
      supplies: 0,
      operational_date: shiftContext.operationalDate,
      operational_day_cutoff_time: shiftContext.cutoffTime,
      operational_timezone: shiftContext.timeZone,
      turn_label: shiftContext.turnLabel,
      shift_version: 1,
      terminal_id: payload.terminal_id || null,
      terminal_name: payload.terminal_name || null,
      lock_threshold: payload.lock_threshold != null ? roundMoney(payload.lock_threshold) : null,
      notes: payload.notes || '',
      opened_by: req.user?.email || ownerEmail,
    };

    const caixa = await repo.createEntity('Caixa', caixaPayload, req.user, {
      forSubscriberEmail: ownerEmail,
      forSubscriberId: ownerSubscriberId,
    });

    return res.status(201).json({
      caixa,
      summary: buildCaixaShiftSummary({ caixa, operations: [] }),
    });
  }

  async function createMovement(req, res) {
    const payload = req.body || {};
    const asSub = payload.as_subscriber || req.query?.as_subscriber;
    const asSubId = payload.as_subscriber_id || req.query?.as_subscriber_id;

    await applyRequestedTenantScope(req, {
      subscriberId: asSubId,
      subscriberEmail: asSub,
    });

    const guard = await enforceEntityWriteAccess(req, res, 'CaixaOperation', 'POST', payload);
    if (!guard.allowed) return;

    const caixaId = Number(payload.caixa_id || payload.shift_id);
    if (!Number.isFinite(caixaId)) {
      return res.status(400).json({
        error: 'caixa_id invalido.',
        code: 'INVALID_CAIXA_ID',
      });
    }

    const type = normalizeLower(payload.type);
    if (!['sangria', 'suprimento'].includes(type)) {
      return res.status(400).json({
        error: 'Tipo de movimentacao invalido.',
        code: 'INVALID_CAIXA_OPERATION_TYPE',
      });
    }

    const amount = ensurePositiveMoney(payload.amount, 'amount');
    if (amount <= 0) {
      return res.status(400).json({
        error: 'amount deve ser maior que zero.',
        code: 'INVALID_CAIXA_OPERATION_AMOUNT',
      });
    }

    const ownerEmail = guard.ownerEmail || guard.subscriber?.email;
    const ownerSubscriberId = guard.subscriber?.id || req.user?._contextForSubscriberId || null;
    const caixa = await repo.getEntityById('Caixa', caixaId, req.user);
    ensureOpenCaixa(caixa);

    const operations = await listShiftOperations(repo, req.user, caixaId);
    const currentSummary = buildCaixaShiftSummary({ caixa, operations });
    if (type === 'sangria' && amount > currentSummary.expectedBalance + 0.01) {
      return res.status(409).json({
        error: 'Saldo insuficiente para registrar a sangria.',
        code: 'CAIXA_INSUFFICIENT_BALANCE',
        summary: currentSummary,
      });
    }

    const shiftContext = getShiftOperationalContext(caixa, null, new Date());
    const nowIso = new Date().toISOString();
    const operationPayload = {
      owner_email: ownerEmail,
      subscriber_email: ownerEmail,
      subscriber_id: ownerSubscriberId,
      caixa_id: String(caixaId),
      shift_id: String(caixaId),
      type,
      description: payload.description || `${type === 'sangria' ? 'Sangria' : 'Suprimento'} de caixa`,
      amount,
      payment_method: payload.payment_method || 'dinheiro',
      reason: payload.reason || '',
      operator: req.user?.email || ownerEmail,
      date: nowIso,
      operational_date: shiftContext.operationalDate,
      operational_day_cutoff_time: shiftContext.cutoffTime,
      operational_timezone: shiftContext.timeZone,
      turn_label: shiftContext.turnLabel,
    };

    const operation = await repo.createEntity('CaixaOperation', operationPayload, req.user, {
      forSubscriberEmail: ownerEmail,
      forSubscriberId: ownerSubscriberId,
    });

    const updatedCaixa = await repo.updateEntity(
      'Caixa',
      caixaId,
      type === 'sangria'
        ? { withdrawals: roundMoney((caixa?.withdrawals || 0) + amount) }
        : { supplies: roundMoney((caixa?.supplies || 0) + amount) },
      req.user
    );

    const summary = buildCaixaShiftSummary({
      caixa: updatedCaixa,
      operations: [...operations, operation],
    });

    return res.status(201).json({
      operation,
      caixa: updatedCaixa,
      summary,
    });
  }

  async function closeShift(req, res) {
    const payload = req.body || {};
    const asSub = payload.as_subscriber || req.query?.as_subscriber;
    const asSubId = payload.as_subscriber_id || req.query?.as_subscriber_id;

    await applyRequestedTenantScope(req, {
      subscriberId: asSubId,
      subscriberEmail: asSub,
    });

    const closingBalance = ensurePositiveMoney(
      payload.closing_amount_cash ?? payload.closing_balance,
      'closing_amount_cash'
    );
    const guard = await enforceEntityWriteAccess(req, res, 'Caixa', 'PUT', {
      ...payload,
      status: 'closed',
      closing_amount_cash: closingBalance,
      closing_balance: closingBalance,
    });
    if (!guard.allowed) return;

    const caixaId = Number(req.params.id);
    if (!Number.isFinite(caixaId)) {
      return res.status(400).json({
        error: 'ID de caixa invalido.',
        code: 'INVALID_CAIXA_ID',
      });
    }

    const caixa = await repo.getEntityById('Caixa', caixaId, req.user);
    ensureOpenCaixa(caixa);

    const operations = await listShiftOperations(repo, req.user, caixaId);
    const closedAt = new Date().toISOString();
    const summary = buildCaixaShiftSummary({
      caixa,
      operations,
      closingBalance,
      cancelledCount: payload.cancelled_count || payload.canceled_count || 0,
      cancelledAmount: payload.cancelled_amount || payload.canceled_amount || 0,
    });

    const updatedCaixa = await repo.updateEntity('Caixa', caixaId, {
      status: 'closed',
      closing_source: payload.closing_source || caixa?.closing_source || 'painel_assinante',
      total_cash: summary.paymentTotals.cash,
      total_pix: summary.paymentTotals.pix,
      total_debit: summary.paymentTotals.debit,
      total_credit: summary.paymentTotals.credit,
      total_other: summary.paymentTotals.other,
      total_sales_amount: summary.totalSales,
      total_sales_count: summary.salesCount,
      total_cancelled_count: summary.cancelledCount,
      total_cancelled_amount: summary.cancelledAmount,
      closing_amount_cash: closingBalance,
      closing_balance: closingBalance,
      expected_balance: summary.expectedBalance,
      difference_amount: summary.differenceAmount,
      closing_notes: payload.closing_notes || payload.notes || '',
      closed_by: req.user?.email || guard.ownerEmail || caixa?.closed_by,
      closed_at: closedAt,
      closing_date: closedAt,
    }, req.user);

    return res.json({
      caixa: updatedCaixa,
      summary: buildCaixaShiftSummary({
        caixa: updatedCaixa,
        operations,
        closingBalance,
        cancelledCount: summary.cancelledCount,
        cancelledAmount: summary.cancelledAmount,
      }),
    });
  }

  return {
    openShift,
    createMovement,
    closeShift,
  };
}
