/**
 * Design-Tokens für die App.
 *
 * Die Werte kommen direkt aus `design/tokens.json` — es gibt keine zweite
 * Farbliste. Wer eine Farbe ändern will, ändert sie dort.
 */
import tokens from '../../../design/tokens.json';

export const color = tokens.color;
export const radius = tokens.radius;
export const space = tokens.space;
export const layout = tokens.layout;

/** Farbe für einen Bewertungswert 0–100. */
export function ratingColor(value: number): string {
  if (value >= 85) return color.rating.elite;
  if (value >= 75) return color.rating.strong;
  if (value >= 62) return color.rating.average;
  if (value >= 50) return color.rating.weak;
  return color.rating.poor;
}

/** Farbe für einen Meterwert 0–100. */
export function meterColor(value: number): string {
  if (value >= 60) return color.status.positive;
  if (value >= 40) return color.status.warning;
  return color.status.negative;
}

export type Breakpoint = 'compact' | 'medium' | 'expanded';

export function breakpointFor(width: number): Breakpoint {
  if (width >= layout.breakpoint.expanded) return 'expanded';
  if (width >= layout.breakpoint.medium) return 'medium';
  return 'compact';
}

/** Spaltenzahl für das Kachelraster. */
export function statColumns(breakpoint: Breakpoint): number {
  return breakpoint === 'expanded' ? 4 : breakpoint === 'medium' ? 3 : 2;
}

export const font = {
  micro: { fontSize: 10, fontWeight: '600', letterSpacing: 0.8, color: color.text.muted } as const,
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, color: color.text.secondary } as const,
  caption: { fontSize: 12, color: color.text.secondary } as const,
  body: { fontSize: 14, color: color.text.primary } as const,
  bodyStrong: { fontSize: 14, fontWeight: '600', color: color.text.primary } as const,
  title: { fontSize: 17, fontWeight: '600', color: color.text.primary } as const,
  headline: { fontSize: 22, fontWeight: '700', color: color.text.primary } as const,
  display: { fontSize: 34, fontWeight: '700', color: color.text.primary } as const,
};
