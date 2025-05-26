import React from 'react';
import { useLanguageStore } from '../store/languageStore';
import { SupportedLocales } from '../i18n/translations';

export const LanguageSwitch: React.FC = () => {
  const { currentLanguage, setLanguage } = useLanguageStore();

  const toggleLanguage = () => {
    const newLanguage: SupportedLocales = currentLanguage === 'en' ? 'fr' : 'en';
    setLanguage(newLanguage);
  };

  // Show the opposite language of what's currently selected
  const buttonText = currentLanguage === 'fr' ? 'EN' : 'FR';
  const ariaLabel = `Switch to ${currentLanguage === 'fr' ? 'English' : 'French'}`;

  return (
    <button
      onClick={toggleLanguage}
      className="px-3 py-1 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
      aria-label={ariaLabel}
    >
      {buttonText}
    </button>
  );
};