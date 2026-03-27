import { getMediaUploadPreset } from './mediaUploadPresets';

const MEDIA_LIBRARY_STORAGE_KEY = 'digimenu.admin.media.library.v1';
const MAX_MEDIA_LIBRARY_ITEMS = 400;
const MAX_METADATA_PREVIEW = 4;

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
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
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
  const updatedAt = toTimestamp(sourceValue?.updatedAt || sourceValue?.lastUsedAt);
  const usageFingerprint = uniqueStrings([
    sourceValue?.usageKey,
    [module, type, reference, source, sourceValue?.context].filter(Boolean).join('::'),
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
