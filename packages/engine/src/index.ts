/**
 * Öffentliche Schnittstelle der footsys-Engine.
 *
 * Die Engine ist rein funktional und kennt keine UI. Sie bekommt die Spieldaten
 * injiziert und liefert zu jedem Zeitpunkt entweder eine offene Entscheidung
 * oder eine beendete Karriere.
 *
 * Ablauf:
 *   const state = createCareer(data, { seed, mode, identity });
 *   // state.pending enthält die erste Entscheidung
 *   const next = decide(data, state, optionId);
 *   // wiederholen, bis next.retired === true
 */

export { createGameData, type GameData, type RawGameData } from './data';
export { clubOf, countryOf, countryOfClub, leagueOf, positionOf } from './data';
export {
  createCareer, decide, acknowledge, kickOff, careerTotals, liveTotals, trophyCabinet,
  titleName, awardName, isNationalTitle, type CareerOptions,
} from './career';
export { Rng, hashSeed } from './rng';
export { computeRole, marketValue, salary } from './progression';
export { collectEffects, currentRole, isEligibleForNationalTeam } from './simulation';
export { academyOffers, clubOffers, rivalOf } from './events';
export { activeAssociation, callingAssociations, canStillSwitch, eligibleAssociations } from './national-team';
export { clubHoldsOn, fanInfluence } from './fans';
export { offerReputationBonus, partnerFanFactor, partnerOf, reachOf } from './partners';
export { meterFactor } from './meters';
export { optionSummary } from './outcome';
export { contributionShift, simulateTeamSeason } from './team-season';
export * from './types';
