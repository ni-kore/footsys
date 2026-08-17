/**
 * Erzeugt `apps/mobile/src/club-files.ts`.
 *
 * Metro kann kein Verzeichnis zur Laufzeit einlesen — jede Vereinsdatei braucht
 * einen statischen Import. Nach einem Import mit neuen Ländern hier neu
 * erzeugen:
 *
 *   node scripts/generate-club-imports.js
 */

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const clubDir = path.join(repoRoot, 'data/football/clubs');
const target = path.join(repoRoot, 'apps/mobile/src/club-files.ts');

const files = fs.readdirSync(clubDir).filter((f) => f.endsWith('.json')).sort();
const names = files.map((f) => 'clubs' + f.replace('.json', ''));

const header = [
  '/**',
  ' * Vereinsdateien für den Bundler — erzeugt von scripts/generate-club-imports.js.',
  ' * Nicht von Hand bearbeiten.',
  ' */',
  '',
].join('\n');

const imports = files
  .map((file, i) => `import ${names[i]} from '../../../data/football/clubs/${file}';`)
  .join('\n');

const body = `\n\nexport const clubFiles = [\n  ${names.join(',\n  ')},\n];\n`;

fs.writeFileSync(target, header + imports + body, 'utf8');
console.log(`${files.length} Vereinsdateien eingebunden → apps/mobile/src/club-files.ts`);
