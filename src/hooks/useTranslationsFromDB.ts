import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguageStore } from '../store/languageStore';
import { messages as staticMessages } from '../i18n/translations';

type TranslationsMap = Record<string, string>;

export const useTranslationsFromDB = () => {
  const currentLanguage = useLanguageStore((state) => state.currentLanguage);
  const [translations, setTranslations] = useState<TranslationsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .rpc('get_translations', { lang: currentLanguage })
          .select();
          
        if (error) throw error;
        
        const translationsMap: TranslationsMap = {};
        data.forEach((item: { key: string; value: string }) => {
          translationsMap[item.key] = item.value;
        });
        
        setTranslations(translationsMap);
      } catch (err) {
        console.error('Erreur lors du chargement des traductions:', err);
        setError('Impossible de charger les traductions');
      } finally {
        setLoading(false);
      }
    };

    fetchTranslations();
  }, [currentLanguage]);

  const t = useCallback((key: string, fallback?: string): string => {
    // Si la traduction est en cours de chargement ou si elle n'existe pas dans la base de données,
    // on utilise les traductions statiques comme fallback
    if (loading || !translations[key]) {
      // Essayer de trouver la traduction dans les messages statiques
      const keyParts = key.split('.');
      let staticTranslation: any = staticMessages[currentLanguage];
      
      for (const part of keyParts) {
        if (staticTranslation && typeof staticTranslation === 'object' && part in staticTranslation) {
          staticTranslation = staticTranslation[part];
        } else {
          staticTranslation = undefined;
          break;
        }
      }
      
      return staticTranslation || fallback || key;
    }
    
    return translations[key] || fallback || key;
  }, [currentLanguage, loading, translations]);

  return { t, loading, error, translations };
};
