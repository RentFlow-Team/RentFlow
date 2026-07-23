import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type AppLanguage = 'en' | 'fr';

export type TranslationKey =
  | 'welcomeTitle'
  | 'welcomeSubtitle'
  | 'getStarted'
  | 'alreadyHaveAccount'
  | 'login'
  | 'settings'
  | 'general'
  | 'notifications'
  | 'support'
  | 'language'
  | 'currency'
  | 'logOut'
  | 'languageValue';

const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  en: {
    welcomeTitle: 'Welcome to',
    welcomeSubtitle: 'The smart way to manage your properties and tenants',
    getStarted: 'Get Started',
    alreadyHaveAccount: 'Already have an account?',
    login: 'Login',
    settings: 'Settings',
    general: 'General',
    notifications: 'Notifications',
    support: 'Support',
    language: 'Language',
    currency: 'Currency',
    logOut: 'Log Out',
    languageValue: 'English',
  },
  fr: {
    welcomeTitle: 'Bienvenue à',
    welcomeSubtitle: 'La manière intelligente de gérer vos propriétés et locataires',
    getStarted: 'Commencer',
    alreadyHaveAccount: 'Vous avez déjà un compte ?',
    login: 'Connexion',
    settings: 'Paramètres',
    general: 'Général',
    notifications: 'Notifications',
    support: 'Support',
    language: 'Langue',
    currency: 'Devise',
    logOut: 'Déconnexion',
    languageValue: 'Français',
  },
};

type LanguageContextValue = {
  language: AppLanguage;
  toggleLanguage: () => void;
  setLanguage: (next: AppLanguage) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('en');

  const setLanguage = useCallback((next: AppLanguage) => {
    setLanguageState(next);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((current) => (current === 'en' ? 'fr' : 'en'));
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[language][key],
    [language],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ language, toggleLanguage, setLanguage, t }),
    [language, toggleLanguage, setLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
