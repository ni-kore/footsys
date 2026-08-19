import type { EventModifiers, EventOption, OutcomeLine } from './types';

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
 * will, wie viel genau, sieht es danach an den Werten. Die Sätze sind
 * englisch, weil es die Oberfläche auch ist.
 */
export function optionSummary(option: EventOption): OutcomeLine[] {
  // Wo ein Wurf entscheidet, gehören beide Ausgänge dazu. Das ist der Reiz.
  if (option.outcome) {
    const lines = [...outcomeSummary(option.modifiers)];
    const good = outcomeSummary(option.outcome.success);
    const bad = outcomeSummary(option.outcome.failure);
    if (good.length > 0) lines.push({ text: 'If it comes off: ' + join(good), tone: 'positive' });
    if (bad.length > 0) lines.push({ text: 'If it backfires: ' + join(bad), tone: 'negative' });
    return lines;
  }
  return outcomeSummary(option.modifiers);
}

/** Mehrere Folgen zu einem lesbaren Satz. */
function join(parts: OutcomeLine[]): string {
  const texts = parts.map((part) => lower(part.text.replace(/\.$/, '')));
  if (texts.length <= 1) return (texts[0] ?? '') + '.';
  return texts.slice(0, -1).join(', ') + ' and ' + texts[texts.length - 1] + '.';
}

function lower(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export function outcomeSummary(modifiers: EventModifiers | undefined): OutcomeLine[] {
  if (!modifiers) return [];
  const lines: OutcomeLine[] = [];
  const good = (text: string) => lines.push({ text, tone: 'positive' });
  const bad = (text: string) => lines.push({ text, tone: 'negative' });
  const plain = (text: string) => lines.push({ text, tone: 'neutral' });

  const overall = (modifiers.permanentOverall ?? 0) + (modifiers.immediateOverall ?? 0);
  if (overall >= 0.5) good('You come out of it a better player, and it shows on the pitch.');
  else if (overall > 0) good('You get a shade better. Hardly measurable, but it is there.');
  if (overall < 0) bad('It takes something off your game.');

  if (modifiers.deferredOverall) {
    if (modifiers.deferredOverall.delta > 0) {
      good('The reward only arrives next season, and then it arrives properly.');
    } else {
      bad('The bill for this lands next season.');
    }
  }

  const morale = modifiers.meters?.morale ?? 0;
  if (morale >= 8) good('You go into the coming weeks feeling good about yourself.');
  else if (morale > 0) good('It lifts your mood a little.');
  else if (morale <= -8) bad('It sits badly with you, and it stays that way for a while.');
  else if (morale < 0) bad('A small dent stays behind.');

  const support = modifiers.meters?.fanSupport ?? 0;
  if (support >= 8) good('The stands get behind you.');
  else if (support > 0) good('It goes down well with the supporters.');
  if (support <= -8) bad('Your own supporters hold it against you.');
  else if (support < 0) bad('Some doubt is left on the terraces.');

  const media = modifiers.meters?.mediaRelation ?? 0;
  if (media >= 8) good('The press writes kindly about you for a while.');
  else if (media > 0) good('You gain a little credit with the journalists.');
  if (media <= -8) bad('The press starts looking for a story at your expense.');
  else if (media < 0) bad('Something sticks in the newsrooms.');

  if (modifiers.missShare) {
    bad(modifiers.missShare >= 0.4
      ? 'You are out for a large part of the half-season.'
      : 'You miss a handful of matches.');
  }
  if (modifiers.forceZeroAppearances) bad('Your season ends here.');
  if (modifiers.suspendedSeasons) bad('You are banned and watch from the side.');

  if ((modifiers.appearanceMultiplier ?? 1) > 1) good('You are on the pitch more often.');
  if ((modifiers.appearanceMultiplier ?? 1) < 1) bad('You are on the pitch less often.');
  if ((modifiers.goalMultiplier ?? 1) > 1) good('More falls to you in front of goal.');
  if ((modifiers.goalMultiplier ?? 1) < 1) bad('Less falls to you in front of goal.');
  if ((modifiers.assistMultiplier ?? 1) > 1) good('You set up more of them.');
  if ((modifiers.assistMultiplier ?? 1) < 1) bad('You set up fewer of them.');

  if (modifiers.roleOverride === 'starter') good('You are first choice.');
  if (modifiers.roleShift === 1) good('You move up the pecking order.');
  if (modifiers.roleShift === -1) bad('You slip down the pecking order.');
  if (modifiers.rerollRole) plain('Your place in the squad is decided all over again.');
  if (modifiers.setCaptain) good('You wear the armband from now on.');

  if (modifiers.forceTransfer) plain('You leave, and you choose where to.');
  if ((modifiers.marketInterestDelta ?? 0) >= 10) good('Other clubs sit up and take notice.');
  else if ((modifiers.marketInterestDelta ?? 0) > 0) good('Other clubs start looking closer.');
  if ((modifiers.marketInterestDelta ?? 0) < 0) bad('Interest in you cools off.');

  if ((modifiers.fansMultiplier ?? 1) >= 1.2) good('Many more people start following you.');
  else if ((modifiers.fansMultiplier ?? 1) > 1) good('A few more people start following you.');
  if ((modifiers.fansMultiplier ?? 1) < 1) bad('Part of your following walks away.');

  if ((modifiers.marketValueMultiplier ?? 1) > 1) good('Your market value goes up.');
  if ((modifiers.marketValueMultiplier ?? 1) < 1) bad('Your market value drops.');

  if (modifiers.nationalTeam === 'force') good('You travel with the national team.');
  if (modifiers.nationalTeam === 'skip') bad('You sit the international window out.');
  if (modifiers.changePosition) plain('You learn a new position.');
  if (modifiers.switchNationality) plain('You change association.');
  if (modifiers.trophyMultiplier) plain('It shifts what the team can realistically win.');

  // Ketten bleiben bewusst vage: die Sorge gehört dazu.
  if (modifiers.schedules) bad('This could come back at you later.');

  return lines;
}
