import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { careerTotals, createCareer, decide } from './career';
import { loadGameData } from './data-node';
import { Rng } from './rng';
import { computeRole } from './progression';
import type { CareerState, GameData, PlayerIdentity } from './index';

const identity: PlayerIdentity = {
  surname: 'Kofidis',
  shirtNumber: 10,
  strongFoot: 'right',
  nationality: 'GER',
  position: 'AM',
};

/** Spielt eine Karriere zu Ende und trifft dabei reproduzierbare Entscheidungen. */
function playThrough(data: GameData, seed: string): CareerState {
  const chooser = new Rng(`${seed}:choices`);
  let state = createCareer(data, { seed, mode: 'normal', identity });
  let guard = 0;
  while (state.pending && !state.retired) {
    assert.ok(guard++ < 300, 'Karriere endet nicht');
    state = decide(data, state, chooser.pick(state.pending.options).id);
  }
  return state;
}

describe('Karriere-Engine', () => {
  const data = loadGameData();

  it('startet mit einem Jugendangebot aus dem Heimatland', () => {
    const state = createCareer(data, { seed: 'test-1', mode: 'normal', identity });

    assert.equal(state.pending?.eventId, 'academy_offer');
    assert.equal(state.pending?.options.length, 3);
    assert.equal(state.player.age, 16);
    assert.equal(state.clubId, null);

    for (const option of state.pending!.options) {
      const club = data.clubById.get(option.clubId!)!;
      assert.equal(data.leagueById.get(club.league)!.country, 'GER');
      assert.ok(club.reputation.domestic <= 4, 'Kein Weltverein als Jugendangebot');
    }
  });

  it('liefert bei gleichem Seed und gleichen Entscheidungen dasselbe Ergebnis', () => {
    const first = playThrough(loadGameData(), 'determinismus');
    const second = playThrough(loadGameData(), 'determinismus');

    assert.deepEqual(careerTotals(first), careerTotals(second));
    assert.equal(first.seasons.length, second.seasons.length);
    assert.deepEqual(
      first.seasons.map((s) => [s.year, s.clubId, s.overall, s.goals, s.titles.join()]),
      second.seasons.map((s) => [s.year, s.clubId, s.overall, s.goals, s.titles.join()]),
    );
  });

  it('unterscheidet sich bei anderem Seed', () => {
    const a = playThrough(loadGameData(), 'seed-a');
    const b = playThrough(loadGameData(), 'seed-b');
    assert.notDeepEqual(
      a.seasons.map((s) => s.clubId),
      b.seasons.map((s) => s.clubId),
    );
  });

  it('spielt jede Saison in zwei Halbserien', () => {
    const state = playThrough(loadGameData(), 'halbserien');
    for (const season of state.seasons) {
      assert.equal(season.halves.length, 2, `Saison ${season.year} hat keine zwei Halbserien`);
      assert.equal(season.halves[0]!.half, 1);
      assert.equal(season.halves[1]!.half, 2);
      assert.equal(
        season.appearances,
        season.halves[0]!.appearances + season.halves[1]!.appearances,
      );
    }
  });

  it('beendet jede Karriere in einem plausiblen Alter', () => {
    for (let i = 0; i < 15; i++) {
      const state = playThrough(loadGameData(), `ende-${i}`);
      assert.ok(state.retired, 'Karriere wurde nicht beendet');
      assert.ok(state.player.age >= 30, `Karriereende mit ${state.player.age}`);
      assert.ok(state.player.age <= 41, `Karriereende mit ${state.player.age}`);
      assert.ok(state.seasons.length >= 14, `Nur ${state.seasons.length} Saisons`);
    }
  });

  it('überschreitet nie das versteckte Potenzial nennenswert', () => {
    for (let i = 0; i < 10; i++) {
      const state = playThrough(loadGameData(), `potenzial-${i}`);
      const peak = careerTotals(state).peakOverall;
      // Ereignisse dürfen kurzfristig darüber hinausschieben, aber nicht beliebig.
      assert.ok(
        peak <= state.player.potential + 8,
        `OVR ${peak} bei Potenzial ${Math.round(state.player.potential)}`,
      );
    }
  });

  it('hält Statistiken und Meter in gültigen Grenzen', () => {
    const state = playThrough(loadGameData(), 'grenzen');
    for (const season of state.seasons) {
      assert.ok(season.appearances >= 0 && season.appearances <= 80);
      assert.ok(season.goals >= 0 && season.goals <= season.appearances * 2);
      assert.ok(season.overall >= 40 && season.overall <= 99);
    }
    for (const value of Object.values(state.player.meters)) {
      assert.ok(value >= 0 && value <= 100, `Meterwert ${value} außerhalb 0–100`);
    }
  });

  it('vergibt Rollen abhängig von Vereinsreputation und Niveau', () => {
    // Ein 60er-Spieler ist bei einem Reputation-5-Verein bestenfalls Ersatz …
    assert.equal(
      computeRole(data, { overall: 60, age: 25, clubReputation: 5, onLoan: false }),
      'substitute',
    );
    // … und bei einem kleinen Verein gesetzt.
    assert.equal(
      computeRole(data, { overall: 60, age: 25, clubReputation: 0, onLoan: false }),
      'starter',
    );
  });

  it('protokolliert Entscheidungen und Zufallsereignisse in der Timeline', () => {
    const state = playThrough(loadGameData(), 'timeline');
    const types = new Set(state.timeline.map((entry) => entry.type));
    assert.ok(types.has('transfer'), 'Kein Transfer protokolliert');
    assert.ok(types.has('random_event'), 'Kein Zufallsereignis protokolliert');
    assert.ok(types.has('retirement'), 'Kein Karriereende protokolliert');
  });
});
