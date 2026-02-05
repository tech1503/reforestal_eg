import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const I18nContext = createContext(undefined);

export const I18nProvider = ({ children }) => {
  return (
    <I18nextProvider i18n={i18n}>
      <I18nStateProvider>
        {children}
      </I18nStateProvider>
    </I18nextProvider>
  );
};

// Separate component to use useAuth hook safely inside provider
const I18nStateProvider = ({ children }) => {
  const { t, i18n: i18nInstance } = useTranslation();
  const { user } = useAuth();

  const changeLanguage = async (lang) => {
    i18nInstance.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
    
    // If user is logged in, optionally save preference to DB
    if (user) {
       // We generally assume user metadata is the place for preferences like this
       try {
         await supabase.auth.updateUser({
           data: { language: lang }
         });
       } catch (error) {
         console.error("Failed to save language preference", error);
       }
    }
  };

  // Load language from user metadata on login if available
  useEffect(() => {
    if (user?.user_metadata?.language) {
        const userLang = user.user_metadata.language;
        if (userLang !== i18nInstance.language && ['en', 'es', 'de', 'fr'].includes(userLang)) {
            i18nInstance.changeLanguage(userLang);
        }
    }
  }, [user, i18nInstance]);

  const value = useMemo(() => ({
    t,
    changeLanguage,
    currentLanguage: i18nInstance.language,
  }), [t, i18nInstance.language]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};