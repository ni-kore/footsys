import type { Locale, LocalizedText } from './types';

export type { Locale };

/** In dieser Reihenfolge stehen sie in der Auswahl. */
export const LOCALES: readonly Locale[] = ['en', 'de', 'es'] as const;

/** Was in der Auswahl neben dem Kürzel steht. */
export const LOCALE_LABEL: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
};

/**
 * Einen mehrsprachigen Wert in der gewählten Sprache.
 *
 * Fehlt die Sprache, tritt Englisch ein, dann Deutsch: lieber ein Text in der
 * falschen Sprache als gar keiner. Ein einfacher String bleibt, wie er ist —
 * Eigennamen wie Vereine oder Ligen tragen keine Übersetzung.
 */
export function tr(value: LocalizedText | string | undefined | null, locale: Locale): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  return value[locale] ?? value.en ?? value.de ?? '';
}
