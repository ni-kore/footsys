import { clubOf, countryOf, leagueOf, positionOf, type GameData } from './data';
import {
  buildAcademyDecision, buildCareerDecision, buildLoanDecision, buildPartnerDecision,
  buildRetirementDecision, buildTransferDecision, clubOffers, movesClub, resolveOption,
  rollRandomEvents,
} from './events';
import { collectFacts, collectSeasonFacts } from './facts';
import { buildDestinationDecision, buildEventDecision, interestOfferCount } from './events';
import { contractSeasons, partnerFits, partnerOf, partnerOffersNow } from './partners';
import {
  interpolate, marketValue, pickDevelopmentProfile, pickPotential, pickTemperament,
} from './progression';
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
      mediaPartnerUntil: null,
      kitSupplier: null,
      kitSupplierUntil: null,
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
    carried: { randomEvents: [], titles: [], awards: [] },
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
  // Im Sofortlauf wird nichts gefragt, auch nicht der erste Verein: die
  // Laufbahn ist fertig, sobald sie beginnt.
  if (options.mode === 'instant') simulateStep(data, rng, state);
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

  if (!resolveSet(data, rng, next, ids)) simulateStep(data, rng, next);
  next.rngState = rng.state;
  return next;
}

/**
 * Wendet die Antworten auf den anstehenden Satz an.
 *
 * Gibt zurück, ob daraus sofort die nächste Entscheidung folgt — die Frage
 * nach dem Ziel eines angestoßenen Wechsels. Dann wird nicht weitergerechnet.
 */
function resolveSet(data: GameData, rng: Rng, state: CareerState, ids: string[]): boolean {
  const set = state.pendingSet;
  const clubBefore = state.clubId;
  state.pendingSet = [];
  state.step += 1;

  for (const [index, decision] of set.entries()) {
    const optionId = ids[index];
    if (optionId === undefined) break;
    const option = decision.options.find((o) => o.id === optionId);
    if (!option) throw new Error('Unbekannte Option ' + optionId);
    applyDecision(data, rng, state, decision, option);
    if (state.retired) break;
  }

  // Wer sich in dieser Pause schon einen Verein ausgesucht hat, sucht sich
  // keinen zweiten: ein angestoßener Wechsel verfällt dann.
  if (state.clubId !== clubBefore) state.pendingTransfer = null;

  // Hat eine Wahl einen Wechsel ausgelöst, folgt zuerst die Frage, wohin.
  // Zugeteilt wird niemand.
  if (state.pendingTransfer && !state.retired) {
    const transfer = state.pendingTransfer;
    const destination = buildDestinationDecision(
      data, rng, state, transfer.scope as TransferScope, transfer.leagueStrengthMax, transfer.kind,
    );
    state.pendingTransfer = null;
    if (destination) {
      state.pendingSet = [destination];
      return true;
    }
  }

  return false;
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

    case 'loan_destination':
      startLoan(data, next, option.clubId!);
      break;

    case 'media_partner_offer':
    case 'kit_supplier_offer': {
      const partnerId = option.id.startsWith('partner:') ? option.id.slice(8) : null;
      const media = decision.eventId === 'media_partner_offer';
      const kind = media ? 'media' : 'kit';
      // Unterschrieben wird auf Jahre, nicht auf eine Saison: eine Marke
      // begleitet eine Karriere, sie fragt nicht jeden Sommer neu.
      const until = next.year + contractSeasons(data, rng, kind);

      if (partnerId) {
        const extended = partnerId === (media ? next.player.mediaPartner : next.player.kitSupplier);
        if (media) { next.player.mediaPartner = partnerId; next.player.mediaPartnerUntil = until; }
        else { next.player.kitSupplier = partnerId; next.player.kitSupplierUntil = until; }
        const name = data.partnerById.get(partnerId)?.name ?? partnerId;
        const verb = extended ? 'Extended with ' : media ? 'Signed with ' : 'Kitted out by ';
        log(next, 'decision', verb + name, until - next.year + ' seasons');
      } else {
        // Abgelehnt heißt beendet: wer nicht verlängert, steht ohne da.
        if (media) { next.player.mediaPartner = null; next.player.mediaPartnerUntil = null; }
        else { next.player.kitSupplier = null; next.player.kitSupplierUntil = null; }
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
            ...(decision.alternativePosition
              ? { alternativePosition: decision.alternativePosition }
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

  if (context) openBreak(data, rng, next, context, false);
  if (next.pendingSet.length === 0 && !next.retired) simulateStep(data, rng, next);
  next.rngState = rng.state;
  return next;
}

/**
 * Wickelt eine Pause ab.
 *
 * Was ohnehin passiert, passiert in jedem Rhythmus: eine Leihe läuft aus, ein
 * angestoßener Wechsel will ein Ziel, eine Laufbahn endet. `silent` heißt:
 * hier stehen keine Entscheidungen an, die Pause wird durchgerechnet.
 */
function openBreak(
  data: GameData, rng: Rng, state: CareerState,
  window: 'summer' | 'winter', silent: boolean,
): void {
  if (window === 'winter') {
    if (offerDestination(data, rng, state)) return;
    if (!silent) startDecisionSet(data, rng, state, 'winter');
    return;
  }

  endLoanIfDue(data, state);
  if (offerDestination(data, rng, state)) return;

  if (state.player.age >= data.progression.career.latestRetirementAge) {
    retire(data, state, false);
    return;
  }
  // Über das Ende der Karriere wird allein entschieden — und immer gefragt,
  // auch wenn die Pause sonst übersprungen würde.
  if (shouldOfferRetirement(data, state)) {
    state.pendingSet = [buildRetirementDecision(data, state)];
    return;
  }

  if (!silent) startDecisionSet(data, rng, state, 'summer');
}

// ------------------------------------------------------------ Ein Schritt

/** Hält die Simulation in der Winterpause an? */
function stopsInWinter(data: GameData, state: CareerState): boolean {
  return Boolean(data.progression.career.modes[state.mode].winterBreak);
}

/** Hält sie zum Saisonende an? */
function stopsAtSeasonEnd(data: GameData, state: CareerState): boolean {
  if (state.mode === 'instant') return false;
  const every = data.progression.career.modes[state.mode].seasonsPerStop as number;
  return every <= 1 || state.seasons.length % every === 0;
}

/**
 * Rechnet weiter, bis etwas ansteht.
 *
 * Im gewohnten Rhythmus ist das nach jeder Halbserie der Fall. In den
 * schnelleren Gangarten läuft die Schleife über Pausen hinweg durch, und im
 * Sofortlauf beantwortet die Engine sogar die Entscheidungen selbst — dann
 * hält sie erst am Karriereende an.
 */
function simulateStep(data: GameData, rng: Rng, state: CareerState): void {
  let guard = 0;

  while (guard++ < 5000) {
    if (state.retired || state.pendingReport || state.pendingKickoff) return;

    if (state.pendingSet.length > 0) {
      // Im Sofortlauf wählt niemand mehr: die Engine wirft für den Spieler.
      if (state.mode !== 'instant') return;
      resolveSet(data, rng, state, state.pendingSet.map((d) => autoPick(rng, d).id));
      continue;
    }

    if (!state.clubId) {
      state.pendingSet = [buildAcademyDecision(data, rng, state)];
      continue;
    }

    // Nur die allererste Saison wird von Hand angepfiffen: nach der
    // Jugendakademie soll man erst sehen, wo man gelandet ist. Danach tragen
    // die Entscheidungen von selbst in die nächste Spielzeit.
    if (
      state.half === 1 && !state.seasonStarted && state.seasons.length === 0
      && state.mode !== 'instant'
    ) {
      state.pendingKickoff = true;
      return;
    }

    const window = playHalf(data, rng, state);
    const stops = window === 'winter' ? stopsInWinter(data, state) : stopsAtSeasonEnd(data, state);

    if (stops) {
      state.reportContext = window;
      state.carried = { randomEvents: [], titles: [], awards: [] };
      return;
    }

    // Ungezeigt heißt nicht ungeschehen: der Bericht wandert in den nächsten.
    const report = state.pendingReport!;
    state.carried = {
      randomEvents: report.randomEvents,
      titles: report.titles,
      awards: report.awards,
    };
    state.pendingReport = null;
    // Übersprungen wird die Pause nur in den schnellen Gangarten. Im
    // Sofortlauf wird sehr wohl entschieden — nur eben nicht vom Spieler,
    // sonst bliebe eine Laufbahn ihr Leben lang beim ersten Verein.
    openBreak(data, rng, state, window, state.mode !== 'instant');
  }
}

/** Wie oft die Engine im Sofortlauf beim Verein bleibt, wenn sie darf. */
const AUTO_STAY_CHANCE = 0.65;

/**
 * Die Wahl der Engine, wenn niemand sonst wählt.
 *
 * Sie greift öfter zum Bleiben als zum Gehen — sonst zieht eine Laufbahn in
 * jedem Sommer weiter und käme auf zwanzig Vereine.
 */
function autoPick(rng: Rng, decision: PendingDecision): PendingOption {
  const stay = decision.options.find((option) => option.id === 'stay');
  const others = decision.options.filter((option) => option.id !== 'stay');
  if (stay && (others.length === 0 || rng.chance(AUTO_STAY_CHANCE))) return stay;
  return rng.pick(others.length > 0 ? others : decision.options);
}

/**
 * Rechnet genau eine Halbserie und legt ihren Bericht ab.
 *
 * Gibt zurück, welche Pause folgt. Ob deren Bericht gezeigt wird, entscheidet
 * der Rhythmus — hier entsteht er in jedem Fall.
 */
function playHalf(data: GameData, rng: Rng, state: CareerState): 'summer' | 'winter' {
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
      randomEvents: [
        ...state.carried.randomEvents,
        ...randoms.map((r) => ({
          id: r.event.id, title: r.event.title, text: r.text, tone: r.event.tone,
        })),
      ],
      titles: state.carried.titles,
      awards: state.carried.awards,
      nationalCaps: state.currentSeasonCaps,
      nationalGoals: state.currentSeasonNationalGoals,
    };
    state.half = 2;
    return 'winter';
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
    randomEvents: [
      ...state.carried.randomEvents,
      ...randoms.map((r) => ({
        id: r.event.id, title: r.event.title, text: r.text, tone: r.event.tone,
      })),
    ],
    titles: [...state.carried.titles, ...outcome.titles],
    awards: [...state.carried.awards, ...outcome.awards],
    nationalCaps: seasonCaps,
    nationalGoals: seasonNationalGoals,
  };

  state.currentSeasonHalves = [];
  state.currentSeasonCaps = 0;
  state.currentSeasonNationalGoals = 0;
  state.currentSeasonNationalAssists = 0;
  state.half = 1;
  state.seasonStarted = false;
  state.year += 1;
  state.seasonsAtClub += 1;
  return 'summer';
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
        countryCode: code,
        tag: code,
        subtitle: 'World ranking tier ' + country.strength,
      };
    }),
  };
}

/**
 * Wie viel eine Pause neben dem Vereinsangebot noch bringt.
 *
 * Nicht jede Pause ist gleich voll: mal steht nur der Wechsel an, mal kommt
 * das halbe Leben dazwischen. Das Angebot selbst zählt hier nicht mit — es
 * ist die Frage, die eine Karriere trägt, und kommt in jedem Sommer.
 */
const DECISION_COUNT_WEIGHTS: [number, number][] = [[0, 28], [1, 40], [2, 32]];

function drawDecisionCount(rng: Rng): number {
  return rng.weighted(DECISION_COUNT_WEIGHTS.map(([count, weight]) => ({ item: count, weight })));
}

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
  const limit = drawDecisionCount(rng);
  let optional = 0;

  // In einer Pause wechselt man höchstens einmal den Verein. Steht schon eine
  // Entscheidung an, die den Klub ändern kann, bleibt jede weitere draußen —
  // sonst wählt man zweimal hintereinander aus und die erste Wahl war umsonst.
  let clubMoveTaken = false;

  // Was fällig ist, kommt auch dann, wenn die Pause sonst ruhig bleibt: die
  // Folge einer früheren Wahl und das Angebot eines Vereins warten nicht.
  const add = (decision: PendingDecision | null | undefined, due = false): boolean => {
    if (!decision || taken.has(decision.eventId)) return false;
    if (!due && optional >= limit) return false;
    const movesClubs = movesClub(data, decision);
    if (movesClubs && clubMoveTaken) return false;
    if (movesClubs) clubMoveTaken = true;
    if (!due) optional += 1;
    taken.add(decision.eventId);
    set.push(decision);
    return true;
  };

  // Was eine frühere Wahl angestoßen hat, kommt zuerst: es ist fällig.
  for (const due of dueScheduled(state)) {
    const decision = buildScheduledDecision(data, rng, state, due.eventId);
    if (add(decision, true)) state.scheduledEvents = state.scheduledEvents.filter((e) => e !== due);
  }

  // Das Vereinsangebot steht über allem anderen: es ist der eine Punkt, an
  // dem eine Karriere jedes Jahr eine Richtung bekommt.
  if (window === 'summer') {
    const summer = dueSummerDecisions(data, rng, state, !clubMoveTaken);
    add(summer.offer, true);
    for (const decision of summer.others) add(decision);
  }

  // Dann, was aus dem Bericht folgt.
  for (let attempt = 0; optional < limit && attempt < 6; attempt += 1) {
    if (!add(buildCareerDecision(data, rng, state, window, { onlyTriggered: true, exclude: taken }))) break;
  }

  // Auffüllen: zuerst Ungespieltes, dann Wiederholungen, zuletzt ein
  // Vereinsangebot als sichere Bank.
  for (let attempt = 0; optional < limit && attempt < 12; attempt += 1) {
    const repeatable = attempt >= 4;
    const filled = add(buildCareerDecision(data, rng, state, window, { repeatable, exclude: taken }));
    if (!filled && attempt >= 8) add(buildTransferDecision(data, rng, state));
  }

  state.pendingSet = set;
}

/**
 * Was im Sommer ohnehin ansteht.
 *
 * `offer` ist der Verein, der anklopft — die eine Frage, die in jedem Sommer
 * gestellt wird und deshalb vor allem anderen steht. `others` ist, was sich
 * sonst von selbst meldet und nur mitkommt, wenn in der Pause Platz ist.
 *
 * `allowClubMove` ist falsch, wenn der Satz schon eine Entscheidung enthält,
 * die den Verein ändern kann. Leihe und Angebot bleiben dann ganz außen vor —
 * samt ihrer Zähler, damit sie nicht verfallen, sondern später kommen.
 */
function dueSummerDecisions(
  data: GameData, rng: Rng, state: CareerState, allowClubMove: boolean,
): { offer: PendingDecision | null; others: PendingDecision[] } {
  const others: PendingDecision[] = [];

  const association = buildAssociationDecision(data, state);
  if (association) others.push(association);

  // Marken melden sich von selbst, wenn man auffällt. Passiert das nicht,
  // geht es ohne sie weiter: Partner sind ein Zusatz, keine Stufe.
  for (const kind of ['media', 'kit'] as const) {
    if (!partnerOffersNow(data, rng, state, kind)) continue;
    const decision = buildPartnerDecision(data, rng, state, kind);
    if (decision) others.push(decision);
  }

  const lastSeason = state.seasons[state.seasons.length - 1];
  const lowMinutes = lastSeason?.role === 'substitute' || lastSeason?.role === 'low_rotation';

  if (!allowClubMove) return { offer: null, others };

  // Junge Spieler ohne Einsatzzeit bekommen zuerst ein Leihangebot.
  if (state.player.age <= 20 && lowMinutes && !state.activeLoan && rng.chance(LOAN_OFFER_CHANCE)) {
    return { offer: buildLoanDecision(data, rng, state), others };
  }

  // In jedem Sommer liegt ein Angebot auf dem Tisch — bleiben oder gehen ist
  // die Frage, die eine Karriere trägt. Nur wen gerade niemand auf dem Zettel
  // hat, bei dem klingelt es auch mal nicht.
  if (rng.chance(quietMarketChance(data, state))) return { offer: null, others };

  // Wer eine große Anhängerschaft hat, wird vom Verein gehalten: es liegen
  // weniger fremde Angebote auf dem Tisch.
  const count = clubHoldsOn(data, state)
    ? (data.progression.fans.clubHoldsFrom.reducedOffers as number)
    : interestOfferCount(data, state);

  return { offer: buildTransferDecision(data, rng, state, 'matching', count), others };
}

/** Wie wahrscheinlich es ist, dass in diesem Sommer niemand anfragt. */
function quietMarketChance(data: GameData, state: CareerState): number {
  const table = data.progression.offers.quietMarketByInterest as [number, number][];
  return interpolate(table, state.player.marketInterest);
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
  dropUnfittingPartners(data, state);
}

/**
 * Ein Vereinssender bleibt beim Verein, nicht beim Spieler.
 *
 * Wer geht, verliert ihn — der Kanal dreht weiter über die Mannschaft, die er
 * begleitet. Landesweite und internationale Marken bleiben.
 */
function dropUnfittingPartners(data: GameData, state: CareerState): void {
  for (const kind of ['media', 'kit'] as const) {
    const partner = partnerOf(data, state, kind);
    if (!partner || partnerFits(data, state, partner)) continue;
    if (kind === 'media') { state.player.mediaPartner = null; state.player.mediaPartnerUntil = null; }
    else { state.player.kitSupplier = null; state.player.kitSupplierUntil = null; }
    log(state, 'decision', partner.name + ' stays behind');
  }
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
    data, rng, state, transfer.scope as TransferScope, transfer.leagueStrengthMax, transfer.kind,
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
