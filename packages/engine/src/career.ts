import { clubOf, countryOf, leagueOf, positionOf, type GameData } from './data';
import {
  buildAcademyDecision, buildCareerDecision, buildLoanDecision, buildPartnerDecision,
  buildRetirementDecision, buildTransferDecision, clubOffers, resolveOption, rollRandomEvents,
} from './events';
import { collectFacts, collectSeasonFacts } from './facts';
import { buildDestinationDecision, buildEventDecision, interestOfferCount } from './events';
import { partnerOffersNow } from './partners';
import { marketValue, pickDevelopmentProfile, pickPotential, pickTemperament } from './progression';
import { callingAssociations, canStillSwitch } from './national-team';
import { Rng } from './rng';
import { ageEffects, closeSeason, simulateHalf } from './simulation';
import { clubHoldsOn, updateFans } from './fans';
import type {
  CareerState, GameMode, PendingDecision, PendingOption, PeriodReport, PlayerIdentity,
  TimelineEntry, TransferScope,
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
      mediaPartner: null,
      kitSupplier: null,
      marketInterest: data.progression.marketInterest.start as number,
      caps: 0,
      nationalGoals: 0,
      nationalAssists: 0,
      nationalFans: 0,
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
    currentSeasonNationalAssists: 0,
    continentalEntry: 'none',
    facts: [],
    scheduledEvents: [],
    seasons: [],
    pendingSet: [],
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
  state.pendingSet = [buildAcademyDecision(data, rng, state)];
  state.rngState = rng.state;
  return state;
}

/**
 * Beantwortet die anstehenden Entscheidungen und simuliert eine Halbserie.
 *
 * Ein einzelner Bezeichner beantwortet eine einzelne Entscheidung, eine Liste
 * den ganzen Satz einer Pause. Bis hierher lässt sich jede Wahl noch ändern;
 * erst dieser Aufruf macht sie verbindlich.
 */
export function decide(
  data: GameData, state: CareerState, choice: string | string[],
): CareerState {
  if (state.pendingSet.length === 0) throw new Error('Es steht keine Entscheidung an');
  const ids = Array.isArray(choice) ? choice : [choice];

  const next = structuredClone(state);
  const rng = new Rng(next.rngState);
  const set = next.pendingSet;
  next.pendingSet = [];
  next.step += 1;

  for (const [index, decision] of set.entries()) {
    const optionId = ids[index];
    if (optionId === undefined) break;
    const option = decision.options.find((o) => o.id === optionId);
    if (!option) throw new Error('Unbekannte Option ' + optionId);
    applyDecision(data, rng, next, decision, option);
    if (next.retired) break;
  }

  // Hat eine Wahl einen Wechsel ausgelöst, folgt zuerst die Frage, wohin.
  // Zugeteilt wird niemand.
  if (next.pendingTransfer && !next.retired) {
    const transfer = next.pendingTransfer;
    const destination = buildDestinationDecision(
      data, rng, next, transfer.scope as TransferScope, transfer.leagueStrengthMax,
    );
    next.pendingTransfer = null;
    if (destination) {
      next.pendingSet = [destination];
      next.rngState = rng.state;
      return next;
    }
  }

  simulateStep(data, rng, next);
  next.rngState = rng.state;
  return next;
}

/** Wendet genau eine getroffene Entscheidung an. */
function applyDecision(
  data: GameData, rng: Rng, next: CareerState,
  decision: PendingDecision, option: PendingOption,
): void {

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

    case 'transfer_destination':
      joinClub(data, next, option.clubId!, 'transfer');
      break;

    case 'media_partner_offer':
    case 'kit_supplier_offer': {
      const partnerId = option.id.startsWith('partner:') ? option.id.slice(8) : null;
      const media = decision.eventId === 'media_partner_offer';
      if (partnerId) {
        if (media) next.player.mediaPartner = partnerId;
        else next.player.kitSupplier = partnerId;
        const name = data.partnerById.get(partnerId)?.name ?? partnerId;
        log(next, 'decision', (media ? 'Signed with ' : 'Kitted out by ') + name);
      }
      break;
    }

    case 'national_team_choice':
      next.player.nationalTeam = option.id.replace('association:', '');
      log(next, 'decision', 'Chose to represent ' + countryOf(data, next.player.nationalTeam).name.en);
      break;

    case 'retirement':
      if (option.id !== 'one_more_year') {
        retire(data, next, option.id === 'retire_at_home');
        return;
      }
      break;

    default: {
      const event = data.careerEventById.get(decision.eventId);
      if (event) {
        const eventOption = event.options.find((o) => o.id === option.id);
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
    if (offerDestination(data, rng, next)) {
      next.rngState = rng.state;
      return next;
    }
    startDecisionSet(data, rng, next, 'winter');
  } else if (context === 'summer') {
    endLoanIfDue(data, next);
    if (offerDestination(data, rng, next)) {
      next.rngState = rng.state;
      return next;
    }

    if (shouldOfferRetirement(data, next)) {
      // Über das Ende der Karriere wird allein entschieden.
      next.pendingSet = [buildRetirementDecision(data, next)];
    } else if (next.player.age >= data.progression.career.latestRetirementAge) {
      retire(data, next, false);
    } else {
      startDecisionSet(data, rng, next, 'summer');
    }
  }

  if (next.pendingSet.length === 0 && !next.retired) simulateStep(data, rng, next);
  next.rngState = rng.state;
  return next;
}

// ------------------------------------------------------------ Ein Schritt

/** Rechnet genau eine Halbserie und legt den Bericht ab. */
function simulateStep(data: GameData, rng: Rng, state: CareerState): void {
  if (state.retired || state.pendingSet.length > 0 || state.pendingReport || state.pendingKickoff) return;
  if (!state.clubId) {
    state.pendingSet = [buildAcademyDecision(data, rng, state)];
    return;
  }

  // Nur die allererste Saison wird von Hand angepfiffen: nach der
  // Jugendakademie soll man erst sehen, wo man gelandet ist. Danach tragen die
  // Entscheidungen von selbst in die nächste Spielzeit.
  if (state.half === 1 && !state.seasonStarted && state.seasons.length === 0) {
    state.pendingKickoff = true;
    return;
  }

  const overallBefore = state.player.overall;
  const marketValueBefore = state.player.marketValue;
  const fansBefore = state.player.fans;

  const half = simulateHalf(data, rng, state);
  state.currentSeasonHalves.push(half);
  state.facts = collectFacts(data, state, half);
  ageEffects(state);
  countDownScheduled(state);

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
  state.facts = [...state.facts, ...collectSeasonFacts(outcome.titles)];
  updateMarketInterest(data, state, outcome);
  updateFans(data, state, half, outcome.titles.length, outcome.awards.length);
  outcome.record.fans = state.player.fans;
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
  state.currentSeasonNationalAssists = 0;
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

/** So viele Entscheidungen stehen in jeder Pause an. */
const DECISIONS_PER_BREAK = 3;

/**
 * Legt den Satz Entscheidungen einer Pause an.
 *
 * Erst kommt, was ohnehin ansteht: die Wahl des Verbands, ein Angebot einer
 * Marke, eine Leihe, ein Vereinswechsel. Aufgefüllt wird mit dem, was das
 * Leben sonst so bringt. Reicht der Vorrat an ungespielten Ereignissen nicht,
 * dürfen alte wiederkommen: über zwanzig Jahre hinweg wiederholt sich manches.
 */
function startDecisionSet(
  data: GameData, rng: Rng, state: CareerState, window: 'summer' | 'winter',
): void {
  const set: PendingDecision[] = [];
  const taken = new Set<string>();

  const add = (decision: PendingDecision | null | undefined): boolean => {
    if (!decision || taken.has(decision.eventId)) return false;
    taken.add(decision.eventId);
    set.push(decision);
    return true;
  };

  // Was eine frühere Wahl angestoßen hat, kommt zuerst: es ist fällig.
  for (const due of dueScheduled(state)) {
    const decision = buildScheduledDecision(data, rng, state, due.eventId);
    if (add(decision)) state.scheduledEvents = state.scheduledEvents.filter((e) => e !== due);
  }

  // Dann, was aus dem Bericht folgt.
  for (let attempt = 0; set.length < DECISIONS_PER_BREAK && attempt < 6; attempt += 1) {
    if (!add(buildCareerDecision(data, rng, state, window, { onlyTriggered: true, exclude: taken }))) break;
  }

  if (window === 'summer') for (const decision of dueSummerDecisions(data, rng, state)) add(decision);

  // Auffüllen: zuerst Ungespieltes, dann Wiederholungen, zuletzt ein
  // Vereinsangebot als sichere Bank.
  for (let attempt = 0; set.length < DECISIONS_PER_BREAK && attempt < 12; attempt += 1) {
    const repeatable = attempt >= 4;
    const filled = add(buildCareerDecision(data, rng, state, window, { repeatable, exclude: taken }));
    if (!filled && attempt >= 8) add(buildTransferDecision(data, rng, state));
  }

  state.pendingSet = set;
}

/** Was im Sommer ohnehin ansteht, in der Reihenfolge seiner Dringlichkeit. */
function dueSummerDecisions(data: GameData, rng: Rng, state: CareerState): PendingDecision[] {
  const due: PendingDecision[] = [];

  const association = buildAssociationDecision(data, state);
  if (association) due.push(association);

  // Marken melden sich von selbst, wenn man auffällt. Passiert das nicht,
  // geht es ohne sie weiter: Partner sind ein Zusatz, keine Stufe.
  for (const kind of ['media', 'kit'] as const) {
    if (!partnerOffersNow(data, rng, state, kind)) continue;
    const decision = buildPartnerDecision(data, rng, state, kind);
    if (decision) due.push(decision);
  }

  const periodLength = data.progression.career.modes[state.mode].periodLengthSeasons as number;
  const lastSeason = state.seasons[state.seasons.length - 1];
  const lowMinutes = lastSeason?.role === 'substitute' || lastSeason?.role === 'low_rotation';

  // Junge Spieler ohne Einsatzzeit bekommen zuerst ein Leihangebot.
  if (state.player.age <= 20 && lowMinutes && !state.activeLoan && rng.chance(LOAN_OFFER_CHANCE)) {
    state.seasonsSinceMajorDecision = 0;
    due.push(buildLoanDecision(data, rng, state));
  } else if (state.seasonsSinceMajorDecision >= periodLength) {
    state.seasonsSinceMajorDecision = 0;
    // Wer eine große Anhängerschaft hat, wird vom Verein gehalten: es liegen
    // weniger fremde Angebote auf dem Tisch.
    const offers = clubHoldsOn(data, state)
      ? (data.progression.fans.clubHoldsFrom.reducedOffers as number)
      : interestOfferCount(data, state);
    due.push(buildTransferDecision(data, rng, state, 'matching', offers));
  }

  return due;
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

/**
 * Steht ein Wechsel an, kommt zuerst die Frage, wohin. Erst wenn dabei nichts
 * Passendes herauskommt, wird zugeteilt.
 */
function offerDestination(data: GameData, rng: Rng, state: CareerState): boolean {
  if (!state.pendingTransfer || state.retired) return false;

  const transfer = state.pendingTransfer;
  const decision = buildDestinationDecision(
    data, rng, state, transfer.scope as TransferScope, transfer.leagueStrengthMax,
  );
  state.pendingTransfer = null;
  if (!decision) return false;

  state.pendingSet = [decision];
  return true;
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
  state.pendingSet = [];
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

/** Zählt angestoßene Ereignisse eine Halbserie herunter. */
function countDownScheduled(state: CareerState): void {
  state.scheduledEvents = state.scheduledEvents.map(
    (entry) => ({ ...entry, halvesRemaining: entry.halvesRemaining - 1 }),
  );
}

/** Was jetzt fällig ist. */
function dueScheduled(state: CareerState) {
  return state.scheduledEvents.filter((entry) => entry.halvesRemaining <= 0);
}

/** Baut die Entscheidung zu einem angestoßenen Ereignis. */
function buildScheduledDecision(
  data: GameData, rng: Rng, state: CareerState, eventId: string,
): PendingDecision | null {
  const event = data.careerEventById.get(eventId);
  if (!event) return null;
  return buildEventDecision(data, rng, state, event);
}

/**
 * Wie begehrt man gerade ist.
 *
 * Das Interesse verfällt langsam und wird von Leistung, Titeln, Auszeichnungen
 * und Länderspielen gespeist. Es entscheidet, wie viele Vereine im Sommer
 * anklopfen und von welcher Stufe sie kommen.
 */
function updateMarketInterest(
  data: GameData, state: CareerState,
  outcome: { record: { goals: number; assists: number; nationalCaps: number }; titles: string[]; awards: string[] },
): void {
  const config = data.progression.marketInterest;
  const club = state.clubId ? clubOf(data, state.clubId) : null;
  const starterLevel = club
    ? ((data.progression.roles.minOverallForStarter as Record<string, number>)[
        String(club.reputation.domestic)
      ] ?? 70)
    : 70;

  let interest = state.player.marketInterest - (config.decayPerSeason as number);
  interest += outcome.record.goals * (config.perGoal as number);
  interest += outcome.record.assists * (config.perAssist as number);
  interest += outcome.titles.length * (config.perTitle as number);
  interest += outcome.awards.length * (config.perAward as number);
  interest += outcome.record.nationalCaps * (config.perCap as number);
  interest += (state.player.overall - starterLevel) * (config.overallWeight as number);

  state.player.marketInterest = Math.max(0, Math.min(100, Math.round(interest)));
}

export function titleName(data: GameData, id: string): string {
  return data.leagueById.get(id)?.name
    ?? data.cupById.get(id)?.name
    ?? data.competitions.club.find((c) => c.id === id)?.name
    ?? data.competitions.national.find((c) => c.id === id)?.name
    ?? id;
}

/** Wurde dieser Titel mit der Nationalmannschaft gewonnen? */
export function isNationalTitle(data: GameData, id: string): boolean {
  return data.competitions.national.some((c) => c.id === id);
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

/**
 * Karrieresummen einschließlich der laufenden Saison. Die Spielerkarte zeigt
 * damit auch mitten in der Spielzeit, wo eine Karriere gerade steht.
 */
export function liveTotals(state: CareerState) {
  const totals = careerTotals(state);
  for (const half of state.currentSeasonHalves) {
    totals.appearances += half.appearances;
    totals.goals += half.goals;
    totals.assists += half.assists;
    totals.cleanSheets += half.cleanSheets;
  }
  return totals;
}

export type { PeriodReport };
export { countryOf, positionOf };
