import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { acknowledge, careerTotals, createCareer, decide, kickOff } from './career';
import { loadGameData } from './data-node';
import { ACADEMY_OFFERS, clubOffers, movesClub } from './events';
import { simulateTeamSeason } from './team-season';
import { partnerFits } from './partners';
import { Rng } from './rng';
import { computeRole } from './progression';
import type { CareerState, GameData, GameMode, PlayerIdentity } from './index';

const identity: PlayerIdentity = {
  surname: 'Kofidis',
  shirtNumber: 10,
  strongFoot: 'right',
  weakFoot: 3,
  nationality: 'GER',
  position: 'AM',
  formationId: '4-2-3-1',
};

/** Spielt eine Karriere zu Ende und trifft dabei reproduzierbare Entscheidungen. */
function playThrough(data: GameData, seed: string): CareerState {
  const chooser = new Rng(`${seed}:choices`);
  let state = createCareer(data, { seed, mode: 'normal', identity });
  let guard = 0;
  // Die Engine hält nach jedem Schritt an: Bericht bestätigen oder wählen.
  while (!state.retired && (state.pendingSet.length > 0 || state.pendingReport || state.pendingKickoff)) {
    assert.ok(guard++ < 2000, 'Karriere endet nicht');
    if (state.pendingKickoff) state = kickOff(data, state);
    else if (state.pendingReport) state = acknowledge(data, state);
    else state = decide(data, state, state.pendingSet.map((d) => chooser.pick(d.options).id));
  }
  return state;
}

describe('Karriere-Engine', () => {
  const data = loadGameData();

  it('startet mit einem Jugendangebot aus dem Heimatland', () => {
    const state = createCareer(data, { seed: 'test-1', mode: 'normal', identity });

    assert.equal(state.pendingSet[0]?.eventId, 'academy_offer');
    assert.equal(state.pendingSet[0]?.options.length, ACADEMY_OFFERS);
    assert.equal(state.player.age, 16);
    assert.equal(state.clubId, null);

    for (const option of state.pendingSet[0]!.options) {
      const club = data.clubById.get(option.clubId!)!;
      assert.equal(data.leagueById.get(club.league)!.country, 'GER');
      assert.ok(club.reputation.domestic <= 8, 'Kein Weltverein als Jugendangebot');
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

  it('stellt in einer Pause höchstens eine Vereinsfrage', () => {
    for (let i = 0; i < 25; i++) {
      const chooser = new Rng(`vereinsfrage-${i}:choices`);
      let state = createCareer(data, { seed: `vereinsfrage-${i}`, mode: 'normal', identity });
      let guard = 0;

      while (!state.retired && (state.pendingSet.length > 0 || state.pendingReport || state.pendingKickoff)) {
        assert.ok(guard++ < 2000, 'Karriere endet nicht');
        if (state.pendingKickoff) { state = kickOff(data, state); continue; }
        if (state.pendingReport) { state = acknowledge(data, state); continue; }

        const moving = state.pendingSet.filter((d) => movesClub(data, d));
        assert.ok(
          moving.length <= 1,
          `Zwei Vereinsfragen in einer Pause: ${moving.map((d) => d.eventId).join(', ')}`,
        );

        state = decide(data, state, state.pendingSet.map((d) => chooser.pick(d.options).id));
      }
    }
  });

  it('macht aus der Bitte um eine Leihe eine Leihe, keinen Verkauf', () => {
    let seen = 0;

    for (let i = 0; i < 40 && seen < 3; i++) {
      const chooser = new Rng(`leihe-${i}:choices`);
      let state = createCareer(data, { seed: `leihe-${i}`, mode: 'normal', identity });
      let guard = 0;

      while (!state.retired && (state.pendingSet.length > 0 || state.pendingReport || state.pendingKickoff)) {
        assert.ok(guard++ < 2000, 'Karriere endet nicht');
        if (state.pendingKickoff) { state = kickOff(data, state); continue; }
        if (state.pendingReport) { state = acknowledge(data, state); continue; }

        // Wo sie angeboten wird, wird um die Leihe gebeten.
        const choices = state.pendingSet.map((decision) => {
          const ask = decision.options.find((o) => o.id === 'ask_for_loan');
          return (ask ?? chooser.pick(decision.options)).id;
        });

        const destination = state.pendingSet[0];
        const parent = state.contractClubId;
        state = decide(data, state, choices);

        if (destination?.eventId === 'loan_destination' && state.pendingSet.length === 0) {
          seen += 1;
          const loan = state.activeLoan;
          assert.ok(loan, 'Leihziel gewählt, aber keine Leihe eingetragen');
          assert.equal(loan!.loanClubId, state.clubId);
          assert.equal(loan!.parentClubId, parent);
          assert.equal(state.contractClubId, parent, 'Die Leihe hat den Vertrag verschoben');
        }
      }
    }

    assert.ok(seen > 0, 'In keiner Karriere kam es zu einer erbetenen Leihe');
  });

  it('legt in fast jedem Sommer ein Vereinsangebot auf den Tisch', () => {
    let summers = 0;
    let withOffer = 0;

    for (let i = 0; i < 10; i++) {
      const chooser = new Rng(`angebot-${i}:choices`);
      let state = createCareer(data, { seed: `angebot-${i}`, mode: 'normal', identity });
      let guard = 0;

      while (!state.retired && (state.pendingSet.length > 0 || state.pendingReport || state.pendingKickoff)) {
        assert.ok(guard++ < 2000, 'Karriere endet nicht');
        if (state.pendingKickoff) { state = kickOff(data, state); continue; }
        if (state.pendingReport) {
          const wasSummer = state.pendingReport.kind === 'season';
          state = acknowledge(data, state);
          if (wasSummer && !state.retired) {
            summers += 1;
            const asks = state.pendingSet.some(
              (d) => d.eventId === 'transfer_offer' || d.eventId === 'loan_offer',
            );
            if (asks) withOffer += 1;
          }
          continue;
        }
        state = decide(data, state, state.pendingSet.map((d) => chooser.pick(d.options).id));
      }
    }

    assert.ok(withOffer / summers >= 0.6, `Nur in ${Math.round(withOffer / summers * 100)}% der Sommer ein Angebot`);
  });

  it('füllt die Pausen mal mehr, mal weniger', () => {
    const sizes = new Map<number, number>();
    let breaks = 0;

    for (let i = 0; i < 10; i++) {
      const chooser = new Rng(`pausen-${i}:choices`);
      let state = createCareer(data, { seed: `pausen-${i}`, mode: 'normal', identity });
      let guard = 0;

      while (!state.retired && (state.pendingSet.length > 0 || state.pendingReport || state.pendingKickoff)) {
        assert.ok(guard++ < 2000, 'Karriere endet nicht');
        if (state.pendingKickoff) { state = kickOff(data, state); continue; }
        if (state.pendingReport) {
          state = acknowledge(data, state);
          // Eine Pause ohne jede Entscheidung sieht man nur hier: die Engine
          // rechnet dann sofort weiter.
          if (!state.retired && state.pendingSet.length === 0) {
            breaks += 1;
            sizes.set(0, (sizes.get(0) ?? 0) + 1);
          }
          continue;
        }
        // Die Zielwahl nach einem Wechsel ist keine Pause, sondern deren Folge.
        if (!state.pendingSet.some((d) => d.eventId.endsWith('_destination'))) {
          breaks += 1;
          sizes.set(state.pendingSet.length, (sizes.get(state.pendingSet.length) ?? 0) + 1);
        }
        state = decide(data, state, state.pendingSet.map((d) => chooser.pick(d.options).id));
      }
    }

    assert.ok(sizes.size >= 3, `Nur ${sizes.size} verschiedene Pausengrößen`);
    assert.ok((sizes.get(0) ?? 0) > 0, 'Nie eine Pause ohne Entscheidung');
    for (const [size, count] of sizes) {
      assert.ok(size <= 4, `Pause mit ${size} Entscheidungen`);
      assert.ok(count / breaks < 0.75, `${size} Entscheidungen in ${Math.round(count / breaks * 100)}% der Pausen`);
    }
  });

  it('fragt nur an, wer zur eigenen Spielklasse und Gegend passt', () => {
    let offers = 0;
    let nearby = 0;
    let sameConfederation = 0;

    for (let i = 0; i < 12; i++) {
      const chooser = new Rng(`spielklasse-${i}:choices`);
      let state = createCareer(data, { seed: `spielklasse-${i}`, mode: 'normal', identity });
      let guard = 0;

      while (!state.retired && (state.pendingSet.length > 0 || state.pendingReport || state.pendingKickoff)) {
        assert.ok(guard++ < 2000, 'Karriere endet nicht');
        if (state.pendingKickoff) { state = kickOff(data, state); continue; }
        if (state.pendingReport) { state = acknowledge(data, state); continue; }

        const club = state.clubId ? data.clubById.get(state.clubId) : null;
        const league = club ? data.leagueById.get(club.league)! : null;

        for (const decision of state.pendingSet) {
          if (decision.eventId !== 'transfer_offer' || !league) continue;
          for (const option of decision.options) {
            if (option.id === 'stay' || !option.clubId) continue;
            const target = data.leagueById.get(data.clubById.get(option.clubId)!.league)!;
            offers += 1;
            if (Math.abs(target.strength - league.strength) <= 1) nearby += 1;
            const here = data.countryByCode.get(league.country)!.confederation;
            if (data.countryByCode.get(target.country)!.confederation === here) sameConfederation += 1;
          }
        }

        state = decide(data, state, state.pendingSet.map((d) => chooser.pick(d.options).id));
      }
    }

    assert.ok(offers > 100, `Nur ${offers} Angebote zum Prüfen`);
    assert.ok(
      nearby / offers >= 0.85,
      `Nur ${Math.round(nearby / offers * 100)}% der Angebote aus der eigenen oder einer benachbarten Spielklasse`,
    );
    assert.ok(
      sameConfederation / offers >= 0.75,
      `Nur ${Math.round(sameConfederation / offers * 100)}% der Angebote vom eigenen Kontinent`,
    );
  });

  it('arbeitet sich über die Karriere nach oben', () => {
    let climbed = 0;
    let startedAtTheTop = 0;
    const starts: number[] = [];

    for (let i = 0; i < 12; i++) {
      const state = playThrough(loadGameData(), `aufstieg-${i}`);
      const strengths = state.seasons.map(
        (s) => data.leagueById.get(data.clubById.get(s.clubId)!.league)!.strength,
      );
      starts.push(strengths[0]!);
      if (strengths[0]! === 5) startedAtTheTop += 1;
      if (Math.max(...strengths) > strengths[0]!) climbed += 1;
    }

    // Angefangen wird unten. Die Jugend eines Topklubs bleibt die Ausnahme.
    const averageStart = starts.reduce((a, b) => a + b, 0) / starts.length;
    assert.ok(averageStart <= 3, `Karrieren starten im Schnitt in Spielklasse ${averageStart.toFixed(1)}`);
    assert.ok(startedAtTheTop <= 2, `${startedAtTheTop} von 12 Karrieren starten ganz oben`);
    assert.ok(climbed >= 8, `Nur ${climbed} von 12 Karrieren führten nach oben`);
  });

  it('hält je nach Gangart unterschiedlich oft an', () => {
    const counts = (mode: GameMode, seed: string) => {
      const chooser = new Rng(`${seed}:choices`);
      let state = createCareer(data, { seed, mode, identity });
      let guard = 0;
      let halves = 0;
      let seasonReports = 0;
      let stops = 0;

      while (!state.retired && (state.pendingSet.length > 0 || state.pendingReport || state.pendingKickoff)) {
        assert.ok(guard++ < 4000, 'Karriere endet nicht');
        if (state.pendingKickoff) { state = kickOff(data, state); continue; }
        if (state.pendingReport) {
          if (state.pendingReport.kind === 'half') halves += 1;
          else seasonReports += 1;
          state = acknowledge(data, state);
          continue;
        }
        stops += 1;
        state = decide(data, state, state.pendingSet.map((d) => chooser.pick(d.options).id));
      }

      assert.ok(state.retired, `Karriere in ${mode} nicht beendet`);
      return { halves, seasonReports, stops, seasons: state.seasons.length };
    };

    const normal = counts('normal', 'gangart-normal');
    const fast = counts('fast', 'gangart-fast');
    const veryFast = counts('very_fast', 'gangart-very-fast');

    // Normal zeigt jede Halbserie, schnell keine.
    assert.ok(normal.halves >= normal.seasons - 1, 'Normal zeigt nicht jede Halbserie');
    assert.equal(fast.halves, 0, 'Schnell zeigt noch Halbserien');
    assert.equal(veryFast.halves, 0, 'Sehr schnell zeigt noch Halbserien');

    // Schnell hält einmal je Saison an, sehr schnell nur etwa jede dritte.
    assert.ok(fast.seasonReports >= fast.seasons - 1, 'Schnell zeigt nicht jede Saison');
    assert.ok(
      veryFast.seasonReports <= veryFast.seasons / 2,
      `Sehr schnell zeigt ${veryFast.seasonReports} von ${veryFast.seasons} Saisons`,
    );
    assert.ok(veryFast.stops < fast.stops, 'Sehr schnell fragt nicht seltener als schnell');
    assert.ok(fast.stops < normal.stops, 'Schnell fragt nicht seltener als normal');
  });

  it('rechnet die Laufbahn im Sofortlauf in einem Zug zu Ende', () => {
    for (let i = 0; i < 5; i++) {
      const state = createCareer(data, { seed: `sofort-${i}`, mode: 'instant', identity });

      assert.ok(state.retired, 'Sofortlauf endet nicht von selbst');
      assert.equal(state.pendingSet.length, 0, 'Sofortlauf fragt noch etwas');
      assert.equal(state.pendingReport, null, 'Sofortlauf legt noch einen Bericht ab');
      assert.equal(state.pendingKickoff, false, 'Sofortlauf wartet noch auf den Anpfiff');
      assert.ok(state.seasons.length >= 14, `Nur ${state.seasons.length} Saisons`);
      assert.ok(state.clubId, 'Sofortlauf hat keinen Verein gewählt');

      // Auch ohne Spieler wird entschieden: sonst bliebe die Laufbahn ihr
      // Leben lang beim ersten Verein und nichts geschähe.
      const clubs = new Set(state.seasons.map((season) => season.clubId));
      assert.ok(clubs.size >= 2, 'Sofortlauf verlässt nie den ersten Verein');
      assert.ok(
        state.timeline.some((entry) => entry.type === 'decision' || entry.type === 'random_event'),
        'Sofortlauf erlebt nichts',
      );
    }
  });

  it('trägt übersprungene Berichte in den nächsten hinein', () => {
    // In der schnellen Gangart bleibt die Winterpause ungezeigt. Was darin
    // passiert ist, muss im Saisonbericht auftauchen.
    let seenCarried = 0;

    for (let i = 0; i < 6 && seenCarried === 0; i++) {
      const seed = `mitnehmen-${i}`;
      const chooser = new Rng(`${seed}:choices`);
      let state = createCareer(data, { seed, mode: 'fast', identity });
      let guard = 0;

      while (!state.retired && (state.pendingSet.length > 0 || state.pendingReport || state.pendingKickoff)) {
        assert.ok(guard++ < 4000, 'Karriere endet nicht');
        if (state.pendingKickoff) { state = kickOff(data, state); continue; }
        if (state.pendingReport) {
          const report = state.pendingReport;
          const winterHalf = state.seasons[state.seasons.length - 1]?.halves[0];
          const winterEvents = winterHalf?.randomEventIds ?? [];
          for (const id of winterEvents) {
            assert.ok(
              report.randomEvents.some((event) => event.id === id),
              `Ereignis ${id} aus der Hinrunde fehlt im Saisonbericht`,
            );
            seenCarried += 1;
          }
          state = acknowledge(data, state);
          continue;
        }
        state = decide(data, state, state.pendingSet.map((d) => chooser.pick(d.options).id));
      }
    }

    assert.ok(seenCarried > 0, 'Keine übersprungenen Ereignisse zum Prüfen');
  });

  it('kündigt beim Positionswechsel die neue Position an und wechselt genau dorthin', () => {
    let offered = 0;

    for (let i = 0; i < 12; i++) {
      const seed = `position-${i}`;
      const chooser = new Rng(`${seed}:choices`);
      let state = createCareer(data, { seed, mode: 'normal', identity });
      let guard = 0;

      while (!state.retired && (state.pendingSet.length > 0 || state.pendingReport || state.pendingKickoff)) {
        assert.ok(guard++ < 2000, 'Karriere endet nicht');
        if (state.pendingKickoff) { state = kickOff(data, state); continue; }
        if (state.pendingReport) { state = acknowledge(data, state); continue; }

        const change = state.pendingSet.find((d) => d.eventId === 'position_change');
        const before = state.player.position;

        state = decide(data, state, state.pendingSet.map((d) => (
          d.eventId === 'position_change' ? 'accept_change' : chooser.pick(d.options).id
        )));

        if (!change) continue;
        offered += 1;

        const target = change.alternativePosition;
        assert.ok(target, 'Positionswechsel ohne Zielposition');
        assert.notEqual(target, before, 'Angeboten wird die Position, auf der man schon spielt');
        assert.ok(
          change.text.en.includes(data.positionById.get(target!)!.name.en),
          `Der Text nennt nicht die Zielposition: "${change.text}"`,
        );
        assert.ok(
          !change.text.en.includes(data.positionById.get(before)!.name.en),
          `Der Text nennt die eigene Position: "${change.text}"`,
        );
        assert.equal(state.player.position, target, 'Gewechselt wurde woandershin als angekündigt');
      }
    }

    assert.ok(offered > 0, 'Kein Positionswechsel zum Prüfen');
  });

  it('bietet einem Torwart keinen Positionswechsel an', () => {
    const keeper: PlayerIdentity = { ...identity, position: 'GK' };

    for (let i = 0; i < 8; i++) {
      const seed = `torwart-${i}`;
      const chooser = new Rng(`${seed}:choices`);
      let state = createCareer(data, { seed, mode: 'normal', identity: keeper });
      let guard = 0;

      while (!state.retired && (state.pendingSet.length > 0 || state.pendingReport || state.pendingKickoff)) {
        assert.ok(guard++ < 2000, 'Karriere endet nicht');
        if (state.pendingKickoff) { state = kickOff(data, state); continue; }
        if (state.pendingReport) { state = acknowledge(data, state); continue; }

        for (const decision of state.pendingSet) {
          assert.notEqual(decision.eventId, 'position_change', 'Ein Torwart soll umgeschult werden');
        }
        state = decide(data, state, state.pendingSet.map((d) => chooser.pick(d.options).id));
      }

      assert.equal(state.player.position, 'GK', 'Der Torwart steht am Ende woanders');
    }
  });

  it('lässt nur Marken anfragen, die zum Verein oder zum Land passen', () => {
    let checked = 0;

    for (let i = 0; i < 20; i++) {
      const seed = `marken-${i}`;
      const chooser = new Rng(`${seed}:choices`);
      let state = createCareer(data, { seed, mode: 'normal', identity });
      let guard = 0;

      while (!state.retired && (state.pendingSet.length > 0 || state.pendingReport || state.pendingKickoff)) {
        assert.ok(guard++ < 2000, 'Karriere endet nicht');
        if (state.pendingKickoff) { state = kickOff(data, state); continue; }
        if (state.pendingReport) { state = acknowledge(data, state); continue; }

        for (const decision of state.pendingSet) {
          if (decision.eventId !== 'media_partner_offer' && decision.eventId !== 'kit_supplier_offer') continue;
          for (const option of decision.options) {
            if (!option.partnerId) continue;
            const partner = data.partnerById.get(option.partnerId)!;
            checked += 1;
            assert.ok(
              partnerFits(data, state, partner),
              `${partner.name} (${partner.club ?? partner.country}) fragt bei einem Spieler von ${state.clubId} an`,
            );
          }
        }

        state = decide(data, state, state.pendingSet.map((d) => chooser.pick(d.options).id));
      }
    }

    assert.ok(checked > 20, `Nur ${checked} Markenangebote zum Prüfen`);
  });

  it('fragt nicht nach, solange ein Vertrag mit der Marke läuft', () => {
    let asked = 0;
    let underContract = 0;

    for (let i = 0; i < 20; i++) {
      const seed = `vertrag-${i}`;
      const chooser = new Rng(`${seed}:choices`);
      let state = createCareer(data, { seed, mode: 'normal', identity });
      let guard = 0;

      while (!state.retired && (state.pendingSet.length > 0 || state.pendingReport || state.pendingKickoff)) {
        assert.ok(guard++ < 2000, 'Karriere endet nicht');
        if (state.pendingKickoff) { state = kickOff(data, state); continue; }
        if (state.pendingReport) { state = acknowledge(data, state); continue; }

        const offer = state.pendingSet.find((d) => d.eventId === 'media_partner_offer');
        const until = state.player.mediaPartnerUntil;
        if (state.player.mediaPartner && until !== null && state.year < until) {
          underContract += 1;
          assert.equal(offer, undefined, `Angebot im Jahr ${state.year}, Vertrag läuft bis ${until}`);
        }
        if (offer) {
          asked += 1;
          // Wer schon eine Marke hat, bekommt sie zum Verlängern angeboten.
          if (state.player.mediaPartner) {
            assert.ok(
              offer.options.some((o) => o.partnerId === state.player.mediaPartner),
              'Der bisherige Partner steht nicht zum Verlängern bereit',
            );
          }
        }

        state = decide(data, state, state.pendingSet.map((d) => (
          d.eventId === 'media_partner_offer'
            ? (d.options.find((o) => o.partnerId) ?? d.options[0]!).id
            : chooser.pick(d.options).id
        )));
      }
    }

    assert.ok(underContract > 30, `Nur ${underContract} Sommer mit laufendem Vertrag`);
    assert.ok(asked > 0, 'Nie nach einer Marke gefragt');
  });

  it('dreht die Doku nur mit einem Medienpartner und nennt ihn beim Namen', () => {
    let seen = 0;

    for (let i = 0; i < 25 && seen < 3; i++) {
      const seed = `doku-${i}`;
      const chooser = new Rng(`${seed}:choices`);
      let state = createCareer(data, { seed, mode: 'normal', identity });
      let guard = 0;

      while (!state.retired && (state.pendingSet.length > 0 || state.pendingReport || state.pendingKickoff)) {
        assert.ok(guard++ < 2000, 'Karriere endet nicht');
        if (state.pendingKickoff) { state = kickOff(data, state); continue; }
        if (state.pendingReport) { state = acknowledge(data, state); continue; }

        for (const decision of state.pendingSet) {
          if (decision.eventId !== 'career_documentary' && decision.eventId !== 'partner_exclusive') continue;
          const partner = state.player.mediaPartner;
          assert.ok(partner, `${decision.eventId} ohne Medienpartner`);
          const name = data.partnerById.get(partner!)!.name;
          assert.ok(decision.text.en.includes(name), `Der Text nennt ${name} nicht: "${decision.text.en}"`);
          seen += 1;
        }

        state = decide(data, state, state.pendingSet.map((d) => (
          d.eventId === 'media_partner_offer'
            ? (d.options.find((o) => o.partnerId) ?? d.options[0]!).id
            : chooser.pick(d.options).id
        )));
      }
    }

    assert.ok(seen > 0, 'Keine Doku und kein Interview zum Prüfen');
  });

  it('lässt Weltvereine erst bei Weltklasse anfragen', () => {
    const fresh = loadGameData();
    const bestOffer = (overall: number, clubId: string): number => {
      const state = createCareer(fresh, { seed: 'leiter', mode: 'normal', identity });
      state.player.overall = overall;
      state.player.marketInterest = 50;
      state.clubId = clubId;
      state.contractClubId = clubId;

      const rng = new Rng(4711);
      let best = 0;
      for (let i = 0; i < 120; i += 1) {
        for (const club of clubOffers(fresh, rng, state, { scope: 'matching', count: 3 })) {
          best = Math.max(best, club.reputation.domestic);
        }
      }
      return best;
    };

    // Mit 84 ist man sehr gut, aber kein Spieler für einen Weltverein.
    assert.ok(bestOffer(84, 'newcastle-united') <= 9, 'Ein 84er bekommt Angebote von ganz oben');
    assert.ok(bestOffer(76, 'crystal-palace') <= 7, 'Ein 76er bekommt Angebote von ganz oben');
    assert.ok(bestOffer(66, 'burnley') <= 6, 'Ein 66er bekommt Angebote von ganz oben');
    // Wer die Spitze erreicht, wird auch von der Spitze gerufen.
    assert.equal(bestOffer(90, 'arsenal'), 10, 'Weltklasse bekommt keine Weltvereine angeboten');
  });

  it('vergibt Titel nach der Kraft des Vereins in seiner Liga', () => {
    // Auf- und Abstiege verändern die Vereine im Lauf einer Karriere, deshalb
    // wird hier auf unberührten Daten gemessen.
    const fresh = loadGameData();
    const seasons = 1500;
    const titleShare = (clubId: string): number => {
      const club = fresh.clubById.get(clubId)!;
      const state = createCareer(fresh, { seed: 'titel', mode: 'normal', identity });
      const level = (fresh.progression.roles.minOverallForStarter as Record<string, number>)[
        String(club.reputation.domestic)
      ] ?? 70;
      state.player.overall = level;
      state.clubId = clubId;
      state.contractClubId = clubId;

      const rng = new Rng(99);
      let champion = 0;
      for (let i = 0; i < seasons; i += 1) {
        if (simulateTeamSeason(fresh, rng, state, 0.85).position === 1) champion += 1;
      }
      return champion / seasons;
    };

    // Der Serienmeister gewinnt oft, aber nicht immer.
    const celtic = titleShare('celtic-fc');
    assert.ok(celtic > 0.3 && celtic < 0.85, `Celtic wird in ${Math.round(celtic * 100)}% Meister`);

    // Wer klein ist, wird es so gut wie nie — auch nicht in einer kleinen Liga.
    for (const small of ['ross-county-fc', 'lamia', 'sv-ried', 'kfum-oslo', 'ipswich-town']) {
      const share = titleShare(small);
      assert.ok(share < 0.05, `${small} wird in ${Math.round(share * 100)}% der Saisons Meister`);
    }

    // In einer starken Liga reicht ein großer Name allein nicht.
    const united = titleShare('manchester-united');
    assert.ok(united < 0.15, `Manchester United wird in ${Math.round(united * 100)}% Meister`);
  });

  it('zeigt bei der Verbandswahl beide Flaggen', () => {
    const dual: PlayerIdentity = { ...identity, nationality: 'MAR', secondNationality: 'FRA' };
    let seen = 0;

    for (let i = 0; i < 12 && seen === 0; i++) {
      const seed = `verband-${i}`;
      const chooser = new Rng(`${seed}:choices`);
      let state = createCareer(data, { seed, mode: 'normal', identity: dual });
      let guard = 0;

      while (!state.retired && (state.pendingSet.length > 0 || state.pendingReport || state.pendingKickoff)) {
        assert.ok(guard++ < 2000, 'Karriere endet nicht');
        // Ein Talent, sonst ruft kein Verband an.
        state.player.overall = Math.max(state.player.overall, 78);
        if (state.pendingKickoff) { state = kickOff(data, state); continue; }
        if (state.pendingReport) { state = acknowledge(data, state); continue; }

        for (const decision of state.pendingSet) {
          if (decision.eventId !== 'national_team_choice') continue;
          seen += 1;
          assert.ok(decision.options.length >= 2, 'Verbandswahl ohne Auswahl');
          for (const option of decision.options) {
            assert.ok(option.countryCode, `Verbandsoption ${option.id} ohne Land`);
            assert.ok(data.countryByCode.has(option.countryCode!), 'unbekanntes Land an der Option');
          }
        }

        state = decide(data, state, state.pendingSet.map((d) => chooser.pick(d.options).id));
      }
    }

    assert.ok(seen > 0, 'Keine Verbandswahl zum Prüfen');
  });

  it('protokolliert Entscheidungen und Zufallsereignisse in der Timeline', () => {
    const state = playThrough(loadGameData(), 'timeline');
    const types = new Set(state.timeline.map((entry) => entry.type));
    assert.ok(types.has('transfer'), 'Kein Transfer protokolliert');
    assert.ok(types.has('random_event'), 'Kein Zufallsereignis protokolliert');
    assert.ok(types.has('retirement'), 'Kein Karriereende protokolliert');
  });
});
