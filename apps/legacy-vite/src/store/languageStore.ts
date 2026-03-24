import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SupportedLocales } from '../i18n/translations';

interface LanguageState {
  currentLanguage: SupportedLocales;
  setLanguage: (language: SupportedLocales) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      currentLanguage: 'fr',
      setLanguage: (language) => set({ currentLanguage: language }),
    }),
    {
      name: 'language-store',
    }
  )
);