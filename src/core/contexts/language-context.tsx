import { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { ReactNode } from "react";
import type { Language } from '@/core/types/language';

import enCommon from '@/core/i18n/en/common.json';
import enAccount from '@/core/i18n/en/account.json';
import enAdmin from '@/core/i18n/en/admin.json';
import enCrm from '@/core/i18n/en/crm.json';
import enMessage from '@/core/i18n/en/message.json';
import enChecklist from '@/core/i18n/en/checklist.json';

import thCommon from '@/core/i18n/th/common.json';
import thAccount from '@/core/i18n/th/account.json';
import thAdmin from '@/core/i18n/th/admin.json';
import thCrm from '@/core/i18n/th/crm.json';
import thMessage from '@/core/i18n/th/message.json';
import thChecklist from '@/core/i18n/th/checklist.json';

const resources = {
  en: {
    root: enMessage,
    common: enCommon,
    account: enAccount,
    admin: enAdmin,
    crm: enCrm,
    checklist: enChecklist,
  },
  th: {
    root: thMessage,
    common: thCommon,
    account: thAccount,
    admin: thAdmin,
    crm: thCrm,
    checklist: thChecklist,
  }
} as const;

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: <K extends string, S extends string>(key: K, subKey?: S) => string;
  isLoading: boolean;
  availableLanguages: Language[];
};

interface LanguageProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
  availableLanguages?: Language[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const createResourceMap = () => {
  const map = new Map<string, string>();
  
  try {
    Object.entries(resources).forEach(([lang, langResources]) => {
      Object.entries(langResources).forEach(([namespace, namespaceData]) => {
        Object.entries(namespaceData).forEach(([key, value]) => {
          if (typeof value === 'string') {
            map.set(`${lang}.${namespace}.${key}`, value);
          } else if (typeof value === 'object' && value !== null) {
            Object.entries(value).forEach(([subKey, subValue]) => {
              if (typeof subValue === 'string') {
                map.set(`${lang}.${namespace}.${key}.${subKey}`, subValue);
              }
            });
          }
        });
      });
    });
  } catch (error) {
    console.error('Error creating resource map:', error);
  }
  
  return map;
};

const resourceMap = createResourceMap();

const toSnakeCase = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
};

const getStoredLanguage = (defaultLang: Language): Language => {
  if (typeof window === 'undefined') return defaultLang;
  
  try {
    const savedLanguage = localStorage.getItem("lang") as Language;
    return (savedLanguage === "en" || savedLanguage === "th") ? savedLanguage : defaultLang;
  } catch (error) {
    console.warn('Failed to read language from localStorage:', error);
    return defaultLang;
  }
};

export function LanguageProvider({ 
  children, 
  defaultLanguage = "th",
  availableLanguages = ["en", "th"]
}: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') return defaultLanguage;
    return getStoredLanguage(defaultLanguage);
  });
  const [isLoading, setIsLoading] = useState(false);

  const t = useCallback(<K extends string, S extends string>(
    key: K, 
    subKey?: S
  ): string => {
    try {
      let namespace: string;
      let translationKey: string;
      let originalText: string;

      if (subKey) {
        // t('namespace', 'text') format
        namespace = key;
        originalText = subKey;
        translationKey = toSnakeCase(subKey);
      } else {
        // t('text') format - use common as default namespace
        namespace = 'common';
        originalText = key;
        translationKey = toSnakeCase(key);
      }

      // Use static resource map
      const lookupKey = `${language}.${namespace}.${translationKey}`;
      const translation = resourceMap.get(lookupKey);
      
      if (translation) {
        return translation;
      }
      
      // Fallback to default language
      if (language !== defaultLanguage) {
        const fallbackKey = `${defaultLanguage}.${namespace}.${translationKey}`;
        const fallbackTranslation = resourceMap.get(fallbackKey);
        if (fallbackTranslation) {
          return fallbackTranslation;
        }
      }

      return originalText;
    } catch (error) {
      console.error('Translation error:', error);
      return subKey || key;
    }
  }, [language, defaultLanguage]);

  const setLanguage = useCallback(async (lang: Language) => {
    if (lang === language || !availableLanguages.includes(lang)) return;
    
    setIsLoading(true);
    try {
      setLanguageState(lang);

      if (typeof window !== 'undefined') {
        localStorage.setItem("lang", lang);
      }
    } catch (error) {
      console.error('Failed to set language:', error);
    } finally {
      setIsLoading(false);
    }
  }, [language, availableLanguages]);

  const contextValue = useMemo(() => ({
    language,
    setLanguage,
    t,
    isLoading,
    availableLanguages
  }), [language, setLanguage, t, isLoading, availableLanguages]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Enhanced useTranslation hook that supports both formats
export function useTranslation(defaultNamespace: string = 'common') {
  const { t: globalT } = useLanguage();
  
  const t = useCallback(<K extends string, S extends string>(
    keyOrNamespace: K, 
    keyText?: S
  ): string => {
    if (keyText) {
      // Two parameter format: t('namespace', 'text')
      return globalT(keyOrNamespace, keyText);
    } else {
      // One parameter format: t('text') - uses defaultNamespace
      return globalT(defaultNamespace, keyOrNamespace);
    }
  }, [globalT, defaultNamespace]);

  return { t };
}

export function useLanguageSwitch() {
  const { language, setLanguage, isLoading, availableLanguages } = useLanguage();
  return { language, setLanguage, isLoading, availableLanguages };
}