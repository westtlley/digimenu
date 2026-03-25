import { deepMergeEntityData, normalizeDishChannels } from '../../utils/entityChannelUtils.js';

function parseEnabledFlag(value) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return null;
}

function parsePdvCode(value) {
  if (value === undefined) {
    return {
      error: 'Campo code obrigatorio.',
      code: 'INVALID_PDV_CODE',
    };
  }

  if (value === null) {
    return { value: null };
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return {
      error: 'Codigo PDV invalido. Use null para remover ou informe um valor valido.',
      code: 'INVALID_PDV_CODE',
    };
  }

  if (normalized.length > 20) {
    return {
      error: 'Codigo PDV muito longo. Limite de 20 caracteres.',
      code: 'INVALID_PDV_CODE_LENGTH',
    };
  }

  return { value: normalized };
}

function normalizeComparableCode(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized.toLowerCase() : null;
}

export function createPdvCatalogHandler({
  repo,
  db,
  usePostgreSQL,
  saveDatabaseDebounced,
  applyRequestedTenantScope,
  enforceEntityWriteAccess,
}) {
  async function findDuplicatePdvCodeWarning({ code, currentDishId, scopedTenant, user }) {
    const comparableCode = normalizeComparableCode(code);
    if (!comparableCode) {
      return null;
    }

    let dishes = [];

    if (usePostgreSQL) {
      const result = await repo.listEntities('Dish', {}, null, user, { page: 1, limit: 5000 });
      dishes = Array.isArray(result?.items) ? result.items : [];
    } else {
      const items = Array.isArray(db?.entities?.Dish) ? db.entities.Dish : [];
      const scopedEmail = scopedTenant?.subscriberEmail || user?._contextForSubscriber || null;
      dishes = items.filter((item) => {
        if (!scopedEmail) return true;
        return String(item?.owner_email || item?.subscriber_email || '')
          .trim()
          .toLowerCase() === String(scopedEmail || '').trim().toLowerCase();
      });
    }

    const duplicate = dishes
      .map((item) => normalizeDishChannels(item))
      .find((item) => {
        const itemId = String(item?.id || '');
        if (itemId === String(currentDishId || '')) return false;
        return normalizeComparableCode(item?.channels?.pdv?.code) === comparableCode;
      });

    if (!duplicate) {
      return null;
    }

    return {
      code: 'PDV_CODE_DUPLICATE',
      message: `Aviso: o codigo ${code} ja esta em uso por ${duplicate?.name || 'outro produto'} neste catalogo.`,
      duplicate_dish_id: duplicate?.id ?? null,
      duplicate_dish_name: duplicate?.name ?? null,
    };
  }

  async function patchDishPdvStatus(req, res) {
    const { id } = req.params;
    const enabled = parseEnabledFlag(req.body?.enabled);

    if (enabled === null) {
      return res.status(400).json({
        error: 'Campo enabled invalido. Use true ou false.',
        code: 'INVALID_PDV_ENABLED',
      });
    }

    const scopedTenant = await applyRequestedTenantScope(req, {
      subscriberId: req.query?.as_subscriber_id ?? null,
      subscriberEmail: req.query?.as_subscriber ?? null,
    });

    const writeGuard = await enforceEntityWriteAccess(req, res, 'Dish', 'PATCH', {
      channels: {
        pdv: {
          enabled,
        },
      },
    });

    if (!writeGuard.allowed) {
      return;
    }

    if (usePostgreSQL) {
      const currentDish = await repo.getEntityById('Dish', id, req.user);
      if (!currentDish) {
        return res.status(404).json({ error: 'Prato nao encontrado' });
      }

      const updatedDish = await repo.updateEntity(
        'Dish',
        id,
        {
          channels: {
            pdv: {
              enabled,
            },
          },
        },
        req.user
      );

      return res.json({
        success: true,
        item: updatedDish,
      });
    }

    const items = db?.entities?.Dish || [];
    const scopedEmail = scopedTenant?.subscriberEmail || req.user?._contextForSubscriber || null;
    const index = items.findIndex((item) => {
      const matchesId = String(item?.id || '') === String(id || '');
      if (!matchesId) return false;
      if (!scopedEmail) return true;
      return String(item?.owner_email || '').trim().toLowerCase() === String(scopedEmail || '').trim().toLowerCase();
    });

    if (index === -1) {
      return res.status(404).json({ error: 'Prato nao encontrado' });
    }

    const updatedDish = normalizeDishChannels({
      ...deepMergeEntityData(items[index], {
        channels: {
          pdv: {
            enabled,
          },
        },
      }),
      id: items[index].id,
      updated_at: new Date().toISOString(),
    });

    items[index] = updatedDish;
    if (typeof saveDatabaseDebounced === 'function') {
      saveDatabaseDebounced(db);
    }

    return res.json({
      success: true,
      item: updatedDish,
    });
  }

  async function patchDishPdvCode(req, res) {
    const { id } = req.params;
    const parsedCode = parsePdvCode(req.body?.code);

    if (parsedCode.error) {
      return res.status(400).json({
        error: parsedCode.error,
        code: parsedCode.code,
      });
    }

    const code = parsedCode.value;

    const scopedTenant = await applyRequestedTenantScope(req, {
      subscriberId: req.query?.as_subscriber_id ?? null,
      subscriberEmail: req.query?.as_subscriber ?? null,
    });

    const writeGuard = await enforceEntityWriteAccess(req, res, 'Dish', 'PATCH', {
      channels: {
        pdv: {
          code,
        },
      },
    });

    if (!writeGuard.allowed) {
      return;
    }

    if (usePostgreSQL) {
      const currentDish = await repo.getEntityById('Dish', id, req.user);
      if (!currentDish) {
        return res.status(404).json({ error: 'Prato nao encontrado' });
      }

      const updatedDish = await repo.updateEntity(
        'Dish',
        id,
        {
          channels: {
            pdv: {
              code,
            },
          },
        },
        req.user
      );

      const warning = await findDuplicatePdvCodeWarning({
        code,
        currentDishId: updatedDish?.id ?? id,
        scopedTenant,
        user: req.user,
      });

      return res.json({
        success: true,
        item: updatedDish,
        warning,
      });
    }

    const items = db?.entities?.Dish || [];
    const scopedEmail = scopedTenant?.subscriberEmail || req.user?._contextForSubscriber || null;
    const index = items.findIndex((item) => {
      const matchesId = String(item?.id || '') === String(id || '');
      if (!matchesId) return false;
      if (!scopedEmail) return true;
      return String(item?.owner_email || item?.subscriber_email || '')
        .trim()
        .toLowerCase() === String(scopedEmail || '').trim().toLowerCase();
    });

    if (index === -1) {
      return res.status(404).json({ error: 'Prato nao encontrado' });
    }

    const updatedDish = normalizeDishChannels({
      ...deepMergeEntityData(items[index], {
        channels: {
          pdv: {
            code,
          },
        },
      }),
      id: items[index].id,
      updated_at: new Date().toISOString(),
    });

    items[index] = updatedDish;
    if (typeof saveDatabaseDebounced === 'function') {
      saveDatabaseDebounced(db);
    }

    const warning = await findDuplicatePdvCodeWarning({
      code,
      currentDishId: updatedDish?.id ?? id,
      scopedTenant,
      user: req.user,
    });

    return res.json({
      success: true,
      item: updatedDish,
      warning,
    });
  }

  return {
    patchDishPdvStatus,
    patchDishPdvCode,
  };
}
