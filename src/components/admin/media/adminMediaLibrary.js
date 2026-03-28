import { apiClient } from '@/api/apiClient';
import { getMediaUploadPreset } from './mediaUploadPresets';

const MEDIA_LIBRARY_STORAGE_KEY = 'digimenu.admin.media.library.v1';
const MAX_MEDIA_LIBRARY_ITEMS = 400;
const MAX_METADATA_PREVIEW = 4;
const DEFAULT_MEDIA_LIBRARY_PAGE_SIZE = 24;
const DEFAULT_MEDIA_LIBRARY_SECTION_SIZE = 6;

const MEDIA_LIBRARY_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'product', label: 'Produtos' },
  { value: 'banner', label: 'Banners' },
  { value: 'cover', label: 'Capas' },
  { value: 'category', label: 'Categorias' },
  { value: 'promotion', label: 'Promocoes' },
  { value: 'logo', label: 'Logos' },
];

const MEDIA_LIBRARY_MODULE_FILTERS = [
  { value: 'all', label: 'Todos os modulos' },
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'pizza', label: 'Pizzaria' },
  { value: 'beverages', label: 'Bebidas' },
  { value: 'store', label: 'Loja' },
  { value: 'promotion', label: 'Promocao' },
  { value: 'category', label: 'Categoria' },
  { value: 'loyalty', label: 'Fidelidade' },
  { value: 'general', label: 'Outros' },
];

const MEDIA_LIBRARY_SCOPE_FILTERS = [
  { value: 'all', label: 'Tudo' },
  { value: 'mostUsed', label: 'Mais usadas' },
  { value: 'recent', label: 'Recentes' },
];

const MODULE_KEYWORDS = [
  { module: 'beverages', keywords: ['bebida', 'bebidas', 'drink', 'drinks', 'refri', 'suco'] },
  { module: 'pizza', keywords: ['pizza', 'pizzaria', 'sabor', 'borda', 'fatia'] },
  { module: 'restaurant', keywords: ['restaurante', 'prato', 'produto', 'dish', 'cardapio'] },
  { module: 'promotion', keywords: ['promocao', 'promocoes', 'combo', 'oferta', 'campanha'] },
  { module: 'store', keywords: ['banner', 'capa', 'cover', 'logo', 'loja', 'store'] },
  { module: 'category', keywords: ['categoria', 'categorias'] },
  { module: 'loyalty', keywords: ['fidelidade', 'recompensa', 'premio'] },
];

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeSearchValue(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizeModuleValue(value) {
  const normalized = normalizeSearchValue(value).replace(/\s+/g, '-');
  return normalized || 'general';
}

function toTimestamp(value) {
  const timestamp = Number(value || 0);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
}

function uniqueStrings(values = [], limit = MAX_METADATA_PREVIEW) {
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
}

function sortAdminMediaItems(items = [], mode = 'recent') {
  return [...items].sort((left, right) => {
    if (mode === 'mostUsed') {
      const usageDiff = Number(right.usageCount || 0) - Number(left.usageCount || 0);
      if (usageDiff !== 0) return usageDiff;
    }

    const updatedDiff = Number(right.updatedAt || 0) - Number(left.updatedAt || 0);
    if (updatedDiff !== 0) return updatedDiff;

    return String(left.label || '').localeCompare(String(right.label || ''), 'pt-BR');
  });
}

function buildLibraryPagination(total, limit = DEFAULT_MEDIA_LIBRARY_PAGE_SIZE, offset = 0) {
  const safeLimit = Math.max(1, Number(limit || DEFAULT_MEDIA_LIBRARY_PAGE_SIZE));
  const safeOffset = Math.max(0, Number(offset || 0));
  const safeTotal = Math.max(0, Number(total || 0));

  return {
    total: safeTotal,
    limit: safeLimit,
    offset: safeOffset,
    has_more: safeOffset + safeLimit < safeTotal,
  };
}

function normalizeBackendMediaItem(item, options = {}) {
  if (!item || typeof item !== 'object') return null;

  return normalizeAdminMediaItem(
    {
      url: item.url,
      type: item.type,
      module: item.module,
      modules: item.modules,
      reference: item.reference_name || item.label,
      references: item.references,
      source: item.source,
      sources: item.sources,
      meta: item.meta,
      context: Array.isArray(item.contexts) ? item.contexts[0] : null,
      updatedAt: item.last_used_at || item.updated_at || item.created_at,
      usageCount: item.usage_count,
      usageSummary: item.usage_summary,
      usageKeys:
        item?.metadata && Array.isArray(item.metadata.usage_keys) ? item.metadata.usage_keys : undefined,
    },
    options
  );
}

function normalizeBackendMediaItems(items = [], options = {}) {
  const orderedItems = [];
  const itemIndexByUrl = new Map();

  (Array.isArray(items) ? items : []).forEach((item) => {
    const normalized = normalizeBackendMediaItem(item, options);
    if (!normalized) return;

    if (!itemIndexByUrl.has(normalized.url)) {
      itemIndexByUrl.set(normalized.url, orderedItems.length);
      orderedItems.push(normalized);
      return;
    }

    const existingIndex = itemIndexByUrl.get(normalized.url);
    const merged = mergeAdminMediaItems([orderedItems[existingIndex], normalized], options);
    orderedItems[existingIndex] = merged[0] || orderedItems[existingIndex];
  });

  return orderedItems;
}

function buildRegisterPayload(items = [], options = {}) {
  return (Array.isArray(items) ? items : [])
    .map((item) => normalizeAdminMediaItem(item, options))
    .filter(Boolean)
    .map((item) => ({
      url: item.url,
      type: item.type,
      module: item.module || options.fallbackModule || 'general',
      reference_name: item.reference || item.label || options.fallbackReference || 'Imagem salva',
      source: item.source || options.fallbackSource || 'Biblioteca',
      context: item.context || options.fallbackContext || null,
      usage_key:
        Array.isArray(item.usageKeys) && item.usageKeys.length > 0
          ? item.usageKeys[0]
          : [item.module, item.type, item.reference, item.source].filter(Boolean).join('::'),
      meta: item.meta || null,
      updated_at: new Date(item.updatedAt || Date.now()).toISOString(),
    }));
}

function buildLocalLibrarySnapshot({
  type = 'all',
  module = 'all',
  searchTerm = '',
  scope = 'all',
  limit = DEFAULT_MEDIA_LIBRARY_PAGE_SIZE,
  offset = 0,
  sectionLimit = DEFAULT_MEDIA_LIBRARY_SECTION_SIZE,
  fallbackItems = [],
  options = {},
} = {}) {
  const libraryPool = mergeAdminMediaItems([readAdminMediaLibrary(), fallbackItems], options);
  const filteredRecent = filterAdminMediaItems(libraryPool, {
    type,
    module,
    searchTerm,
    scope: 'recent',
  });
  const filteredPopular = filterAdminMediaItems(libraryPool, {
    type,
    module,
    searchTerm,
    scope: 'mostUsed',
  });
  const safeLimit = Math.max(1, Number(limit || DEFAULT_MEDIA_LIBRARY_PAGE_SIZE));
  const safeOffset = Math.max(0, Number(offset || 0));
  const baseItems = scope === 'mostUsed' ? filteredPopular : filteredRecent;
  const pagedItems = baseItems.slice(safeOffset, safeOffset + safeLimit);
  const insights = buildAdminMediaLibraryInsights(libraryPool, { type, module, searchTerm });

  return {
    items: pagedItems,
    mostUsed: filteredPopular.slice(0, sectionLimit),
    recent: filteredRecent.slice(0, sectionLimit),
    insights,
    pagination: buildLibraryPagination(baseItems.length, safeLimit, safeOffset),
    source: 'local',
    allItems: libraryPool,
    error: null,
  };
}

function getLibraryEndpoint(scope = 'all') {
  if (scope === 'mostUsed') return '/media/popular';
  if (scope === 'recent') return '/media/recent';
  return '/media';
}

export function inferAdminMediaModule(item = {}, options = {}) {
  const explicitValue = item?.module || item?.moduleKey || options?.fallbackModule;
  if (explicitValue) {
    const normalized = normalizeModuleValue(explicitValue);
    if (MEDIA_LIBRARY_MODULE_FILTERS.some((entry) => entry.value === normalized)) {
      return normalized;
    }
  }

  const haystack = normalizeSearchValue([
    item?.source,
    item?.origin,
    item?.reference,
    item?.label,
    item?.name,
    item?.context,
    item?.folder,
    options?.fallbackSource,
    options?.fallbackReference,
  ].filter(Boolean).join(' '));

  for (const entry of MODULE_KEYWORDS) {
    if (entry.keywords.some((keyword) => haystack.includes(normalizeSearchValue(keyword)))) {
      return entry.module;
    }
  }

  return 'general';
}

export function getMediaModuleLabel(module = 'general') {
  const filter = MEDIA_LIBRARY_MODULE_FILTERS.find((item) => item.value === normalizeModuleValue(module));
  return filter?.label || 'Outros';
}

export function normalizeAdminMediaItem(item, options = {}) {
  if (!item) return null;

  const sourceValue = typeof item === 'string' ? { url: item } : item;
  const url = String(sourceValue?.url || '').trim();

  if (!url) return null;

  const type = String(sourceValue?.type || options.fallbackType || 'product');
  const preset = getMediaUploadPreset(type);
  const module = inferAdminMediaModule(sourceValue, options);
  const reference = String(
    sourceValue?.reference ||
      sourceValue?.label ||
      sourceValue?.name ||
      options.fallbackReference ||
      preset.label ||
      'Imagem salva'
  ).trim();
  const source = String(
    sourceValue?.source ||
      sourceValue?.origin ||
      options.fallbackSource ||
      options.fallbackOrigin ||
      'Biblioteca'
  ).trim();
  const meta = String(sourceValue?.meta || sourceValue?.description || '').trim();
  const context = String(sourceValue?.context || sourceValue?.folder || '').trim();
  const updatedAt = toTimestamp(sourceValue?.updatedAt || sourceValue?.lastUsedAt);
  const usageFingerprint = uniqueStrings([
    sourceValue?.usageKey,
    [module, type, reference, source, context].filter(Boolean).join('::'),
  ], undefined);
  const usageKeys = uniqueStrings([sourceValue?.usageKeys, usageFingerprint], undefined);
  const usageCount = Math.max(1, Number(sourceValue?.usageCount || sourceValue?.uses || 1), usageKeys.length);
  const modules = uniqueStrings([module, sourceValue?.modules], undefined).map(normalizeModuleValue);
  const references = uniqueStrings([reference, sourceValue?.references]);
  const sources = uniqueStrings([source, sourceValue?.sources]);
  const keywords = [
    reference,
    source,
    meta,
    type,
    preset.label,
    preset.previewLabel,
    sourceValue?.context,
    getMediaModuleLabel(module),
    references.join(' '),
    sources.join(' '),
  ]
    .filter(Boolean)
    .join(' ');

  return {
    url,
    type,
    module,
    modules,
    label: reference,
    reference,
    references,
    source,
    sources,
    meta,
    context,
    updatedAt,
    usageKeys,
    usageCount,
    usageSummary: usageCount > 1 ? `Usado em ${usageCount} itens` : 'Usado em 1 item',
    keywords: normalizeSearchValue(keywords),
  };
}

export function mergeAdminMediaItems(sources = [], options = {}) {
  const merged = new Map();

  sources.flat().forEach((item) => {
    const normalized = normalizeAdminMediaItem(item, options);
    if (!normalized) return;

    const previous = merged.get(normalized.url);
    if (!previous) {
      merged.set(normalized.url, normalized);
      return;
    }

    const updatedAt = Math.max(previous.updatedAt || 0, normalized.updatedAt || 0);
    const usageKeys = uniqueStrings([previous.usageKeys, normalized.usageKeys], undefined);
    const usageCount = Math.max(
      Number(previous.usageCount || 0),
      Number(normalized.usageCount || 0),
      usageKeys.length || 1
    );
    const modules = uniqueStrings([previous.modules, normalized.modules], undefined).map(normalizeModuleValue);
    const references = uniqueStrings([previous.references, normalized.references]);
    const sourcesList = uniqueStrings([previous.sources, normalized.sources]);

    merged.set(normalized.url, {
      ...previous,
      ...normalized,
      module: normalized.module || previous.module,
      modules,
      label: normalized.label || previous.label,
      reference: normalized.reference || previous.reference,
      references,
      source: normalized.source || previous.source,
      sources: sourcesList,
      meta: normalized.meta || previous.meta,
      context: normalized.context || previous.context,
      usageKeys,
      keywords: normalizeSearchValue([
        previous.keywords,
        normalized.keywords,
        references.join(' '),
        sourcesList.join(' '),
      ].filter(Boolean).join(' ')),
      updatedAt,
      usageCount,
      usageSummary: usageCount > 1 ? `Usado em ${usageCount} itens` : 'Usado em 1 item',
    });
  });

  return sortAdminMediaItems(Array.from(merged.values()), 'recent').slice(0, MAX_MEDIA_LIBRARY_ITEMS);
}

export function readAdminMediaLibrary() {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(MEDIA_LIBRARY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('[admin-media-library] failed to read library', error);
    return [];
  }
}

export function writeAdminMediaLibrary(items = []) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(
      MEDIA_LIBRARY_STORAGE_KEY,
      JSON.stringify(Array.isArray(items) ? items.slice(0, MAX_MEDIA_LIBRARY_ITEMS) : [])
    );
  } catch (error) {
    console.warn('[admin-media-library] failed to persist library', error);
  }
}

export function registerAdminMediaItems(items = [], options = {}) {
  const merged = mergeAdminMediaItems([readAdminMediaLibrary(), items], options);
  writeAdminMediaLibrary(merged);
  return merged;
}

export async function syncAdminMediaItems(items = [], options = {}) {
  const payload = buildRegisterPayload(items, options);
  if (!payload.length) return [];

  try {
    const response = await apiClient.post('/media/register', {
      items: payload,
    });

    const normalized = normalizeBackendMediaItems(response?.items || [], options);
    if (normalized.length) {
      registerAdminMediaItems(normalized, options);
    }
    return normalized;
  } catch (error) {
    console.warn('[admin-media-library] backend register fallback', error);
    return [];
  }
}

export async function loadAdminMediaLibrary({
  type = 'all',
  module = 'all',
  searchTerm = '',
  scope = 'all',
  limit = DEFAULT_MEDIA_LIBRARY_PAGE_SIZE,
  offset = 0,
  sectionLimit = DEFAULT_MEDIA_LIBRARY_SECTION_SIZE,
  fallbackItems = [],
  ...options
} = {}) {
  const localSnapshot = buildLocalLibrarySnapshot({
    type,
    module,
    searchTerm,
    scope,
    limit,
    offset,
    sectionLimit,
    fallbackItems,
    options,
  });

  try {
    const endpoint = getLibraryEndpoint(scope);
    const baseParams = {
      type,
      module,
      search: searchTerm,
      limit,
      offset,
    };

    const requests = [apiClient.get(endpoint, baseParams)];
    if (offset === 0) {
      requests.push(
        apiClient.get('/media/popular', {
          type,
          module,
          search: searchTerm,
          limit: sectionLimit,
          offset: 0,
        }),
        apiClient.get('/media/recent', {
          type,
          module,
          search: searchTerm,
          limit: sectionLimit,
          offset: 0,
        })
      );
    }

    const [mainResponse, popularResponse, recentResponse] = await Promise.all(requests);
    const remoteMainItems = normalizeBackendMediaItems(mainResponse?.items || [], options);
    const remotePopularItems =
      offset === 0 ? normalizeBackendMediaItems(popularResponse?.items || [], options) : [];
    const remoteRecentItems =
      offset === 0 ? normalizeBackendMediaItems(recentResponse?.items || [], options) : [];

    const combinedPool = mergeAdminMediaItems(
      [
        localSnapshot.allItems,
        remoteMainItems,
        remotePopularItems,
        remoteRecentItems,
      ],
      options
    );

    registerAdminMediaItems(combinedPool, options);

    const mergedPageItems = filterAdminMediaItems(
      mergeAdminMediaItems([remoteMainItems, localSnapshot.items], options),
      { scope }
    );
    const mergedPopular = offset === 0
      ? filterAdminMediaItems(
          mergeAdminMediaItems([remotePopularItems, localSnapshot.mostUsed], options),
          { scope: 'mostUsed' }
        ).slice(0, sectionLimit)
      : localSnapshot.mostUsed;
    const mergedRecent = offset === 0
      ? filterAdminMediaItems(
          mergeAdminMediaItems([remoteRecentItems, localSnapshot.recent], options),
          { scope: 'recent' }
        ).slice(0, sectionLimit)
      : localSnapshot.recent;
    const insights = buildAdminMediaLibraryInsights(combinedPool, { type, module, searchTerm });
    const pagination = mainResponse?.pagination || localSnapshot.pagination;

    return {
      items: mergedPageItems,
      mostUsed: mergedPopular,
      recent: mergedRecent,
      insights,
      pagination: {
        total: Number(pagination?.total || pagination?.count || 0),
        limit: Number(pagination?.limit || limit || DEFAULT_MEDIA_LIBRARY_PAGE_SIZE),
        offset: Number(pagination?.offset || offset || 0),
        has_more: Boolean(pagination?.has_more),
      },
      source: 'backend',
      allItems: combinedPool,
      error: null,
    };
  } catch (error) {
    console.warn('[admin-media-library] backend load fallback', error);
    return {
      ...localSnapshot,
      error,
    };
  }
}

export function filterAdminMediaItems(items = [], { type = 'all', module = 'all', searchTerm = '', scope = 'all' } = {}) {
  const normalizedSearch = normalizeSearchValue(searchTerm);
  const normalizedModule = normalizeModuleValue(module === 'all' ? '' : module);

  const filtered = (Array.isArray(items) ? items : []).filter((item) => {
    const matchesType = type === 'all' ? true : String(item?.type || '') === String(type);
    if (!matchesType) return false;

    const matchesModule = module === 'all'
      ? true
      : [item?.module, ...(Array.isArray(item?.modules) ? item.modules : [])]
          .map(normalizeModuleValue)
          .includes(normalizedModule);
    if (!matchesModule) return false;

    if (!normalizedSearch) return true;
    return normalizeSearchValue(item?.keywords || '').includes(normalizedSearch);
  });

  return sortAdminMediaItems(filtered, scope === 'mostUsed' ? 'mostUsed' : 'recent');
}

export function buildAdminMediaLibraryInsights(items = [], filters = {}) {
  const filtered = filterAdminMediaItems(items, { ...filters, scope: 'recent' });
  const mostUsed = filterAdminMediaItems(items, { ...filters, scope: 'mostUsed' }).slice(0, 6);
  const recent = sortAdminMediaItems(filtered, 'recent').slice(0, 6);

  const byModule = MEDIA_LIBRARY_MODULE_FILTERS
    .filter((entry) => entry.value !== 'all')
    .map((entry) => ({
      value: entry.value,
      label: entry.label,
      count: filtered.filter((item) => [item.module, ...(item.modules || [])].map(normalizeModuleValue).includes(entry.value)).length,
    }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count);

  const byType = MEDIA_LIBRARY_FILTERS
    .filter((entry) => entry.value !== 'all')
    .map((entry) => ({
      value: entry.value,
      label: entry.label,
      count: filtered.filter((item) => item.type === entry.value).length,
    }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count);

  const totalUsageCount = filtered.reduce((sum, item) => sum + Number(item.usageCount || 0), 0);

  return {
    filtered,
    mostUsed,
    recent,
    byModule,
    byType,
    totalUsageCount,
  };
}

export function getMediaFilterLabel(type = 'product') {
  const filter = MEDIA_LIBRARY_FILTERS.find((item) => item.value === type);
  return filter?.label || getMediaUploadPreset(type).label;
}

export { MEDIA_LIBRARY_FILTERS, MEDIA_LIBRARY_MODULE_FILTERS, MEDIA_LIBRARY_SCOPE_FILTERS };
