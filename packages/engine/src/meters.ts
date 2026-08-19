import type { GameData } from './data';
import type { CareerState, MeterKey } from './types';

/**
 * Die Meter als Verstärker.
 *
 * Moral, Rückhalt und Presse erzeugen nichts aus dem Nichts. Sie verstärken
 * oder dämpfen, was ohnehin geschieht: wer nicht spielt, dem hilft auch beste
 * Moral nicht, und wer spielt, für den macht sie den Unterschied zwischen
 * soliden und herausragenden Zahlen.
 *
 * Jede Wirkung steht als Kurve in `meters.json`, damit sich alles über Daten
 * einstellen lässt und nicht über Zahlen im Quelltext.
 */

type Curve = [number, number][];

/** Linear zwischen den Stützstellen. */
function along(curve: Curve, value: number): number {
  if (curve.length === 0) return 1;
  const first = curve[0]!;
  if (value <= first[0]) return first[1];

  for (let i = 1; i < curve.length; i += 1) {
    const previous = curve[i - 1]!;
    const current = curve[i]!;
    if (value <= current[0]) {
      const span = current[0] - previous[0];
      if (span === 0) return current[1];
      const t = (value - previous[0]) / span;
      return previous[1] + (current[1] - previous[1]) * t;
    }
  }
  return curve[curve.length - 1]![1];
}

/**
 * Der Faktor, mit dem ein Meter an einer bestimmten Stelle wirkt.
 *
 * Fehlt die Kurve in den Daten, ist der Faktor 1: eine fehlende Einstellung
 * darf nie stillschweigend etwas verändern.
 */
export function meterFactor(
  data: GameData, state: CareerState, meter: MeterKey, effect: string,
): number {
  const curves = data.meters.curves?.[meter];
  if (!curves) return 1;

  const entry = curves[effect];
  if (!entry) return 1;

  // Manche Kurven stehen wegen ihres Kommentars in einem Objekt.
  const points: Curve = Array.isArray(entry) ? entry : entry.points;
  if (!Array.isArray(points)) return 1;

  return along(points, state.player.meters[meter]);
}
