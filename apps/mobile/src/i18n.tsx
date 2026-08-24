import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { tr, type Locale, type LocalizedText } from '@footsys/engine';
import { STRINGS, type StringKey } from './strings';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({ locale: 'en', setLocale: () => {} });

const STORAGE_KEY = 'footsys.locale';

/** Zuletzt gewählte Sprache, sofern der Browser sie behalten hat. */
function initialLocale(): Locale {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'de' || stored === 'es') return stored;
  } catch {
    // Kein Speicher (natives Gerät ohne localStorage): dann eben Englisch.
  }
  return 'en';
}

/**
 * Hält die gewählte Sprache für die ganze Anwendung.
 *
 * Der Wechsel wirkt sofort: alles liest die Sprache bei jedem Rendern aus dem
 * Kontext, und die Engine legt Ereignistexte ohnehin in allen Sprachen ab.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, next);
    } catch {
      // Kein Speicher: die Wahl gilt dann nur für diese Sitzung.
    }
  }, []);
  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Die gewählte Sprache und der Umschalter. */
export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

interface Translator {
  /** Ein fester Oberflächentext über seinen Schlüssel. */
  t: (key: StringKey) => string;
  /** Ein mehrsprachiger Wert aus den Daten (oder ein Eigenname als String). */
  tr: (value: LocalizedText | string | undefined | null) => string;
  locale: Locale;
}

/** Übersetzt Oberflächentexte und Datenwerte in der gewählten Sprache. */
export function useT(): Translator {
  const { locale } = useContext(LocaleContext);
  const t = useCallback((key: StringKey) => tr(STRINGS[key], locale), [locale]);
  const trValue = useCallback(
    (value: LocalizedText | string | undefined | null) => tr(value, locale),
    [locale],
  );
  return { t, tr: trValue, locale };
}
