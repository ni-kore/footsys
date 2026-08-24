/**
 * Abgleich zwischen Bilddateien und Daten.
 *
 * Meldet, welche Wappen und Trophäen noch fehlen, welche Dateien zu keinem
 * Eintrag passen, und schreibt `assets/MANIFEST.json` — die App liest daraus,
 * für welche IDs ein Bild existiert, ohne zur Laufzeit das Dateisystem zu
 * durchsuchen.
 *
 *   npm run assets
 *   npm run assets -- --missing clubs
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadGameData } from '../data-node';
import { leagueOf } from '../data';

const assetsRoot = fileURLToPath(new URL('../../../../assets/', import.meta.url));

const TROPHY_KEYS = [
  'league', 'domestic-cup', 'continental-primary', 'continental-secondary',
  'continental-tertiary', 'supercup', 'world-club', 'world-cup',
  'continental-national', 'olympic', 'individual-golden-ball',
  'individual-golden-boot', 'individual-golden-glove', 'individual-playmaker',
  'individual-young',
];

interface Category {
  folder: string;
  label: string;
  expected: { id: string; name: string; rank: number }[];
}

function filesIn(folder: string): Set<string> {
  const path = assetsRoot + folder;
  if (!existsSync(path)) return new Set();
  return new Set(
    readdirSync(path)
      .filter((file) => file.toLowerCase().endsWith('.png'))
      .map((file) => file.slice(0, -4).toLowerCase()),
  );
}

function main(): void {
  const data = loadGameData();
  const argv = process.argv.slice(2);
  const missingIndex = argv.indexOf('--missing');
  const missingCategory = missingIndex >= 0 ? argv[missingIndex + 1] : null;

  const categories: Category[] = [
    {
      folder: 'clubs',
      label: 'Vereinswappen',
      expected: data.clubs.map((club) => ({
        id: club.id,
        name: `${club.name} (${leagueOf(data, club).name})`,
        // Bekannte Vereine zuerst — dort lohnt sich ein echtes Wappen am meisten.
        rank: club.reputation.domestic * 10 + club.reputation.international,
      })),
    },
    {
      folder: 'leagues',
      label: 'Ligalogos',
      expected: data.leagues.map((league) => ({
        id: league.id, name: league.name, rank: league.strength * 10 - league.tier,
      })),
    },
    {
      folder: 'competitions',
      label: 'Wettbewerbslogos',
      expected: [...data.competitions.club, ...data.competitions.national].map((c) => ({
        id: c.id, name: c.name.en, rank: c.prestige,
      })),
    },
    {
      folder: 'trophies',
      label: 'Trophäen',
      expected: TROPHY_KEYS.map((key) => ({ id: key, name: key, rank: 0 })),
    },
  ];

  const manifest: Record<string, string[]> = {};
  console.log('');

  for (const category of categories) {
    const present = filesIn(category.folder);
    const expectedIds = new Set(category.expected.map((e) => e.id.toLowerCase()));

    const covered = category.expected.filter((e) => present.has(e.id.toLowerCase()));
    const missing = category.expected.filter((e) => !present.has(e.id.toLowerCase()));
    const orphaned = [...present].filter((file) => !expectedIds.has(file));

    manifest[category.folder] = covered.map((e) => e.id).sort();

    const share = category.expected.length === 0
      ? 100
      : Math.round((covered.length / category.expected.length) * 100);

    console.log(
      `${category.label.padEnd(18)} ${String(covered.length).padStart(4)} / ` +
      `${String(category.expected.length).padEnd(5)} ${String(share).padStart(3)} %` +
      (orphaned.length > 0 ? `   ${orphaned.length} verwaist` : ''),
    );

    for (const file of orphaned.slice(0, 10)) {
      console.log(`  verwaist: ${category.folder}/${file}.png — kein Eintrag mit dieser ID`);
    }

    if (missingCategory === category.folder) {
      console.log(`\n  Fehlende ${category.label}, wichtigste zuerst:`);
      for (const entry of missing.sort((a, b) => b.rank - a.rank)) {
        console.log(`    ${entry.id.padEnd(32)} ${entry.name}`);
      }
      console.log('');
    }
  }

  mkdirSync(assetsRoot, { recursive: true });
  writeFileSync(assetsRoot + 'MANIFEST.json', JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  console.log(`\nassets/MANIFEST.json geschrieben.`);
  if (!missingCategory) {
    console.log('Liste der fehlenden Dateien: npm run assets -- --missing clubs\n');
  }
}

main();
