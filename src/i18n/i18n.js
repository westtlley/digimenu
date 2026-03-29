import ptBR from './translations/pt-BR';
import enUS from './translations/en-US';

export const DEFAULT_LANGUAGE = 'pt-BR';
export const LANGUAGE_STORAGE_KEY = 'digimenu:language';

export const TRANSLATIONS = {
  'pt-BR': ptBR,
  'en-US': enUS,
};

export const SUPPORTED_LANGUAGES = [
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'en-US', label: 'English (US)' },
];

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(baseValue, overrideValue) {
  if (overrideValue === undefined) return baseValue;
  if (!isPlainObject(baseValue) || !isPlainObject(overrideValue)) return overrideValue;

  const merged = { ...baseValue };

  Object.keys(overrideValue).forEach((key) => {
    merged[key] = deepMerge(baseValue?.[key], overrideValue[key]);
  });

  return merged;
}

export function getNestedValue(source, key) {
  if (!key) return source;
  return String(key)
    .split('.')
    .reduce((accumulator, part) => (accumulator == null ? undefined : accumulator[part]), source);
}

export function isSupportedLanguage(language) {
  return Object.prototype.hasOwnProperty.call(TRANSLATIONS, language);
}

export function normalizeLanguage(language) {
  return isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE;
}

export function getStoredLanguage() {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return normalizeLanguage(stored);
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function getTranslationTree(language) {
  return TRANSLATIONS[normalizeLanguage(language)] || ptBR;
}

export function resolveTranslation(language, key, fallback = '') {
  const requestedValue = getNestedValue(getTranslationTree(language), key);
  const fallbackValue = getNestedValue(ptBR, key);

  if (isPlainObject(fallbackValue) || isPlainObject(requestedValue)) {
    const mergedObject = deepMerge(fallbackValue, requestedValue);
    if (mergedObject !== undefined) return mergedObject;
  }

  if (requestedValue !== undefined && requestedValue !== null && requestedValue !== '') {
    return requestedValue;
  }

  if (fallbackValue !== undefined && fallbackValue !== null && fallbackValue !== '') {
    return fallbackValue;
  }

  return fallback || key;
}

let currentLanguage = getStoredLanguage();

export function setI18nLanguage(language) {
  currentLanguage = normalizeLanguage(language);
  return currentLanguage;
}

export function getI18nLanguage() {
  return currentLanguage;
}

export function createTranslator(language) {
  return (key, fallback = '') => resolveTranslation(language, key, fallback);
}

export function t(key, fallback = '') {
  return resolveTranslation(currentLanguage, key, fallback);
}


