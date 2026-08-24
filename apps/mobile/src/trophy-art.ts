import type React from 'react';
import type { GameData } from '@footsys/engine';
import ContinentalPrimary from '../../../assets/_fallback/trophies/continental-primary.svg';
import DomesticCup from '../../../assets/_fallback/trophies/domestic-cup.svg';
import GoldenBall from '../../../assets/_fallback/trophies/individual-golden-ball.svg';
import GoldenBoot from '../../../assets/_fallback/trophies/individual-golden-boot.svg';
import LeagueShield from '../../../assets/_fallback/trophies/league-shield.svg';
import WorldCup from '../../../assets/_fallback/trophies/world-cup.svg';

/**
 * Die Form einer gewonnenen Trophäe.
 *
 * In `assets/trophies` liegen 2460 Bilder, benannt nach Nummern aus einer
 * fremden Quelle. Ohne eine Zuordnungstabelle lässt sich keines davon sicher
 * einem Wettbewerb zuweisen, und ein falsch beschriftetes Wappen wäre schlimmer
 * als eine ehrliche, allgemeine Form. Deshalb steht statt eines geratenen
 * Bildes eine passende Silhouette: ein Schild für die Liga, ein Pokal für den
 * Landespokal, die Kontinentaltrophäe, der Weltpokal, Ball oder Schuh für
 * Einzelauszeichnungen. Den genauen Titel nennt der Hinweis beim Darüberfahren.
 *
 * Sobald die Bilder zugeordnet sind, tritt an diese Stelle das echte Foto.
 */
export type TrophyArt = React.ComponentType<{ width?: number; height?: number; color?: string }>;

const bySlot: Record<string, TrophyArt> = {
  'league-shield': LeagueShield,
  'domestic-cup': DomesticCup,
  'continental-primary': ContinentalPrimary,
  'world-cup': WorldCup,
  'individual-golden-ball': GoldenBall,
  'individual-golden-boot': GoldenBoot,
};

// Die Daten kennen 14 feine Trophäen-Kategorien; hier fallen sie auf die sechs
// vorhandenen Formen zusammen. Was keine eigene Form hat, nimmt die nächste,
// die passt: alle Kontinentalpokale die Kontinentaltrophäe, Weltpokal und
// Klub-WM und Olympia den Weltpokal, Superpokal den Landespokal, die übrigen
// Einzelauszeichnungen den Ball.
const slotByCategory: Record<string, keyof typeof bySlot> = {
  'continental-national': 'continental-primary',
  'continental-primary': 'continental-primary',
  'continental-secondary': 'continental-primary',
  'continental-tertiary': 'continental-primary',
  'continental-youth': 'continental-primary',
  supercup: 'domestic-cup',
  'world-cup': 'world-cup',
  'world-club': 'world-cup',
  olympic: 'world-cup',
  'individual-golden-ball': 'individual-golden-ball',
  'individual-golden-boot': 'individual-golden-boot',
  'individual-golden-glove': 'individual-golden-ball',
  'individual-playmaker': 'individual-golden-ball',
  'individual-young': 'individual-golden-ball',
};

interface CompetitionLike { trophy?: string }
const competitionCache = new WeakMap<GameData, Map<string, CompetitionLike>>();

function competitionIndex(data: GameData): Map<string, CompetitionLike> {
  const cached = competitionCache.get(data);
  if (cached) return cached;
  const index = new Map<string, CompetitionLike>();
  const groups = data.competitions as Record<string, (CompetitionLike & { id: string })[]>;
  for (const key of ['club', 'national', 'individual'] as const) {
    for (const entry of groups[key] ?? []) index.set(entry.id, entry);
  }
  competitionCache.set(data, index);
  return index;
}

/** Die Trophäenform zu einem Titel, egal ob Liga, Pokal oder Wettbewerb. */
export function trophyArt(data: GameData, id: string): TrophyArt {
  if (data.leagueById.has(id)) return LeagueShield;
  if (data.cupById.has(id)) return DomesticCup;
  const category = competitionIndex(data).get(id)?.trophy;
  const slot = (category && slotByCategory[category]) ?? 'continental-primary';
  return bySlot[slot] ?? ContinentalPrimary;
}
