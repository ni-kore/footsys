import { clubOf, countryOf, leagueOf, positionOf, type GameData } from './data';
import {
  buildAcademyDecision, buildCareerDecision, buildLoanDecision, buildRetirementDecision,
  buildTransferDecision, clubOffers, resolveOption, rollRandomEvents,
} from './events';
import { marketValue, pickDevelopmentProfile, pickPotential, pickTemperament } from './progression';
import { callingAssociations, canStillSwitch } from './national-team';
import { Rng } from './rng';
import { ageEffects, closeSeason, simulateHalf } from './simulation';
import { clubHoldsOn, updateFans } from './fans';
import type {
  CareerState, GameMode, PeriodReport, PlayerIdentity, TimelineEntry, TransferScope,
} from './types';

/**
 * Der Ablauf einer Karriere.
 *
 * Die Engine geht in einzelnen Schritten vor und hält nach jedem an. Ein
 * Schritt ist entweder eine simulierte Halbserie, deren Bericht auf
 * Bestätigung wartet, oder eine Entscheidung, die auf eine Wahl wartet. Nie
 * laufen mehrere Schritte auf einmal durch — die Oberfläche zeigt jeden
 * Zwischenstand vollständig an.
 *
 *   createCareer()      → erste Entscheidung (Jugendangebot)
 *   decide(optionId)    → simuliert eine Halbserie, liefert deren Bericht
 *   acknowledge()       → schließt den Bericht, liefert Entscheidung oder nächsten Bericht
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
  const egg = data.progression.easterEgg;

  // Ein Name, ein Ausnahmespieler.
  const legend = options.identity.surname.trim().toUpperCase() === String(egg.name).toUpperCase();
  const weakFoot = legend ? (egg.weakFoot as 1 | 2 | 3 | 4 | 5) : options.identity.weakFoot;

  const developmentProfile = legend
    ? (egg.developmentProfile as ReturnType<typeof pickDevelopmentProfile>)
    : pickDevelopmentProfile(rng, data, options.identity.position);

  const state: CareerState = {
    seed: options.seed,
    rngState: 0,
    step: 0,
    mode: options.mode,
    year: options.startYear ?? 2026,
    half: 1,
    player: {
      ...options.identity,
      weakFoot,
      age: career.startAge,
      overall: legend ? (egg.startOverall as number) : career.startOverall,
      potential: legend
        ? (egg.potential as number)
        : pickPotential(rng, data, developmentProfile, options.identity.strongFoot, weakFoot),
      marketValue: 0,
      developmentProfile,
      isCaptain: false,
      meters: {
        morale: meters.morale.start,
        fanSupport: meters.fanSupport.start,
        mediaRelation: meters.mediaRelation.start,
      },
      fans: data.progression.fans.start as number,
      caps: 0,
      nationalGoals: 0,
      temperament: legend
        ? (egg.temperament as number)
        : pickTemperament(data, options.identity.strongFoot, weakFoot),
      nationalTeam: null,
      firstSeniorCapAge: null,
      seasonsInCountry: {},
      legend,
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
    pendingReport: null,
    pendingKickoff: false,
    seasonStarted: false,
    reportContext: null,
    pendingTransfer: null,
    activeEffects: [],
    deferredOverall: [],
    eventHistory: [],
    randomEventHistory: [],
    suspensionHalves: 0,
    lastInjuryYear: null,
    lastCoachBias: 0.5,
    lastFormationFit: 1,
    timeline: [],
    retired: false,
  };

  state.player.marketValue = marketValue(data, rng, state.player.overall, state.player.age);
  state.pending = buildAcademyDecision(data, rng, state);
  state.rngState = rng.state;
  return state;
}

/** Verarbeitet eine Entscheidung und simuliert genau eine Halbserie weiter. */
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

    case 'national_team_choice':
      next.player.nationalTeam = option.id.replace('association:', '');
      log(next, 'decision', 'Chose to represent ' + countryOf(data, next.player.nationalTeam).name.en);
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
          resolveOption(data, rng, next, event, eventOption, decision.variantKey, {
            ...(decision.alternativeCountry
              ? { alternativeCountry: decision.alternativeCountry }
              : {}),
          });
          next.eventHistory.push({ id: event.id, year: next.year });
          log(next, 'decision', event.title.en + ': ' + eventOption.label.en);
        }
      }
    }
  }

  executePendingTransfer(data, rng, next);
  simulateStep(data, rng, next);
  next.rngState = rng.state;
  return next;
}

/** Pfeift die Saison an und rechnet die Hinrunde. */
export function kickOff(data: GameData, state: CareerState): CareerState {
  if (!state.pendingKickoff) return state;
  const next = structuredClone(state);
  const rng = new Rng(next.rngState);

  next.pendingKickoff = false;
  next.seasonStarted = true;
  simulateStep(data, rng, next);

  next.rngState = rng.state;
  return next;
}

/**
 * Schließt einen Bericht ab. Danach steht entweder eine Entscheidung an oder
 * die nächste Halbserie wird gerechnet.
 */
export function acknowledge(data: GameData, state: CareerState): CareerState {
  if (!state.pendingReport) return state;
  const next = structuredClone(state);
  const rng = new Rng(next.rngState);

  const context = next.reportContext;
  next.pendingReport = null;
  next.reportContext = null;

  if (context === 'winter') {
    executePendingTransfer(data, rng, next);
    if (rng.chance(WINTER_DECISION_CHANCE)) {
      next.pending = buildCareerDecision(data, rng, next, 'winter');
    }
  } else if (context === 'summer') {
    endLoanIfDue(data, next);
    executePendingTransfer(data, rng, next);

    if (shouldOfferRetirement(data, next)) {
      next.pending = buildRetirementDecision(data, next);
    } else if (next.player.age >= data.progression.career.latestRetirementAge) {
      retire(data, next, false);
    } else {
      next.pending = buildSummerDecision(data, rng, next);
    }
  }

  if (!next.pending && !next.retired) simulateStep(data, rng, next);
  next.rngState = rng.state;
  return next;
}

// ------------------------------------------------------------ Ein Schritt

/** Rechnet genau eine Halbserie und legt den Bericht ab. */
function simulateStep(data: GameData, rng: Rng, state: CareerState): void {
  if (state.retired || state.pending || state.pendingReport || state.pendingKickoff) return;
  if (!state.clubId) {
    state.pending = buildAcademyDecision(data, rng, state);
    return;
  }

  // Eine neue Saison läuft nicht von selbst los. Wer gerade einen Verein
  // gewählt hat, soll erst sehen, wo er gelandet ist.
  if (state.half === 1 && !state.seasonStarted) {
    state.pendingKickoff = true;
    return;
  }

  const overallBefore = state.player.overall;
  const marketValueBefore = state.player.marketValue;
  const fansBefore = state.player.fans;

  const half = simulateHalf(data, rng, state);
  state.currentSeasonHalves.push(half);
  ageEffects(state);

  const club = clubOf(data, half.clubId);
  const base = {
    year: state.year,
    half: state.half,
    clubId: half.clubId,
    leagueId: leagueOf(data, club).id,
    role: half.role,
    appearances: half.appearances,
    goals: half.goals,
    assists: half.assists,
    cleanSheets: half.cleanSheets,
    age: state.player.age,
    position: state.player.position,
    coachBias: state.lastCoachBias,
    formationFit: state.lastFormationFit,
    fansBefore,
    fansAfter: state.player.fans,
  };

  if (state.half === 1) {
    updateFans(data, state, half);
    const randoms = rollRandomEvents(data, rng, state, 'winter');
    half.randomEventIds = randoms.map((r) => r.event.id);
    for (const r of randoms) log(state, 'random_event', r.event.title.en, r.text);

    state.pendingReport = {
      ...base,
      fansAfter: state.player.fans,
      kind: 'half',
      overallBefore,
      overallAfter: state.player.overall,
      marketValueBefore,
      marketValueAfter: state.player.marketValue,
      randomEvents: randoms.map((r) => ({
        id: r.event.id, title: r.event.title, text: r.text, tone: r.event.tone,
      })),
      titles: [],
      awards: [],
      nationalCaps: state.currentSeasonCaps,
      nationalGoals: state.currentSeasonNationalGoals,
    };
    state.reportContext = 'winter';
    state.half = 2;
    return;
  }

  const randoms = rollRandomEvents(data, rng, state, 'season_end');
  half.randomEventIds = randoms.map((r) => r.event.id);
  for (const r of randoms) log(state, 'random_event', r.event.title.en, r.text);

  const seasonCaps = state.currentSeasonCaps;
  const seasonNationalGoals = state.currentSeasonNationalGoals;
  const outcome = closeSeason(data, rng, state);
  updateFans(data, state, half, outcome.titles.length, outcome.awards.length);
  state.seasons.push(outcome.record);
  for (const title of outcome.titles) log(state, 'title', titleName(data, title));
  for (const award of outcome.awards) log(state, 'award', awardName(data, award));

  state.pendingReport = {
    ...base,
    fansAfter: state.player.fans,
    kind: 'season',
    appearances: outcome.record.appearances,
    goals: outcome.record.goals,
    assists: outcome.record.assists,
    cleanSheets: outcome.record.cleanSheets,
    overallBefore,
    overallAfter: state.player.overall,
    marketValueBefore,
    marketValueAfter: state.player.marketValue,
    randomEvents: randoms.map((r) => ({
      id: r.event.id, title: r.event.title, text: r.text, tone: r.event.tone,
    })),
    titles: outcome.titles,
    awards: outcome.awards,
    nationalCaps: seasonCaps,
    nationalGoals: seasonNationalGoals,
  };
  state.reportContext = 'summer';

  state.currentSeasonHalves = [];
  state.currentSeasonCaps = 0;
  state.currentSeasonNationalGoals = 0;
  state.half = 1;
  state.seasonStarted = false;
  state.year += 1;
  state.seasonsAtClub += 1;
  state.seasonsSinceMajorDecision += 1;
}

/**
 * Rufen zwei Verbände gleichzeitig an und ist die Wahl noch offen, entscheidet
 * der Spieler — das geht jeder anderen Sommerentscheidung vor.
 */
function buildAssociationDecision(data: GameData, state: CareerState) {
  if (!canStillSwitch(data, state)) return null;

  const calling = callingAssociations(data, state);
  if (calling.length < 2) return null;
  if (state.player.nationalTeam && calling[0] === state.player.nationalTeam) return null;

  const event = data.events.structural.find((e) => e.id === 'national_team_choice');
  if (!event) return null;

  return {
    kind: 'structural' as const,
    eventId: 'national_team_choice',
    window: 'summer' as const,
    title: event.title,
    text: event.text.en,
    options: calling.map((code) => {
      const country = countryOf(data, code);
      return {
        id: 'association:' + code,
        label: { de: country.name.de, en: country.name.en },
        subtitle: 'World ranking tier ' + country.strength,
      };
    }),
  };
}

function buildSummerDecision(data: GameData, rng: Rng, state: CareerState) {
  const association = buildAssociationDecision(data, state);
  if (association) return association;

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
    // Wer eine große Anhängerschaft hat, wird vom Verein gehalten: es liegen
    // weniger fremde Angebote auf dem Tisch.
    const offers = clubHoldsOn(data, state)
      ? (data.progression.fans.clubHoldsFrom.reducedOffers as number)
      : 3;
    return buildTransferDecision(data, rng, state, 'matching', offers);
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
  log(state, kind, 'Signed for ' + club.short, leagueOf(data, club).name);
}

function startLoan(data: GameData, state: CareerState, clubId: string): void {
  const parent = state.contractClubId ?? state.clubId!;
  const club = clubOf(data, clubId);
  state.activeLoan = { parentClubId: parent, loanClubId: clubId, returnYear: state.year + 1 };
  state.clubId = clubId;
  state.seasonsAtClub = 0;
  log(state, 'loan', 'On loan at ' + club.short, leagueOf(data, club).name);
}

function endLoanIfDue(data: GameData, state: CareerState): void {
  if (!state.activeLoan || state.year < state.activeLoan.returnYear) return;
  const parent = clubOf(data, state.activeLoan.parentClubId);
  state.clubId = parent.id;
  state.contractClubId = parent.id;
  state.activeLoan = null;
  state.seasonsAtClub = 0;
  log(state, 'transfer', 'Back at ' + parent.short);
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
  state.pendingReport = null;
  const where = atHome ? ' back home' : state.clubId ? ' at ' + clubOf(data, state.clubId).short : '';
  log(state, 'retirement', 'Retired' + where);
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

export type { PeriodReport };
export { countryOf, positionOf };
