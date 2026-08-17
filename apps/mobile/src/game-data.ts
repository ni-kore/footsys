/**
 * Spieldaten für die App.
 *
 * Alles wird statisch gebündelt — zur Laufzeit wird nichts nachgeladen und
 * nichts aus dem Netz geholt. Die JSON-Dateien unter `data/` sind die einzige
 * Quelle.
 */
import { createGameData, type GameData, type RawGameData } from '@footsys/engine';

import confederations from '../../../data/core/confederations.json';
import countries from '../../../data/core/countries.json';
import positions from '../../../data/core/positions.json';
import formations from '../../../data/core/formations.json';
import leagues from '../../../data/football/leagues.json';
import cups from '../../../data/football/cups.json';
import competitions from '../../../data/football/competitions.json';
import progression from '../../../data/game/progression.json';
import trophyOdds from '../../../data/game/trophy-odds.json';
import meters from '../../../data/game/meters.json';
import events from '../../../data/game/events.json';
import randomEvents from '../../../data/game/random-events.json';

import { clubFiles } from './club-files';

function buildRaw(): RawGameData {
  return {
    confederations,
    countries,
    positions,
    formations,
    leagues,
    cups,
    clubFiles,
    competitions,
    progression,
    trophyOdds,
    meters,
    events,
    randomEvents,
  } as unknown as RawGameData;
}

/**
 * Jede Karriere bekommt eine eigene Kopie der Daten. Auf- und Abstiege sowie
 * Reputationsänderungen wirken auf die Vereinsobjekte — ohne Kopie würde ein
 * Aufstieg aus einer Karriere in die nächste durchschlagen.
 */
export function freshGameData(): GameData {
  return createGameData(JSON.parse(JSON.stringify(buildRaw())) as RawGameData);
}

/** Unveränderliche Daten für Auswahllisten im Startbildschirm. */
export const staticData: GameData = createGameData(buildRaw());
