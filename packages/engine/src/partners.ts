import { clubOf, leagueOf, type GameData } from './data';
import type { CareerState, Partner, PartnerKind } from './types';
import type { Rng } from './rng';

/**
 * Partner: Medien und Ausrüster.
 *
 * Beide sind ein Zusatz, kein Muss. Man kann eine ganze Karriere ohne sie
 * spielen. Wer aber auffällt, wird irgendwann angesprochen, und ab dann läuft
 * im Hintergrund etwas mit:
 *
 * Ein Medienpartner berichtet. Das bringt Zuschauer, also Fans, und macht
 * andere Vereine auf einen aufmerksam.
 *
 * Ein Ausrüster stattet aus. Das bringt weniger Fans, öffnet dafür Türen: wer
 * dieselbe Marke trägt wie die großen Vereine, taucht dort eher auf einem
 * Zettel auf.
 *
 * Wie stark das wirkt, hängt an der Reichweite der Marke. Ein Fankanal mit
 * zweitausend Zuschauern ändert wenig, ein Weltsender viel.
 */

function list(data: GameData, kind: PartnerKind): Partner[] {
  return kind === 'media' ? data.partners.media : data.partners.kit;
}

function rules(data: GameData, kind: PartnerKind) {
  return data.partners.rules[kind];
}

/** Bis wann der laufende Vertrag gilt. */
function runsUntil(state: CareerState, kind: PartnerKind): number | null {
  return kind === 'media' ? state.player.mediaPartnerUntil : state.player.kitSupplierUntil;
}

/**
 * Wo eine Marke überhaupt anklopft.
 *
 * Ein Vereinssender begleitet den eigenen Verein, keinen anderen: PAOK TV
 * dreht nicht über einen Spieler in Valencia. Eine Landeszeitung berichtet im
 * eigenen Land — und über einen Landsmann auch, wenn er im Ausland spielt.
 * Alles andere ist international.
 */
export function partnerFits(data: GameData, state: CareerState, partner: Partner): boolean {
  // Auf Leihe zählt auch der Stammverein: sein Sender begleitet einen weiter.
  if (partner.club) return state.clubId === partner.club || state.contractClubId === partner.club;
  if (!partner.country) return true;
  if (partner.country === state.player.nationality) return true;
  if (partner.country === state.player.secondNationality) return true;
  if (!state.clubId) return false;
  return leagueOf(data, clubOf(data, state.clubId)).country === partner.country;
}

/** Der Partner, den ein Spieler gerade hat. */
export function partnerOf(data: GameData, state: CareerState, kind: PartnerKind): Partner | null {
  const id = kind === 'media' ? state.player.mediaPartner : state.player.kitSupplier;
  if (!id) return null;
  return list(data, kind).find((p) => p.id === id) ?? null;
}

/** Reichweite des aktuellen Partners, 0 ohne. */
export function reachOf(data: GameData, state: CareerState, kind: PartnerKind): number {
  return partnerOf(data, state, kind)?.reach ?? 0;
}

/**
 * Faktor auf den Fanzuwachs einer Halbserie. Ohne Partner bleibt es bei 1,
 * mit beiden auf voller Reichweite etwa beim Doppelten.
 */
export function partnerFanFactor(data: GameData, state: CareerState): number {
  const media = reachOf(data, state, 'media') * (rules(data, 'media').fansPerReach as number);
  const kit = reachOf(data, state, 'kit') * (rules(data, 'kit').fansPerReach as number);
  return 1 + media + kit;
}

/**
 * Wie viele Stufen besser ein anbietender Verein sein darf.
 *
 * Ein Partner sorgt dafür, dass man gesehen wird. Ab der in den Regeln
 * hinterlegten Reichweite reicht es für eine Stufe mehr, weit darüber für
 * zwei. Sicher ist das nie: das Interesse muss trotzdem erst entstehen.
 */
export function offerReputationBonus(data: GameData, state: CareerState): number {
  let bonus = 0;
  for (const kind of ['media', 'kit'] as PartnerKind[]) {
    const reach = reachOf(data, state, kind);
    const from = rules(data, kind).clubInterestFromReach as number;
    if (reach >= from) bonus += 1;
    if (reach >= from + 3) bonus += 1;
  }
  return bonus;
}

/**
 * Ob in dieser Sommerpause jemand anklopft.
 *
 * Bedingungen sind Stärke und Anhängerschaft: Marken kommen nicht zu jedem,
 * und sie kommen auch dann nicht immer.
 */
export function partnerOffersNow(
  data: GameData, rng: Rng, state: CareerState, kind: PartnerKind,
): boolean {
  const config = rules(data, kind);
  // Ein laufender Vertrag ist ein laufender Vertrag: solange er gilt, klopft
  // niemand an. Erst wenn er ausläuft, steht die Frage wieder im Raum.
  const until = runsUntil(state, kind);
  if (until !== null && state.year < until) return false;
  if (state.player.overall < (config.minOverall as number)) return false;
  if (state.player.fans < (config.minFans as number)) return false;
  if (list(data, kind).length === 0) return false;
  // Wer gerade eine Marke hat, deren Vertrag ausläuft, wird sowieso gefragt.
  if (partnerOf(data, state, kind)) return true;
  return rng.chance(config.chancePerSummer as number);
}

/** Wie viele Saisons ein neuer Vertrag läuft. */
export function contractSeasons(data: GameData, rng: Rng, kind: PartnerKind): number {
  const config = rules(data, kind);
  const [min, max] = config.contractSeasons as [number, number];
  return min + Math.floor(rng.next() * (max - min + 1));
}

/**
 * Die Marken, die gerade zu einem passen.
 *
 * Wer stärker wird, wird für größere Namen interessant. Um die passende
 * Reichweite herum liegt ein Fenster, aus dem gezogen wird, damit nicht jede
 * Karriere dieselben Partner sieht. Ein bestehender Partner wird nie erneut
 * angeboten.
 */
export function partnerOffers(
  data: GameData, rng: Rng, state: CareerState, kind: PartnerKind,
): Partner[] {
  const config = data.partners.rules;
  const current = kind === 'media' ? state.player.mediaPartner : state.player.kitSupplier;

  const target = (state.player.overall - 55) * (config.reachPerOverall as number);
  const spread = config.reachSpread as number;

  const eligible = list(data, kind)
    .filter((partner) => partner.id !== current)
    .filter((partner) => partnerFits(data, state, partner));

  const pool = eligible.filter((partner) => Math.abs(partner.reach - target) <= spread);
  return rng.sample(pool.length > 0 ? pool : eligible, config.offers as number);
}
