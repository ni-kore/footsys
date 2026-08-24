import { countryOf, positionOf, tr, type CareerState, type GameData, type Locale } from '@footsys/engine';

/**
 * Die Eröffnung einer Karriere.
 *
 * Bewusst knapp und in fester Form: dieselben Sätze für jeden Spieler, nur mit
 * seinen Werten gefüllt. Was zählt, sind die getroffenen Entscheidungen — die
 * Ausschmückung steht der Übersicht sonst im Weg.
 */
export function careerOpening(data: GameData, state: CareerState, locale: Locale): string[] {
  const player = state.player;
  const home = tr(countryOf(data, player.nationality).name, locale);
  const position = positionOf(data, player.position);
  const positionName = tr(position.name, locale).toLowerCase();
  const formation = data.formations.find((f) => f.id === player.formationId);
  const system = formation?.label ?? '';
  const foot = player.strongFoot;

  if (locale === 'de') {
    const second = player.secondNationality
      ? countryOf(data, player.secondNationality)
      : null;
    const origin = second
      ? `Du bist 16, in ${home} aufgewachsen und hast außerdem einen Pass von ${tr(second.name, locale)}. Beide Verbände können dich berufen.`
      : `Du bist 16 und in ${home} aufgewachsen.`;
    return [
      origin,
      `Dein ${foot === 'left' ? 'linker' : 'rechter'} Fuß ist der stärkere, der andere ist mit ${player.weakFoot} von 5 bewertet.`,
      `Du spielst als ${positionName} und bevorzugst das ${system}.`,
      player.legend
        ? 'Jede Akademie im Land kennt deinen Namen bereits. Vier haben ein Angebot gemacht.'
        : 'Vier Akademien haben ein Angebot gemacht.',
    ];
  }

  if (locale === 'es') {
    const second = player.secondNationality
      ? countryOf(data, player.secondNationality)
      : null;
    const origin = second
      ? `Tienes 16 años, creciste en ${home} y también tienes pasaporte de ${tr(second.name, locale)}. Ambas federaciones pueden convocarte.`
      : `Tienes 16 años y creciste en ${home}.`;
    return [
      origin,
      `Tu pie ${foot === 'left' ? 'izquierdo' : 'derecho'} es el más fuerte; el otro está valorado en ${player.weakFoot} de 5.`,
      `Juegas de ${positionName} y prefieres el ${system}.`,
      player.legend
        ? 'Cada academia del país ya conoce tu nombre. Cuatro han hecho una oferta.'
        : 'Cuatro academias han hecho una oferta.',
    ];
  }

  const secondEn = player.secondNationality
    ? tr(countryOf(data, player.secondNationality).name, locale)
    : null;
  const origin = secondEn
    ? `You are 16, grew up in ${home} and also hold ${article(secondEn)} ${secondEn} passport. Both associations can call you up.`
    : `You are 16 and grew up in ${home}.`;
  return [
    origin,
    `Your ${foot} foot is the stronger one, the other is rated ${player.weakFoot} out of 5.`,
    `You play as ${article(positionName)} ${positionName} and prefer ${article(system)} ${system || 'system'}.`,
    player.legend
      ? 'Every academy in the country has already heard your name. Four of them made an offer.'
      : 'Four academies have made an offer.',
  ];
}

/** Unbestimmter Artikel: „an attacking midfielder", nicht „a attacking". */
function article(word: string): string {
  return /^[aeiou8]/i.test(word) ? 'an' : 'a';
}
