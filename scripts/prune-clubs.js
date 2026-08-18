/**
 * Entfernt Vereine ohne Wappen aus dem Datenbestand.
 *
 * Ein Verein ohne Wappen fällt in der Oberfläche sofort auf. Statt Platzhalter
 * zu zeigen, bleiben nur die Vereine im Spiel, für die es auch ein Bild gibt.
 *
 *   node scripts/prune-clubs.js --write
 */
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const clubsDir = path.join(repoRoot, 'data/football/clubs');
const badgeDir = path.join(repoRoot, 'assets/clubs');
const leaguesFile = path.join(repoRoot, 'data/football/leagues.json');
const write = process.argv.includes('--write');

const badges = new Set(
  fs.readdirSync(badgeDir).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)),
);

let removed = 0;
let kept = 0;
const usedLeagues = new Set();

for (const file of fs.readdirSync(clubsDir)) {
  if (!file.endsWith('.json')) continue;
  const full = path.join(clubsDir, file);
  const data = JSON.parse(fs.readFileSync(full, 'utf8'));

  const keepers = data.clubs.filter((club) => badges.has(club.id));
  removed += data.clubs.length - keepers.length;
  kept += keepers.length;

  if (keepers.length === 0) {
    if (write) fs.unlinkSync(full);
    console.log(`  ${data.country}: keine Vereine mit Wappen — Datei entfernt`);
    continue;
  }
  keepers.forEach((club) => usedLeagues.add(club.league));
  if (write) fs.writeFileSync(full, JSON.stringify({ ...data, clubs: keepers }, null, 2) + '\n', 'utf8');
}

// Ligen ohne Vereine haben keinen Zweck mehr.
const leagues = JSON.parse(fs.readFileSync(leaguesFile, 'utf8'));
const keptLeagues = leagues.filter((l) => usedLeagues.has(l.id));
if (write) fs.writeFileSync(leaguesFile, JSON.stringify(keptLeagues, null, 2) + '\n', 'utf8');

console.log(`Vereine behalten: ${kept} · entfernt: ${removed}`);
console.log(`Ligen behalten:   ${keptLeagues.length} · entfernt: ${leagues.length - keptLeagues.length}`);
if (!write) console.log('Probelauf — nichts geschrieben. Mit --write ausführen.');
