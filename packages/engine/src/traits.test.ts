import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { acknowledge, createCareer, decide, kickOff } from './career';
import { loadGameData } from './data-node';
import { Rng } from './rng';
import { pickPotential, pickTemperament } from './progression';
import { callingAssociations, canStillSwitch, eligibleAssociations } from './national-team';
import type { CareerState, GameData, PlayerIdentity } from './index';

function identity(overrides: Partial<PlayerIdentity> = {}): PlayerIdentity {
  return {
    surname: 'Test',
    shirtNumber: 10,
    strongFoot: 'right',
    weakFoot: 3,
    nationality: 'GER',
    position: 'AM',
    formationId: '4-2-3-1',
    ...overrides,
  };
}

/** Spielt eine Karriere zu Ende und wählt dabei reproduzierbar. */
function playThrough(data: GameData, seed: string, id: PlayerIdentity): CareerState {
  const chooser = new Rng(`${seed}:choices`);
  let state = createCareer(data, { seed, mode: 'normal', identity: id });
  let guard = 0;
  while (!state.retired && (state.pending || state.pendingReport || state.pendingKickoff)) {
    assert.ok(guard++ < 2000, 'Karriere endet nicht');
    if (state.pendingKickoff) state = kickOff(data, state);
    else if (state.pendingReport) state = acknowledge(data, state);
    else state = decide(data, state, chooser.pick(state.pending!.options).id);
  }
  return state;
}

describe('Fuß, Temperament und Talent', () => {
  const data = loadGameData();

  it('gibt Linksfüßern im Mittel mehr Potenzial als Rechtsfüßern', () => {
    // Gepaarter Vergleich: derselbe Seed für beide Füße. Mit verschiedenen
    // Seeds verschluckt die Streuung der Potenzialverteilung den Effekt.
    let links = 0;
    let rechts = 0;
    let bonusGefeuert = 0;

    for (let i = 0; i < 500; i++) {
      const l = pickPotential(new Rng(`paar-${i}`), data, 'normal', 'left', 3);
      const r = pickPotential(new Rng(`paar-${i}`), data, 'normal', 'right', 3);
      links += l;
      rechts += r;
      if (Math.abs(l - r) > 0.001) bonusGefeuert++;
    }

    const chance = data.progression.traits.strongFoot.left.talentChance as number;
    assert.ok(
      links / 500 > rechts / 500 + 1,
      `links ${(links / 500).toFixed(1)} vs rechts ${(rechts / 500).toFixed(1)}`,
    );
    assert.ok(
      Math.abs(bonusGefeuert / 500 - chance) < 0.08,
      `Bonus feuerte in ${(bonusGefeuert / 5).toFixed(0)} % der Fälle statt ${chance * 100} %`,
    );
  });

  it('steigert das Potenzial mit dem zweiten Fuß', () => {
    const mittel = (weakFoot: number) => {
      let sum = 0;
      for (let i = 0; i < 300; i++) {
        sum += pickPotential(new Rng(`w-${weakFoot}-${i}`), data, 'normal', 'right', weakFoot);
      }
      return sum / 300;
    };
    assert.ok(mittel(5) > mittel(1) + 3, `fünf Sterne ${mittel(5).toFixed(1)}, ein Stern ${mittel(1).toFixed(1)}`);
  });

  it('macht begabte Spieler temperamentvoller', () => {
    assert.equal(pickTemperament(data, 'right', 2), 0);
    assert.ok(pickTemperament(data, 'left', 2) > 0, 'Linksfuß ohne Temperament');
    assert.ok(
      pickTemperament(data, 'left', 5) > pickTemperament(data, 'left', 2),
      'Zweiter Fuß erhöht das Temperament nicht',
    );
    assert.ok(pickTemperament(data, 'left', 5) <= 100);
  });

  it('lässt PELLE PELLE zum besten Spieler werden', () => {
    const legend = createCareer(data, {
      seed: 'egg', mode: 'normal', identity: identity({ surname: 'PELLE PELLE' }),
    });
    assert.equal(legend.player.legend, true);
    assert.equal(legend.player.potential, 99);
    assert.equal(legend.player.temperament, 0);
    assert.equal(legend.player.weakFoot, 5);
    assert.ok(legend.player.overall > 60, 'Startwert nicht angehoben');

    const normal = createCareer(data, { seed: 'egg', mode: 'normal', identity: identity() });
    assert.equal(normal.player.legend, false);
    assert.ok(normal.player.potential < 99);
  });
});

describe('Nationalmannschaft', () => {
  const data = loadGameData();

  it('erlaubt beide Verbände bei doppelter Staatsbürgerschaft', () => {
    const state = createCareer(data, {
      seed: 'nat-1', mode: 'normal',
      identity: identity({ nationality: 'GER', secondNationality: 'TUR' }),
    });
    const eligible = eligibleAssociations(data, state);
    assert.deepEqual([...eligible].sort(), ['GER', 'TUR']);
  });

  it('ruft schwache Verbände früher an als starke', () => {
    const schwach = createCareer(data, {
      seed: 'nat-2', mode: 'normal', identity: identity({ nationality: 'MLT' }),
    });
    const stark = createCareer(data, {
      seed: 'nat-2', mode: 'normal', identity: identity({ nationality: 'GER' }),
    });
    schwach.player.overall = 66;
    stark.player.overall = 66;

    assert.deepEqual(callingAssociations(data, schwach), ['MLT']);
    assert.deepEqual(callingAssociations(data, stark), [], 'Deutschland ruft bei OVR 66 an');
  });

  it('bürgert erst nach genügend Saisons im Land ein', () => {
    const state = createCareer(data, {
      seed: 'nat-3', mode: 'normal', identity: identity({ nationality: 'BRA' }),
    });
    const rules = data.progression.nationalTeam;
    state.player.age = rules.naturalisationMinAge;

    state.player.seasonsInCountry = { POR: (rules.naturalisationSeasons as number) - 1 };
    assert.ok(!eligibleAssociations(data, state).includes('POR'), 'zu früh eingebürgert');

    state.player.seasonsInCountry = { POR: rules.naturalisationSeasons as number };
    assert.ok(eligibleAssociations(data, state).includes('POR'), 'nicht eingebürgert');

    // Zu jung bleibt zu jung, egal wie lange man dort spielt.
    state.player.age = (rules.naturalisationMinAge as number) - 1;
    assert.ok(!eligibleAssociations(data, state).includes('POR'));
  });

  it('bindet den Verband erst mit dem A-Länderspiel', () => {
    const state = createCareer(data, {
      seed: 'nat-4', mode: 'normal',
      identity: identity({ nationality: 'GER', secondNationality: 'TUR' }),
    });
    const lockAge = data.progression.nationalTeam.aTeamLockAge as number;

    assert.ok(canStillSwitch(data, state), 'ohne Einsatz schon gebunden');

    state.player.firstSeniorCapAge = lockAge - 1;
    assert.ok(canStillSwitch(data, state), 'Nachwuchsspiele binden fälschlich');

    state.player.firstSeniorCapAge = lockAge;
    assert.ok(!canStillSwitch(data, state), 'A-Länderspiel bindet nicht');
  });

  it('lässt schwache Spieler ohne Verband', () => {
    const state = createCareer(data, {
      seed: 'nat-5', mode: 'normal', identity: identity({ nationality: 'GER' }),
    });
    state.player.overall = 52;
    assert.deepEqual(callingAssociations(data, state), []);
  });

  it('vermerkt gespielte Saisons je Land', () => {
    const state = playThrough(loadGameData(), 'residenz', identity());
    const laender = Object.keys(state.player.seasonsInCountry);
    assert.ok(laender.length > 0, 'keine Saison vermerkt');

    const summe = Object.values(state.player.seasonsInCountry).reduce((a, b) => a + b, 0);
    assert.equal(summe, state.seasons.length, 'Saisons und Länderjahre passen nicht zusammen');
  });
});

describe('Formation', () => {
  const data = loadGameData();

  it('kennt das 4-4-2 als neutrales System', () => {
    const neutral = data.formations.filter((f) => f.neutral);
    assert.equal(neutral.length, 1);
    assert.equal(neutral[0]!.id, '4-4-2');
  });

  it('verschafft dem neutralen System überall volle Einsatzzeit', () => {
    // Über viele Karrieren hinweg darf das 4-4-2 nie unter die volle Passung
    // fallen, jedes andere System schon.
    let neutralWorst = 1;
    let otherWorst = 1;

    for (let i = 0; i < 6; i++) {
      const neutralRun = playThrough(loadGameData(), `fit-n-${i}`, identity({ formationId: '4-4-2' }));
      const otherRun = playThrough(loadGameData(), `fit-o-${i}`, identity({ formationId: '5-2-1-2' }));
      neutralWorst = Math.min(neutralWorst, neutralRun.lastFormationFit);
      otherWorst = Math.min(otherWorst, otherRun.lastFormationFit);
    }

    assert.equal(neutralWorst, 1, `4-4-2 kam auf Passung ${neutralWorst}`);
    assert.ok(otherWorst < 1, 'Die Fünferkette passte immer perfekt — unwahrscheinlich');
  });
});
