/**
 * Erzeugt `apps/mobile/src/flags.ts`.
 *
 * Emoji-Flaggen fallen auf Windows auf zwei Buchstaben zurück. Deshalb
 * bündeln wir echte Bilddateien — ein statischer require je Land, weil Metro
 * keine zusammengebauten Pfade auflöst.
 *
 *   node scripts/generate-flag-imports.js
 */
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const flagDir = path.join(repoRoot, 'assets/flags');
const target = path.join(repoRoot, 'apps/mobile/src/flags.ts');

const files = fs.readdirSync(flagDir).filter((f) => f.endsWith('.png')).sort();
const entries = files
  .map((file) => `  ${JSON.stringify(file.slice(0, -4))}: require('../../../assets/flags/${file}'),`)
  .join('\n');

fs.writeFileSync(target, `/**
 * Länderflaggen für den Bundler — erzeugt von scripts/generate-flag-imports.js.
 * Nicht von Hand bearbeiten.
 */

export const flagImages: Record<string, number> = {
${entries}
};
`, 'utf8');

console.log(`${files.length} Flaggen eingebunden → apps/mobile/src/flags.ts`);
