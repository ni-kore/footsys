import {
  clubOf, clubsInConfederation, clubsInCountry, countryOf, countryOfClub, leagueAtTier, leagueOf,
  positionOf, type GameData,
} from './data';
import { meterFactor } from './meters';
import { optionSummary } from './outcome';
import { LOCALES, tr } from './i18n';
import { offerReputationBonus, partnerFits, partnerOf, partnerOffers } from './partners';
import { clamp, clampOverall, interpolate, roleAtLeast } from './progression';
import { collectEffects, currentRole, isEligibleForNationalTeam } from './simulation';
import type { Rng } from './rng';
import type {
  CareerEvent, CareerState, Club, CountryCode, EventModifiers, EventOption, EventRequirements,
  EventVariant, Locale, LocalizedOutcome, LocalizedText, PartnerKind, PendingDecision,
  PendingOption, PositionId, RandomEvent, ReputationLevel, TransferKind, TransferScope,
} from './types';

// ------------------------------------------------- Mehrsprachige Bausteine

/** Kurzschreibweise fuer einen Text in allen drei Sprachen. */
const L = (en: string, de: string, es: string): LocalizedText => ({ en, de, es });
/** Ein Eigenname traegt in jeder Sprache denselben Wortlaut. */
const proper = (name: string): LocalizedText => ({ en: name, de: name, es: name });

const TAG_STAY = L('Stay', 'Bleiben', 'Quedarse');
const TAG_MOVE = L('Move', 'Wechseln', 'Fichar');
const TAG_EXTEND = L('Extend', 'Verlaengern', 'Renovar');
const TAG_LOAN = L('On loan', 'Leihe', 'Cesion');
const LABEL_DECLINE = L('Sign with nobody', 'Keinen Vertrag', 'No firmar con nadie');
const RIVALS = L('the rivals', 'die Rivalen', 'los rivales');
const ANOTHER_COUNTRY = L('another country', 'ein anderes Land', 'otro pais');

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
  if (req.hasMediaPartner !== undefined && (player.mediaPartner !== null) !== req.hasMediaPartner) {
    return false;
  }
  return true;
}

// -------------------------------------------------------- Vereinsauswahl

/**
 * Spielklasse, in die ein Spieler mit diesem OVR gerade gehört (5 = Topliga).
 *
 * Das ist die Leitplanke der ganzen Karriere: Angebote kommen aus der Klasse,
 * in die man gehört, nicht von irgendwo auf der Welt. Wer besser wird, wird
 * von weiter oben angerufen; wer nachlässt, von weiter unten.
 */
export function strengthForOverall(data: GameData, overall: number, bonus = 0): number {
  const table = data.progression.offers.leagueStrengthForOverall as [number, number][];
  const perBonus = data.progression.offers.strengthPerQualityBonus as number;
  return clamp(interpolate(table, overall) + bonus * perBonus, 1, 5);
}

/**
 * Reputationsstufe des Vereins, der bei diesem OVR realistisch anfragt.
 *
 * Bewusst eine eigene Leiter, nicht die der Kaderrollen: dort geht es darum,
 * wo man noch spielen würde, hier darum, wer überhaupt anruft. Bei einem
 * Weltverein unterschreibt man nicht mit 84 — dafür braucht es die 90.
 */
function levelForOverall(data: GameData, overall: number, bonus = 0): number {
  const table = data.progression.offers.reputationForOverall as [number, number][];
  const perBonus = data.progression.offers.reputationPerQualityBonus as number;
  return clamp(interpolate(table, overall) + bonus * perBonus, 0, 10);
}

export interface OfferOptions {
  scope: TransferScope;
  count: number;
  leagueStrengthMax?: number;
  qualityBonus?: number;
}

/**
 * Eine Marke klopft an. Man kann zusagen oder es lassen; wer ablehnt, verliert
 * nichts außer der Wirkung.
 *
 * Läuft gerade ein Vertrag aus, steht die bisherige Marke mit an erster
 * Stelle: verlängern ist die naheliegende Antwort, nicht die versteckte.
 */
export function buildPartnerDecision(
  data: GameData, rng: Rng, state: CareerState, kind: PartnerKind,
): PendingDecision | null {
  const offers = partnerOffers(data, rng, state, kind);
  const current = partnerOf(data, state, kind);
  // Ein Vereinssender, dessen Verein man verlassen hat, verlängert nicht.
  const canExtend = current !== null && partnerFits(data, state, current);
  if (offers.length === 0 && !canExtend) return null;

  const event = data.events.structural.find(
    (e) => e.id === (kind === 'media' ? 'media_partner_offer' : 'kit_supplier_offer'),
  );
  if (!event) return null;

  return {
    kind: 'structural',
    eventId: event.id,
    window: 'summer',
    title: event.title,
    text: localizeText(data, state, event.text),
    options: [
      ...(canExtend ? [{
        id: 'partner:' + current!.id,
        label: proper(current!.name),
        partnerId: current!.id,
        tag: TAG_EXTEND,
        subtitle: reachLabel(current!.reach),
      }] : []),
      ...offers.map((partner) => ({
        id: 'partner:' + partner.id,
        label: proper(partner.name),
        partnerId: partner.id,
        subtitle: reachLabel(partner.reach),
      })),
      { id: 'decline', label: LABEL_DECLINE },
    ],
  };
}

/** Wie weit eine Marke trägt, in Worten. */
function reachLabel(reach: number): LocalizedText {
  if (reach >= 9) return L('Worldwide reach', 'Weltweite Reichweite', 'Alcance mundial');
  if (reach >= 7) return L('National reach', 'Landesweite Reichweite', 'Alcance nacional');
  if (reach >= 5) return L('Wide reach', 'Grosse Reichweite', 'Amplio alcance');
  if (reach >= 3) return L('Regional reach', 'Regionale Reichweite', 'Alcance regional');
  return L('Small but loyal following', 'Klein, aber treu', 'Pocos pero fieles');
}

/** Wie viele Reputationsstufen die Angebote über dem eigenen Niveau liegen. */
export function interestQuality(data: GameData, state: CareerState): number {
  const table = data.progression.marketInterest.qualityByInterest as [number, number][];
  const pull = meterFactor(data, state, 'fanSupport', 'transferPull')
    * meterFactor(data, state, 'mediaRelation', 'offerQuality');
  return Math.round(interpolate(table, state.player.marketInterest) * pull);
}

/** Wie viele Vereine gerade anklopfen. */
export function interestOfferCount(data: GameData, state: CareerState): number {
  const table = data.progression.marketInterest.offerCountByInterest as [number, number][];
  return Math.max(1, Math.round(interpolate(table, state.player.marketInterest)));
}

/**
 * Die Wahl, wohin es geht.
 *
 * Wer sich für einen Wechsel entschieden hat, soll nicht zugeteilt bekommen,
 * wo er landet. Deshalb folgt auf jede Entscheidung, die einen Wechsel
 * auslöst, diese Karte mit den Vereinen, die in Frage kommen.
 */
export function buildDestinationDecision(
  data: GameData, rng: Rng, state: CareerState,
  scope: TransferScope, leagueStrengthMax?: number, kind: TransferKind = 'transfer',
): PendingDecision | null {
  // Eine Leihe braucht einen Verein, der einen verleiht.
  const loan = kind === 'loan' && !!state.clubId;
  const eventId = loan ? 'loan_destination' : 'transfer_destination';
  const event = data.events.structural.find((e) => e.id === eventId);
  if (!event) return null;

  const options: Parameters<typeof clubOffers>[3] = {
    scope,
    count: Math.max(2, interestOfferCount(data, state)),
  };
  if (leagueStrengthMax !== undefined) options.leagueStrengthMax = leagueStrengthMax;

  const clubs = clubOffers(data, rng, state, options);
  if (clubs.length === 0) return null;

  return {
    kind: 'structural',
    eventId,
    window: 'summer',
    title: event.title,
    text: localizeText(data, state, event.text),
    options: clubs.map((club) => clubOption(data, club, 'destination', loan ? TAG_LOAN : TAG_MOVE)),
  };
}

/** Entscheidungen, bei denen man sich von sich aus einen Verein aussucht. */
const CLUB_MOVE_EVENTS = new Set([
  'academy_offer', 'transfer_offer', 'loan_offer', 'transfer_destination', 'loan_destination',
]);

/**
 * Ändert diese Entscheidung womöglich den Verein? In einer Pause darf nur
 * eine davon anstehen — sonst sucht man sich zweimal hintereinander einen
 * Klub aus und der erste war umsonst.
 */
export function movesClub(data: GameData, decision: PendingDecision): boolean {
  if (CLUB_MOVE_EVENTS.has(decision.eventId)) return true;
  const event = data.careerEventById.get(decision.eventId);
  return (event?.options ?? []).some((option) => Boolean(
    option.modifiers?.forceTransfer
    ?? option.outcome?.success?.forceTransfer
    ?? option.outcome?.failure?.forceTransfer,
  ));
}

/** Kandidatenvereine für ein Angebot, gewichtet nach Passung zum Spielerniveau. */
export function clubOffers(data: GameData, rng: Rng, state: CareerState, options: OfferOptions): Club[] {
  const current = state.clubId ? clubOf(data, state.clubId) : null;
  const currentLeague = current ? leagueOf(data, current) : null;
  // Ein Partner sorgt dafür, dass man gesehen wird, und wer gerade begehrt
  // ist, bekommt Angebote von weiter oben.
  const bonus = (options.qualityBonus ?? 0)
    + offerReputationBonus(data, state)
    + interestQuality(data, state);
  const target = levelForOverall(data, state.player.overall, bonus);

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

  // Ein Spieler bekommt keine Angebote von Vereinen weit über seinem Niveau —
  // und keine aus einer Spielklasse, die nichts mit seiner zu tun hat. Wer
  // sich in einer europäischen zweiten Liga bewiesen hat, bekommt keinen Anruf
  // aus einer Liga zwei Stufen darunter: dort fragt schlicht niemand an.
  //
  // Nach oben ist das Fenster enger als nach unten: absteigen kann man weit,
  // aufsteigen immer nur um eine Stufe.
  const window = data.progression.offers.reputationWindow as { up: number; down: number };
  const deserved = strengthForOverall(data, state.player.overall, bonus);
  const fits = (club: Club, extra: number, strengthRange: number): boolean => {
    const gap = club.reputation.domestic - target;
    return gap <= window.up + extra && -gap <= window.down + extra
      && Math.abs(leagueOf(data, club).strength - deserved) <= strengthRange;
  };

  // Erst eng, dann Stufe für Stufe weiter — bis genug Vereine übrig bleiben.
  for (const [extra, strengthRange] of [[0, 1], [1, 1.5], [2, 2.5]] as const) {
    const inRange = pool.filter((c) => fits(c, extra, strengthRange));
    if (inRange.length >= options.count) { pool = inRange; break; }
  }
  if (pool.length === 0) pool = data.clubs.filter((c) => c.id !== current?.id);

  // Je näher an Zielstufe und Spielklasse, desto wahrscheinlicher das Angebot.
  // Zusätzlich wiegt das gewohnte Umfeld schwer: dieselbe Liga zuerst, dann
  // dasselbe Land, dann derselbe Kontinent — sonst springt jede Karriere
  // wahllos über den Globus.
  const homeCountry = currentLeague?.country ?? state.player.nationality;
  const homeConfederation = countryOf(data, homeCountry).confederation;
  // Wer dieselbe Marke trägt wie ein Verein, taucht dort eher auf einem Zettel
  // auf: die Ausrüster reden miteinander.
  const ownSupplier = state.player.kitSupplier
    ? data.partnerById.get(state.player.kitSupplier)?.id
    : undefined;

  const weighted = pool.map((club) => {
    const league = leagueOf(data, club);
    let weight = Math.max(1, 12 - Math.abs(club.reputation.domestic - target) * 2.5);
    // Eine Spielklasse Unterschied ist der übliche Schritt, zwei die Ausnahme,
    // drei kommt nicht vor.
    const step = Math.abs(league.strength - deserved);
    weight *= step <= 0.5 ? 2.2 : step <= 1.5 ? 1 : step <= 2.5 ? 0.12 : 0.02;
    weight *= currentLeague && league.id === currentLeague.id ? 3.5
      : league.country === homeCountry ? 2.5
        : countryOf(data, league.country).confederation === homeConfederation ? 1.6
          : 0.35;
    if (league.country === state.player.nationality) weight *= 1.5;
    if (ownSupplier && club.kitSupplier === ownSupplier) weight *= 1.8;
    return { item: club, weight };
  });
  return rng.weightedSample(weighted, options.count);
}

/** So viele Vereine stehen zum Karrierestart zur Wahl. */
export const ACADEMY_OFFERS = 4;

/** Die Jugendangebote zum Karrierestart. */
export function academyOffers(data: GameData, rng: Rng, state: CareerState): Club[] {
  const country = countryOf(data, state.player.nationality);

  // Mit zweitem Pass stehen die Vereine beider Heimatländer offen — das ist
  // der erste spürbare Vorteil einer doppelten Staatsbürgerschaft.
  let pool = clubsInCountry(data, state.player.nationality);
  if (state.player.secondNationality) {
    pool = [...pool, ...clubsInCountry(data, state.player.secondNationality)];
  }
  if (pool.length < ACADEMY_OFFERS) pool = clubsInConfederation(data, country.confederation);
  if (pool.length < ACADEMY_OFFERS) pool = data.clubs;

  // Kein 16-Jähriger startet bei einem Weltverein — die Spitze fällt raus.
  const eligible = pool.filter((c) => c.reputation.domestic <= 8);
  // Und kaum einer startet ganz oben: eine Karriere soll sich von unten nach
  // oben arbeiten, deshalb wiegen die kleineren Spielklassen schwerer. Ganz
  // ausgeschlossen ist die Jugend eines großen Vereins damit nicht.
  const weighted = (eligible.length >= ACADEMY_OFFERS ? eligible : pool).map((club) => ({
    item: club,
    weight: Math.max(1, 11 - club.reputation.domestic) * (6 - leagueOf(data, club).strength),
  }));
  return rng.weightedSample(weighted, ACADEMY_OFFERS);
}

// ----------------------------------------------------- Entscheidungsbau

function clubOption(
  data: GameData, club: Club, prefix: string, tag?: LocalizedText,
): PendingOption {
  const league = leagueOf(data, club);
  return {
    id: `${prefix}:${club.id}`,
    label: proper(club.short),
    clubId: club.id,
    ...(tag ? { tag } : {}),
    subtitle: proper(league.name),
  };
}

export function buildAcademyDecision(data: GameData, rng: Rng, state: CareerState): PendingDecision {
  const event = data.events.structural.find((e) => e.id === 'academy_offer')!;
  return {
    kind: 'structural',
    eventId: 'academy_offer',
    window: 'start',
    title: event.title,
    text: localizeText(data, state, event.text),
    options: academyOffers(data, rng, state).map((c) => clubOption(data, c, 'academy')),
  };
}

export function buildTransferDecision(
  data: GameData, rng: Rng, state: CareerState, scope: TransferScope = 'matching',
  count = 3,
): PendingDecision {
  const event = data.events.structural.find((e) => e.id === 'transfer_offer')!;
  const bonus = state.activeEffects.find((e) => e.modifiers.offerQualityBonus)?.modifiers.offerQualityBonus ?? 0;
  const clubs = clubOffers(data, rng, state, { scope, count, qualityBonus: bonus });

  // Ein Kennzeichen sagt, was die Wahl bedeutet: hier bleiben oder gehen.
  const options: PendingOption[] = clubs.map((c) => clubOption(data, c, 'transfer', TAG_MOVE));
  if (state.clubId) {
    const club = clubOf(data, state.clubId);
    options.unshift({
      id: 'stay',
      label: proper(club.short),
      clubId: club.id,
      tag: TAG_STAY,
      subtitle: proper(leagueOf(data, club).name),
    });
  }

  return {
    kind: 'structural',
    eventId: 'transfer_offer',
    window: 'summer',
    title: event.title,
    text: localizeText(data, state, event.text),
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
    text: localizeText(data, state, event.text),
    options: [
      ...clubs.map((c) => clubOption(data, c, 'loan', TAG_LOAN)),
      {
        id: 'stay',
        label: proper(club.short),
        clubId: club.id,
        tag: TAG_STAY,
        subtitle: proper(leagueOf(data, club).name),
      },
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
    text: localizeText(data, state, event.text),
    options,
  };
}

/** Wählt ein passendes Karriere-Ereignis für das angegebene Fenster. */
export function buildCareerDecision(
  data: GameData, rng: Rng, state: CareerState, window: 'summer' | 'winter',
  options: { repeatable?: boolean; exclude?: Set<string>; onlyTriggered?: boolean } = {},
): PendingDecision | null {
  const eligible = data.events.career.filter((event) => {
    // Ausgelöste Ereignisse kommen nur, wenn ihre Tatsache gerade zutrifft.
    const triggers = event.triggeredBy ?? [];
    const fits = triggers.length > 0 && triggers.some((fact) => state.facts.includes(fact));
    if (options.onlyTriggered && !fits) return false;
    if (!options.onlyTriggered && triggers.length > 0 && !fits) return false;

    const eventWindow = event.window ?? 'summer';
    if (eventWindow !== 'any' && eventWindow !== window) return false;
    if (state.player.age < event.ageRange[0] || state.player.age > event.ageRange[1]) return false;
    if (options.exclude?.has(event.id)) return false;

    // In jeder Pause stehen drei Entscheidungen an. Der Vorrat an Ereignissen
    // reicht dafür nicht ein Karriereleben lang, deshalb darf die Sperre
    // fallen, sobald nichts Neues mehr übrig ist.
    if (!options.repeatable) {
      const used = state.eventHistory.filter((e) => e.id === event.id).length;
      if (used >= (event.maxPerCareer ?? 1)) return false;
    }

    // Ein Torwart bleibt Torwart: wo es keine verwandte Position gibt, ist
    // nichts zu entscheiden.
    if (needsAlternativePosition(event) && relatedPositions(data, state).length === 0) return false;

    return meetsRequirements(data, state, event.requires);
  });

  if (eligible.length === 0) return null;

  // Temperamentvolle Spieler geraten häufiger in heikle Lagen. Das ist der
  // Preis für das Talent, das über den Fuß hereinkommt.
  const temperament = state.player.temperament / 100;
  const riskyWeight = data.progression.traits.temperament.riskyEventWeight as number;
  const event = rng.weighted(eligible.map((item) => ({
    item,
    weight: item.risky ? item.weight * (1 + temperament * (riskyWeight - 1)) : item.weight,
  })));
  return buildEventDecision(data, rng, state, event, window);
}

/**
 * Baut die Entscheidung zu einem bestimmten Ereignis.
 *
 * Wird auch für angestoßene Ereignisse gebraucht: dort steht der Auslöser
 * schon fest, es muss nur noch gewürfelt werden, in welcher Ausprägung.
 */
export function buildEventDecision(
  data: GameData, rng: Rng, state: CareerState, event: CareerEvent,
  window: 'summer' | 'winter' = 'summer',
): PendingDecision {
  const variant = pickVariant(data, rng, event);
  const alternativeCountry = event.id === 'foreign_grandfather'
    ? alternativeNationality(data, rng, state)
    : undefined;

  // Auf welche Position es ginge, steht schon auf der Karte — sonst kündigt
  // der Text etwas anderes an, als am Ende passiert.
  const related = needsAlternativePosition(event) ? relatedPositions(data, state) : [];
  const alternativePosition = related.length > 0 ? rng.pick(related) : undefined;

  const filled = fillLocalized(
    data, state, variant?.text ?? event.text, variant,
    alternativeCountry, alternativePosition,
  );

  return {
    kind: 'career',
    eventId: event.id,
    window,
    ...(event.category ? { category: event.category } : {}),
    ...(alternativeCountry ? { alternativeCountry } : {}),
    ...(alternativePosition ? { alternativePosition } : {}),
    title: event.title,
    text: filled.text,
    ...(filled.highlights.length > 0 ? { highlights: filled.highlights } : {}),
    ...(variant ? { variantKey: variant.key } : {}),
    options: event.options
      .filter((o) => optionAllowed(state, o))
      .map((o) => {
        // Fuer jede Sprache einmal, damit der Wechsel der Sprache auch das
        // Ergebnis sofort umstellt.
        const outcome: LocalizedOutcome = {
          en: optionSummary(o, 'en'),
          de: optionSummary(o, 'de'),
          es: optionSummary(o, 'es'),
        };
        return {
          id: o.id,
          label: o.label,
          ...(o.motif ? { motif: o.motif } : {}),
          ...((outcome.en?.length ?? 0) > 0 ? { outcome } : {}),
        };
      }),
  };
}

/** Positionen, auf die dieser Spieler umschulen könnte. */
function relatedPositions(data: GameData, state: CareerState): PositionId[] {
  return positionOf(data, state.player.position).related;
}

/** Kündigt dieses Ereignis eine andere Position an oder wechselt es dorthin? */
function needsAlternativePosition(event: CareerEvent): boolean {
  const texts = [
    ...Object.values(event.text ?? {}),
    ...(event.variants ?? []).flatMap((variant) => Object.values(variant.text ?? {})),
  ];
  if (texts.some((text) => String(text).includes('{alternativePosition}'))) return true;
  return (event.options ?? []).some((option) => (
    option.modifiers?.changePosition
    ?? option.outcome?.success?.changePosition
    ?? option.outcome?.failure?.changePosition
  ) === true);
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

/**
 * Das Land, in das ein Verbandswechsel führt. Wer einen zweiten Pass hat, für
 * den steht es von Anfang an fest; alle anderen entdecken ihre Wurzeln erst in
 * dem Moment — dann wird ein Land aus derselben Konföderation gezogen.
 */
function alternativeNationality(data: GameData, rng: Rng, state: CareerState): CountryCode {
  if (state.player.secondNationality) return state.player.secondNationality;

  const own = countryOf(data, state.player.nationality);
  const candidates = data.countries.filter(
    (c) => c.code !== own.code && c.confederation === own.confederation,
  );
  if (candidates.length === 0) return own.code;
  return rng.weighted(candidates.map((item) => ({ item, weight: item.strength }))).code;
}

/**
 * Setzt die Namen in den Text und merkt sich, welche das waren.
 *
 * Bisher war der Vereinsname nach dem Einsetzen nicht mehr auffindbar. Jetzt
 * kommt er zusätzlich als Liste zurück, damit die Oberfläche ihn hervorheben
 * kann, ohne raten zu müssen.
 */
function fillLocalized(
  data: GameData, state: CareerState, source: LocalizedText, variant: EventVariant | null,
  alternativeCountry?: CountryCode,
  alternativePosition?: PositionId,
): { text: LocalizedText; highlights: string[] } {
  const club = state.clubId ? clubOf(data, state.clubId) : null;
  const country = countryOf(data, state.player.nationality);
  const rivalClub = club ? rivalOf(data, club) : null;
  const media = partnerOf(data, state, 'media');
  const altCountry = alternativeCountry ? countryOf(data, alternativeCountry) : null;
  const altPosition = alternativePosition ? positionOf(data, alternativePosition) : null;

  // Die hervorgehobenen Namen sammeln sich über alle Sprachen. Zusätzliche,
  // in der gerade gezeigten Sprache nicht vorkommende Begriffe schaden nicht:
  // die Oberfläche färbt nur, was sie im Text findet.
  const highlights = new Set<string>();

  const fill = (locale: Locale): string => {
    const names: Record<string, string> = {
      '{club}': club?.short ?? '',
      '{country}': tr(country.name, locale),
      '{rivalClub}': rivalClub?.short ?? tr(RIVALS, locale),
      '{alternativeCountry}': altCountry ? tr(altCountry.name, locale) : tr(ANOTHER_COUNTRY, locale),
      '{alternativePosition}': altPosition ? tr(altPosition.name, locale) : '',
      '{mediaPartner}': media?.name ?? '',
    };
    let filled = tr(source, locale).replace('{injuryLabel}', variant ? tr(variant.text, locale) : '');
    for (const [token, name] of Object.entries(names)) {
      if (!filled.includes(token) || !name) continue;
      filled = filled.split(token).join(name);
      highlights.add(name);
    }
    return filled;
  };

  const text: LocalizedText = { en: fill('en'), de: fill('de'), es: fill('es') };
  return { text, highlights: [...highlights] };
}

/** Ein Entscheidungstext ohne Antwortabhängige Platzhalter, in allen Sprachen. */
export function localizeText(data: GameData, state: CareerState, source: LocalizedText): LocalizedText {
  return fillLocalized(data, state, source, null).text;
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
  text: LocalizedText;
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
    return { event, text: localizeText(data, state, event.text) };
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
    domestic: clamp(club.reputation.domestic + delta * 2, 0, 10) as ReputationLevel,
    continental: clamp(club.reputation.continental + delta * 2, 0, 10) as ReputationLevel,
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
export interface ModifierContext {
  /** Ziel eines Verbandswechsels. */
  alternativeCountry?: CountryCode;
  alternativePosition?: PositionId;
}

export function applyModifiers(
  data: GameData, rng: Rng, state: CareerState, modifiers: EventModifiers, source: string,
  context: ModifierContext = {},
): void {
  const player = state.player;

  if (modifiers.switchNationality && context.alternativeCountry) {
    // Der alte Pass bleibt erhalten — man verliert ihn ja nicht.
    const previous = player.nationality;
    player.nationality = context.alternativeCountry;
    player.secondNationality = previous;
  }

  if (modifiers.immediateOverall) player.overall += modifiers.immediateOverall;
  if (modifiers.permanentOverall) player.overall += modifiers.permanentOverall;
  player.overall = clampOverall(data, player.overall, player.potential);

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
  if (modifiers.fansMultiplier) {
    // Gedämpft, weil in jeder Pause mehrere Entscheidungen anfallen und sich
    // Faktoren auf den Bestand sonst über zwanzig Jahre hochschaukeln.
    const damping = data.progression.fans.multiplierDamping as number;
    const factor = 1 + (modifiers.fansMultiplier - 1) * damping;
    const ceiling = player.legend
      ? (data.progression.fans.max as number)
      : (data.progression.fans.regularMax as number);
    player.fans = Math.round(Math.min(ceiling, player.fans * factor));
  }
  if (modifiers.marketInterestDelta) {
    player.marketInterest = clamp(player.marketInterest + modifiers.marketInterestDelta, 0, 100);
  }

  // Manche Wahl zieht später etwas nach sich: das Tattoo entzündet sich, die
  // zu früh beendete Reha kommt als Rückfall zurück.
  if (modifiers.schedules) {
    const plan = modifiers.schedules;
    if (rng.chance(plan.chance ?? 1)) {
      state.scheduledEvents.push({
        eventId: plan.eventId,
        halvesRemaining: plan.afterHalves ?? 1,
      });
    }
  }

  if (modifiers.setCaptain) player.isCaptain = true;
  if (modifiers.suspendedSeasons) state.suspensionHalves += modifiers.suspendedSeasons * 2;
  // Gewechselt wird auf die Position, die auf der Karte stand.
  if (modifiers.changePosition && context.alternativePosition) {
    player.position = context.alternativePosition;
  }
  if (modifiers.missShare && modifiers.missShare >= 0.2) state.lastInjuryYear = state.year;
  if (modifiers.forceTransfer) {
    state.pendingTransfer = {
      scope: modifiers.forceTransfer.scope,
      ...(modifiers.forceTransfer.leagueStrengthMax !== undefined
        ? { leagueStrengthMax: modifiers.forceTransfer.leagueStrengthMax }
        : {}),
      ...(modifiers.forceTransfer.kind ? { kind: modifiers.forceTransfer.kind } : {}),
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
  variantKey?: string, context: ModifierContext = {},
): { outcome: 'positive' | 'negative' | null } {
  if (!option.outcome) {
    if (option.modifiers) applyModifiers(data, rng, state, option.modifiers, event.id, context);
    return { outcome: null };
  }

  const variant = event.variants?.find((v) => v.key === variantKey);
  let chance = option.outcome.successChance ?? 0.5;
  if (option.outcome.fromVariant && variant?.successChance !== undefined) {
    chance = variant.successChance;
  }

  // In heiklen Lagen entscheidet ein Hitzkopf öfter falsch.
  if (event.risky) {
    const penalty = data.progression.traits.temperament.successPenalty as number;
    chance = Math.max(0.05, chance - (state.player.temperament / 100) * penalty);
  }

  const success = rng.chance(chance);

  if (option.outcome.fromVariant && variant) {
    const delta = success ? variant.successOverall ?? 0 : variant.failureOverall ?? 0;
    const key = option.outcome.permanent ? 'permanentOverall' : 'immediateOverall';
    applyModifiers(data, rng, state, { [key]: delta }, event.id, context);
  }

  const branch = success ? option.outcome.success : option.outcome.failure;
  if (branch) applyModifiers(data, rng, state, branch, event.id, context);
  if (option.modifiers) applyModifiers(data, rng, state, option.modifiers, event.id, context);

  return { outcome: success ? 'positive' : 'negative' };
}

export { meetsRequirements };
