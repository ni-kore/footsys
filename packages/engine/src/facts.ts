import { positionOf, type GameData } from './data';
import type { CareerFact, CareerState, HalfSeasonRecord } from './types';

/**
 * Was in einer Halbserie geschehen ist, in einer Form, auf die Ereignisse
 * reagieren können.
 *
 * Bisher hatte der Bericht keinen Einfluss darauf, welche Entscheidungen
 * danach anstanden: Verletzung, Platzverlust, Torserie, alles verpuffte. Diese
 * Tatsachen sind das Bindeglied. Ereignisse melden in ihren Daten an, worauf
 * sie reagieren, und der Satz der Pause wird daraus gefüllt.
 */

/** Ab so vielen Toren je Einsatz spricht man von einer Serie. */
const RUN_RATE = 0.6;

/** Unter diesem Einsatzanteil sitzt man faktisch daneben. */
const BENCH_SHARE = 0.2;

export function collectFacts(
  data: GameData, state: CareerState, half: HalfSeasonRecord,
): CareerFact[] {
  const facts: CareerFact[] = [];
  const player = state.player;
  const position = positionOf(data, player.position);
  const previous = state.currentSeasonHalves[state.currentSeasonHalves.length - 2];

  if (state.lastInjuryYear === state.year) facts.push('was_injured');
  if (state.suspensionHalves > 0) facts.push('suspended');

  if (previous) {
    const wasStarter = previous.role === 'starter' || previous.role === 'high_rotation';
    const isStarter = half.role === 'starter' || half.role === 'high_rotation';
    if (wasStarter && !isStarter) facts.push('lost_starting_spot');
    if (!wasStarter && isStarter) facts.push('won_starting_spot');
  }

  if (half.minutesShare < BENCH_SHARE) facts.push('benched');

  if (half.appearances >= 6) {
    const rate = half.goals / half.appearances;
    if (rate >= RUN_RATE) facts.push('scoring_run');
    // Für einen Stürmer ist eine Halbserie ohne Tor eine Nachricht, für einen
    // Innenverteidiger der Normalfall.
    if (half.goals === 0 && position.goalFactor >= 0.5) facts.push('goal_drought');
  }

  if (half.randomEventIds.includes('coach_sacked')) facts.push('new_coach');
  if (player.caps > 0 && player.caps === half.caps) facts.push('first_call_up');

  const interest = data.progression.marketInterest;
  if (player.marketInterest >= ((interest.qualityByInterest as [number, number][])[2]?.[0] ?? 65)) {
    facts.push('transfer_interest');
  }

  return facts;
}

/** Tatsachen, die erst am Saisonende feststehen. */
export function collectSeasonFacts(titles: string[], leagueMove?: 'promotion' | 'relegation'): CareerFact[] {
  const facts: CareerFact[] = [];
  if (titles.length > 0) facts.push('won_title');
  if (leagueMove === 'relegation') facts.push('relegated');
  if (leagueMove === 'promotion') facts.push('promoted');
  return facts;
}
