/**
 * Balancing-Werkzeug.
 *
 * Spielt sehr viele Karrieren komplett durch — mit zufällig gewählten Optionen —
 * und gibt die Verteilung aus. Damit lässt sich prüfen, ob die Zahlen in
 * `data/game/` ein sinnvolles Spiel ergeben, ohne dass jemand hundert Karrieren
 * per Hand klicken muss.
 *
 *   npm run sim -- --runs 500 --mode normal --position ST --country GER
 */

import { acknowledge, careerTotals, createCareer, decide, kickOff, titleName } from '../career';
import { loadGameData } from '../data-node';
import { Rng } from '../rng';
import type { CareerState, GameMode, PositionId } from '../types';

interface Args {
  runs: number;
  mode: GameMode;
  position: PositionId;
  country: string;
  verbose: boolean;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string, fallback: string): string => {
    const index = argv.indexOf(`--${flag}`);
    return index >= 0 && argv[index + 1] ? argv[index + 1]! : fallback;
  };
  return {
    runs: Number(get('runs', '300')),
    mode: get('mode', 'normal') as GameMode,
    position: get('position', 'ST') as PositionId,
    country: get('country', 'GER'),
    verbose: argv.includes('--verbose'),
  };
}

function playCareer(data: ReturnType<typeof loadGameData>, args: Args, seed: string): CareerState {
  const chooser = new Rng(`${seed}:choices`);
  let state = createCareer(data, {
    seed,
    mode: args.mode,
    identity: {
      surname: 'Test',
      shirtNumber: 10,
      strongFoot: 'right',
  weakFoot: 3,
      nationality: args.country,
      position: args.position,
      formationId: '4-2-3-1',
    },
  });

  let guard = 0;
  while (!state.retired && (state.pendingSet.length > 0 || state.pendingReport || state.pendingKickoff)) {
    if (guard++ > 3000) throw new Error('Karriere endet nicht — Endlosschleife');
    if (state.pendingKickoff) state = kickOff(data, state);
    else if (state.pendingReport) state = acknowledge(data, state);
    else state = decide(data, state, state.pendingSet.map((d) => chooser.pick(d.options).id));
  }
  return state;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]!;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  // Für jede Karriere frische Daten: Auf-/Abstiege und Reputationsänderungen
  // wirken auf die Vereinsobjekte und dürfen nicht in den nächsten Lauf lecken.
  const peaks: number[] = [];
  const goals: number[] = [];
  const appearances: number[] = [];
  const retirementAges: number[] = [];
  const decisionCounts: number[] = [];
  const randomEventCounts: number[] = [];
  const titleCounts: number[] = [];
  const titleFrequency = new Map<string, number>();
  const clubsPerCareer: number[] = [];
  let sampleState: CareerState | null = null;

  for (let i = 0; i < args.runs; i++) {
    const data = loadGameData();
    const state = playCareer(data, args, `sim-${i}`);
    const totals = careerTotals(state);

    peaks.push(totals.peakOverall);
    goals.push(totals.goals);
    appearances.push(totals.appearances);
    retirementAges.push(state.player.age);
    decisionCounts.push(state.step);
    randomEventCounts.push(state.randomEventHistory.length);
    titleCounts.push(totals.titles);
    clubsPerCareer.push(new Set(state.seasons.map((s) => s.clubId)).size);

    for (const season of state.seasons) {
      for (const title of season.titles) {
        titleFrequency.set(titleName(data, title), (titleFrequency.get(titleName(data, title)) ?? 0) + 1);
      }
    }
    if (i === 0) sampleState = state;
  }

  const avg = (values: number[]): number =>
    Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;

  console.log(`\n${args.runs} Karrieren · Modus ${args.mode} · ${args.position} · ${args.country}\n`);
  console.log('                     Ø      p10     p50     p90');
  const row = (label: string, values: number[]): void => {
    console.log(
      `${label.padEnd(18)} ${String(avg(values)).padStart(6)} ${String(percentile(values, 0.1)).padStart(7)} ` +
      `${String(percentile(values, 0.5)).padStart(7)} ${String(percentile(values, 0.9)).padStart(7)}`,
    );
  };
  row('Höchster OVR', peaks);
  row('Tore gesamt', goals);
  row('Einsätze gesamt', appearances);
  row('Karriereende', retirementAges);
  row('Entscheidungen', decisionCounts);
  row('Zufallsereignisse', randomEventCounts);
  row('Titel', titleCounts);
  row('Vereine', clubsPerCareer);

  const withoutTitle = titleCounts.filter((t) => t === 0).length;
  console.log(`\nOhne einen einzigen Titel: ${Math.round((withoutTitle / args.runs) * 100)} %`);
  console.log(`Weltklasse (OVR 88+):      ${Math.round((peaks.filter((p) => p >= 88).length / args.runs) * 100)} %`);
  console.log(`Nie über OVR 65:           ${Math.round((peaks.filter((p) => p < 65).length / args.runs) * 100)} %`);

  console.log('\nHäufigste Titel:');
  [...titleFrequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .forEach(([name, count]) => console.log(`  ${name.padEnd(28)} ${(count / args.runs).toFixed(2)} je Karriere`));

  if (args.verbose && sampleState) {
    const data = loadGameData();
    console.log(`\nBeispielkarriere (Potenzial ${Math.round(sampleState.player.potential)}, ` +
      `Profil ${sampleState.player.developmentProfile}):`);
    for (const season of sampleState.seasons) {
      const titles = season.titles.map((t) => titleName(data, t)).join(', ');
      console.log(
        `  ${season.year} Alter ${season.age} OVR ${String(season.overall).padStart(2)} ` +
        `${season.role.padEnd(14)} ${String(season.appearances).padStart(2)} Sp ` +
        `${String(season.goals).padStart(2)} T ${String(season.assists).padStart(2)} V ` +
        `${titles ? '🏆 ' + titles : ''}`,
      );
    }
  }
}

main();
