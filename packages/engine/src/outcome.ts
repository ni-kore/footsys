import type { EventModifiers, EventOption, LocalizedText, OutcomeLine } from './types';
import type { Locale } from './i18n';
import { tr } from './i18n';

/**
 * Was eine Wahl bedeutet, in Worten.
 *
 * Der Text entsteht aus den tatsächlichen Wirkungen und nicht aus einer
 * zweiten, von Hand gepflegten Beschreibung. So kann er nicht auseinander
 * laufen: was hier steht, passiert auch.
 *
 * Jede Aussage trägt ihren Ton mit: was einem hilft, steht grün da, was einen
 * etwas kostet, rot. Eine Wahl hat oft beides, und genau das soll man sehen.
 *
 * Absichtlich ohne Zahlen. Eine Karriere ist keine Tabelle, und wer wissen
 * will, wie viel genau, sieht es danach an den Werten.
 */

/** Ein Satzbaustein in allen drei Sprachen. */
type L = LocalizedText;
const L = (en: string, de: string, es: string): L => ({ en, de, es });

const PHRASE = {
  overallBig: L(
    'You come out of it a better player, and it shows on the pitch.',
    'Du gehst als besserer Spieler daraus hervor, und man sieht es auf dem Platz.',
    'Sales de esto siendo mejor jugador, y se nota en el campo.',
  ),
  overallSmall: L(
    'You get a shade better. Hardly measurable, but it is there.',
    'Du wirst eine Spur besser. Kaum messbar, aber da.',
    'Mejoras un pelín. Apenas medible, pero ahí está.',
  ),
  overallDown: L(
    'It takes something off your game.',
    'Es nimmt etwas von deinem Spiel.',
    'Le resta algo a tu juego.',
  ),
  deferredUp: L(
    'The reward only arrives next season, and then it arrives properly.',
    'Der Lohn kommt erst nächste Saison, dann aber richtig.',
    'La recompensa llega recién la próxima temporada, pero entonces llega de verdad.',
  ),
  deferredDown: L(
    'The bill for this lands next season.',
    'Die Rechnung dafür kommt nächste Saison.',
    'La factura de esto llega la próxima temporada.',
  ),
  moraleBig: L(
    'You go into the coming weeks feeling good about yourself.',
    'Du gehst mit gutem Gefühl in die kommenden Wochen.',
    'Encaras las próximas semanas sintiéndote bien contigo mismo.',
  ),
  moraleSmall: L(
    'It lifts your mood a little.',
    'Es hebt deine Stimmung ein wenig.',
    'Te levanta un poco el ánimo.',
  ),
  moraleDownBig: L(
    'It sits badly with you, and it stays that way for a while.',
    'Es sitzt dir schwer im Magen, und das bleibt eine Weile.',
    'Te sienta mal, y sigue así durante un tiempo.',
  ),
  moraleDown: L(
    'A small dent stays behind.',
    'Eine kleine Delle bleibt zurück.',
    'Queda una pequeña abolladura.',
  ),
  supportBig: L(
    'The stands get behind you.',
    'Die Ränge stehen hinter dir.',
    'Las gradas se ponen de tu lado.',
  ),
  supportSmall: L(
    'It goes down well with the supporters.',
    'Bei den Anhängern kommt es gut an.',
    'A la afición le sienta bien.',
  ),
  supportDownBig: L(
    'Your own supporters hold it against you.',
    'Deine eigenen Anhänger nehmen es dir übel.',
    'Tu propia afición te lo reprocha.',
  ),
  supportDown: L(
    'Some doubt is left on the terraces.',
    'Auf den Rängen bleibt ein Zweifel zurück.',
    'En las gradas queda algo de duda.',
  ),
  mediaBig: L(
    'The press writes kindly about you for a while.',
    'Die Presse schreibt eine Weile wohlwollend über dich.',
    'La prensa escribe bien de ti durante un tiempo.',
  ),
  mediaSmall: L(
    'You gain a little credit with the journalists.',
    'Du gewinnst etwas Kredit bei den Journalisten.',
    'Ganas algo de crédito con los periodistas.',
  ),
  mediaDownBig: L(
    'The press starts looking for a story at your expense.',
    'Die Presse sucht eine Geschichte auf deine Kosten.',
    'La prensa empieza a buscar un titular a tu costa.',
  ),
  mediaDown: L(
    'Something sticks in the newsrooms.',
    'In den Redaktionen bleibt etwas hängen.',
    'Algo queda pegado en las redacciones.',
  ),
  missBig: L(
    'You are out for a large part of the half-season.',
    'Du fällst einen großen Teil der Halbserie aus.',
    'Te pierdes gran parte de la media temporada.',
  ),
  missSmall: L(
    'You miss a handful of matches.',
    'Du verpasst eine Handvoll Spiele.',
    'Te pierdes un puñado de partidos.',
  ),
  zeroApps: L(
    'Your season ends here.',
    'Deine Saison endet hier.',
    'Tu temporada termina aquí.',
  ),
  suspended: L(
    'You are banned and watch from the side.',
    'Du bist gesperrt und schaust von draußen zu.',
    'Estás sancionado y miras desde fuera.',
  ),
  appsUp: L(
    'You are on the pitch more often.',
    'Du stehst öfter auf dem Platz.',
    'Estás en el campo más a menudo.',
  ),
  appsDown: L(
    'You are on the pitch less often.',
    'Du stehst seltener auf dem Platz.',
    'Estás en el campo con menos frecuencia.',
  ),
  goalsUp: L(
    'More falls to you in front of goal.',
    'Vor dem Tor fällt dir mehr zu.',
    'Te caen más ocasiones de cara al gol.',
  ),
  goalsDown: L(
    'Less falls to you in front of goal.',
    'Vor dem Tor fällt dir weniger zu.',
    'Te caen menos ocasiones de cara al gol.',
  ),
  assistsUp: L(
    'You set up more of them.',
    'Du legst mehr auf.',
    'Das más asistencias.',
  ),
  assistsDown: L(
    'You set up fewer of them.',
    'Du legst weniger auf.',
    'Das menos asistencias.',
  ),
  starter: L(
    'You are first choice.',
    'Du bist gesetzt.',
    'Eres titular indiscutible.',
  ),
  roleUp: L(
    'You move up the pecking order.',
    'Du rückst in der Hierarchie nach oben.',
    'Subes en la jerarquía del equipo.',
  ),
  roleDown: L(
    'You slip down the pecking order.',
    'Du rutschst in der Hierarchie nach unten.',
    'Bajas en la jerarquía del equipo.',
  ),
  rerollRole: L(
    'Your place in the squad is decided all over again.',
    'Dein Platz im Kader wird neu vergeben.',
    'Tu lugar en la plantilla se decide de nuevo.',
  ),
  captain: L(
    'You wear the armband from now on.',
    'Du trägst von nun an die Binde.',
    'Llevas el brazalete a partir de ahora.',
  ),
  forceTransfer: L(
    'You leave, and you choose where to.',
    'Du gehst, und du wählst wohin.',
    'Te vas, y tú eliges adónde.',
  ),
  interestBig: L(
    'Other clubs sit up and take notice.',
    'Andere Vereine werden hellhörig.',
    'Otros clubes se fijan en ti.',
  ),
  interestSmall: L(
    'Other clubs start looking closer.',
    'Andere Vereine schauen genauer hin.',
    'Otros clubes empiezan a mirarte de cerca.',
  ),
  interestDown: L(
    'Interest in you cools off.',
    'Das Interesse an dir kühlt ab.',
    'El interés por ti se enfría.',
  ),
  fansBig: L(
    'Many more people start following you.',
    'Viel mehr Leute folgen dir jetzt.',
    'Mucha más gente empieza a seguirte.',
  ),
  fansSmall: L(
    'A few more people start following you.',
    'Ein paar mehr Leute folgen dir jetzt.',
    'Algo más de gente empieza a seguirte.',
  ),
  fansDown: L(
    'Part of your following walks away.',
    'Ein Teil deiner Anhänger wendet sich ab.',
    'Parte de tus seguidores te da la espalda.',
  ),
  valueUp: L(
    'Your market value goes up.',
    'Dein Marktwert steigt.',
    'Tu valor de mercado sube.',
  ),
  valueDown: L(
    'Your market value drops.',
    'Dein Marktwert fällt.',
    'Tu valor de mercado baja.',
  ),
  nationalGo: L(
    'You travel with the national team.',
    'Du fährst mit der Nationalmannschaft.',
    'Viajas con la selección.',
  ),
  nationalSkip: L(
    'You sit the international window out.',
    'Du lässt das Länderspielfenster aus.',
    'Te saltas la ventana de selecciones.',
  ),
  changePosition: L(
    'You learn a new position.',
    'Du lernst eine neue Position.',
    'Aprendes una nueva posición.',
  ),
  switchNationality: L(
    'You change association.',
    'Du wechselst den Verband.',
    'Cambias de federación.',
  ),
  trophyShift: L(
    'It shifts what the team can realistically win.',
    'Es verschiebt, was die Mannschaft realistisch gewinnen kann.',
    'Cambia lo que el equipo puede ganar de forma realista.',
  ),
  schedules: L(
    'This could come back at you later.',
    'Das könnte dir später auf die Füße fallen.',
    'Esto podría volverse en tu contra más adelante.',
  ),
  ifComesOff: L('If it comes off: ', 'Wenn es klappt: ', 'Si sale bien: '),
  ifBackfires: L('If it backfires: ', 'Wenn es schiefgeht: ', 'Si sale mal: '),
  and: L(' and ', ' und ', ' y '),
};

export function optionSummary(option: EventOption, locale: Locale): OutcomeLine[] {
  // Wo ein Wurf entscheidet, gehören beide Ausgänge dazu. Das ist der Reiz.
  if (option.outcome) {
    const lines = [...outcomeSummary(option.modifiers, locale)];
    const good = outcomeSummary(option.outcome.success, locale);
    const bad = outcomeSummary(option.outcome.failure, locale);
    if (good.length > 0) {
      lines.push({ text: tr(PHRASE.ifComesOff, locale) + join(good, locale), tone: 'positive' });
    }
    if (bad.length > 0) {
      lines.push({ text: tr(PHRASE.ifBackfires, locale) + join(bad, locale), tone: 'negative' });
    }
    return lines;
  }
  return outcomeSummary(option.modifiers, locale);
}

/** Mehrere Folgen zu einem lesbaren Satz. */
function join(parts: OutcomeLine[], locale: Locale): string {
  const texts = parts.map((part) => lower(part.text.replace(/[.。]$/, '')));
  if (texts.length <= 1) return (texts[0] ?? '') + '.';
  return texts.slice(0, -1).join(', ') + tr(PHRASE.and, locale) + texts[texts.length - 1] + '.';
}

function lower(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export function outcomeSummary(
  modifiers: EventModifiers | undefined, locale: Locale,
): OutcomeLine[] {
  if (!modifiers) return [];
  const lines: OutcomeLine[] = [];
  const good = (phrase: L) => lines.push({ text: tr(phrase, locale), tone: 'positive' });
  const bad = (phrase: L) => lines.push({ text: tr(phrase, locale), tone: 'negative' });
  const plain = (phrase: L) => lines.push({ text: tr(phrase, locale), tone: 'neutral' });

  const overall = (modifiers.permanentOverall ?? 0) + (modifiers.immediateOverall ?? 0);
  if (overall >= 0.5) good(PHRASE.overallBig);
  else if (overall > 0) good(PHRASE.overallSmall);
  if (overall < 0) bad(PHRASE.overallDown);

  if (modifiers.deferredOverall) {
    if (modifiers.deferredOverall.delta > 0) good(PHRASE.deferredUp);
    else bad(PHRASE.deferredDown);
  }

  const morale = modifiers.meters?.morale ?? 0;
  if (morale >= 8) good(PHRASE.moraleBig);
  else if (morale > 0) good(PHRASE.moraleSmall);
  else if (morale <= -8) bad(PHRASE.moraleDownBig);
  else if (morale < 0) bad(PHRASE.moraleDown);

  const support = modifiers.meters?.fanSupport ?? 0;
  if (support >= 8) good(PHRASE.supportBig);
  else if (support > 0) good(PHRASE.supportSmall);
  if (support <= -8) bad(PHRASE.supportDownBig);
  else if (support < 0) bad(PHRASE.supportDown);

  const media = modifiers.meters?.mediaRelation ?? 0;
  if (media >= 8) good(PHRASE.mediaBig);
  else if (media > 0) good(PHRASE.mediaSmall);
  if (media <= -8) bad(PHRASE.mediaDownBig);
  else if (media < 0) bad(PHRASE.mediaDown);

  if (modifiers.missShare) {
    bad(modifiers.missShare >= 0.4 ? PHRASE.missBig : PHRASE.missSmall);
  }
  if (modifiers.forceZeroAppearances) bad(PHRASE.zeroApps);
  if (modifiers.suspendedSeasons) bad(PHRASE.suspended);

  if ((modifiers.appearanceMultiplier ?? 1) > 1) good(PHRASE.appsUp);
  if ((modifiers.appearanceMultiplier ?? 1) < 1) bad(PHRASE.appsDown);
  if ((modifiers.goalMultiplier ?? 1) > 1) good(PHRASE.goalsUp);
  if ((modifiers.goalMultiplier ?? 1) < 1) bad(PHRASE.goalsDown);
  if ((modifiers.assistMultiplier ?? 1) > 1) good(PHRASE.assistsUp);
  if ((modifiers.assistMultiplier ?? 1) < 1) bad(PHRASE.assistsDown);

  if (modifiers.roleOverride === 'starter') good(PHRASE.starter);
  if (modifiers.roleShift === 1) good(PHRASE.roleUp);
  if (modifiers.roleShift === -1) bad(PHRASE.roleDown);
  if (modifiers.rerollRole) plain(PHRASE.rerollRole);
  if (modifiers.setCaptain) good(PHRASE.captain);

  if (modifiers.forceTransfer) plain(PHRASE.forceTransfer);
  if ((modifiers.marketInterestDelta ?? 0) >= 10) good(PHRASE.interestBig);
  else if ((modifiers.marketInterestDelta ?? 0) > 0) good(PHRASE.interestSmall);
  if ((modifiers.marketInterestDelta ?? 0) < 0) bad(PHRASE.interestDown);

  if ((modifiers.fansMultiplier ?? 1) >= 1.2) good(PHRASE.fansBig);
  else if ((modifiers.fansMultiplier ?? 1) > 1) good(PHRASE.fansSmall);
  if ((modifiers.fansMultiplier ?? 1) < 1) bad(PHRASE.fansDown);

  if ((modifiers.marketValueMultiplier ?? 1) > 1) good(PHRASE.valueUp);
  if ((modifiers.marketValueMultiplier ?? 1) < 1) bad(PHRASE.valueDown);

  if (modifiers.nationalTeam === 'force') good(PHRASE.nationalGo);
  if (modifiers.nationalTeam === 'skip') bad(PHRASE.nationalSkip);
  if (modifiers.changePosition) plain(PHRASE.changePosition);
  if (modifiers.switchNationality) plain(PHRASE.switchNationality);
  if (modifiers.trophyMultiplier) plain(PHRASE.trophyShift);

  // Ketten bleiben bewusst vage: die Sorge gehört dazu.
  if (modifiers.schedules) bad(PHRASE.schedules);

  return lines;
}
