import { clubOf, countryOf, countryOfClub, leagueOf, positionOf, type GameData } from './data';
import { activeAssociation, recordSeasonInCountry } from './national-team';
import { fanInfluence } from './fans';
import { byNumericKey, clamp, clampOverall, computeRole, interpolate, marketValue, roleAtLeast, seasonOverallDelta, shiftRole, stepTable } from './progression';
import type { Rng } from './rng';
import type {
  CareerState, ClubCompetition, EventModifiers, HalfSeasonRecord, NationalCompetition,
  SeasonRecord, SquadRole,
} from './types';

/**
 * Simulation einer Halbserie und der Saisonabschluss.
 *
 * Die kleinste Einheit ist bewusst die Halbserie: nur so lassen sich
 * Winterpause, Wintertransfers und kurzfristige Effekte wie Formhoch oder
 * Sperren sauber abbilden.
 */

// --------------------------------------------------------- Effektlage

/** Fasst alle gerade aktiven Effekte zu einem Satz Modifikatoren zusammen. */
export function collectEffects(state: CareerState): EventModifiers {
  const combined: EventModifiers = {
    appearanceMultiplier: 1,
    goalMultiplier: 1,
    assistMultiplier: 1,
    missShare: 0,
    trophyMultiplier: {},
  };

  for (const effect of state.activeEffects) {
    if (effect.halvesRemaining <= 0) continue;
    const m = effect.modifiers;
    combined.appearanceMultiplier! *= m.appearanceMultiplier ?? 1;
    combined.goalMultiplier! *= m.goalMultiplier ?? 1;
    combined.assistMultiplier! *= m.assistMultiplier ?? 1;
    // Mehrere Ausfälle addieren sich nicht beliebig — die schwerste zählt.
    combined.missShare = Math.max(combined.missShare!, m.missShare ?? 0);
    if (m.roleOverride) combined.roleOverride = m.roleOverride;
    if (m.roleShift) combined.roleShift = ((combined.roleShift ?? 0) + m.roleShift) as -1 | 1;
    if (m.forceZeroAppearances) combined.forceZeroAppearances = true;
    if (m.nationalTeam) combined.nationalTeam = m.nationalTeam;
    for (const [key, factor] of Object.entries(m.trophyMultiplier ?? {})) {
      const k = key as keyof NonNullable<EventModifiers['trophyMultiplier']>;
      combined.trophyMultiplier![k] = (combined.trophyMultiplier![k] ?? 1) * factor;
    }
  }
  return combined;
}

/** Zählt alle aktiven Effekte eine Halbserie herunter und entfernt abgelaufene. */
export function ageEffects(state: CareerState): void {
  state.activeEffects = state.activeEffects
    .map((e) => ({ ...e, halvesRemaining: e.halvesRemaining - 1 }))
    .filter((e) => e.halvesRemaining > 0);
}

// ------------------------------------------------------- Rolle & Spiele

export function currentRole(data: GameData, state: CareerState, effects: EventModifiers): SquadRole {
  if (!state.clubId) return 'substitute';
  const club = clubOf(data, state.clubId);
  let role = computeRole(data, {
    overall: state.player.overall,
    age: state.player.age,
    clubReputation: club.reputation.domestic,
    onLoan: state.activeLoan !== null,
  });

  if (effects.roleOverride) role = effects.roleOverride;
  if (effects.roleShift) role = shiftRole(role, effects.roleShift);

  // Sehr schlechte Moral kostet Spielzeit.
  const moraleEffect = data.meters.meters.morale.effects as { below?: number; above?: number; modifiers: EventModifiers }[];
  for (const rule of moraleEffect) {
    if (rule.below !== undefined && state.player.meters.morale < rule.below && rule.modifiers.roleShift) {
      role = shiftRole(role, rule.modifiers.roleShift);
    }
  }
  return role;
}

/** Pflichtspiele einer Halbserie für den aktuellen Verein. */
function matchesInHalf(data: GameData, state: CareerState): number {
  if (!state.clubId) return 0;
  const club = clubOf(data, state.clubId);
  const league = leagueOf(data, club);
  const rep = String(club.reputation.domestic);

  const leagueMatches = (league.teams * 2 - 2) / 2;
  const cup = (data.progression.season.cupMatchesByReputation[rep] as number) / 2;
  const continental = league.continentalSlots.primary > 0
    ? (data.progression.season.continentalMatchesByReputation[String(club.reputation.continental)] as number) / 2
    : 0;

  return leagueMatches + cup + continental;
}

// --------------------------------------------------- Halbserie rechnen

export function simulateHalf(data: GameData, rng: Rng, state: CareerState): HalfSeasonRecord {
  const effects = collectEffects(state);
  const role = currentRole(data, state, effects);
  const clubId = state.clubId!;
  const club = clubOf(data, clubId);
  const position = positionOf(data, state.player.position);
  const season = data.progression.season;

  const record: HalfSeasonRecord = {
    year: state.year,
    half: state.half,
    clubId,
    role,
    appearances: 0,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    caps: 0,
    nationalGoals: 0,
    nationalAssists: 0,
    randomEventIds: [],
  };

  if (state.suspensionHalves > 0 || effects.forceZeroAppearances) {
    state.suspensionHalves = Math.max(0, state.suspensionHalves - 1);
    return record;
  }

  // Die Spielweise des Trainers wird je Halbserie neu gezogen. Sie bestimmt,
  // wie viele Chancen entstehen — und wie gut das Lieblingssystem des Spielers
  // dazu passt. Wer die Fünferkette liebt und bei einem Offensivtrainer landet,
  // steht seltener auf dem Platz.
  const fitConfig = data.progression.formationFit;
  const formation = data.formations.find((f) => f.id === state.player.formationId);
  const playerBias = formation ? formation.attackingBias : 0.5;
  const [coachMin, coachMax] = fitConfig.coachBiasRange as [number, number];
  const coachBias = rng.float(coachMin, coachMax);
  // Das 4-4-2 ist das System, mit dem jeder Trainer etwas anfangen kann.
  const neutralSystem = formation?.neutral === true;
  // Beidfüßige Spieler sind vielseitiger — bei ihnen fällt ein unpassendes
  // System weniger ins Gewicht.
  const weakFootConfig = data.progression.weakFoot;
  const relief = (weakFootConfig.fitRelief as Record<string, number>)[String(state.player.weakFoot)] ?? 0;
  const weakFootOutput = (weakFootConfig.outputMultiplier as Record<string, number>)[String(state.player.weakFoot)] ?? 1;

  const biasGap = neutralSystem ? 0 : Math.abs(coachBias - playerBias) * (1 - relief);
  const fit = clamp(1 - biasGap * (fitConfig.penaltyPerGap as number), fitConfig.minMultiplier as number, 1);

  const attackMultiplier = 0.82 + coachBias * 0.42;
  const defenceMultiplier = 1.15 - coachBias * 0.3;

  state.lastCoachBias = coachBias;
  state.lastFormationFit = fit;

  const matches = matchesInHalf(data, state);
  const shareRange = data.progression.roles.appearanceShare[role] as [number, number];
  const availability = 1 - clamp(effects.missShare ?? 0, 0, 1);

  const appearances = Math.round(
    matches * rng.float(shareRange[0], shareRange[1]) * availability
    * (effects.appearanceMultiplier ?? 1) * fit,
  );
  record.appearances = Math.max(0, appearances);

  const teamQuality = season.teamQualityMultiplier[String(club.reputation.domestic)] as number;
  const output = data.progression.roles.outputMultiplier[role] as number;

  // Linksfüßer gelten als kreativer, aber unbeständiger; Rechtsfüßer liefern
  // verlässlicher ab. Das zeigt sich in den Vorlagen und in der Schwankung.
  const footTraits = data.progression.traits.strongFoot[state.player.strongFoot];
  const [baseMin, baseMax] = season.variance as [number, number];
  const spread = ((baseMax - baseMin) / 2) * (footTraits.varianceFactor as number);
  const varMin = 1 - spread;
  const varMax = 1 + spread;

  const goalRate = stepTable(season.goalRateByOverall.table, state.player.overall);
  const assistRate = stepTable(season.assistRateByOverall.table, state.player.overall);

  record.goals = Math.round(
    record.appearances * goalRate * position.goalFactor * teamQuality * output *
    (effects.goalMultiplier ?? 1) * attackMultiplier * weakFootOutput * rng.float(varMin, varMax),
  );
  record.assists = Math.round(
    record.appearances * assistRate * position.assistFactor * teamQuality * output *
    (effects.assistMultiplier ?? 1) * attackMultiplier * weakFootOutput
    * (footTraits.assistFactor as number) * rng.float(varMin, varMax),
  );

  if (position.tracksCleanSheets) {
    const rate = stepTable(season.cleanSheetRateByOverall.table, state.player.overall);
    record.cleanSheets = Math.round(
      record.appearances * rate * teamQuality * defenceMultiplier * rng.float(varMin, varMax),
    );
  }

  simulateNationalTeamHalf(data, rng, state, effects, record);
  return record;
}

function simulateNationalTeamHalf(
  data: GameData, rng: Rng, state: CareerState, effects: EventModifiers, half: HalfSeasonRecord,
): void {
  if (effects.nationalTeam === 'skip' || half.appearances === 0) return;

  const association = activeAssociation(data, state);
  if (!association) return;

  const [min, max] = data.progression.nationalTeam.capsPerSeason as [number, number];
  const caps = Math.round(rng.int(min, max) / 2);
  if (caps === 0) return;

  const position = positionOf(data, state.player.position);
  const goals = Math.round(caps * position.goalFactor * 0.35 * rng.float(0.6, 1.4));
  const assists = Math.round(caps * position.assistFactor * 0.3 * rng.float(0.6, 1.4));

  state.player.nationalTeam = association;
  // Ab dem festgelegten Alter zählen die Spiele als A-Länderspiele und binden
  // den Verband.
  const lockAge = data.progression.nationalTeam.aTeamLockAge as number;
  if (state.player.firstSeniorCapAge === null && state.player.age >= lockAge) {
    state.player.firstSeniorCapAge = state.player.age;
  }

  state.currentSeasonCaps += caps;
  state.currentSeasonNationalGoals += goals;
  state.currentSeasonNationalAssists += assists;
  state.player.caps += caps;
  state.player.nationalGoals += goals;
  state.player.nationalAssists += assists;

  // Auch die Halbserie merkt sich das: die Anhängerschaft wird je Halbserie
  // gerechnet und braucht die Länderspiele dieser Wochen.
  half.caps += caps;
  half.nationalGoals += goals;
  half.nationalAssists += assists;
}

export function isEligibleForNationalTeam(data: GameData, state: CareerState): boolean {
  return activeAssociation(data, state) !== null;
}

// ------------------------------------------------------ Saisonabschluss

export interface SeasonOutcome {
  record: SeasonRecord;
  titles: string[];
  awards: string[];
}

export function closeSeason(data: GameData, rng: Rng, state: CareerState): SeasonOutcome {
  const halves = state.currentSeasonHalves;
  const clubId = state.clubId!;
  const club = clubOf(data, clubId);
  const league = leagueOf(data, club);
  const effects = collectEffects(state);

  const appearances = sum(halves, (h) => h.appearances);
  const goals = sum(halves, (h) => h.goals);
  const assists = sum(halves, (h) => h.assists);
  const cleanSheets = sum(halves, (h) => h.cleanSheets);
  const role = halves[halves.length - 1]?.role ?? 'substitute';

  const titles = appearances > 0 ? rollClubTitles(data, rng, state, effects) : [];
  titles.push(...rollNationalTitles(data, rng, state, effects));
  const awards = appearances > 0 ? rollAwards(data, rng, state, role, goals, assists) : [];

  const record: SeasonRecord = {
    year: state.year,
    age: state.player.age,
    clubId,
    leagueId: league.id,
    overall: Math.round(state.player.overall),
    role,
    appearances,
    goals,
    assists,
    cleanSheets,
    // Wird nach dem Abschluss überschrieben: die Fans der Saison werden erst
    // danach gerechnet.
    fans: state.player.fans,
    titles,
    awards,
    nationalCaps: state.currentSeasonCaps,
    nationalGoals: state.currentSeasonNationalGoals,
    nationalAssists: state.currentSeasonNationalAssists,
    halves: [...halves],
  };
  if (state.activeLoan) record.loanFrom = state.activeLoan.parentClubId;

  applyEndOfSeasonProgression(data, rng, state, role);
  return { record, titles, awards };
}

function applyEndOfSeasonProgression(data: GameData, rng: Rng, state: CareerState, role: SquadRole): void {
  recordSeasonInCountry(data, state);
  state.player.age += 1;

  const poorPlayingTime = role === 'substitute' || role === 'low_rotation';
  const delta = seasonOverallDelta(
    data, rng, state.player.developmentProfile, state.player.age, poorPlayingTime, state.seasons.length,
    state.player.overall, state.player.potential,
  );

  let overall = state.player.overall + delta;

  // Fällige verzögerte Effekte aus Entscheidungen.
  const due = state.deferredOverall.filter((d) => d.dueYear <= state.year);
  for (const entry of due) overall += entry.delta;
  state.deferredOverall = state.deferredOverall.filter((d) => d.dueYear > state.year);

  // Sehr hohe Moral gibt einen kleinen Schub.
  if (state.player.meters.morale > 85) overall += 1;

  // Eine große Anhängerschaft trägt oder erdrückt, je nach Stimmung.
  overall += fanInfluence(data, state);

  state.player.overall = clampOverall(data, overall, state.player.potential);

  driftMeters(data, state);
  state.player.marketValue = marketValue(data, rng, state.player.overall, state.player.age);
}

function driftMeters(data: GameData, state: CareerState): void {
  for (const key of ['morale', 'fanSupport', 'mediaRelation'] as const) {
    const config = data.meters.meters[key];
    const { toward, amount } = config.driftPerSeason;
    const current = state.player.meters[key];
    if (current > toward) state.player.meters[key] = Math.max(toward, current - amount);
    else if (current < toward) state.player.meters[key] = Math.min(toward, current + amount);
  }
}

// ------------------------------------------------------------- Titel

function rollClubTitles(data: GameData, rng: Rng, state: CareerState, effects: EventModifiers): string[] {
  const club = clubOf(data, state.clubId!);
  const league = leagueOf(data, club);
  const country = countryOfClub(data, club);
  const odds = data.trophyOdds.club;
  const multiplier = effects.trophyMultiplier ?? {};
  const titles: string[] = [];

  const lastSeason = state.seasons[state.seasons.length - 1];
  const wonLastSeason = (id: string): boolean => lastSeason?.titles.includes(id) ?? false;

  if (rng.chance(odds.league.byDomesticReputation[club.reputation.domestic] * (multiplier.league ?? 1))) {
    titles.push(league.id);
  }
  if (league.cup && rng.chance(odds.domesticCup.byDomesticReputation[club.reputation.domestic] * (multiplier.domesticCup ?? 1))) {
    titles.push(league.cup);
  }
  if (league.secondaryCup && wonLastSeason(league.id) &&
      rng.chance(odds.domesticSuperCup.byDomesticReputation[club.reputation.domestic])) {
    titles.push(league.secondaryCup);
  }

  const primary = competitionFor(data, country.confederation, 'continental_primary');
  const secondary = competitionFor(data, country.confederation, 'continental_secondary');
  const tertiary = competitionFor(data, country.confederation, 'continental_tertiary');

  if (primary && league.continentalSlots.primary > 0 &&
      rng.chance(odds.continentalPrimary.byContinentalReputation[club.reputation.continental] * (multiplier.continentalPrimary ?? 1))) {
    titles.push(primary.id);
  } else if (secondary && league.continentalSlots.secondary > 0 &&
      rng.chance(odds.continentalSecondary.byContinentalReputation[club.reputation.continental] * (multiplier.continentalSecondary ?? 1))) {
    titles.push(secondary.id);
  } else if (tertiary && league.continentalSlots.tertiary > 0 &&
      rng.chance(odds.continentalTertiary.byContinentalReputation[club.reputation.continental])) {
    titles.push(tertiary.id);
  }

  if (primary && wonLastSeason(primary.id) &&
      rng.chance(odds.clubWorldCup.byInternationalReputation[club.reputation.international])) {
    titles.push('fifa-club-world-cup');
  }

  return titles;
}

function competitionFor(
  data: GameData, confederation: string, level: ClubCompetition['level'],
): ClubCompetition | null {
  // Frauenwettbewerbe stehen in denselben Daten und dürfen hier nicht greifen,
  // solange footsys nur Männerkarrieren kennt.
  return data.competitions.club.find(
    (c) => c.confederation === confederation && c.level === level && c.gender !== 'women',
  ) ?? null;
}

function rollNationalTitles(data: GameData, rng: Rng, state: CareerState, effects: EventModifiers): string[] {
  if (effects.nationalTeam === 'skip') return [];
  if (state.currentSeasonCaps === 0) return [];

  const association = state.player.nationalTeam ?? state.player.nationality;
  const country = countryOf(data, association);
  const odds = data.trophyOdds.national;
  const difficulty = odds.confederationDifficulty[country.confederation] as number;
  const titles: string[] = [];

  for (const competition of data.competitions.national as NationalCompetition[]) {
    if (competition.historic) continue;
    if (competition.confederation && competition.confederation !== country.confederation) continue;
    if (competition.maxAge && state.player.age > competition.maxAge) continue;
    if (!tournamentHappensThisYear(competition, state.year)) continue;

    const key = levelToOddsKey(competition.level);
    if (!key) continue;
    let chance = (odds[key].byCountryStrength[String(country.strength)] as number) ?? 0;
    if (competition.level === 'world_cup') chance *= difficulty;
    if (effects.trophyMultiplier?.national) chance *= effects.trophyMultiplier.national;

    if (rng.chance(chance)) titles.push(competition.id);
  }
  return titles;
}

function levelToOddsKey(level: string): 'worldCup' | 'continentalNational' | 'secondaryNational' | 'olympic' | null {
  switch (level) {
    case 'world_cup': return 'worldCup';
    case 'continental_national': return 'continentalNational';
    case 'secondary_national': return 'secondaryNational';
    case 'youth_national': return 'olympic';
    default: return null;
  }
}

/** WM 2026/2030, EM & Copa 2028/2032, Afrika-Cup und Gold Cup alle zwei Jahre. */
function tournamentHappensThisYear(competition: NationalCompetition, year: number): boolean {
  if (competition.cycleYears === 2) return year % 2 === 1;
  if (competition.level === 'world_cup') return year % 4 === 2;
  return year % 4 === 0;
}

// ------------------------------------------------------ Auszeichnungen

function rollAwards(
  data: GameData, rng: Rng, state: CareerState, role: SquadRole, goals: number, assists: number,
): string[] {
  const club = clubOf(data, state.clubId!);
  const league = leagueOf(data, club);
  const position = positionOf(data, state.player.position);
  const awards: string[] = [];
  const config = data.trophyOdds.individual;
  const mediaBonus = state.player.meters.mediaRelation > 80 ? 1.15 : 1;

  const check = (
    key: string, awardId: string, extra: () => boolean = () => true,
  ): void => {
    const rule = config[key];
    if (!rule) return;
    if (rule.minOverall && state.player.overall < rule.minOverall) return;
    if (rule.maxAge && state.player.age > rule.maxAge) return;
    if (rule.requiresRole && !rule.requiresRole.includes(role)) return;
    if (rule.requiresPositionGroup && !rule.requiresPositionGroup.includes(position.group)) return;
    if (rule.oncePerCareer && state.seasons.some((s) => s.awards.includes(awardId))) return;
    if (!extra()) return;

    const chance = rule.chance ?? rule.chanceByLeagueStrength?.[String(league.strength)] ?? 0;
    if (rng.chance(chance * mediaBonus)) awards.push(awardId);
  };

  check('leagueTopScorer', 'league-top-scorer', () => goals >= 15);
  check('leagueTopAssists', 'league-top-assists', () => assists >= 10);
  check('leaguePlayerOfTheSeason', 'league-player-of-the-season');
  check('leagueYoungPlayer', 'league-young-player');
  check('leagueGoalkeeperOfSeason', 'league-goalkeeper-of-the-season');
  check('goldenBoy', 'golden-boy');
  check('ballonDOr', 'ballon-dor', () => awards.includes('league-top-scorer') || hasContinentalTitle(data, state));

  return awards;
}

function hasContinentalTitle(data: GameData, state: CareerState): boolean {
  const ids = new Set(
    data.competitions.club.filter((c) => c.level === 'continental_primary').map((c) => c.id),
  );
  const last = state.seasons[state.seasons.length - 1];
  return last?.titles.some((t) => ids.has(t)) ?? false;
}

// ------------------------------------------------------------- Helfer

function sum<T>(items: T[], value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0);
}

export { interpolate, byNumericKey, roleAtLeast };
