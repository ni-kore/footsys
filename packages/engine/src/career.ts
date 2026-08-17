import { clubOf, countryOf, leagueOf, positionOf, type GameData } from './data';
import {
  buildAcademyDecision, buildCareerDecision, buildLoanDecision, buildRetirementDecision,
  buildTransferDecision, clubOffers, resolveOption, rollRandomEvents,
} from './events';
import { marketValue, pickDevelopmentProfile, pickPotential } from './progression';
import { Rng } from './rng';
import { ageEffects, closeSeason, simulateHalf } from './simulation';
import type {
  CareerState, GameMode, PlayerIdentity, TimelineEntry, TransferScope,
} from './types';

/**
 * Der Ablauf einer Karriere.
 *
 * Die Engine läuft in Halbserien. Nach jeder Halbserie können
 * Zufallsereignisse eintreten; in der Winterpause und in der Sommerpause kann
 * eine Entscheidung anstehen. Steht eine an, hält die Simulation an und wartet
 * — die UI ruft dann `decide()` auf.
 */

/** Wahrscheinlichkeit, dass in der Winterpause eine Entscheidung ansteht. */
const WINTER_DECISION_CHANCE = 0.45;

/** Ab dieser Saisonzahl beim Verein ohne Einsatzzeit wird eine Leihe angeboten. */
const LOAN_OFFER_CHANCE = 0.7;

export interface CareerOptions {
  seed: string;
  mode: GameMode;
  identity: PlayerIdentity;
  /** Startjahr der ersten Saison. */
  startYear?: number;
}

export function createCareer(data: GameData, options: CareerOptions): CareerState {
  const rng = new Rng(options.seed);
  const career = data.progression.career;
  const meters = data.meters.meters;

  const developmentProfile = pickDevelopmentProfile(rng, data, options.identity.position);

  const state: CareerState = {
    seed: options.seed,
    rngState: 0,
    step: 0,
    mode: options.mode,
    year: options.startYear ?? 2025,
    half: 1,
    player: {
      ...options.identity,
      age: career.startAge,
      overall: career.startOverall,
      potential: pickPotential(rng, data, developmentProfile),
      marketValue: 0,
      developmentProfile,
      isCaptain: false,
      meters: {
        morale: meters.morale.start,
        fanSupport: meters.fanSupport.start,
        mediaRelation: meters.mediaRelation.start,
      },
      caps: 0,
      nationalGoals: 0,
    },
    clubId: null,
    contractClubId: null,
    activeLoan: null,
    seasonsAtClub: 0,
    seasonsSinceMajorDecision: 0,
    currentSeasonHalves: [],
    currentSeasonCaps: 0,
    currentSeasonNationalGoals: 0,
    seasons: [],
    pending: null,
    pendingTransfer: null,
    activeEffects: [],
    deferredOverall: [],
    eventHistory: [],
    randomEventHistory: [],
    suspensionHalves: 0,
    lastInjuryYear: null,
    timeline: [],
    retired: false,
  };

  state.player.marketValue = marketValue(data, rng, state.player.overall, state.player.age);
  state.pending = buildAcademyDecision(data, rng, state);
  state.rngState = rng.state;
  return state;
}

/**
 * Verarbeitet eine Entscheidung und simuliert weiter, bis die nächste ansteht
 * oder die Karriere endet.
 */
export function decide(data: GameData, state: CareerState, optionId: string): CareerState {
  if (!state.pending) throw new Error('Es steht keine Entscheidung an');
  const next = structuredClone(state);
  const rng = new Rng(next.rngState);
  const decision = next.pending!;
  const option = decision.options.find((o) => o.id === optionId);
  if (!option) throw new Error(`Unbekannte Option ${optionId}`);

  next.pending = null;
  next.step += 1;

  switch (decision.eventId) {
    case 'academy_offer':
      joinClub(data, next, option.clubId!, 'transfer');
      break;

    case 'transfer_offer':
      if (option.id !== 'stay') joinClub(data, next, option.clubId!, 'transfer');
      break;

    case 'loan_offer':
      if (option.id !== 'stay') startLoan(data, next, option.clubId!);
      break;

    case 'retirement':
      if (option.id !== 'one_more_year') {
        retire(data, next, option.id === 'retire_at_home');
        next.rngState = rng.state;
        return next;
      }
      break;

    default: {
      const event = data.careerEventById.get(decision.eventId);
      if (event) {
        const eventOption = event.options.find((o) => o.id === optionId);
        if (eventOption) {
          resolveOption(data, rng, next, event, eventOption, decision.variantKey);
          next.eventHistory.push({ id: event.id, year: next.year });
          log(next, 'decision', `${event.title.de}: ${eventOption.label.de}`);
        }
      }
    }
  }

  executePendingTransfer(data, rng, next);
  advance(data, rng, next);
  next.rngState = rng.state;
  return next;
}

// ------------------------------------------------------------ Ablauf

function advance(data: GameData, rng: Rng, state: CareerState): void {
  const career = data.progression.career;

  while (!state.pending && !state.retired) {
    if (!state.clubId) {
      state.pending = buildAcademyDecision(data, rng, state);
      return;
    }

    const half = simulateHalf(data, rng, state);
    state.currentSeasonHalves.push(half);
    ageEffects(state);

    if (state.half === 1) {
      // ---- Winterpause
      const randoms = rollRandomEvents(data, rng, state, 'winter');
      half.randomEventIds = randoms.map((r) => r.event.id);
      for (const r of randoms) log(state, 'random_event', r.event.title.de, r.text);

      state.half = 2;
      executePendingTransfer(data, rng, state);

      if (rng.chance(WINTER_DECISION_CHANCE)) {
        state.pending = buildCareerDecision(data, rng, state, 'winter');
      }
    } else {
      // ---- Saisonende
      const randoms = rollRandomEvents(data, rng, state, 'season_end');
      half.randomEventIds = randoms.map((r) => r.event.id);
      for (const r of randoms) log(state, 'random_event', r.event.title.de, r.text);

      const outcome = closeSeason(data, rng, state);
      state.seasons.push(outcome.record);
      for (const title of outcome.titles) log(state, 'title', titleName(data, title));
      for (const award of outcome.awards) log(state, 'award', awardName(data, award));

      state.currentSeasonHalves = [];
      state.currentSeasonCaps = 0;
      state.currentSeasonNationalGoals = 0;
      state.half = 1;
      state.year += 1;
      state.seasonsAtClub += 1;
      state.seasonsSinceMajorDecision += 1;

      endLoanIfDue(data, state);
      executePendingTransfer(data, rng, state);

      if (shouldOfferRetirement(data, state)) {
        state.pending = buildRetirementDecision(data, state);
        return;
      }
      if (state.player.age >= career.latestRetirementAge) {
        retire(data, state, false);
        return;
      }

      state.pending = buildSummerDecision(data, rng, state);
    }
  }
}

function buildSummerDecision(data: GameData, rng: Rng, state: CareerState) {
  const periodLength = data.progression.career.modes[state.mode].periodLengthSeasons as number;
  const lastSeason = state.seasons[state.seasons.length - 1];
  const lowMinutes = lastSeason?.role === 'substitute' || lastSeason?.role === 'low_rotation';

  // Junge Spieler ohne Einsatzzeit bekommen zuerst ein Leihangebot.
  if (state.player.age <= 20 && lowMinutes && !state.activeLoan && rng.chance(LOAN_OFFER_CHANCE)) {
    state.seasonsSinceMajorDecision = 0;
    return buildLoanDecision(data, rng, state);
  }

  if (state.seasonsSinceMajorDecision >= periodLength) {
    state.seasonsSinceMajorDecision = 0;
    return buildTransferDecision(data, rng, state);
  }

  return buildCareerDecision(data, rng, state, 'summer') ?? buildTransferDecision(data, rng, state);
}

function shouldOfferRetirement(data: GameData, state: CareerState): boolean {
  const career = data.progression.career;
  if (state.player.age >= career.defaultRetirementAge) return true;
  return state.player.age >= career.earliestRetirementAge && state.player.overall < 58;
}

// ------------------------------------------------------- Vereinswechsel

function joinClub(data: GameData, state: CareerState, clubId: string, kind: 'transfer' | 'loan'): void {
  const club = clubOf(data, clubId);
  state.clubId = clubId;
  state.contractClubId = clubId;
  state.activeLoan = null;
  state.seasonsAtClub = 0;
  state.player.isCaptain = false;
  state.player.meters.fanSupport = data.meters.meters.fanSupport.resetOnTransfer.to;
  log(state, kind, `Wechsel zu ${club.short}`, leagueOf(data, club).name);
}

function startLoan(data: GameData, state: CareerState, clubId: string): void {
  const parent = state.contractClubId ?? state.clubId!;
  const club = clubOf(data, clubId);
  state.activeLoan = { parentClubId: parent, loanClubId: clubId, returnYear: state.year + 1 };
  state.clubId = clubId;
  state.seasonsAtClub = 0;
  log(state, 'loan', `Leihe zu ${club.short}`, leagueOf(data, club).name);
}

function endLoanIfDue(data: GameData, state: CareerState): void {
  if (!state.activeLoan || state.year < state.activeLoan.returnYear) return;
  const parent = clubOf(data, state.activeLoan.parentClubId);
  state.clubId = parent.id;
  state.contractClubId = parent.id;
  state.activeLoan = null;
  state.seasonsAtClub = 0;
  log(state, 'transfer', `Rückkehr zu ${parent.short}`);
}

function executePendingTransfer(data: GameData, rng: Rng, state: CareerState): void {
  if (!state.pendingTransfer || !state.clubId) return;
  const scope = state.pendingTransfer.scope as TransferScope;
  const options: Parameters<typeof clubOffers>[3] = { scope, count: 1 };
  if (state.pendingTransfer.leagueStrengthMax !== undefined) {
    options.leagueStrengthMax = state.pendingTransfer.leagueStrengthMax;
  }
  const [club] = clubOffers(data, rng, state, options);
  state.pendingTransfer = null;
  if (club) joinClub(data, state, club.id, 'transfer');
}

// ---------------------------------------------------------- Abschluss

function retire(data: GameData, state: CareerState, atHome: boolean): void {
  state.retired = true;
  state.pending = null;
  const where = atHome ? ' in der Heimat' : state.clubId ? ` bei ${clubOf(data, state.clubId).short}` : '';
  log(state, 'retirement', `Karriereende${where}`);
}

// -------------------------------------------------------------- Helfer

function log(state: CareerState, type: TimelineEntry['type'], text: string, detail?: string): void {
  state.timeline.push({
    year: state.year,
    age: state.player.age,
    type,
    text,
    ...(detail ? { detail } : {}),
  });
}

export function titleName(data: GameData, id: string): string {
  return data.leagueById.get(id)?.name
    ?? data.cupById.get(id)?.name
    ?? data.competitions.club.find((c) => c.id === id)?.name
    ?? data.competitions.national.find((c) => c.id === id)?.name
    ?? id;
}

export function awardName(data: GameData, id: string): string {
  return data.competitions.individual.find((a) => a.id === id)?.name ?? id;
}

/** Alle Titel einer Karriere, gruppiert nach Wettbewerb. */
export function trophyCabinet(state: CareerState): Map<string, number> {
  const cabinet = new Map<string, number>();
  for (const season of state.seasons) {
    for (const id of [...season.titles, ...season.awards]) {
      cabinet.set(id, (cabinet.get(id) ?? 0) + 1);
    }
  }
  return cabinet;
}

/** Karrieresummen für die Abschlussansicht. */
export function careerTotals(state: CareerState) {
  return state.seasons.reduce(
    (totals, season) => ({
      appearances: totals.appearances + season.appearances,
      goals: totals.goals + season.goals,
      assists: totals.assists + season.assists,
      cleanSheets: totals.cleanSheets + season.cleanSheets,
      titles: totals.titles + season.titles.length,
      awards: totals.awards + season.awards.length,
      caps: totals.caps + season.nationalCaps,
      nationalGoals: totals.nationalGoals + season.nationalGoals,
      peakOverall: Math.max(totals.peakOverall, season.overall),
    }),
    { appearances: 0, goals: 0, assists: 0, cleanSheets: 0, titles: 0, awards: 0, caps: 0, nationalGoals: 0, peakOverall: 0 },
  );
}

export { countryOf, positionOf };
