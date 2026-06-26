import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { translations, Language, Translations } from '../lib/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: Translations;
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en-GB');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLanguagePreference();
  }, []);

  const fetchLanguagePreference = async () => {
    try {
      const { data, error } = await supabase
        .from('organisation_settings')
        .select('language')
        .maybeSingle();

      if (error) throw error;

      if (data && data.language) {
        setLanguageState(data.language as Language);
      }
    } catch (error) {
      console.error('Error fetching language preference:', error);
    } finally {
      setLoading(false);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      const { data: existingSettings } = await supabase
        .from('organisation_settings')
        .select('id')
        .maybeSingle();

      if (existingSettings) {
        const { error } = await supabase
          .from('organisation_settings')
          .update({ language: lang })
          .eq('id', existingSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organisation_settings')
          .insert({ language: lang });

        if (error) throw error;
      }

      setLanguageState(lang);
    } catch (error) {
      console.error('Error setting language:', error);
      throw error;
    }
  };

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, loading }}>
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
