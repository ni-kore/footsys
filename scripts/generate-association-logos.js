/**
 * Erzeugt `apps/mobile/src/association-logos.ts`.
 *
 * Metro bündelt Bilder nur über statische require-Aufrufe. Diese Datei
 * entsteht aus `data/core/association-logos.json`, also aus der Zuordnung von
 * FIFA-Code zu Logodatei. Nach jeder Erweiterung der Zuordnung:
 *
 *   node scripts/generate-association-logos.js
 */

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const source = path.join(repoRoot, 'data/core/association-logos.json');
const target = path.join(repoRoot, 'apps/mobile/src/association-logos.ts');

const map = JSON.parse(fs.readFileSync(source, 'utf8'));
const entries = Object.entries(map)
  .filter(([, file]) => fs.existsSync(path.join(repoRoot, 'assets/nations', file)))
  .map(([code, file]) => `  '${code}': require('../../../assets/nations/${file}'),`)
  .join('\n');

const content = `/**
 * Verbandslogos für den Bundler — erzeugt von
 * scripts/generate-association-logos.js. Nicht von Hand bearbeiten.
 *
 * Verbände ohne Eintrag zeigen weiterhin die Länderflagge.
 */

export const associationLogos: Record<string, number> = {
${entries}
};
`;

fs.writeFileSync(target, content, 'utf8');
console.log(Object.keys(map).length + ' Verbandslogos eingebunden');
