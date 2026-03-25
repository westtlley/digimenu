import { deepMergeEntityData, normalizeDishChannels } from '../../utils/entityChannelUtils.js';

function parseEnabledFlag(value) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return null;
}

export function createPdvCatalogHandler({
  repo,
  db,
  usePostgreSQL,
  saveDatabaseDebounced,
  applyRequestedTenantScope,
  enforceEntityWriteAccess,
}) {
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

  return {
    patchDishPdvStatus,
  };
}
