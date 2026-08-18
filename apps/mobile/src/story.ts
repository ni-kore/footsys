import { countryOf, positionOf, type CareerState, type GameData } from '@footsys/engine';

/**
 * Die Eröffnung einer Karriere.
 *
 * Bewusst knapp und in fester Form: dieselben Sätze für jeden Spieler, nur mit
 * seinen Werten gefüllt. Was zählt, sind die getroffenen Entscheidungen — die
 * Ausschmückung steht der Übersicht sonst im Weg.
 */
export function careerOpening(data: GameData, state: CareerState): string[] {
  const player = state.player;
  const home = countryOf(data, player.nationality).name.en;
  const position = positionOf(data, player.position);
  const formation = data.formations.find((f) => f.id === player.formationId);

  const origin = player.secondNationality
    ? `You are 16, grew up in ${home} and also hold ${article(countryOf(data, player.secondNationality).name.en)} ${countryOf(data, player.secondNationality).name.en} passport. Both associations can call you up.`
    : `You are 16 and grew up in ${home}.`;

  const foot = `Your ${player.strongFoot} foot is the stronger one, the other is rated ${player.weakFoot} out of 5.`;

  const game = `You play as ${article(position.name.en)} ${position.name.en.toLowerCase()} and prefer ${article(formation?.label ?? '')} ${formation?.label ?? 'system'}.`;

  const closing = player.legend
    ? 'Every academy in the country has already heard your name. Four of them made an offer.'
    : 'Four academies have made an offer.';

  return [origin, foot, game, closing];
}

/** Unbestimmter Artikel: „an attacking midfielder", nicht „a attacking". */
function article(word: string): string {
  return /^[aeiou8]/i.test(word) ? 'an' : 'a';
}
