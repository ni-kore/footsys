/**
 * Typen zu allen Dateien unter `data/` und zum Spielstand.
 *
 * Diese Datei ist die Brücke zwischen den JSON-Daten und der Engine. Sie
 * beschreibt ausschließlich Struktur — keine Logik, keine Konstanten. Wenn eine
 * Datendatei erweitert wird, wird zuerst hier der Typ erweitert.
 */

// ---------------------------------------------------------------- Grundlagen

/** Zweisprachiger Text. Weitere Sprachen kommen als zusätzliche Keys dazu. */
export interface LocalizedText {
  de: string;
  en: string;
  [locale: string]: string;
}

export type ConfederationId = 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'AFC' | 'CAF' | 'OFC';

/** FIFA-Ländercode, dreistellig, z. B. "GER". */
export type CountryCode = string;

/** 0 = unbedeutend, 10 = Weltspitze. Wird für Vereine verwendet. */
export type ReputationLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** 1 = sehr schwach, 5 = Weltklasse. Wird für Nationen und Ligen verwendet. */
export type StrengthLevel = 1 | 2 | 3 | 4 | 5;

/** Geschlossenes Intervall [min, max] für Zufallswürfe. */
export type Range = [number, number];

// -------------------------------------------------------------- data/core

export interface Confederation {
  id: ConfederationId;
  name: LocalizedText;
  region: LocalizedText;
  strength: StrengthLevel;
  worldCupSlots: number;
  primaryCompetition: string | null;
  secondaryCompetition: string | null;
  tertiaryCompetition: string | null;
}

export interface Country {
  code: CountryCode;
  name: LocalizedText;
  confederation: ConfederationId;
  strength: StrengthLevel;
  /** ISO 3166-1 alpha-2 für die Flagge. Leer bei England, Schottland, Wales, Nordirland. */
  iso2: string;
}

export type PositionId =
  | 'GK' | 'SW' | 'CB' | 'LB' | 'RB' | 'LWB' | 'RWB'
  | 'DM' | 'CM' | 'AM' | 'LM' | 'RM'
  | 'LW' | 'RW' | 'SS' | 'CF' | 'ST';

export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'ATT';

export interface Position {
  id: PositionId;
  group: PositionGroup;
  /** Platzkoordinaten in Prozent: x = 0 links … 100 rechts, y = 0 eigenes Tor … 100 gegnerisches Tor. */
  x: number;
  y: number;
  abbr: LocalizedText;
  name: LocalizedText;
  /** Faktor auf die Basis-Torquote aus progression.json. */
  goalFactor: number;
  /** Faktor auf die Basis-Vorlagenquote. */
  assistFactor: number;
  defenseWeight: number;
  tracksCleanSheets: boolean;
  tracksSaves: boolean;
  /** Positionen, auf die beim Positionswechsel-Event umgeschult werden kann. */
  related: PositionId[];
}

export interface FormationSlot {
  pos: PositionId;
  x?: number;
  y?: number;
}

export interface Formation {
  id: string;
  label: string;
  name: LocalizedText;
  /** 0 = extrem defensiv, 1 = extrem offensiv. */
  attackingBias: number;
  historic?: boolean;
  /** Systeme, die zu jeder Spielweise passen. Betrifft nur das 4-4-2. */
  neutral?: boolean;
  /** Im Karrierestart auswählbar. Die übrigen Systeme bleiben für später hinterlegt. */
  selectable?: boolean;
  slots: FormationSlot[];
}

// ---------------------------------------------------------- data/football

export interface ContinentalSlots {
  primary: number;
  secondary: number;
  tertiary: number;
}

export interface League {
  id: string;
  name: string;
  country: CountryCode;
  /** 1 = höchste Spielklasse. */
  tier: number;
  teams: number;
  strength: StrengthLevel;
  cup: string | null;
  secondaryCup?: string;
  continentalSlots: ContinentalSlots;
}

export interface ClubReputation {
  domestic: ReputationLevel;
  continental: ReputationLevel;
  international: ReputationLevel;
}

export interface DomesticCup {
  id: string;
  name: string;
  country: CountryCode;
  prestige: 1 | 2 | 3 | 4 | 5;
}

export interface Club {
  id: string;
  league: string;
  name: string;
  short: string;
  abbr: string;
  city: string;
  colors: [string, string];
  /** Ausrüster nach heutigem Stand, sofern bekannt. */
  kitSupplier?: string;
  reputation: ClubReputation;
}

export interface ClubFile {
  country: CountryCode;
  clubs: Club[];
}

export type CompetitionLevel =
  | 'continental_primary' | 'continental_secondary' | 'continental_tertiary'
  | 'continental_supercup' | 'continental_youth' | 'continental_regional' | 'world_club'
  | 'world_cup' | 'continental_national' | 'secondary_national' | 'youth_national';

export interface ClubCompetition {
  id: string;
  name: string;
  confederation: ConfederationId | null;
  /** Frauenwettbewerbe sind hinterlegt, werden aber erst mit weiblichen Karrieren aktiv. */
  gender: 'men' | 'women';
  level: CompetitionLevel;
  prestige: 1 | 2 | 3 | 4 | 5;
  trophy: string;
  /** Nachwuchswettbewerbe: nur solange der Spieler jung genug ist. */
  maxAge?: number;
}

export interface NationalCompetition extends ClubCompetition {
  cycleYears: number;
  maxAge?: number;
  historic?: boolean;
}

export interface IndividualAward {
  id: string;
  name: string;
  scope: 'world' | 'continental' | 'league';
  prestige: 1 | 2 | 3 | 4 | 5;
  trophy: string;
  maxAge?: number;
  positionGroup?: PositionGroup;
}

// -------------------------------------------------------------- data/game

export type SquadRole = 'substitute' | 'low_rotation' | 'high_rotation' | 'starter';

export const ROLE_ORDER: SquadRole[] = ['substitute', 'low_rotation', 'high_rotation', 'starter'];

export type DevelopmentProfileId = 'early' | 'normal' | 'late' | 'goalkeeper';

export type GameMode = 'intense' | 'normal' | 'express';

/** Die Saison besteht aus Hinrunde (1) und Rückrunde (2). */
export type SeasonHalf = 1 | 2;

/** Wann ein Ereignis auftreten kann. */
export type EventWindow = 'summer' | 'winter' | 'any' | 'half_end' | 'season_end';

/** Sichtbare Karrieremeter, 0–100. In der UI als 5-stufige Balken. */
export interface Meters {
  morale: number;
  fanSupport: number;
  mediaRelation: number;
}

export type TrophyMultiplierKey =
  | 'league' | 'domesticCup' | 'continentalPrimary' | 'continentalSecondary' | 'national';

export interface EventModifiers {
  immediateOverall?: number;
  permanentOverall?: number;
  deferredOverall?: { delta: number; afterSeasons: number };
  roleOverride?: SquadRole;
  roleShift?: -1 | 1;
  roleOverrideSeasons?: number;
  suspendedSeasons?: number;
  forceZeroAppearances?: boolean;
  trophyMultiplier?: Partial<Record<TrophyMultiplierKey, number>>;
  marketValueMultiplier?: number;
  meters?: Partial<Meters>;
  nationalTeam?: 'force' | 'skip';
  switchNationality?: boolean;
  changePosition?: boolean;
  setCaptain?: boolean;
  forceTransfer?: { scope: TransferScope; leagueStrengthMax?: number };
  /** Faktoren auf die nächste Halbserie. */
  appearanceMultiplier?: number;
  goalMultiplier?: number;
  assistMultiplier?: number;
  /** Anteil der nächsten Halbserie, der verletzungsbedingt ausfällt (0–1). */
  missShare?: number;
  /** Faktor auf die Anhängerschaft. */
  fansMultiplier?: number;
  /** Änderung des Marktinteresses in Punkten. */
  marketInterestDelta?: number;
  /** Stößt ein Ereignis an, das später fällig wird. */
  schedules?: { eventId: string; chance?: number; afterHalves?: number };
  /** Nur Zufallsereignisse. */
  clubReputationDelta?: number;
  leagueMove?: 'promotion' | 'relegation';
  rerollRole?: boolean;
  /** Bessere Angebote im nächsten Transferfenster. */
  offerQualityBonus?: number;
}

export type TransferScope =
  | 'home_country' | 'rival' | 'same_league' | 'abroad' | 'free'
  | 'matching' | 'better' | 'lower';

export interface EventOutcome {
  successChance?: number;
  fromVariant?: boolean;
  permanent?: boolean;
  success?: EventModifiers;
  failure?: EventModifiers;
}

export interface EventOption {
  /** Motiv für das Bild auf dieser Antwort. */
  motif?: string;
  id: string;
  label: LocalizedText;
  condition?: { minAge?: number; maxAge?: number };
  modifiers?: EventModifiers;
  outcome?: EventOutcome;
}

export interface EventVariant {
  key: string;
  weight: number;
  text: LocalizedText;
  successChance?: number;
  successOverall?: number;
  failureOverall?: number;
}

export interface EventRequirements {
  minOverall?: number;
  maxOverall?: number;
  minMarketValue?: number;
  minMorale?: number;
  maxMorale?: number;
  minFanSupport?: number;
  maxFanSupport?: number;
  minDomesticReputation?: ReputationLevel;
  maxDomesticReputation?: ReputationLevel;
  minLeagueTier?: number;
  minSeasonsAtClub?: number;
  maxSeasonsAtClub?: number;
  minRole?: SquadRole;
  playingAbroad?: boolean;
  isInternational?: boolean;
  eligibleForNationalTeam?: boolean;
  notCalledUpYet?: boolean;
  notCaptain?: boolean;
  recentInjury?: boolean;
  upcomingNationalTournament?: boolean;
}

export interface CareerEvent {
  /** Art der Entscheidung, bestimmt das Bild auf der Karte. */
  category?: string;
  /**
   * Worauf dieses Ereignis reagiert. Steht hier etwas, kommt es bevorzugt und
   * nur dann, wenn die Tatsache gerade zutrifft.
   */
  triggeredBy?: CareerFact[];
  id: string;
  weight: number;
  window?: EventWindow;
  ageRange: Range;
  maxPerCareer?: number;
  requires?: EventRequirements;
  variants?: EventVariant[];
  variantsFrom?: string;
  /** Heikle Lage — tritt bei temperamentvollen Spielern häufiger ein. */
  risky?: boolean;
  title: LocalizedText;
  text: LocalizedText;
  options: EventOption[];
}

export interface StructuralEvent {
  id: string;
  type: 'structural';
  trigger: string;
  optionsFrom?: {
    pool: 'clubs';
    scope: string;
    count: number;
    includeStayOption?: boolean;
    reputationRange?: Range;
  };
  title: LocalizedText;
  text: LocalizedText;
  options?: EventOption[];
}

export interface RandomEvent {
  id: string;
  weight: number;
  window: EventWindow;
  tone: 'positive' | 'negative' | 'neutral';
  ageRange?: Range;
  requires?: EventRequirements;
  title: LocalizedText;
  text: LocalizedText;
  effects: EventModifiers;
}

// ------------------------------------------------------------ Spielstand

export interface PlayerIdentity {
  surname: string;
  shirtNumber: number;
  strongFoot: 'left' | 'right';
  /**
   * Beidfüßigkeit, 1–5. Wer den zweiten Fuß beherrscht, ist im Abschluss
   * gefährlicher und passt in mehr Systeme.
   */
  weakFoot: 1 | 2 | 3 | 4 | 5;
  nationality: CountryCode;
  /**
   * Zweiter Pass. Erweitert den Kreis der Jugendvereine und ist das Land, in
   * das ein Verbandswechsel später führt.
   */
  secondNationality?: CountryCode;
  position: PositionId;
  /**
   * Bevorzugtes System. Bestimmt, welche Positionen überhaupt wählbar sind,
   * und wirkt über den Offensivgrad der Formation auf Tore und Vorlagen.
   */
  formationId: string;
}

/**
 * Ein Partner: Sender, Zeitung, Fankanal oder Ausrüster.
 *
 * Die Reichweite 1 bis 10 sagt, wie weit die Marke trägt. Ein Regionalsender
 * bringt ein paar hundert Leute mehr, ein Weltkonzern Millionen.
 */
/** Die drei sichtbaren Meter. */
export type MeterKey = 'morale' | 'fanSupport' | 'mediaRelation';

/** Woran ein Verein im kommenden Jahr international teilnimmt. */
export type ContinentalEntry = 'primary' | 'secondary' | 'tertiary' | 'none';

/** Wie die Mannschaft ihre Saison gespielt hat. */
export interface TeamSeason {
  /** Tabellenplatz in der Liga. */
  position: number;
  teams: number;
  /** Wie viele Plätze der eigene Beitrag ausgemacht hat. */
  contributionShift: number;
  titles: string[];
  /** Startplatz für das kommende Jahr. */
  nextEntry: ContinentalEntry;
}

/**
 * Was in einer Halbserie geschehen ist, in einer Form, auf die Ereignisse
 * reagieren können. Aus dem Bericht werden damit die nächsten Entscheidungen.
 */
export type CareerFact =
  | 'was_injured'
  | 'lost_starting_spot'
  | 'won_starting_spot'
  | 'scoring_run'
  | 'goal_drought'
  | 'new_coach'
  | 'won_title'
  | 'relegated'
  | 'promoted'
  | 'first_call_up'
  | 'benched'
  | 'suspended'
  | 'transfer_interest';

/** Ein Ereignis, das später fällig wird, weil eine Wahl es angestoßen hat. */
export interface ScheduledEvent {
  eventId: string;
  /** Halbserien bis zur Fälligkeit. */
  halvesRemaining: number;
}

export interface Partner {
  id: string;
  name: string;
  /** Pfad des Logos unterhalb von assets/. */
  logo: string;
  reach: number;
  /** Helle Logos brauchen einen dunklen Untergrund, sonst verschwinden sie. */
  light: boolean;
}

export type PartnerKind = 'media' | 'kit';

/** Eine Aussage darüber, was eine Wahl bedeutet, samt ihrem Ton. */
export interface OutcomeLine {
  text: string;
  tone: 'positive' | 'negative' | 'neutral';
}

export interface PlayerState extends PlayerIdentity {
  age: number;
  /** Intern als Fließkommazahl geführt, für die Anzeige gerundet. */
  overall: number;
  /**
   * Verstecktes Leistungsmaximum. Wird der UI nie direkt gezeigt — der Spieler
   * merkt nur, dass seine Entwicklung abflacht.
   */
  potential: number;
  marketValue: number;
  developmentProfile: DevelopmentProfileId;
  isCaptain: boolean;
  meters: Meters;
  /**
   * Anhängerschaft in Köpfen. Beginnt bei zwei und wächst mit Leistung und
   * Bühne. Die Stimmung dieser Leute steht im Meter `fanSupport`.
   */
  fans: number;

  /**
   * Anhänger, die über die Nationalmannschaft dazugekommen sind. Sie stecken
   * in `fans` mit drin und werden hier nur getrennt mitgezählt.
   */
  nationalFans: number;

  /** Medienpartner, der über einen berichtet. Keiner heißt null. */
  mediaPartner: string | null;
  /** Ausrüster, der einen ausstattet. */
  kitSupplier: string | null;

  /**
   * Wie begehrt man gerade ist, 0 bis 100. Wächst mit Leistung, Presse und
   * Ereignissen, verfällt langsam. Bestimmt Zahl und Güte der Angebote.
   */
  marketInterest: number;

  /** Länderspiele insgesamt. */
  caps: number;
  nationalGoals: number;
  nationalAssists: number;

  /**
   * 0–100. Steigt mit dem linken Fuß und einem starken zweiten Fuß. Solche
   * Spieler sind begabter, geraten aber öfter in heikle Situationen.
   */
  temperament: number;

  /** Verband, für den gespielt wird. Ab dem A-Länderspiel bindend. */
  nationalTeam: CountryCode | null;
  /** Alter beim ersten A-Länderspiel — davor sind Wechsel erlaubt. */
  firstSeniorCapAge: number | null;
  /** Saisons je Land, aus denen sich eine Einbürgerung ergeben kann. */
  seasonsInCountry: Record<CountryCode, number>;
  /** Der beste Spieler aller Zeiten, freigeschaltet über den Namen. */
  legend: boolean;
}

/** Ergebnis einer Halbserie — die kleinste simulierte Einheit. */
export interface HalfSeasonRecord {
  year: number;
  half: SeasonHalf;
  clubId: string;
  role: SquadRole;
  appearances: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  /** Länderspiele dieser Halbserie und was dabei heraussprang. */
  caps: number;
  nationalGoals: number;
  nationalAssists: number;
  /** Anteil der möglichen Spiele, in denen man auf dem Platz stand. */
  minutesShare: number;
  /** Zufallsereignisse, die in dieser Halbserie passiert sind. */
  randomEventIds: string[];
}

export interface SeasonRecord {
  year: number;
  age: number;
  clubId: string;
  loanFrom?: string;
  leagueId: string;
  overall: number;
  role: SquadRole;
  appearances: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  /** Anhängerschaft am Ende dieser Saison. */
  fans: number;
  /** Wie die Mannschaft diese Saison gespielt hat. */
  team?: TeamSeason;
  /** Vorlagen im Nationaltrikot. */
  nationalAssists: number;
  titles: string[];
  awards: string[];
  nationalCaps: number;
  nationalGoals: number;
  halves: HalfSeasonRecord[];
}

/** Ein zeitlich begrenzter Effekt, der auf kommende Halbserien wirkt. */
export interface ActiveEffect {
  source: string;
  halvesRemaining: number;
  modifiers: EventModifiers;
}

export interface PendingOption {
  id: string;
  label: LocalizedText;
  /** Bei Vereinsentscheidungen: der Verein hinter der Option. */
  clubId?: string;
  /** Bei Partnerentscheidungen: die Marke hinter der Option. */
  partnerId?: string;
  /** Kurzes Kennzeichen der Option, etwa "Stay" oder "Move". */
  tag?: string;
  /** Motiv für das Bild auf dieser Antwort. */
  motif?: string;
  /** Was diese Wahl bedeutet, in Worten, jede Aussage mit ihrem Ton. */
  outcome?: OutcomeLine[];
  subtitle?: string;
}

export interface PendingDecision {
  kind: 'structural' | 'career';
  eventId: string;
  /** Beim Verbandswechsel: das Land, um das es geht. */
  alternativeCountry?: CountryCode;
  window: 'summer' | 'winter' | 'start';
  title: LocalizedText;
  text: string;
  variantKey?: string;
  /** Art der Entscheidung, bestimmt das Bild auf der Karte. */
  category?: string;
  /**
   * Namen im Text, die hervorgehoben gehören: Vereine, Länder, Positionen.
   * Die Oberfläche färbt sie ein, statt den Text zu zerlegen.
   */
  highlights?: string[];
  options: PendingOption[];
}

export interface TimelineEntry {
  year: number;
  age: number;
  type: 'transfer' | 'loan' | 'title' | 'award' | 'random_event' | 'decision' | 'injury' | 'retirement';
  text: string;
  detail?: string;
}

/** Ergebnis einer Halbserie oder einer ganzen Saison, für die Anzeige. */
export interface PeriodReport {
  kind: 'half' | 'season';
  year: number;
  half: SeasonHalf;
  clubId: string;
  leagueId: string;
  role: SquadRole;
  appearances: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  overallBefore: number;
  overallAfter: number;
  marketValueBefore: number;
  marketValueAfter: number;
  randomEvents: { id: string; title: LocalizedText; text: string; tone: string }[];
  /** Auf welcher Position gespielt wurde. */
  position: PositionId;
  /** Anhängerschaft vor und nach der Halbserie. */
  fansBefore: number;
  fansAfter: number;
  /** Offensivgrad des Trainers in dieser Halbserie, 0–1. */
  coachBias: number;
  /** Wie gut das Lieblingssystem dazu passte, 0,7–1. */
  formationFit: number;
  /** Nur bei kind === 'season'. */
  titles: string[];
  awards: string[];
  nationalCaps: number;
  nationalGoals: number;
  age: number;
}

export interface CareerState {
  /** Startwert des deterministischen RNG. Gleicher Seed + gleiche Entscheidungen = gleiche Karriere. */
  seed: string;
  rngState: number;
  step: number;
  mode: GameMode;
  year: number;
  /** Die als Nächstes zu simulierende Halbserie. */
  half: SeasonHalf;
  player: PlayerState;
  clubId: string | null;
  /** Bei Leihe der Stammverein, sonst identisch mit clubId. */
  contractClubId: string | null;
  activeLoan: { parentClubId: string; loanClubId: string; returnYear: number } | null;
  seasonsAtClub: number;
  seasonsSinceMajorDecision: number;
  currentSeasonHalves: HalfSeasonRecord[];
  currentSeasonCaps: number;
  currentSeasonNationalGoals: number;
  currentSeasonNationalAssists: number;

  /** Woran der Verein diese Saison international teilnimmt. */
  continentalEntry: ContinentalEntry;
  /** Was in der zuletzt gerechneten Halbserie geschehen ist. */
  facts: CareerFact[];
  /** Angestoßene Ereignisse, die noch fällig werden. */
  scheduledEvents: ScheduledEvent[];
  seasons: SeasonRecord[];
  /**
   * Die Entscheidungen, die gerade anstehen. Eine bei der Jugendakademie und
   * beim Karriereende, drei in jeder Pause. Sie werden gemeinsam beantwortet:
   * bis zum Anpfiff lässt sich jede noch ändern.
   */
  pendingSet: PendingDecision[];
  /** Ergebnis der zuletzt simulierten Halbserie, wartet auf Bestätigung. */
  pendingReport: PeriodReport | null;
  /** Die Saison wartet auf den Anpfiff. */
  pendingKickoff: boolean;
  /** Ob die laufende Saison schon angepfiffen wurde. */
  seasonStarted: boolean;
  /** Welche Entscheidung nach dem Bericht ansteht. */
  reportContext: 'winter' | 'summer' | null;
  /** Von einem Ereignis erzwungener Wechsel, der beim nächsten Schritt ausgeführt wird. */
  pendingTransfer: { scope: TransferScope; leagueStrengthMax?: number } | null;
  activeEffects: ActiveEffect[];
  deferredOverall: { delta: number; dueYear: number }[];
  eventHistory: { id: string; year: number }[];
  randomEventHistory: { id: string; year: number }[];
  suspensionHalves: number;
  lastInjuryYear: number | null;
  /** Spielweise des Trainers und Passung aus der zuletzt gerechneten Halbserie. */
  lastCoachBias: number;
  lastFormationFit: number;
  timeline: TimelineEntry[];
  retired: boolean;
}
