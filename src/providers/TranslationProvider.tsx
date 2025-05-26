import { createContext, useContext, ReactNode, useMemo } from 'react';
import { IntlProvider, createIntl, createIntlCache } from 'react-intl';
import { useLanguageStore } from '../store/languageStore';
import { messages, defaultLocale } from '../i18n/translations';
import type { SupportedLocales } from '../i18n/translations';
import { useTranslationsFromDB } from '../hooks/useTranslationsFromDB';

// Fonction utilitaire pour aplatir un objet imbriqué en un objet plat
type FlattenObject = (obj: Record<string, any>, prefix?: string) => Record<string, string>;
const flattenObject: FlattenObject = (obj, prefix = '') => {
  return Object.keys(obj).reduce<Record<string, string>>((acc, key) => {
    const prefixedKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(acc, flattenObject(obj[key], prefixedKey));
    } else {
      acc[prefixedKey] = String(obj[key]);
    }
    
    return acc;
  }, {});
};

// Contexte pour les traductions
type TranslationContextType = {
  t: (key: string, fallback?: string) => string;
  loading: boolean;
};

const TranslationContext = createContext<TranslationContextType>({
  t: (key) => key,
  loading: true
});

// Hook personnalisé pour utiliser les traductions
export const useTranslation = () => useContext(TranslationContext);

// Propriétés du provider
type TranslationProviderProps = {
  children: ReactNode;
};

// Créer un cache pour l'intl
const cache = createIntlCache();

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  const currentLanguage = useLanguageStore((state) => state.currentLanguage) as SupportedLocales;
  const { t, loading } = useTranslationsFromDB();
  
  // Aplatir les messages pour IntlProvider
  const flattenedMessages = useMemo(() => {
    return flattenObject(messages[currentLanguage] || {});
  }, [currentLanguage]);
  
  // Créer un intl avec les messages statiques pour éviter les erreurs de typage
  // Note: intl est utilisé implicitement par IntlProvider
  useMemo(() => {
    return createIntl({
      locale: currentLanguage,
      messages: flattenedMessages,
      defaultLocale
    }, cache);
  }, [currentLanguage, flattenedMessages]);

  return (
    <TranslationContext.Provider value={{ t, loading }}>
      <IntlProvider
        locale={currentLanguage}
        defaultLocale={defaultLocale}
        messages={flattenedMessages}
      >
        {children}
      </IntlProvider>
    </TranslationContext.Provider>
  );
};
