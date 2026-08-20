import type { PeriodReport, SquadRole } from '@footsys/engine';
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

/** Positionen, bei denen die Zahl der Spiele ohne Gegentor etwas aussagt. */
const KEEPS_CLEAN_SHEETS = new Set(['GK', 'SW', 'CB', 'LB', 'RB', 'LWB', 'RWB']);

/** Wenn sich sonst nichts bewegt hat, sagt wenigstens die Rolle etwas. */
const QUIET_BY_ROLE: Record<SquadRole, string> = {
  starter: 'You kept your place, and that was the whole story.',
  high_rotation: 'In the side, out of the side, and nothing else to report.',
  low_rotation: 'You waited for your turn more often than you got it.',
  substitute: 'You spent it watching from the bench.',
};

function count(value: number, one: string, many = one + 's'): string {
  return `${value} ${value === 1 ? one : many}`;
}

/** Aufzählung mit Komma und abschließendem „and". */
function list(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
}

/**
 * Der Bericht in zwei Sätzen, aus nichts als den Zahlen.
 *
 * Er steht da, wenn sonst nichts passiert ist: eine ruhige Spielzeit ist auch
 * eine Spielzeit, und ein leerer Bildschirm sagt darüber nichts. Der zweite
 * Satz nimmt sich das, was sich am deutlichsten bewegt hat — und wenn sich
 * nichts bewegt hat, sagt er das.
 */
export function periodSummary(report: PeriodReport): { title: string; text: string } {
  const period = report.kind === 'season' ? 'season' : 'half-season';
  const growth = Math.round(report.overallAfter) - Math.round(report.overallBefore);
  const gainedFans = Math.round(report.fansAfter - report.fansBefore);
  const valueFactor = report.marketValueBefore > 0
    ? report.marketValueAfter / report.marketValueBefore
    : 1;

  const title = report.appearances === 0
    ? `A ${period} on the sidelines`
    : growth >= 2
      ? 'Quiet, but you got better'
      : growth <= -1
        ? 'A quiet one, and it cost you'
        : `A ${period} without a story`;

  const parts = [count(report.appearances, 'appearance')];
  if (report.goals > 0) parts.push(count(report.goals, 'goal'));
  if (report.assists > 0) parts.push(count(report.assists, 'assist'));
  if (report.cleanSheets > 0 && KEEPS_CLEAN_SHEETS.has(report.position)) {
    parts.push(count(report.cleanSheets, 'clean sheet'));
  }
  if (report.nationalCaps > 0) parts.push(count(report.nationalCaps, 'cap') + ' for your country');

  const played = report.appearances === 0 ? 'Not a single minute.' : list(parts) + '.';

  // Das Auffälligste zuerst: erst das Können, dann der Marktwert, dann der
  // Zulauf. Zahlen, die sich kaum bewegt haben, bleiben unerwähnt.
  const moved = growth !== 0
    ? `Your overall went ${growth > 0 ? 'up' : 'down'} ${Math.abs(growth)}.`
    : valueFactor >= 1.15 || valueFactor <= 0.85
      ? `Your value ${valueFactor > 1 ? 'rose' : 'fell'} to ${money(report.marketValueAfter)}.`
      : gainedFans >= 1000
        ? `${fansDelta(gainedFans)} fans came along anyway.`
        : QUIET_BY_ROLE[report.role];

  return { title, text: `${played} ${moved}` };
}
