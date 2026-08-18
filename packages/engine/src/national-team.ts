import { clubOf, countryOf, leagueOf, type GameData } from './data';
import type { CareerState, CountryCode } from './types';

/**
 * Nationalmannschaft.
 *
 * Für welchen Verband jemand spielt, ist keine Frage der Geburt allein: es
 * zählen der zweite Pass und, nach langen Jahren im Ausland, die Einbürgerung.
 * Wer gut genug für einen starken Verband ist, hat die Wahl; wer es nicht ist,
 * bekommt allenfalls den schwächeren Anruf — oder gar keinen.
 *
 * Die Bindung entsteht erst mit dem ersten A-Länderspiel. Bis zum in
 * `progression.json` festgelegten Alter zählen Einsätze als Nachwuchsspiele
 * und lassen einen Wechsel offen.
 */

/** Alle Verbände, für die der Spieler grundsätzlich spielberechtigt ist. */
export function eligibleAssociations(data: GameData, state: CareerState): CountryCode[] {
  const player = state.player;
  const codes = new Set<CountryCode>([player.nationality]);
  if (player.secondNationality) codes.add(player.secondNationality);

  // Einbürgerung: erst nach genügend Saisons im Land und ab einem Mindestalter.
  const rules = data.progression.nationalTeam;
  for (const [code, seasons] of Object.entries(player.seasonsInCountry)) {
    if (seasons >= (rules.naturalisationSeasons as number)
      && player.age >= (rules.naturalisationMinAge as number)) {
      codes.add(code);
    }
  }
  return [...codes].filter((code) => data.countryByCode.has(code));
}

/** Ruft dieser Verband bei diesem Leistungsstand an? */
export function callsUp(data: GameData, state: CareerState, code: CountryCode): boolean {
  const country = countryOf(data, code);
  const threshold = data.progression.nationalTeam
    .minOverallByCountryStrength[String(country.strength)] as number;
  return state.player.overall >= threshold;
}

/**
 * Die Verbände, die den Spieler gerade nehmen würden — der stärkste zuerst.
 * Ist die Liste leer, ruft niemand an.
 */
export function callingAssociations(data: GameData, state: CareerState): CountryCode[] {
  return eligibleAssociations(data, state)
    .filter((code) => callsUp(data, state, code))
    .sort((a, b) => countryOf(data, b).strength - countryOf(data, a).strength);
}

/** Ist die Verbandswahl noch offen? */
export function canStillSwitch(data: GameData, state: CareerState): boolean {
  const lockAge = data.progression.nationalTeam.aTeamLockAge as number;
  return state.player.firstSeniorCapAge === null || state.player.firstSeniorCapAge < lockAge;
}

/**
 * Der Verband, für den in dieser Halbserie gespielt wird. Solange die Wahl
 * offen ist, kann sie sich noch verschieben; danach zählt nur der gebundene
 * Verband — und auch nur, solange er überhaupt noch anruft.
 */
export function activeAssociation(data: GameData, state: CareerState): CountryCode | null {
  const player = state.player;

  if (player.nationalTeam && !canStillSwitch(data, state)) {
    return callsUp(data, state, player.nationalTeam) ? player.nationalTeam : null;
  }

  const calling = callingAssociations(data, state);
  if (calling.length === 0) return null;
  if (player.nationalTeam && calling.includes(player.nationalTeam)) return player.nationalTeam;
  return calling[0]!;
}

/** Vermerkt eine Saison im Land des aktuellen Vereins. */
export function recordSeasonInCountry(data: GameData, state: CareerState): void {
  if (!state.clubId) return;
  const country = leagueOf(data, clubOf(data, state.clubId)).country;
  state.player.seasonsInCountry[country] = (state.player.seasonsInCountry[country] ?? 0) + 1;
}
