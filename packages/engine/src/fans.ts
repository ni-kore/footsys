import { clubOf, type GameData } from './data';
import { clamp } from './progression';
import type { CareerState, HalfSeasonRecord } from './types';

/**
 * Die Anhängerschaft.
 *
 * Fans sind eine gezählte Größe: man beginnt mit zwei und kann am Ende die
 * halbe Welt hinter sich haben. Wie viele dazukommen, hängt an der Leistung
 * und an der Bühne — ein Tor für einen Viertligisten sehen ein paar hundert
 * Leute, eines für einen Weltverein Millionen.
 *
 * Wie zufrieden diese Leute sind, steht getrennt davon im Meter
 * \`fanSupport\`. Aus beidem zusammen entsteht der Druck, der eine Karriere
 * trägt oder erdrückt.
 */

/** Reichweite des Vereins, in dem gespielt wird. */
function reach(data: GameData, state: CareerState): number {
  if (!state.clubId) return 0;
  const club = clubOf(data, state.clubId);
  const table = data.progression.fans.reachByClubReputation as Record<string, number>;
  return table[String(club.reputation.international)] ?? 0;
}

/**
 * Fans nach einer Halbserie. Gute Auftritte auf großer Bühne bringen welche
 * dazu, schlechte Stimmung kostet welche.
 */
export function updateFans(
  data: GameData, state: CareerState, half: HalfSeasonRecord,
  titles = 0, awards = 0,
): void {
  const config = data.progression.fans;
  const player = state.player;

  const performance =
    half.appearances * (config.perAppearance as number)
    + half.goals * (config.perGoal as number)
    + half.assists * (config.perAssist as number)
    + half.cleanSheets * (config.perCleanSheet as number)
    + titles * (config.perTitle as number)
    + awards * (config.perAward as number);

  // Zufriedene Fans bringen Freunde mit, unzufriedene bleiben weg.
  const mood = config.moodBonus.atZero as number
    + (player.meters.fanSupport / 100)
      * ((config.moodBonus.atHundred as number) - (config.moodBonus.atZero as number));

  let fans = player.fans + performance * reach(data, state) * mood;

  // Unter einer gewissen Stimmung wandern Anhänger ab.
  const churn = config.churn;
  if (player.meters.fanSupport < (churn.belowSupport as number)) {
    const severity = ((churn.belowSupport as number) - player.meters.fanSupport)
      / (churn.belowSupport as number);
    fans *= 1 - severity * (churn.maxShare as number);
  }

  player.fans = Math.round(clamp(fans, 0, config.max as number));
}

/**
 * Einfluss der Anhängerschaft auf den OVR einer Saison.
 *
 * Eine große, zufriedene Anhängerschaft trägt; eine große, unzufriedene
 * erdrückt. Bei wenigen Fans passiert in beide Richtungen fast nichts — es
 * schaut ja kaum jemand hin.
 */
export function fanInfluence(data: GameData, state: CareerState): number {
  const config = data.progression.fans.overallInfluence;
  const weight = Math.min(1, state.player.fans / (config.fullEffectFans as number));
  const mood = (state.player.meters.fanSupport - 50) / 50;
  return weight * mood * (config.maxSwing as number);
}

/** Ab wie vielen Fans der Verein nicht mehr ohne Weiteres verkauft. */
export function clubHoldsOn(data: GameData, state: CareerState): boolean {
  return state.player.fans >= (data.progression.fans.clubHoldsFrom.fans as number);
}
