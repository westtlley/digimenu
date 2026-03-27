import { getMediaUploadPreset } from './mediaUploadPresets';

const MEDIA_LIBRARY_STORAGE_KEY = 'digimenu.admin.media.library.v1';
const MAX_MEDIA_LIBRARY_ITEMS = 400;

const MEDIA_LIBRARY_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'product', label: 'Produtos' },
  { value: 'banner', label: 'Banners' },
  { value: 'cover', label: 'Capas' },
  { value: 'category', label: 'Categorias' },
  { value: 'promotion', label: 'Promocoes' },
  { value: 'logo', label: 'Logos' },
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

function toTimestamp(value) {
  const timestamp = Number(value || 0);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now();
}

export function normalizeAdminMediaItem(item, options = {}) {
  if (!item) return null;

  const sourceValue = typeof item === 'string' ? { url: item } : item;
  const url = String(sourceValue?.url || '').trim();

  if (!url) return null;

  const type = String(sourceValue?.type || options.fallbackType || 'product');
  const preset = getMediaUploadPreset(type);
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
  const keywords = [
    reference,
    source,
    meta,
    type,
    preset.label,
    preset.previewLabel,
    sourceValue?.context,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    url,
    type,
    label: reference,
    reference,
    source,
    meta,
    updatedAt: toTimestamp(sourceValue?.updatedAt || sourceValue?.lastUsedAt),
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
    merged.set(normalized.url, {
      ...previous,
      ...normalized,
      label: normalized.label || previous.label,
      reference: normalized.reference || previous.reference,
      source: normalized.source || previous.source,
      meta: normalized.meta || previous.meta,
      keywords: normalizeSearchValue([previous.keywords, normalized.keywords].filter(Boolean).join(' ')),
      updatedAt,
    });
  });

  return Array.from(merged.values())
    .sort((left, right) => Number(right.updatedAt || 0) - Number(left.updatedAt || 0))
    .slice(0, MAX_MEDIA_LIBRARY_ITEMS);
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

export function filterAdminMediaItems(items = [], { type = 'all', searchTerm = '' } = {}) {
  const normalizedSearch = normalizeSearchValue(searchTerm);

  return (Array.isArray(items) ? items : []).filter((item) => {
    const matchesType = type === 'all' ? true : String(item?.type || '') === String(type);
    if (!matchesType) return false;
    if (!normalizedSearch) return true;
    return normalizeSearchValue(item?.keywords || '').includes(normalizedSearch);
  });
}

export function getMediaFilterLabel(type = 'product') {
  const filter = MEDIA_LIBRARY_FILTERS.find((item) => item.value === type);
  return filter?.label || getMediaUploadPreset(type).label;
}

export { MEDIA_LIBRARY_FILTERS };
