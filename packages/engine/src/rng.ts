/**
 * Deterministischer Zufallsgenerator.
 *
 * Die gesamte Engine zieht ausschließlich hierüber. `Math.random()` kommt im
 * Enginecode nicht vor — sonst wäre eine Karriere nicht reproduzierbar und
 * Tests wären nutzlos. Der Zustand ist eine einzelne Zahl und wird im
 * Spielstand mitgeführt: gleicher Seed plus gleiche Entscheidungen ergeben
 * immer dieselbe Karriere.
 */

/** 32-Bit-Hash (FNV-1a) für den Start-Seed. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class Rng {
  private s: number;

  constructor(seedOrState: string | number) {
    this.s = typeof seedOrState === 'string' ? hashSeed(seedOrState) : seedOrState >>> 0;
  }

  /** Aktueller Zustand — gehört in den Spielstand. */
  get state(): number {
    return this.s;
  }

  /** mulberry32: schnell, klein, für Spielzwecke mehr als ausreichend. */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Gleichverteilt in [min, max). */
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Gleichverteilt in [min, max], beide Grenzen inklusive. */
  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1));
  }

  /** true mit Wahrscheinlichkeit p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: leere Liste');
    return items[Math.floor(this.next() * items.length)]!;
  }

  /** Gewichtete Auswahl. Gewichte müssen positiv sein. */
  weighted<T>(items: readonly { item: T; weight: number }[]): T {
    const total = items.reduce((sum, e) => sum + e.weight, 0);
    if (total <= 0) throw new Error('Rng.weighted: Gesamtgewicht ist 0');
    let roll = this.next() * total;
    for (const entry of items) {
      roll -= entry.weight;
      if (roll < 0) return entry.item;
    }
    return items[items.length - 1]!.item;
  }

  /** n verschiedene Elemente ohne Zurücklegen. Gibt weniger zurück, wenn die Liste kürzer ist. */
  sample<T>(items: readonly T[], n: number): T[] {
    const pool = [...items];
    const out: T[] = [];
    while (pool.length > 0 && out.length < n) {
      out.push(pool.splice(Math.floor(this.next() * pool.length), 1)[0]!);
    }
    return out;
  }

  /** n verschiedene Elemente, aber gewichtet gezogen. */
  weightedSample<T>(items: readonly { item: T; weight: number }[], n: number): T[] {
    const pool = [...items];
    const out: T[] = [];
    while (pool.length > 0 && out.length < n) {
      const chosen = this.weighted(pool);
      out.push(chosen);
      pool.splice(pool.findIndex((e) => e.item === chosen), 1);
    }
    return out;
  }
}
