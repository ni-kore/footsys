import { loadGameData } from '../data-node';
import { acknowledge, careerTotals, createCareer, decide, kickOff } from '../career';
import { Rng } from '../rng';
import type { CareerState, PositionId } from '../types';

/** Balancing-Lauf gegen die Zieltabelle aus docs/iteration-2.md. */
const data = loadGameData();
const RUNS = Number(process.argv[2] ?? 120);

function play(seed: string, surname: string) {
  const rng = new Rng('choice-' + seed);
  let state: CareerState = createCareer(data, {
    seed,
    mode: 'normal',
    identity: {
      surname, shirtNumber: 9, nationality: 'GER',
      position: rng.pick(['ST', 'CM', 'CB', 'LW', 'GK'] as PositionId[]),
      strongFoot: 'right', weakFoot: 3, formationId: '4-2-3-1',
    },
    startYear: 2026,
  });

  let guard = 0;
  let peak = 0;
  while (!state.retired && guard < 900) {
    guard += 1;
    peak = Math.max(peak, state.player.overall);
    if (state.pendingKickoff) { state = kickOff(data, state); continue; }
    if (state.pendingReport) { state = acknowledge(data, state); continue; }
    if (state.pendingSet.length > 0) {
      state = decide(data, state, state.pendingSet.map((d) => rng.pick(d.options).id));
      continue;
    }
    break;
  }

  const totals = careerTotals(state);
  const continental = new Set(
    data.competitions.club.filter((c) => c.level === 'continental_primary').map((c) => c.id),
  );
  const contTitles = state.seasons.flatMap((s) => s.titles).filter((t) => continental.has(t)).length;

  return {
    peak,
    titles: totals.titles,
    awards: totals.awards,
    continental: contTitles,
    fans: state.player.fans,
    seasons: state.seasons.length,
    bestPosition: Math.min(...state.seasons.map((s) => s.team?.position ?? 99), 99),
  };
}

const runs = Array.from({ length: RUNS }, (_, i) => play('balance-' + i, 'Test'));
const q = (list: number[], p: number) => {
  const sorted = [...list].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]!;
};
const peaks = runs.map((r) => r.peak);
const titles = runs.map((r) => r.titles);
const fans = runs.map((r) => r.fans);

console.log('Karrieren:', RUNS);
console.log('Spitzen-OVR   p10 ' + Math.round(q(peaks, 0.1)) + '  p50 ' + Math.round(q(peaks, 0.5))
  + '  p90 ' + Math.round(q(peaks, 0.9)) + '  max ' + Math.round(q(peaks, 1)));
console.log('Titel         p10 ' + q(titles, 0.1) + '  p50 ' + q(titles, 0.5)
  + '  p90 ' + q(titles, 0.9) + '  max ' + q(titles, 1));
console.log('ohne Titel    ' + Math.round(runs.filter((r) => r.titles === 0).length / RUNS * 100) + '%');
console.log('mit Kontinentaltitel ' + Math.round(runs.filter((r) => r.continental > 0).length / RUNS * 100) + '%');
console.log('Auszeichnungen p50 ' + q(runs.map((r) => r.awards), 0.5) + '  p90 ' + q(runs.map((r) => r.awards), 0.9));
console.log('Fans          p50 ' + q(fans, 0.5).toLocaleString('de-DE') + '  p90 ' + q(fans, 0.9).toLocaleString('de-DE')
  + '  max ' + q(fans, 1).toLocaleString('de-DE'));
console.log('bester Platz  p50 ' + q(runs.map((r) => r.bestPosition), 0.5));
