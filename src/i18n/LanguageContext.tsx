import React, { createContext, useContext, useState, ReactNode } from 'react';
import { translations, Language } from './translations';

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['en']) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // PERF-02: Language preference is now persisted to localStorage.
  // Previously this reset to 'en' on every app restart, forcing Tamil-speaking
  // operators to re-toggle the language every session (multiple times per day).
  const [language, setLanguageState] = useState<Language>(
    () => (localStorage.getItem('kattam_lang') as Language) || 'en'
  );

  const setLanguage = (lang: Language) => {
    localStorage.setItem('kattam_lang', lang);
    setLanguageState(lang);
  };

  const t = (key: keyof typeof translations['en']): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
