import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  createTranslator,
  getI18nLanguage,
  getStoredLanguage,
  normalizeLanguage,
  setI18nLanguage,
} from './i18n';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => getStoredLanguage());

  useEffect(() => {
    const normalizedLanguage = normalizeLanguage(language || DEFAULT_LANGUAGE);
    setI18nLanguage(normalizedLanguage);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage);
    }

    if (typeof document !== 'undefined') {
      document.documentElement.lang = normalizedLanguage;
    }
  }, [language]);

  const setLanguage = (nextLanguage) => {
    setLanguageState(normalizeLanguage(nextLanguage));
  };

  const value = useMemo(() => ({
    language,
    setLanguage,
    availableLanguages: SUPPORTED_LANGUAGES,
    t: createTranslator(language),
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (context) {
    return context;
  }

  const fallbackLanguage = getI18nLanguage();
  return {
    language: fallbackLanguage,
    setLanguage: setI18nLanguage,
    availableLanguages: SUPPORTED_LANGUAGES,
    t: createTranslator(fallbackLanguage),
  };
}

