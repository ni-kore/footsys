import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createGameData, type GameData, type RawGameData } from './data';

/**
 * Lädt die Spieldaten aus dem `data/`-Verzeichnis. Nur für Node — Tests,
 * Balancing-Läufe und Skripte. Die App bündelt die JSON-Dateien stattdessen
 * über statische Imports und ruft `createGameData` direkt auf.
 */

const dataRoot = fileURLToPath(new URL('../../../data/', import.meta.url));

function read<T>(relativePath: string): T {
  return JSON.parse(readFileSync(dataRoot + relativePath, 'utf8')) as T;
}

export function loadGameData(): GameData {
  const clubDir = dataRoot + 'football/clubs/';
  const clubFiles = readdirSync(clubDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(readFileSync(clubDir + file, 'utf8')));

  const raw: RawGameData = {
    confederations: read('core/confederations.json'),
    countries: read('core/countries.json'),
    positions: read('core/positions.json'),
    formations: read('core/formations.json'),
    leagues: read('football/leagues.json'),
    cups: read('football/cups.json'),
    clubFiles,
    competitions: read('football/competitions.json'),
    progression: read('game/progression.json'),
    trophyOdds: read('game/trophy-odds.json'),
    meters: read('game/meters.json'),
    events: read('game/events.json'),
    randomEvents: read('game/random-events.json'),
  };

  return createGameData(raw);
}
