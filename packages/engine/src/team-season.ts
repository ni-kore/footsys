import { clubOf, countryOfClub, leagueOf, positionOf, type GameData } from './data';
import { clamp } from './progression';
import type { Rng } from './rng';
import type {
  CareerState, Club, ClubCompetition, ContinentalEntry, League, TeamSeason,
} from './types';

/**
 * Die Saison der Mannschaft.
 *
 * Vorher entschied ein einzelner Wurf gegen die Vereinsreputation über jeden
 * Titel. Der Spieler kam darin nicht vor: ein Ergänzungsspieler beim
 * Spitzenklub wurde genauso oft Meister wie dessen bester Mann.
 *
 * Jetzt wird zuerst gespielt und dann gezählt. Die ganze Liga bekommt eine
 * Tabelle: jeder Verein der Spielklasse spielt seine Saison mit seiner Stärke
 * und seiner Form, der eigene Platz ist der Rang darin. Es gibt also je Saison
 * genau einen Meister, und ob man es wird, hängt daran, wer sonst noch in der
 * Liga steht. Titel, Europapokalplätze und Pokalrunden folgen daraus.
 *
 * Der Verein bleibt der bestimmende Teil. Wer bei einem Großen spielt, gewinnt
 * Titel, auch ohne herausragend zu sein. Der eigene Beitrag verschiebt den
 * Platz um wenige Ränge, bei kleinen Vereinen mehr als bei großen, weil dort
 * ein Einzelner mehr ausmacht.
 */

/** Wie viel ein Spieler zu dieser Saison beigetragen hat, in Tabellenplätzen. */
export function contributionShift(
  data: GameData, state: CareerState, minutesShare: number,
): number {
  const config = data.teamSeason.contribution;
  if (minutesShare < (config.minutesFloor as number)) return 0;

  const club = clubOf(data, state.clubId!);
  const rep = String(club.reputation.domestic);
  const starterLevel = (data.progression.roles.minOverallForStarter as Record<string, number>)[rep] ?? 70;
  const position = positionOf(data, state.player.position);

  const above = state.player.overall - starterLevel;
  const weight = (config.positionWeight as Record<string, number>)[position.group] ?? 1;
  const damping = (config.bigClubDamping as Record<string, number>)[rep] ?? 1;

  const raw = above * (config.perOverallPoint as number) * minutesShare * weight * damping;
  return clamp(raw, -(config.maxShift as number), config.maxShift as number);
}

/** Ein Zufallswert um null, angenähert normalverteilt. */
function noise(rng: Rng): number {
  return (rng.float(-1, 1) + rng.float(-1, 1) + rng.float(-1, 1)) / 1.5;
}

/**
 * Die Liga wird gespielt, nicht gewürfelt.
 *
 * Jeder Verein der Spielklasse bekommt eine Saisonstärke aus seiner Reputation
 * und einer Portion Form; sortiert ergibt das die Tabelle, und der eigene Rang
 * darin ist der Platz. Damit gibt es je Saison genau einen Meister, und ob man
 * es wird, hängt daran, wer sonst noch in der Liga steht: bei einem kleinen
 * Verein muss man an allen Großen vorbei, nicht nur an einer Schwelle.
 *
 * Kennt die Datenbank weniger Vereine als die Liga Plätze hat, füllen
 * namenlose Mitbewerber auf — sonst wäre eine dünn besetzte Liga leicht zu
 * gewinnen.
 */
function leaguePosition(
  data: GameData, rng: Rng, league: League, club: Club, shift: number,
): number {
  const config = data.teamSeason.position;
  const table = config.strengthByReputation as Record<string, number>;
  const form = config.formSpread as number;
  const strengthOf = (reputation: number): number => table[String(reputation)] ?? 0;

  const field = data.clubsByLeague.get(league.id) ?? [];
  const own = strengthOf(club.reputation.domestic) + noise(rng) * form;

  let better = 0;
  for (const other of field) {
    if (other.id === club.id) continue;
    if (strengthOf(other.reputation.domestic) + noise(rng) * form > own) better += 1;
  }
  const filler = config.fieldReputation as number;
  for (let i = field.length; i < league.teams; i += 1) {
    if (strengthOf(filler) + noise(rng) * form > own) better += 1;
  }

  // Erst steht die Tabelle, dann kommt der Spieler dazu: sein Beitrag hebt
  // oder senkt den Platz um wenige Ränge. Er wirkt also auf das Ergebnis der
  // Mannschaft, nicht auf die Kräfteverhältnisse der ganzen Liga.
  return clamp(Math.round(better + 1 - shift), 1, league.teams);
}

/** Anteil der Ligakonkurrenz, der schwächer ist als der eigene Verein. */
function strongerShare(data: GameData, league: League, club: Club): number {
  const field = data.clubsByLeague.get(league.id) ?? [];
  const rivals = field.filter((c) => c.id !== club.id);
  if (rivals.length === 0) return 0.5;
  const weaker = rivals.filter((c) => c.reputation.domestic < club.reputation.domestic).length;
  const equal = rivals.filter((c) => c.reputation.domestic === club.reputation.domestic).length;
  return (weaker + equal / 2) / rivals.length;
}

/**
 * Rechnet die Saison der Mannschaft und liefert Platz, Titel und die
 * Startplätze für das kommende Jahr.
 */
export function simulateTeamSeason(
  data: GameData, rng: Rng, state: CareerState, minutesShare: number,
): TeamSeason {
  const club = clubOf(data, state.clubId!);
  const league = leagueOf(data, club);
  const country = countryOfClub(data, club);
  const config = data.teamSeason;
  const rep = String(club.reputation.domestic);

  // ------------------------------------------------------------- Tabelle
  const shift = contributionShift(data, state, minutesShare);
  const position = leaguePosition(data, rng, league, club, shift);

  const titles: string[] = [];
  if (position === 1) titles.push(league.id);

  // --------------------------------------------------------------- Pokal
  const cup = config.domesticCup;
  if (league.cup) {
    // Im Pokal trifft man auf die eigene Liga. Wer dort zu den Größten zählt,
    // kommt Runde für Runde weiter — auch wenn er im Weltmaßstab klein ist.
    const [low, high] = cup.winPerRoundRange as [number, number];
    const base = (cup.winPerRoundBase as number)
      + (cup.winPerRoundPerRank as number) * strongerShare(data, league, club);
    const perRound = clamp(base + shift * (cup.seasonBonusPerShift as number), low, high);
    if (winsAllRounds(rng, cup.rounds as number, perRound)) titles.push(league.cup);
  }

  // ------------------------------------------------------- Kontinental
  const entry = state.continentalEntry;
  if (entry && entry !== 'none') {
    const competition = competitionFor(data, country.confederation, levelOf(entry));
    if (competition) {
      const cont = config.continental;
      const bonus = entry === 'secondary'
        ? (cont.secondaryRoundBonus as number)
        : entry === 'tertiary' ? (cont.tertiaryRoundBonus as number) : 0;
      const base = (cont.winPerRoundByReputation as Record<string, number>)[
        String(club.reputation.continental)
      ] ?? 0.4;
      const perRound = clamp(
        base + bonus + shift * (cont.seasonBonusPerShift as number), 0.05, 0.95,
      );
      if (winsAllRounds(rng, cont.rounds as number, perRound)) titles.push(competition.id);
    }
  }

  // -------------------------------------------------- Supercup und Klub-WM
  const lastSeason = state.seasons[state.seasons.length - 1];
  const wonLast = (id: string | null | undefined): boolean =>
    !!id && (lastSeason?.titles.includes(id) ?? false);

  if (league.secondaryCup && (wonLast(league.id) || wonLast(league.cup))) {
    const chance = (config.superCup.winChanceByReputation as Record<string, number>)[rep] ?? 0.5;
    if (rng.chance(chance)) titles.push(league.secondaryCup);
  }

  const primary = competitionFor(data, country.confederation, 'continental_primary');
  if (primary && wonLast(primary.id)) {
    const chance = (config.clubWorldCup.winChanceByReputation as Record<string, number>)[
      String(club.reputation.international)
    ] ?? 0.3;
    if (rng.chance(chance)) titles.push('fifa-club-world-cup');
  }

  return {
    position,
    teams: league.teams,
    contributionShift: Math.round(shift * 10) / 10,
    titles,
    nextEntry: qualificationFrom(league, position, titles),
  };
}

/** Alle Runden hintereinander gewinnen, sonst ist der Wettbewerb vorbei. */
function winsAllRounds(rng: Rng, rounds: number, perRound: number): boolean {
  for (let i = 0; i < rounds; i += 1) if (!rng.chance(perRound)) return false;
  return true;
}

function levelOf(entry: ContinentalEntry): ClubCompetition['level'] {
  if (entry === 'primary') return 'continental_primary';
  if (entry === 'secondary') return 'continental_secondary';
  return 'continental_tertiary';
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

/**
 * Woran man im kommenden Jahr teilnimmt. Der Tabellenplatz entscheidet, ein
 * Pokalsieg reicht für den zweiten Wettbewerb. Damit hängen Saisons zusammen,
 * statt jedes Jahr bei null anzufangen.
 */
function qualificationFrom(
  league: {
    continentalSlots: { primary: number; secondary: number; tertiary: number };
    cup?: string | null;
  },
  position: number,
  titles: string[],
): ContinentalEntry {
  const slots = league.continentalSlots;
  if (position <= slots.primary) return 'primary';
  if (league.cup && titles.includes(league.cup)) return 'secondary';
  if (position <= slots.primary + slots.secondary) return 'secondary';
  if (position <= slots.primary + slots.secondary + slots.tertiary) return 'tertiary';
  return 'none';
}
