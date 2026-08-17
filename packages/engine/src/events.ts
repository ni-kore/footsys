import {
  clubOf, clubsInConfederation, clubsInCountry, countryOf, countryOfClub, leagueAtTier, leagueOf,
  positionOf, type GameData,
} from './data';
import { clamp, roleAtLeast } from './progression';
import { collectEffects, currentRole, isEligibleForNationalTeam } from './simulation';
import type { Rng } from './rng';
import type {
  CareerEvent, CareerState, Club, EventModifiers, EventOption, EventRequirements, EventVariant,
  PendingDecision, PendingOption, RandomEvent, ReputationLevel, TransferScope,
} from './types';

/**
 * Auswahl und Anwendung von Ereignissen.
 *
 * Entscheidungen (`events.json`) unterbrechen die Simulation und warten auf den
 * Spieler. Zufallsereignisse (`random-events.json`) passieren einfach und
 * werden nur gemeldet — sie sind der Grund, warum zwei Karrieren mit denselben
 * Entscheidungen unterschiedlich verlaufen.
 */

// ------------------------------------------------------ Voraussetzungen

function meetsRequirements(data: GameData, state: CareerState, req?: EventRequirements): boolean {
  if (!req) return true;
  const player = state.player;
  const club = state.clubId ? clubOf(data, state.clubId) : null;
  const role = currentRole(data, state, collectEffects(state));

  if (req.minOverall !== undefined && player.overall < req.minOverall) return false;
  if (req.maxOverall !== undefined && player.overall > req.maxOverall) return false;
  if (req.minMarketValue !== undefined && player.marketValue < req.minMarketValue) return false;
  if (req.minMorale !== undefined && player.meters.morale < req.minMorale) return false;
  if (req.maxMorale !== undefined && player.meters.morale > req.maxMorale) return false;
  if (req.minFanSupport !== undefined && player.meters.fanSupport < req.minFanSupport) return false;
  if (req.maxFanSupport !== undefined && player.meters.fanSupport > req.maxFanSupport) return false;
  if (req.minSeasonsAtClub !== undefined && state.seasonsAtClub < req.minSeasonsAtClub) return false;
  if (req.maxSeasonsAtClub !== undefined && state.seasonsAtClub > req.maxSeasonsAtClub) return false;
  if (req.minRole !== undefined && !roleAtLeast(role, req.minRole)) return false;
  if (req.notCaptain && player.isCaptain) return false;
  if (req.notCalledUpYet && player.caps > 0) return false;
  if (req.eligibleForNationalTeam && !isEligibleForNationalTeam(data, state)) return false;
  if (req.isInternational && player.caps === 0) return false;
  if (req.recentInjury && state.lastInjuryYear !== state.year) return false;

  if (club) {
    const league = leagueOf(data, club);
    if (req.minDomesticReputation !== undefined && club.reputation.domestic < req.minDomesticReputation) return false;
    if (req.maxDomesticReputation !== undefined && club.reputation.domestic > req.maxDomesticReputation) return false;
    if (req.minLeagueTier !== undefined && league.tier < req.minLeagueTier) return false;
    if (req.playingAbroad !== undefined) {
      const abroad = league.country !== player.nationality;
      if (abroad !== req.playingAbroad) return false;
    }
  }

  if (req.upcomingNationalTournament && !isEligibleForNationalTeam(data, state)) return false;
  return true;
}

// -------------------------------------------------------- Vereinsauswahl

/** Reputationsstufe, auf der ein Spieler mit diesem OVR realistisch Stammspieler wäre. */
function levelForOverall(data: GameData, overall: number, bonus = 0): ReputationLevel {
  const thresholds = data.progression.roles.minOverallForStarter as Record<string, number>;
  let best: ReputationLevel = 0;
  for (let rep = 0; rep <= 5; rep++) {
    if (overall + 4 >= thresholds[String(rep)]!) best = rep as ReputationLevel;
  }
  return clamp(best + bonus, 0, 5) as ReputationLevel;
}

export interface OfferOptions {
  scope: TransferScope;
  count: number;
  leagueStrengthMax?: number;
  qualityBonus?: number;
}

/** Kandidatenvereine für ein Angebot, gewichtet nach Passung zum Spielerniveau. */
export function clubOffers(data: GameData, rng: Rng, state: CareerState, options: OfferOptions): Club[] {
  const current = state.clubId ? clubOf(data, state.clubId) : null;
  const currentLeague = current ? leagueOf(data, current) : null;
  const target = levelForOverall(data, state.player.overall, options.qualityBonus ?? 0);

  let pool: Club[];
  switch (options.scope) {
    case 'home_country':
      pool = clubsInCountry(data, state.player.nationality);
      break;
    case 'same_league':
    case 'rival':
      pool = currentLeague ? (data.clubsByLeague.get(currentLeague.id) ?? []) : data.clubs;
      break;
    case 'abroad':
      pool = data.clubs.filter((c) => leagueOf(data, c).country !== (currentLeague?.country ?? state.player.nationality));
      break;
    case 'better':
      pool = data.clubs.filter((c) => c.reputation.domestic > (current?.reputation.domestic ?? 0));
      break;
    case 'lower':
      pool = data.clubs.filter((c) => c.reputation.domestic < (current?.reputation.domestic ?? 5));
      break;
    default:
      pool = data.clubs;
  }

  pool = pool.filter((c) => c.id !== current?.id);
  if (options.leagueStrengthMax !== undefined) {
    pool = pool.filter((c) => leagueOf(data, c).strength <= options.leagueStrengthMax!);
  }

  // Ein Spieler bekommt keine Angebote von Vereinen weit über seinem Niveau.
  // Ohne diese harte Grenze landet jede Karriere irgendwann bei einem Topklub.
  const inRange = pool.filter((c) => Math.abs(c.reputation.domestic - target) <= 1);
  if (inRange.length >= options.count) pool = inRange;
  if (pool.length === 0) pool = data.clubs.filter((c) => c.id !== current?.id);

  // Je näher an der Zielstufe, desto wahrscheinlicher das Angebot. Zusätzlich
  // wiegen Vereine aus dem aktuellen Land und der aktuellen Konföderation
  // schwerer — sonst springt jede Karriere wahllos über den Globus.
  const homeCountry = currentLeague?.country ?? state.player.nationality;
  const homeConfederation = countryOf(data, homeCountry).confederation;

  const weighted = pool.map((club) => {
    const league = leagueOf(data, club);
    let weight = Math.max(1, 12 - Math.abs(club.reputation.domestic - target) * 5);
    if (league.country === homeCountry) weight *= 2.5;
    else if (countryOf(data, league.country).confederation === homeConfederation) weight *= 1.5;
    if (league.country === state.player.nationality) weight *= 1.5;
    return { item: club, weight };
  });
  return rng.weightedSample(weighted, options.count);
}

/** Die drei Jugendangebote zum Karrierestart. */
export function academyOffers(data: GameData, rng: Rng, state: CareerState): Club[] {
  const country = countryOf(data, state.player.nationality);
  let pool = clubsInCountry(data, state.player.nationality);
  if (pool.length < 3) pool = clubsInConfederation(data, country.confederation);
  if (pool.length < 3) pool = data.clubs;

  // Kein 16-Jähriger startet bei einem Weltverein — Reputation 5 fällt raus.
  const eligible = pool.filter((c) => c.reputation.domestic <= 4);
  const weighted = (eligible.length >= 3 ? eligible : pool).map((club) => ({
    item: club,
    weight: Math.max(1, 6 - club.reputation.domestic),
  }));
  return rng.weightedSample(weighted, 3);
}

// ----------------------------------------------------- Entscheidungsbau

function clubOption(data: GameData, club: Club, prefix: string): PendingOption {
  const league = leagueOf(data, club);
  return {
    id: `${prefix}:${club.id}`,
    label: { de: club.short, en: club.short },
    clubId: club.id,
    subtitle: league.name,
  };
}

export function buildAcademyDecision(data: GameData, rng: Rng, state: CareerState): PendingDecision {
  const event = data.events.structural.find((e) => e.id === 'academy_offer')!;
  return {
    kind: 'structural',
    eventId: 'academy_offer',
    window: 'start',
    title: event.title,
    text: event.text.de,
    options: academyOffers(data, rng, state).map((c) => clubOption(data, c, 'academy')),
  };
}

export function buildTransferDecision(
  data: GameData, rng: Rng, state: CareerState, scope: TransferScope = 'matching',
): PendingDecision {
  const event = data.events.structural.find((e) => e.id === 'transfer_offer')!;
  const bonus = state.activeEffects.find((e) => e.modifiers.offerQualityBonus)?.modifiers.offerQualityBonus ?? 0;
  const clubs = clubOffers(data, rng, state, { scope, count: 3, qualityBonus: bonus });

  const options: PendingOption[] = clubs.map((c) => clubOption(data, c, 'transfer'));
  if (state.clubId) {
    const club = clubOf(data, state.clubId);
    options.unshift({
      id: 'stay',
      label: { de: `Bei ${club.short} bleiben`, en: `Stay at ${club.short}` },
      clubId: club.id,
      subtitle: leagueOf(data, club).name,
    });
  }

  return {
    kind: 'structural',
    eventId: 'transfer_offer',
    window: 'summer',
    title: event.title,
    text: event.text.de,
    options,
  };
}

export function buildLoanDecision(data: GameData, rng: Rng, state: CareerState): PendingDecision {
  const event = data.events.structural.find((e) => e.id === 'loan_offer')!;
  const clubs = clubOffers(data, rng, state, { scope: 'lower', count: 3 });
  const club = clubOf(data, state.clubId!);

  return {
    kind: 'structural',
    eventId: 'loan_offer',
    window: 'summer',
    title: event.title,
    text: event.text.de,
    options: [
      ...clubs.map((c) => clubOption(data, c, 'loan')),
      { id: 'stay', label: { de: `Bei ${club.short} bleiben`, en: `Stay at ${club.short}` }, clubId: club.id },
    ],
  };
}

export function buildRetirementDecision(data: GameData, state: CareerState): PendingDecision {
  const event = data.events.structural.find((e) => e.id === 'retirement')!;
  const options = (event.options ?? [])
    .filter((o) => !o.condition?.maxAge || state.player.age <= o.condition.maxAge)
    .map((o) => ({ id: o.id, label: o.label }));

  return {
    kind: 'structural',
    eventId: 'retirement',
    window: 'summer',
    title: event.title,
    text: event.text.de,
    options,
  };
}

/** Wählt ein passendes Karriere-Ereignis für das angegebene Fenster. */
export function buildCareerDecision(
  data: GameData, rng: Rng, state: CareerState, window: 'summer' | 'winter',
): PendingDecision | null {
  const eligible = data.events.career.filter((event) => {
    const eventWindow = event.window ?? 'summer';
    if (eventWindow !== 'any' && eventWindow !== window) return false;
    if (state.player.age < event.ageRange[0] || state.player.age > event.ageRange[1]) return false;

    const used = state.eventHistory.filter((e) => e.id === event.id).length;
    if (used >= (event.maxPerCareer ?? 1)) return false;

    return meetsRequirements(data, state, event.requires);
  });

  if (eligible.length === 0) return null;
  const event = rng.weighted(eligible.map((item) => ({ item, weight: item.weight })));
  const variant = pickVariant(data, rng, event);

  return {
    kind: 'career',
    eventId: event.id,
    window,
    title: event.title,
    text: fillPlaceholders(data, state, variant?.text.de ?? event.text.de, variant),
    ...(variant ? { variantKey: variant.key } : {}),
    options: event.options
      .filter((o) => optionAllowed(state, o))
      .map((o) => ({ id: o.id, label: o.label })),
  };
}

function optionAllowed(state: CareerState, option: EventOption): boolean {
  if (option.condition?.minAge && state.player.age < option.condition.minAge) return false;
  if (option.condition?.maxAge && state.player.age > option.condition.maxAge) return false;
  return true;
}

function pickVariant(data: GameData, rng: Rng, event: CareerEvent): EventVariant | null {
  if (event.variants && event.variants.length > 0) {
    return rng.weighted(event.variants.map((item) => ({ item, weight: item.weight })));
  }
  if (event.variantsFrom === 'progression.injury.types') {
    const weights = data.progression.injury.weights as Record<string, number>;
    const key = rng.weighted(Object.entries(weights).map(([item, weight]) => ({ item, weight })));
    const type = data.progression.injury.types[key];
    return { key, weight: 1, text: { de: type.label.de, en: type.label.en } };
  }
  return null;
}

function fillPlaceholders(
  data: GameData, state: CareerState, text: string, variant: EventVariant | null,
): string {
  const club = state.clubId ? clubOf(data, state.clubId) : null;
  const country = countryOf(data, state.player.nationality);
  return text
    .replace('{club}', club?.short ?? '')
    .replace('{country}', country.name.de)
    .replace('{injuryLabel}', variant?.text.de ?? '')
    .replace('{rivalClub}', club ? rivalOf(data, club)?.short ?? 'Der Rivale' : 'Der Rivale')
    .replace('{alternativeCountry}', '')
    .replace('{alternativePosition}', positionOf(data, state.player.position).name.de);
}

/** Der prestigeträchtigste andere Verein derselben Liga gilt als Rivale. */
export function rivalOf(data: GameData, club: Club): Club | null {
  const sameLeague = (data.clubsByLeague.get(club.league) ?? []).filter((c) => c.id !== club.id);
  if (sameLeague.length === 0) return null;
  return sameLeague.reduce((best, c) =>
    c.reputation.domestic > best.reputation.domestic ? c : best, sameLeague[0]!);
}

// -------------------------------------------------------- Zufallsereignisse

export interface RandomEventResult {
  event: RandomEvent;
  text: string;
}

/** Zieht die Zufallsereignisse für das angegebene Fenster und wendet sie an. */
export function rollRandomEvents(
  data: GameData, rng: Rng, state: CareerState, window: 'winter' | 'season_end',
): RandomEventResult[] {
  const config = data.randomEvents.config;
  const countWeights = config.countWeights as Record<string, number>;
  const count = Number(rng.weighted(
    Object.entries(countWeights).map(([item, weight]) => ({ item, weight })),
  ));
  if (count === 0) return [];

  const eligible = data.randomEvents.events.filter((event) => {
    if (!windowMatches(event.window, window)) return false;
    if (event.ageRange && (state.player.age < event.ageRange[0] || state.player.age > event.ageRange[1])) return false;

    const last = state.randomEventHistory.filter((e) => e.id === event.id).pop();
    if (last && state.year - last.year < (config.minSeasonsBetweenSameEvent as number)) return false;

    return meetsRequirements(data, state, event.requires);
  });
  if (eligible.length === 0) return [];

  const chosen = rng.weightedSample(eligible.map((item) => ({ item, weight: item.weight })), count);
  return chosen.map((event) => {
    applyRandomEvent(data, rng, state, event);
    state.randomEventHistory.push({ id: event.id, year: state.year });
    return { event, text: fillPlaceholders(data, state, event.text.de, null) };
  });
}

function windowMatches(eventWindow: string, current: string): boolean {
  // 'half_end' und 'any' gelten für beide Pausen, alles andere muss genau passen.
  if (eventWindow === 'any' || eventWindow === 'half_end') return true;
  return eventWindow === current;
}

function applyRandomEvent(data: GameData, rng: Rng, state: CareerState, event: RandomEvent): void {
  applyModifiers(data, rng, state, event.effects, event.id);

  if (event.effects.clubReputationDelta && state.clubId) {
    adjustClubReputation(data, state.clubId, event.effects.clubReputationDelta);
  }
  if (event.effects.leagueMove && state.clubId) {
    moveClubLeague(data, state.clubId, event.effects.leagueMove);
  }
}

/**
 * Reputationsänderungen wirken auf die Vereinsdaten des laufenden Spielstands.
 * Die Engine arbeitet auf einer Kopie der Vereinsliste, damit ein Aufstieg in
 * einer Karriere keine andere beeinflusst.
 */
function adjustClubReputation(data: GameData, clubId: string, delta: number): void {
  const club = clubOf(data, clubId);
  club.reputation = {
    domestic: clamp(club.reputation.domestic + delta, 0, 5) as ReputationLevel,
    continental: clamp(club.reputation.continental + delta, 0, 5) as ReputationLevel,
    international: club.reputation.international,
  };
}

function moveClubLeague(data: GameData, clubId: string, move: 'promotion' | 'relegation'): void {
  const club = clubOf(data, clubId);
  const league = leagueOf(data, club);
  const targetTier = move === 'promotion' ? league.tier - 1 : league.tier + 1;
  const target = leagueAtTier(data, league.country, targetTier);
  if (!target) return;

  const from = data.clubsByLeague.get(league.id);
  if (from) from.splice(from.indexOf(club), 1);
  club.league = target.id;
  const to = data.clubsByLeague.get(target.id);
  if (to) to.push(club);
  else data.clubsByLeague.set(target.id, [club]);
}

// ------------------------------------------------- Modifikatoren anwenden

/** Wendet einen Satz Modifikatoren auf den Spielstand an. */
export function applyModifiers(
  data: GameData, rng: Rng, state: CareerState, modifiers: EventModifiers, source: string,
): void {
  const player = state.player;

  if (modifiers.immediateOverall) player.overall += modifiers.immediateOverall;
  if (modifiers.permanentOverall) player.overall += modifiers.permanentOverall;
  player.overall = clamp(
    player.overall, data.progression.career.overallMin, data.progression.career.overallMax,
  );

  if (modifiers.deferredOverall) {
    state.deferredOverall.push({
      delta: modifiers.deferredOverall.delta,
      dueYear: state.year + modifiers.deferredOverall.afterSeasons,
    });
  }

  for (const [key, delta] of Object.entries(modifiers.meters ?? {})) {
    const meter = key as keyof typeof player.meters;
    player.meters[meter] = clamp(player.meters[meter] + delta, 0, 100);
  }

  if (modifiers.marketValueMultiplier) {
    player.marketValue = Math.round(player.marketValue * modifiers.marketValueMultiplier);
  }
  if (modifiers.setCaptain) player.isCaptain = true;
  if (modifiers.suspendedSeasons) state.suspensionHalves += modifiers.suspendedSeasons * 2;
  if (modifiers.changePosition) {
    const position = positionOf(data, player.position);
    if (position.related.length > 0) player.position = rng.pick(position.related);
  }
  if (modifiers.missShare && modifiers.missShare >= 0.2) state.lastInjuryYear = state.year;
  if (modifiers.forceTransfer) {
    state.pendingTransfer = {
      scope: modifiers.forceTransfer.scope,
      ...(modifiers.forceTransfer.leagueStrengthMax !== undefined
        ? { leagueStrengthMax: modifiers.forceTransfer.leagueStrengthMax }
        : {}),
    };
  }

  // Alles, was über die Zeit wirkt, wird als aktiver Effekt hinterlegt.
  const durable: EventModifiers = {};
  let hasDurable = false;
  for (const key of [
    'roleOverride', 'roleShift', 'appearanceMultiplier', 'goalMultiplier', 'assistMultiplier',
    'missShare', 'trophyMultiplier', 'nationalTeam', 'forceZeroAppearances', 'offerQualityBonus',
  ] as const) {
    if (modifiers[key] !== undefined) {
      (durable as any)[key] = modifiers[key];
      hasDurable = true;
    }
  }
  if (hasDurable) {
    const seasons = modifiers.roleOverrideSeasons ?? 1;
    state.activeEffects.push({ source, halvesRemaining: seasons * 2, modifiers: durable });
  }
}

/** Löst eine gewählte Option auf: Wurf, Erfolg oder Misserfolg, Modifikatoren. */
export function resolveOption(
  data: GameData, rng: Rng, state: CareerState, event: CareerEvent, option: EventOption,
  variantKey?: string,
): { outcome: 'positive' | 'negative' | null } {
  if (!option.outcome) {
    if (option.modifiers) applyModifiers(data, rng, state, option.modifiers, event.id);
    return { outcome: null };
  }

  const variant = event.variants?.find((v) => v.key === variantKey);
  let chance = option.outcome.successChance ?? 0.5;
  if (option.outcome.fromVariant && variant?.successChance !== undefined) {
    chance = variant.successChance;
  }

  const success = rng.chance(chance);

  if (option.outcome.fromVariant && variant) {
    const delta = success ? variant.successOverall ?? 0 : variant.failureOverall ?? 0;
    const key = option.outcome.permanent ? 'permanentOverall' : 'immediateOverall';
    applyModifiers(data, rng, state, { [key]: delta }, event.id);
  }

  const branch = success ? option.outcome.success : option.outcome.failure;
  if (branch) applyModifiers(data, rng, state, branch, event.id);
  if (option.modifiers) applyModifiers(data, rng, state, option.modifiers, event.id);

  return { outcome: success ? 'positive' : 'negative' };
}

export { meetsRequirements };
