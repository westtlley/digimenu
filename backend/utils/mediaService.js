import { getClient, query } from '../db/postgres.js';
import { getDb, getSaveDatabaseDebounced, usePostgreSQL } from '../config/appConfig.js';
import { resolveBeverageTenantScope } from './beverageIntelligence.js';

const MAX_LIMIT = 60;
const DEFAULT_LIMIT = 24;
const DEFAULT_SECTION_LIMIT = 6;
const MAX_USAGE_KEYS = 200;
const MAX_REFERENCES = 12;
const MAX_SOURCES = 8;
const MAX_CONTEXTS = 10;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeText = (value, maxLength = 255) => {
  const normalized = String(value || '').trim();
  return normalized ? normalized.slice(0, maxLength) : null;
};

const normalizeSearchValue = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const normalizeModule = (value) => {
  const normalized = normalizeSearchValue(value).replace(/\s+/g, '-');
  return normalized || 'general';
};

const normalizeType = (value) => normalizeText(value, 50) || 'product';

const normalizeTimestamp = (value) => {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const uniqueStrings = (values = [], limit = null) => {
  const seen = new Set();
  const result = [];

  values.flat().forEach((value) => {
    const normalized = String(value || '').trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  });

  return typeof limit === 'number' ? result.slice(0, limit) : result;
};

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildUsageKey(item = {}) {
  const explicit = normalizeText(item.usage_key || item.usageKey, 240);
  if (explicit) return explicit;

  return [
    normalizeModule(item.module),
    normalizeType(item.type),
    normalizeText(item.reference_name || item.reference || item.label, 120) || 'imagem',
    normalizeText(item.source, 120) || 'biblioteca',
    normalizeText(item.context, 120) || 'geral',
  ].join('::');
}

function buildSearchText({ url, type, module, referenceName, source, meta, references, contexts }) {
  return normalizeSearchValue(
    [
      url,
      type,
      module,
      referenceName,
      source,
      meta,
      ensureArray(references).join(' '),
      ensureArray(contexts).join(' '),
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function normalizeRegisterItem(item = {}, options = {}) {
  if (!item) return null;

  const sourceValue = typeof item === 'string' ? { url: item } : item;
  const url = normalizeText(sourceValue.url, 2048);
  if (!url) return null;

  const type = normalizeType(sourceValue.type || options.fallbackType);
  const module = normalizeModule(sourceValue.module || options.fallbackModule);
  const referenceName =
    normalizeText(sourceValue.reference_name || sourceValue.reference || sourceValue.label || options.fallbackReference, 255) ||
    'Imagem salva';
  const source =
    normalizeText(sourceValue.source || sourceValue.origin || options.fallbackSource, 120) || 'Biblioteca';
  const meta = normalizeText(sourceValue.meta || sourceValue.description, 255);
  const context = normalizeText(sourceValue.context || sourceValue.folder || sourceValue.preview_label, 120);
  const usageKey = buildUsageKey({
    ...sourceValue,
    type,
    module,
    reference_name: referenceName,
    source,
    context,
  });

  return {
    url,
    type,
    module,
    reference_name: referenceName,
    source,
    meta,
    context,
    usage_key: usageKey,
    updated_at: normalizeTimestamp(sourceValue.updated_at || sourceValue.updatedAt || Date.now()),
  };
}

function mergeMediaMetadata(previousMetadata = {}, item = {}) {
  const previous = previousMetadata && typeof previousMetadata === 'object' ? previousMetadata : {};
  const references = uniqueStrings(
    [previous.references, item.reference_name, previous.reference_name, item.reference],
    MAX_REFERENCES
  );
  const sources = uniqueStrings([previous.sources, item.source, previous.primary_source], MAX_SOURCES);
  const contexts = uniqueStrings([previous.contexts, item.context], MAX_CONTEXTS);
  const modules = uniqueStrings([previous.modules, item.module], MAX_CONTEXTS).map(normalizeModule);
  const usageKeys = uniqueStrings([previous.usage_keys, item.usage_key], MAX_USAGE_KEYS);
  const lastContexts = uniqueStrings([item.context, previous.last_contexts], MAX_CONTEXTS);
  const meta = normalizeText(item.meta || previous.meta, 255);

  return {
    ...previous,
    meta,
    primary_source: item.source || previous.primary_source || null,
    references,
    sources,
    contexts,
    modules,
    usage_keys: usageKeys,
    last_contexts: lastContexts,
    search_text: buildSearchText({
      url: item.url,
      type: item.type,
      module: item.module,
      referenceName: item.reference_name,
      source: item.source,
      meta,
      references,
      contexts,
    }),
  };
}

function formatMediaAssetRow(row = {}) {
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const references = uniqueStrings(metadata.references, MAX_REFERENCES);
  const sources = uniqueStrings(metadata.sources, MAX_SOURCES);
  const contexts = uniqueStrings(metadata.contexts, MAX_CONTEXTS);
  const modules = uniqueStrings([row.module, metadata.modules], MAX_CONTEXTS).map(normalizeModule);
  const usageCount = Math.max(
    1,
    toNumber(row.usage_count, 0),
    uniqueStrings(metadata.usage_keys, MAX_USAGE_KEYS).length
  );

  return {
    id: row.id,
    tenant_id: row.tenant_id ?? null,
    url: row.url,
    type: normalizeType(row.type),
    module: normalizeModule(row.module),
    reference_name: normalizeText(row.reference_name, 255),
    label: normalizeText(row.reference_name, 255) || references[0] || 'Imagem salva',
    source: sources[0] || metadata.primary_source || null,
    meta: metadata.meta || null,
    usage_count: usageCount,
    usage_summary: usageCount > 1 ? `Usado em ${usageCount} itens` : 'Usado em 1 item',
    last_used_at: row.last_used_at || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    references,
    sources,
    contexts,
    modules,
    metadata,
  };
}

function sortRows(rows = [], sort = 'recent') {
  return [...rows].sort((left, right) => {
    if (sort === 'popular') {
      const usageDiff = toNumber(right.usage_count, 0) - toNumber(left.usage_count, 0);
      if (usageDiff !== 0) return usageDiff;
    }

    const lastUsedDiff = new Date(right.last_used_at || 0).getTime() - new Date(left.last_used_at || 0).getTime();
    if (lastUsedDiff !== 0) return lastUsedDiff;

    return String(left.reference_name || '').localeCompare(String(right.reference_name || ''), 'pt-BR');
  });
}

export async function ensureMediaAssetsTable() {
  if (!usePostgreSQL) return;

  await query(`
    CREATE TABLE IF NOT EXISTS media_assets (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER,
      tenant_key VARCHAR(300) NOT NULL,
      subscriber_email VARCHAR(255),
      url TEXT NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'product',
      module VARCHAR(60) NOT NULL DEFAULT 'general',
      reference_name VARCHAR(255),
      usage_count INTEGER NOT NULL DEFAULT 1,
      last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      metadata JSONB DEFAULT '{}'::jsonb
    );
  `);

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_media_assets_tenant_url
    ON media_assets(tenant_key, url);
    CREATE INDEX IF NOT EXISTS idx_media_assets_tenant_recent
    ON media_assets(tenant_key, last_used_at DESC);
    CREATE INDEX IF NOT EXISTS idx_media_assets_tenant_popular
    ON media_assets(tenant_key, usage_count DESC, last_used_at DESC);
    CREATE INDEX IF NOT EXISTS idx_media_assets_tenant_type
    ON media_assets(tenant_key, type);
    CREATE INDEX IF NOT EXISTS idx_media_assets_tenant_module
    ON media_assets(tenant_key, module);
  `);
}

export async function resolveMediaTenantScope(options = {}) {
  return resolveBeverageTenantScope(options);
}

function buildWhereClause({ scope, type, module, search }, params = []) {
  const clauses = ['tenant_key = $1'];
  params.push(scope.tenantKey);

  if (type && type !== 'all') {
    params.push(normalizeType(type));
    clauses.push(`type = $${params.length}`);
  }

  if (module && module !== 'all') {
    params.push(normalizeModule(module));
    clauses.push(`module = $${params.length}`);
  }

  const searchValue = normalizeSearchValue(search);
  if (searchValue) {
    params.push(`%${searchValue}%`);
    clauses.push(`(
      LOWER(COALESCE(reference_name, '')) LIKE $${params.length}
      OR LOWER(COALESCE(module, '')) LIKE $${params.length}
      OR LOWER(COALESCE(type, '')) LIKE $${params.length}
      OR LOWER(COALESCE(url, '')) LIKE $${params.length}
      OR LOWER(COALESCE(metadata->>'search_text', '')) LIKE $${params.length}
    )`);
  }

  return {
    whereSql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

async function listMediaAssetsFromPostgres({ scope, type, module, search, sort = 'recent', limit, offset }) {
  await ensureMediaAssetsTable();

  const boundedLimit = clamp(toNumber(limit, DEFAULT_LIMIT), 1, MAX_LIMIT);
  const boundedOffset = Math.max(0, toNumber(offset, 0));
  const orderSql =
    sort === 'popular'
      ? 'ORDER BY usage_count DESC, last_used_at DESC, updated_at DESC'
      : 'ORDER BY last_used_at DESC, updated_at DESC';

  const whereState = buildWhereClause({ scope, type, module, search }, []);
  whereState.params.push(boundedLimit, boundedOffset);

  const result = await query(
    `
      SELECT
        id,
        tenant_id,
        subscriber_email,
        url,
        type,
        module,
        reference_name,
        usage_count,
        last_used_at,
        created_at,
        updated_at,
        metadata,
        COUNT(*) OVER() AS total_count
      FROM media_assets
      ${whereState.whereSql}
      ${orderSql}
      LIMIT $${whereState.params.length - 1}
      OFFSET $${whereState.params.length}
    `,
    whereState.params
  );

  const items = result.rows.map(formatMediaAssetRow);
  const total = toNumber(result.rows[0]?.total_count, 0);

  return {
    items,
    pagination: {
      total,
      limit: boundedLimit,
      offset: boundedOffset,
      has_more: boundedOffset + items.length < total,
    },
  };
}

function listMediaAssetsFromFallback({ scope, type, module, search, sort = 'recent', limit, offset }) {
  const db = getDb();
  if (!Array.isArray(db?.media_assets)) {
    db.media_assets = [];
  }

  const boundedLimit = clamp(toNumber(limit, DEFAULT_LIMIT), 1, MAX_LIMIT);
  const boundedOffset = Math.max(0, toNumber(offset, 0));
  const normalizedSearch = normalizeSearchValue(search);

  const filtered = db.media_assets
    .filter((item) => String(item.tenant_key || '') === String(scope.tenantKey))
    .filter((item) => (type && type !== 'all' ? normalizeType(item.type) === normalizeType(type) : true))
    .filter((item) => (module && module !== 'all' ? normalizeModule(item.module) === normalizeModule(module) : true))
    .filter((item) => {
      if (!normalizedSearch) return true;
      const metadata = item.metadata && typeof item.metadata === 'object' ? item.metadata : {};
      const searchText = buildSearchText({
        url: item.url,
        type: item.type,
        module: item.module,
        referenceName: item.reference_name,
        source: metadata.primary_source,
        meta: metadata.meta,
        references: metadata.references,
        contexts: metadata.contexts,
      });
      return searchText.includes(normalizedSearch);
    });

  const sorted = sortRows(filtered, sort);
  const sliced = sorted.slice(boundedOffset, boundedOffset + boundedLimit).map(formatMediaAssetRow);

  return {
    items: sliced,
    pagination: {
      total: sorted.length,
      limit: boundedLimit,
      offset: boundedOffset,
      has_more: boundedOffset + sliced.length < sorted.length,
    },
  };
}

export async function listMediaAssets(options = {}) {
  const scope = options.scope?.tenantKey ? options.scope : await resolveMediaTenantScope(options.scope || {});
  if (!scope?.tenantKey) {
    return {
      items: [],
      pagination: { total: 0, limit: clamp(toNumber(options.limit, DEFAULT_LIMIT), 1, MAX_LIMIT), offset: 0, has_more: false },
    };
  }

  if (usePostgreSQL) {
    return listMediaAssetsFromPostgres({ ...options, scope });
  }

  return listMediaAssetsFromFallback({ ...options, scope });
}

export async function listPopularMediaAssets(options = {}) {
  return listMediaAssets({
    ...options,
    sort: 'popular',
    limit: options.limit ?? DEFAULT_SECTION_LIMIT,
    offset: options.offset ?? 0,
  });
}

export async function listRecentMediaAssets(options = {}) {
  return listMediaAssets({
    ...options,
    sort: 'recent',
    limit: options.limit ?? DEFAULT_SECTION_LIMIT,
    offset: options.offset ?? 0,
  });
}

function mergeExistingRow(existingRow, inputItem, scope) {
  const previousMetadata = existingRow?.metadata && typeof existingRow.metadata === 'object' ? existingRow.metadata : {};
  const metadata = mergeMediaMetadata(previousMetadata, inputItem);
  const usageCount = Math.max(1, uniqueStrings(metadata.usage_keys, MAX_USAGE_KEYS).length);
  const now = inputItem.updated_at || new Date().toISOString();

  return {
    tenant_id: scope.subscriberId ?? null,
    tenant_key: scope.tenantKey,
    subscriber_email: scope.subscriberEmail ?? null,
    url: inputItem.url,
    type: inputItem.type,
    module: inputItem.module,
    reference_name: inputItem.reference_name,
    usage_count: usageCount,
    last_used_at: now,
    updated_at: now,
    metadata,
  };
}

export async function registerMediaAssets({ scope, items = [] } = {}) {
  const safeScope = scope?.tenantKey ? scope : await resolveMediaTenantScope(scope || {});
  if (!safeScope?.tenantKey) {
    throw new Error('Tenant nao encontrado para registrar ativos de midia.');
  }

  const normalizedItems = uniqueStrings(
    items
      .map((item) =>
        normalizeRegisterItem(item, {
          fallbackType: 'product',
          fallbackModule: 'general',
          fallbackReference: 'Imagem salva',
          fallbackSource: 'Biblioteca',
        })?.url
      )
  )
    .map((url) =>
      normalizeRegisterItem(
        items.find((entry) => normalizeText(typeof entry === 'string' ? entry : entry?.url, 2048) === url),
        {
          fallbackType: 'product',
          fallbackModule: 'general',
          fallbackReference: 'Imagem salva',
          fallbackSource: 'Biblioteca',
        }
      )
    )
    .filter(Boolean);

  if (!normalizedItems.length) {
    return [];
  }

  if (usePostgreSQL) {
    await ensureMediaAssetsTable();
    const client = await getClient();

    try {
      await client.query('BEGIN');
      const savedRows = [];

      for (const item of normalizedItems) {
        const existingResult = await client.query(
          `
            SELECT *
            FROM media_assets
            WHERE tenant_key = $1
              AND url = $2
            LIMIT 1
            FOR UPDATE
          `,
          [safeScope.tenantKey, item.url]
        );

        const existingRow = existingResult.rows[0] || null;
        const nextRow = mergeExistingRow(existingRow, item, safeScope);

        const upsertResult = await client.query(
          `
            INSERT INTO media_assets (
              tenant_id,
              tenant_key,
              subscriber_email,
              url,
              type,
              module,
              reference_name,
              usage_count,
              last_used_at,
              updated_at,
              metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10::jsonb)
            ON CONFLICT (tenant_key, url)
            DO UPDATE SET
              tenant_id = EXCLUDED.tenant_id,
              subscriber_email = EXCLUDED.subscriber_email,
              type = EXCLUDED.type,
              module = EXCLUDED.module,
              reference_name = EXCLUDED.reference_name,
              usage_count = EXCLUDED.usage_count,
              last_used_at = EXCLUDED.last_used_at,
              updated_at = CURRENT_TIMESTAMP,
              metadata = EXCLUDED.metadata
            RETURNING *
          `,
          [
            nextRow.tenant_id,
            nextRow.tenant_key,
            nextRow.subscriber_email,
            nextRow.url,
            nextRow.type,
            nextRow.module,
            nextRow.reference_name,
            nextRow.usage_count,
            nextRow.last_used_at,
            JSON.stringify(nextRow.metadata || {}),
          ]
        );

        savedRows.push(upsertResult.rows[0]);
      }

      await client.query('COMMIT');
      return savedRows.map(formatMediaAssetRow);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  const db = getDb();
  if (!Array.isArray(db.media_assets)) {
    db.media_assets = [];
  }

  const savedRows = normalizedItems.map((item) => {
    const existingIndex = db.media_assets.findIndex(
      (entry) => String(entry?.tenant_key || '') === String(safeScope.tenantKey) && String(entry?.url || '') === item.url
    );
    const existingRow = existingIndex >= 0 ? db.media_assets[existingIndex] : null;
    const nextRow = {
      id: existingRow?.id || `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      created_at: existingRow?.created_at || new Date().toISOString(),
      ...mergeExistingRow(existingRow, item, safeScope),
    };

    if (existingIndex >= 0) {
      db.media_assets[existingIndex] = nextRow;
    } else {
      db.media_assets.push(nextRow);
    }

    return nextRow;
  });

  const saveDatabaseDebounced = getSaveDatabaseDebounced();
  if (typeof saveDatabaseDebounced === 'function') {
    saveDatabaseDebounced(db);
  }

  return sortRows(savedRows, 'recent').map(formatMediaAssetRow);
}

export async function updateMediaAsset({ scope, assetId, patch = {} } = {}) {
  const safeScope = scope?.tenantKey ? scope : await resolveMediaTenantScope(scope || {});
  if (!safeScope?.tenantKey) {
    throw new Error('Tenant nao encontrado para atualizar ativo de midia.');
  }

  const rawAssetId = String(assetId || '').trim();
  const safeAssetId = toNumber(assetId, 0);
  if (usePostgreSQL && !safeAssetId) {
    throw new Error('Ativo de midia invalido.');
  }
  if (!usePostgreSQL && !rawAssetId) {
    throw new Error('Ativo de midia invalido.');
  }

  const normalizedPatch = {
    type: patch.type ? normalizeType(patch.type) : null,
    module: patch.module ? normalizeModule(patch.module) : null,
    reference_name: normalizeText(patch.reference_name || patch.referenceName, 255),
    metadata: patch.metadata && typeof patch.metadata === 'object' ? patch.metadata : null,
  };

  if (usePostgreSQL) {
    await ensureMediaAssetsTable();
    const existingResult = await query(
      `
        SELECT *
        FROM media_assets
        WHERE id = $1
          AND tenant_key = $2
        LIMIT 1
      `,
      [safeAssetId, safeScope.tenantKey]
    );

    const existingRow = existingResult.rows[0];
    if (!existingRow) {
      throw new Error('Ativo de midia nao encontrado.');
    }

    const mergedMetadata = {
      ...(existingRow.metadata && typeof existingRow.metadata === 'object' ? existingRow.metadata : {}),
      ...(normalizedPatch.metadata || {}),
    };

    const result = await query(
      `
        UPDATE media_assets
        SET
          type = COALESCE($3, type),
          module = COALESCE($4, module),
          reference_name = COALESCE($5, reference_name),
          metadata = $6::jsonb,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND tenant_key = $2
        RETURNING *
      `,
      [
        safeAssetId,
        safeScope.tenantKey,
        normalizedPatch.type,
        normalizedPatch.module,
        normalizedPatch.reference_name,
        JSON.stringify(mergedMetadata),
      ]
    );

    return formatMediaAssetRow(result.rows[0]);
  }

  const db = getDb();
  if (!Array.isArray(db?.media_assets)) {
    db.media_assets = [];
  }

  const assetIndex = db.media_assets.findIndex(
    (entry) => String(entry?.id || '') === rawAssetId && String(entry?.tenant_key || '') === String(safeScope.tenantKey)
  );

  if (assetIndex < 0) {
    throw new Error('Ativo de midia nao encontrado.');
  }

  const current = db.media_assets[assetIndex];
  const updated = {
    ...current,
    type: normalizedPatch.type || current.type,
    module: normalizedPatch.module || current.module,
    reference_name: normalizedPatch.reference_name || current.reference_name,
    metadata: {
      ...(current.metadata && typeof current.metadata === 'object' ? current.metadata : {}),
      ...(normalizedPatch.metadata || {}),
    },
    updated_at: new Date().toISOString(),
  };
  db.media_assets[assetIndex] = updated;

  const saveDatabaseDebounced = getSaveDatabaseDebounced();
  if (typeof saveDatabaseDebounced === 'function') {
    saveDatabaseDebounced(db);
  }

  return formatMediaAssetRow(updated);
}
