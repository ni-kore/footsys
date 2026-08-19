import type {
  CareerEvent, Club, ClubFile, ClubCompetition, Confederation, ConfederationId, Country,
  CountryCode, DomesticCup, Formation, IndividualAward, League, NationalCompetition, Partner,
  Position, PositionId, RandomEvent, StructuralEvent,
} from './types';

/**
 * Rohe JSON-Inhalte, so wie sie in `data/` liegen. Die Engine bekommt sie
 * injiziert — sie liest nie selbst vom Dateisystem. Nur so läuft dieselbe
 * Engine in Node (Tests, Balancing) und in React Native (gebündelte Imports).
 */
export interface RawGameData {
  confederations: Confederation[];
  countries: Country[];
  positions: Position[];
  formations: Formation[];
  leagues: League[];
  cups: DomesticCup[];
  clubFiles: ClubFile[];
  competitions: {
    club: ClubCompetition[];
    national: NationalCompetition[];
    individual: IndividualAward[];
  };
  progression: any;
  trophyOdds: any;
  meters: any;
  events: { structural: StructuralEvent[]; career: CareerEvent[] };
  randomEvents: { config: any; events: RandomEvent[] };
  partners: { rules: any; media: Partner[]; kit: Partner[] };
}

/** Indizierte, abfragebereite Spieldaten. */
export interface GameData extends RawGameData {
  clubs: Club[];
  countryByCode: Map<CountryCode, Country>;
  confederationById: Map<ConfederationId, Confederation>;
  leagueById: Map<string, League>;
  leaguesByCountry: Map<CountryCode, League[]>;
  cupById: Map<string, DomesticCup>;
  clubById: Map<string, Club>;
  clubsByLeague: Map<string, Club[]>;
  clubsByCountry: Map<CountryCode, Club[]>;
  positionById: Map<PositionId, Position>;
  careerEventById: Map<string, CareerEvent>;
  randomEventById: Map<string, RandomEvent>;
  partnerById: Map<string, Partner>;
}

export function createGameData(raw: RawGameData): GameData {
  const clubs = raw.clubFiles.flatMap((f) => f.clubs);

  const leagueById = new Map(raw.leagues.map((l) => [l.id, l]));
  const leaguesByCountry = groupBy(raw.leagues, (l) => l.country);
  const clubsByLeague = groupBy(clubs, (c) => c.league);

  const clubsByCountry = new Map<CountryCode, Club[]>();
  for (const club of clubs) {
    const league = leagueById.get(club.league);
    if (!league) continue;
    push(clubsByCountry, league.country, club);
  }

  return {
    ...raw,
    clubs,
    countryByCode: new Map(raw.countries.map((c) => [c.code, c])),
    confederationById: new Map(raw.confederations.map((c) => [c.id, c])),
    leagueById,
    leaguesByCountry,
    cupById: new Map(raw.cups.map((c) => [c.id, c])),
    clubById: new Map(clubs.map((c) => [c.id, c])),
    clubsByLeague,
    clubsByCountry,
    positionById: new Map(raw.positions.map((p) => [p.id, p])),
    careerEventById: new Map(raw.events.career.map((e) => [e.id, e])),
    randomEventById: new Map(raw.randomEvents.events.map((e) => [e.id, e])),
    partnerById: new Map(
      [...raw.partners.media, ...raw.partners.kit].map((p) => [p.id, p]),
    ),
  };
}

// ------------------------------------------------------------- Abfragen

export function leagueOf(data: GameData, club: Club): League {
  const league = data.leagueById.get(club.league);
  if (!league) throw new Error(`Liga ${club.league} zu Verein ${club.id} fehlt`);
  return league;
}

export function countryOfClub(data: GameData, club: Club): Country {
  const code = leagueOf(data, club).country;
  const country = data.countryByCode.get(code);
  if (!country) throw new Error(`Land ${code} fehlt`);
  return country;
}

export function countryOf(data: GameData, code: CountryCode): Country {
  const country = data.countryByCode.get(code);
  if (!country) throw new Error(`Land ${code} fehlt`);
  return country;
}

export function positionOf(data: GameData, id: PositionId): Position {
  const position = data.positionById.get(id);
  if (!position) throw new Error(`Position ${id} fehlt`);
  return position;
}

export function clubOf(data: GameData, id: string): Club {
  const club = data.clubById.get(id);
  if (!club) throw new Error(`Verein ${id} fehlt`);
  return club;
}

/** Alle Vereine, die in einer Liga des Landes spielen. */
export function clubsInCountry(data: GameData, code: CountryCode): Club[] {
  return data.clubsByCountry.get(code) ?? [];
}

/** Alle Vereine aus allen Ländern einer Konföderation. */
export function clubsInConfederation(data: GameData, confederation: ConfederationId): Club[] {
  return data.countries
    .filter((c) => c.confederation === confederation)
    .flatMap((c) => clubsInCountry(data, c.code));
}

/**
 * Der nächsthöhere oder nächsttiefere Ligaverein desselben Landes — für Auf-
 * und Abstieg. Gibt null zurück, wenn es keine solche Spielklasse gibt.
 */
export function leagueAtTier(data: GameData, country: CountryCode, tier: number): League | null {
  return (data.leaguesByCountry.get(country) ?? []).find((l) => l.tier === tier) ?? null;
}

// -------------------------------------------------------------- Helfer

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) push(map, key(item), item);
  return map;
}

function push<K, T>(map: Map<K, T[]>, key: K, value: T): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}
