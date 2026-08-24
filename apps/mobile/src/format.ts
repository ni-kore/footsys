import type { Locale, PeriodReport, SquadRole } from '@footsys/engine';
import { tr } from '@footsys/engine';
import { STRINGS, type StringKey } from './strings';
import { color } from './theme';

/** Market value, short: €1.2M / €850K */
export function money(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `€${millions >= 100 ? Math.round(millions) : millions.toFixed(1)}M`;
  }
  return `€${Math.round(value / 1000)}K`;
}

const ROLE_KEY: Record<SquadRole, StringKey> = {
  starter: 'roleStarter',
  high_rotation: 'roleHighRotation',
  low_rotation: 'roleLowRotation',
  substitute: 'roleSubstitute',
};

export function roleLabel(role: SquadRole, locale: Locale): string {
  return tr(STRINGS[ROLE_KEY[role]], locale);
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

// ------------------------------------------------ Ruhiger Saisonbericht

/** Ein Wort im Singular und Plural, je Sprache. */
type Count = Record<Locale, [string, string]>;
const WORD = {
  appearance: { en: ['appearance', 'appearances'], de: ['Spiel', 'Spiele'], es: ['partido', 'partidos'] },
  goal: { en: ['goal', 'goals'], de: ['Tor', 'Tore'], es: ['gol', 'goles'] },
  assist: { en: ['assist', 'assists'], de: ['Vorlage', 'Vorlagen'], es: ['asistencia', 'asistencias'] },
  cleanSheet: { en: ['clean sheet', 'clean sheets'], de: ['Spiel zu null', 'Spiele zu null'], es: ['portería a cero', 'porterías a cero'] },
  cap: { en: ['cap', 'caps'], de: ['Länderspiel', 'Länderspiele'], es: ['partido internacional', 'partidos internacionales'] },
} satisfies Record<string, Count>;

function count(value: number, word: Count, locale: Locale): string {
  const [one, many] = word[locale];
  return `${value} ${value === 1 ? one : many}`;
}

const FOR_COUNTRY: Record<Locale, string> = {
  en: ' for your country',
  de: ' für dein Land',
  es: ' con tu selección',
};

/** Aufzählung mit Komma und abschließendem „and". */
function list(parts: string[], locale: Locale): string {
  if (parts.length <= 1) return parts[0] ?? '';
  const and = locale === 'de' ? ' und ' : locale === 'es' ? ' y ' : ' and ';
  return parts.slice(0, -1).join(', ') + and + parts[parts.length - 1];
}

const QUIET = {
  onSidelines: {
    en: 'A {p} on the sidelines', de: 'Eine {p} auf der Bank', es: 'Una {p} en el banquillo',
  },
  gotBetter: {
    en: 'Quiet, but you got better', de: 'Ruhig, aber du wurdest besser', es: 'Tranquila, pero mejoraste',
  },
  costYou: {
    en: 'A quiet one, and it cost you', de: 'Ruhig, und es kostete dich etwas', es: 'Tranquila, y te costó algo',
  },
  withoutStory: {
    en: 'A {p} without a story', de: 'Eine {p} ohne Geschichte', es: 'Una {p} sin historia',
  },
  season: { en: 'season', de: 'Saison', es: 'temporada' },
  halfSeason: { en: 'half-season', de: 'Halbserie', es: 'media temporada' },
  notAMinute: { en: 'Not a single minute.', de: 'Keine einzige Minute.', es: 'Ni un solo minuto.' },
} as const;

const OVR_MOVED: Record<Locale, (dir: 'up' | 'down', amount: number) => string> = {
  en: (dir, a) => `Your overall went ${dir} ${a}.`,
  de: (dir, a) => `Dein OVR ging um ${a} nach ${dir === 'up' ? 'oben' : 'unten'}.`,
  es: (dir, a) => `Tu media ${dir === 'up' ? 'subió' : 'bajó'} ${a}.`,
};

const VALUE_MOVED: Record<Locale, (up: boolean, v: string) => string> = {
  en: (up, v) => `Your value ${up ? 'rose' : 'fell'} to ${v}.`,
  de: (up, v) => `Dein Marktwert ${up ? 'stieg' : 'fiel'} auf ${v}.`,
  es: (up, v) => `Tu valor ${up ? 'subió' : 'bajó'} a ${v}.`,
};

const FANS_ANYWAY: Record<Locale, (n: string) => string> = {
  en: (n) => `${n} fans came along anyway.`,
  de: (n) => `${n} Fans kamen trotzdem dazu.`,
  es: (n) => `${n} aficionados se sumaron de todos modos.`,
};

const QUIET_BY_ROLE: Record<SquadRole, Record<Locale, string>> = {
  starter: {
    en: 'You kept your place, and that was the whole story.',
    de: 'Du hieltest deinen Platz, und das war die ganze Geschichte.',
    es: 'Mantuviste tu puesto, y esa fue toda la historia.',
  },
  high_rotation: {
    en: 'In the side, out of the side, and nothing else to report.',
    de: 'Mal drin, mal draußen, und sonst nichts zu berichten.',
    es: 'Dentro, fuera, y nada más que contar.',
  },
  low_rotation: {
    en: 'You waited for your turn more often than you got it.',
    de: 'Du wartetest öfter auf deine Chance, als du sie bekamst.',
    es: 'Esperaste tu turno más veces de las que lo tuviste.',
  },
  substitute: {
    en: 'You spent it watching from the bench.',
    de: 'Du verbrachtest sie auf der Bank.',
    es: 'La pasaste mirando desde el banquillo.',
  },
};

/**
 * Der Bericht in zwei Sätzen, aus nichts als den Zahlen. Er steht da, wenn
 * sonst nichts passiert ist: eine ruhige Spielzeit ist auch eine Spielzeit.
 */
export function periodSummary(report: PeriodReport, locale: Locale): { title: string; text: string } {
  const periodWord = report.kind === 'season' ? QUIET.season[locale] : QUIET.halfSeason[locale];
  const growth = Math.round(report.overallAfter) - Math.round(report.overallBefore);
  const gainedFans = Math.round(report.fansAfter - report.fansBefore);
  const valueFactor = report.marketValueBefore > 0
    ? report.marketValueAfter / report.marketValueBefore
    : 1;

  const title = (report.appearances === 0
    ? QUIET.onSidelines[locale]
    : growth >= 2
      ? QUIET.gotBetter[locale]
      : growth <= -1
        ? QUIET.costYou[locale]
        : QUIET.withoutStory[locale]
  ).replace('{p}', periodWord);

  const parts = [count(report.appearances, WORD.appearance, locale)];
  if (report.goals > 0) parts.push(count(report.goals, WORD.goal, locale));
  if (report.assists > 0) parts.push(count(report.assists, WORD.assist, locale));
  if (report.cleanSheets > 0 && KEEPS_CLEAN_SHEETS.has(report.position)) {
    parts.push(count(report.cleanSheets, WORD.cleanSheet, locale));
  }
  if (report.nationalCaps > 0) {
    parts.push(count(report.nationalCaps, WORD.cap, locale) + FOR_COUNTRY[locale]);
  }

  const played = report.appearances === 0 ? QUIET.notAMinute[locale] : list(parts, locale) + '.';

  const moved = growth !== 0
    ? OVR_MOVED[locale](growth > 0 ? 'up' : 'down', Math.abs(growth))
    : valueFactor >= 1.15 || valueFactor <= 0.85
      ? VALUE_MOVED[locale](valueFactor > 1, money(report.marketValueAfter))
      : gainedFans >= 1000
        ? FANS_ANYWAY[locale](fansDelta(gainedFans))
        : QUIET_BY_ROLE[report.role][locale];

  return { title, text: `${played} ${moved}` };
}
