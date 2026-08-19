import type { SquadRole } from '@footsys/engine';
import { color } from './theme';

/** Market value, short: €1.2M / €850K */
export function money(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `€${millions >= 100 ? Math.round(millions) : millions.toFixed(1)}M`;
  }
  return `€${Math.round(value / 1000)}K`;
}

const ROLE_LABEL: Record<SquadRole, string> = {
  starter: 'First choice',
  high_rotation: 'Rotation',
  low_rotation: 'Fringe player',
  substitute: 'Benchwarmer',
};

export function roleLabel(role: SquadRole): string {
  return ROLE_LABEL[role];
}

/** Wie gut die Rolle ist, sieht man an der Farbe. */
const ROLE_TONE: Record<SquadRole, string> = {
  starter: color.status.positive,
  high_rotation: color.text.secondary,
  low_rotation: color.status.warning,
  substitute: color.status.negative,
};

export function roleTone(role: SquadRole): string {
  return ROLE_TONE[role];
}

/**
 * Anhängerschaft in Köpfen: 2, 4.7K, 13.6M, 210M. Ab einer Million wird
 * gerundet — auf den einzelnen Fan kommt es dann nicht mehr an.
 */
export function fans(count: number): string {
  if (count >= 1_000_000) {
    const millions = count / 1_000_000;
    return `${millions >= 100 ? Math.round(millions) : millions.toFixed(1)}M`;
  }
  if (count >= 1000) return `${Math.round(count / 1000)}K`;
  return String(Math.round(count));
}

/** Season as "26/27". */
export function seasonLabel(year: number): string {
  return `${String(year % 100).padStart(2, '0')}/${String((year + 1) % 100).padStart(2, '0')}`;
}

/** Signed number for deltas: +3, -2, 0. */
export function delta(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return '0';
  return rounded > 0 ? '+' + rounded : String(rounded);
}

/**
 * Zu- oder Abgang an Anhängern. Hier steht immer ein Vorzeichen davor, auch
 * bei null: die Zahl ist eine Bewegung, kein Bestand.
 */
export function fansDelta(value: number): string {
  const sign = value < 0 ? '-' : '+';
  return sign + fans(Math.abs(Math.round(value)));
}

/** Readable text colour on a club colour. */
export function readableOn(hex: string): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#101018' : '#FFFFFF';
}
