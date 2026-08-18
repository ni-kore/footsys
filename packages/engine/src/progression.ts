import type { GameData } from './data';
import type { Rng } from './rng';
import type { DevelopmentProfileId, PositionId, Range, ReputationLevel, SquadRole } from './types';
import { ROLE_ORDER } from './types';

/**
 * Entwicklung, Kaderrolle und Marktwert. Alle Zahlen stammen aus
 * `data/game/progression.json` — hier steht nur, wie sie angewendet werden.
 */

// ------------------------------------------------------------- Tabellen

/** Tabelle [Obergrenze, Wert]: gibt den Wert der ersten passenden Stufe zurück. */
export function stepTable(table: [number, number][], x: number): number {
  for (const [limit, value] of table) {
    if (x <= limit) return value;
  }
  return table[table.length - 1]![1];
}

/** Tabelle [Stützstelle, Wert]: linear interpoliert. */
export function interpolate(table: [number, number][], x: number): number {
  if (table.length === 0) return 0;
  if (x <= table[0]![0]) return table[0]![1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i]!;
    const [x0, y0] = table[i - 1]!;
    if (x <= x1) {
      const t = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
      return y0 + (y1 - y0) * t;
    }
  }
  return table[table.length - 1]![1];
}

/** Wert aus einem Objekt mit numerischen Schlüsseln: nimmt die erste Schwelle >= x. */
export function byNumericKey(map: Record<string, number>, x: number): number {
  const keys = Object.keys(map).map(Number).sort((a, b) => a - b);
  for (const key of keys) {
    if (x <= key) return map[String(key)]!;
  }
  return map[String(keys[keys.length - 1])]!;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Deckelt den OVR. Neben der harten Ober- und Untergrenze wirkt das versteckte
 * Potenzial: Ereignisse dürfen kurzfristig darüber hinausschieben, aber nur um
 * den in progression.json erlaubten Betrag. Ohne diese Grenze hebeln
 * Trainingslager und Formhochs das Potenzial komplett aus.
 */
export function clampOverall(data: GameData, value: number, potential: number): number {
  const career = data.progression.career;
  const overshoot = data.progression.potential.overshootAllowed as number;
  const ceiling = Math.min(career.overallMax as number, potential + overshoot);
  return clamp(value, career.overallMin as number, ceiling);
}

// ---------------------------------------------------------- Entwicklung

export function pickDevelopmentProfile(rng: Rng, data: GameData, position: PositionId): DevelopmentProfileId {
  if (position === 'GK') return 'goalkeeper';
  const weights = data.progression.developmentProfiles.weights as Record<string, number>;
  return rng.weighted(
    Object.entries(weights).map(([item, weight]) => ({ item: item as DevelopmentProfileId, weight })),
  );
}

/**
 * Verstecktes Leistungsmaximum. Es entscheidet mehr über eine Karriere als
 * jede einzelne Entscheidung — und der Spieler bekommt es nie zu sehen.
 *
 * Fuß und Beidfüßigkeit zahlen darauf ein: Linksfüßer gelten als begabter,
 * und wer beide Füße beherrscht, hat mehr Möglichkeiten. Beides kostet
 * Temperament, siehe `pickTemperament`.
 */
export function pickPotential(
  rng: Rng, data: GameData, profile: DevelopmentProfileId,
  strongFoot: 'left' | 'right' = 'right', weakFoot = 3,
): number {
  const config = data.progression.potential;
  const bucket = rng.weighted(
    (config.distribution as { range: Range; weight: number }[]).map((entry) => ({ item: entry, weight: entry.weight })),
  );
  const profileBonus = (config.lateBloomerBonus as Record<string, number>)[profile] ?? 0;

  const traits = data.progression.traits;
  const foot = traits.strongFoot[strongFoot];
  const footBonus = rng.chance(foot.talentChance as number) ? (foot.talentBonus as number) : 0;
  const weakFootBonus = Math.max(0, weakFoot - 2) * (traits.weakFoot.talentPerStarAboveTwo as number);

  return clamp(
    rng.float(bucket.range[0], bucket.range[1]) + profileBonus + footBonus + weakFootBonus,
    50, 99,
  );
}

/**
 * Temperament, 0–100. Der Preis für das Talent aus dem Fuß: solche Spieler
 * geraten häufiger in heikle Lagen und entscheiden sie öfter falsch.
 */
export function pickTemperament(
  data: GameData, strongFoot: 'left' | 'right', weakFoot: number,
): number {
  const traits = data.progression.traits;
  const base = traits.strongFoot[strongFoot].temperament as number;
  const fromWeakFoot = Math.max(0, weakFoot - 2) * (traits.weakFoot.temperamentPerStarAboveTwo as number);
  return clamp(base + fromWeakFoot, 0, 100);
}

/**
 * OVR-Veränderung für eine einzelne Saison.
 *
 * Die Kurven in progression.json beschreiben jeweils einen Zwei-Jahres-Block.
 * Weil footsys in Halbserien rechnet, wird der Blockwert halbiert und als
 * Fließkommazahl angewendet — über zwei Saisons ergibt das im Erwartungswert
 * exakt den Blockwert, ohne dass durch Rundung etwas verloren geht.
 */
export function seasonOverallDelta(
  data: GameData,
  rng: Rng,
  profile: DevelopmentProfileId,
  age: number,
  poorPlayingTime: boolean,
  seasonIndex: number,
  overall: number,
  potential: number,
): number {
  const curve = data.progression.developmentProfiles.profiles[profile];
  if (!curve) throw new Error(`Entwicklungsprofil ${profile} fehlt`);
  const range = bracketForAge(curve.deltaByAge as Record<string, Range>, age);
  if (!range) return 0;

  let value = rng.float(range[0], range[1]);

  const penalty = data.progression.developmentProfiles.playingTimePenalty;
  if (poorPlayingTime && seasonIndex >= penalty.fromBlockIndex) {
    // Zu wenig Spielzeit: der schlechtere von zwei Würfen zählt.
    value = Math.min(value, rng.float(range[0], range[1]));
  }

  // Wachstum bremst ab, je näher der Spieler an seinem Potenzial ist.
  // Der Abbau im Alter läuft unabhängig davon weiter.
  if (value > 0) {
    const table = data.progression.potential.growthDampening.byDistance as [number, number][];
    value *= interpolate(table, Math.max(0, potential - overall));
  }
  return value / 2;
}

function bracketForAge(deltaByAge: Record<string, Range>, age: number): Range | null {
  const ages = Object.keys(deltaByAge).map(Number).sort((a, b) => a - b);
  for (const bracketAge of ages) {
    if (age <= bracketAge) return deltaByAge[String(bracketAge)]!;
  }
  return deltaByAge[String(ages[ages.length - 1])] ?? null;
}

// --------------------------------------------------------- Kaderrolle

export interface RoleContext {
  overall: number;
  age: number;
  clubReputation: ReputationLevel;
  onLoan: boolean;
}

/** Welche Rolle der Spieler bei diesem Verein bekommt. */
export function computeRole(data: GameData, ctx: RoleContext): SquadRole {
  const roles = data.progression.roles;
  let reputation = ctx.clubReputation;
  if (ctx.onLoan) {
    reputation = clamp(reputation + roles.loanReputationBonus, 0, 10) as ReputationLevel;
  }

  let threshold = roles.minOverallForStarter[String(reputation)] as number;
  const youth = roles.youthPlayerBonus;
  if (ctx.age <= youth.maxAge) threshold -= youth.reduction;

  const step = roles.stepDown as number;
  if (ctx.overall >= threshold) return 'starter';
  if (ctx.overall >= threshold - step) return 'high_rotation';
  if (ctx.overall >= threshold - step * 2) return 'low_rotation';
  return 'substitute';
}

export function shiftRole(role: SquadRole, shift: number): SquadRole {
  const index = clamp(ROLE_ORDER.indexOf(role) + shift, 0, ROLE_ORDER.length - 1);
  return ROLE_ORDER[index]!;
}

export function roleAtLeast(role: SquadRole, min: SquadRole): boolean {
  return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(min);
}

// --------------------------------------------------------- Marktwert

export function marketValue(data: GameData, rng: Rng, overall: number, age: number): number {
  const config = data.progression.marketValue;
  const base = interpolate(config.byOverall as [number, number][], clamp(overall, 50, 99));
  const ageFactor = byNumericKey(config.ageMultiplier as Record<string, number>, age);
  const [min, max] = config.variance as Range;
  return roundValue(base * ageFactor * rng.float(min, max));
}

function roundValue(value: number): number {
  if (value >= 10_000_000) return Math.round(value / 1_000_000) * 1_000_000;
  if (value >= 1_000_000) return Math.round(value / 100_000) * 100_000;
  return Math.max(10_000, Math.round(value / 10_000) * 10_000);
}

export function salary(data: GameData, value: number, leagueStrength: number): number {
  const config = data.progression.salary;
  const multiplier = (config.leagueStrengthMultiplier as Record<string, number>)[String(leagueStrength)] ?? 1;
  return Math.max(config.min as number, Math.round(value * config.valueToSalaryRatio * multiplier));
}
