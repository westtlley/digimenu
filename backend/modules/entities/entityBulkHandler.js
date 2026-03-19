import { ENTITY_ACCESS_CONFIG, normalizeEntityName } from './entityAccessConfig.js';

export function createEntityBulkHandler({
  repo,
  db,
  usePostgreSQL,
  saveDatabaseDebounced,
}) {
  return async function entityBulkHandler(req, res) {
    const { entity } = req.params;
    const { items: itemsToCreate } = req.body || {};
    const entityNorm = normalizeEntityName(entity);

    if (ENTITY_ACCESS_CONFIG[entityNorm] && !req.user?.is_master) {
      return res.status(403).json({
        error: 'Operacao em lote nao permitida para entidades protegidas.',
        code: 'BULK_NOT_ALLOWED_FOR_SENSITIVE_ENTITY',
      });
    }

    let newItems;
    if (usePostgreSQL) {
      newItems = await repo.createEntitiesBulk(entity, itemsToCreate, req.user);
    } else if (db?.entities) {
      if (!db.entities[entity]) db.entities[entity] = [];
      newItems = (itemsToCreate || []).map((item) => ({
        id: String(Date.now()) + Math.random().toString(36).substr(2, 9),
        ...item,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      db.entities[entity].push(...newItems);
      if (saveDatabaseDebounced) saveDatabaseDebounced(db);
    } else {
      return res.status(500).json({ error: 'Banco de dados nao inicializado' });
    }

    console.log(`[${entity}] ${newItems?.length || 0} itens criados`);
    res.status(201).json(newItems || []);
  };
}
