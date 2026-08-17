/**
 * Erzeugt `apps/mobile/src/club-badges.ts`.
 *
 * Metro bündelt Bilder nur über statische `require`-Aufrufe — ein Pfad, der
 * zur Laufzeit zusammengebaut wird, findet nichts. Deshalb wird für jede
 * vorhandene Wappendatei ein Eintrag erzeugt. Nach neuen Uploads:
 *
 *   node scripts/generate-badge-imports.js
 */

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const badgeDir = path.join(repoRoot, 'assets/clubs');
const target = path.join(repoRoot, 'apps/mobile/src/club-badges.ts');

const files = fs.readdirSync(badgeDir)
  .filter((file) => file.toLowerCase().endsWith('.png'))
  .sort();

const entries = files
  .map((file) => `  '${file.slice(0, -4)}': require('../../../assets/clubs/${file}'),`)
  .join('\n');

const content = `/**
 * Vereinswappen für den Bundler — erzeugt von scripts/generate-badge-imports.js.
 * Nicht von Hand bearbeiten.
 *
 * Vereine ohne Eintrag bekommen das aus Farben und Kürzel erzeugte Wappen.
 */

export const clubBadges: Record<string, number> = {
${entries}
};
`;

fs.writeFileSync(target, content, 'utf8');
console.log(`${files.length} Wappen eingebunden → apps/mobile/src/club-badges.ts`);
