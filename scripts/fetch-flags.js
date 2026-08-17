/**
 * Holt die Länderflaggen als PNG nach `assets/flags/<FIFA>.png`.
 *
 * Emoji-Flaggen sind keine Lösung: Windows liefert für die Regional-Indicator-
 * Zeichen keine Glyphen, dort stehen dann nur zwei Buchstaben. Bilddateien
 * sehen auf jeder Plattform gleich aus.
 *
 * Einmaliger Lauf, danach liegen die Dateien im Repo:
 *
 *   node scripts/fetch-flags.js
 */

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const targetDir = path.join(repoRoot, 'assets/flags');
const countries = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'data/core/countries.json'), 'utf8'),
);

/** Die britischen Verbände haben keinen ISO-Code, aber eigene Flaggen. */
const BRITISH = { ENG: 'gb-eng', SCO: 'gb-sct', WAL: 'gb-wls', NIR: 'gb-nir' };

const WIDTH = 'w160';

async function download(code, slug) {
  const target = path.join(targetDir, `${code}.png`);
  if (fs.existsSync(target)) return 'vorhanden';

  const response = await fetch(`https://flagcdn.com/${WIDTH}/${slug}.png`);
  if (!response.ok) return `HTTP ${response.status}`;

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 40 || buffer.subarray(1, 4).toString() !== 'PNG') return 'keine PNG-Datei';

  fs.writeFileSync(target, buffer);
  return 'geladen';
}

async function main() {
  fs.mkdirSync(targetDir, { recursive: true });

  const jobs = countries
    .map((country) => ({
      code: country.code,
      slug: BRITISH[country.code] ?? (country.iso2 || '').toLowerCase(),
    }))
    .filter((job) => job.slug.length > 0);

  console.log(`${jobs.length} Flaggen werden geholt …`);

  const failed = [];
  let loaded = 0;
  let existing = 0;

  // In kleinen Gruppen, damit der Anbieter nicht gedrosselt wird.
  const groupSize = 8;
  for (let i = 0; i < jobs.length; i += groupSize) {
    const group = jobs.slice(i, i + groupSize);
    const results = await Promise.all(group.map((job) => download(job.code, job.slug)));
    results.forEach((result, index) => {
      if (result === 'geladen') loaded++;
      else if (result === 'vorhanden') existing++;
      else failed.push(`${group[index].code} (${group[index].slug}): ${result}`);
    });
  }

  console.log(`geladen: ${loaded} · schon da: ${existing} · fehlgeschlagen: ${failed.length}`);
  failed.slice(0, 20).forEach((entry) => console.log('  ' + entry));

  const missing = countries.filter(
    (c) => !fs.existsSync(path.join(targetDir, `${c.code}.png`)),
  );
  if (missing.length > 0) {
    console.log(`\nOhne Flagge (${missing.length}): ${missing.map((c) => c.code).join(', ')}`);
  }
}

main().catch((error) => {
  console.error('Abbruch:', error.message);
  process.exit(1);
});
