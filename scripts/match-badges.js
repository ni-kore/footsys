/**
 * Ordnet die Football-Manager-Wappen unseren Vereinen zu.
 *
 * Ausgangslage: 77.000 Dateien mit numerischen IDs (`1000037_club.png`) und
 * ein PDF, das ID, Ländercode und Vereinsname verbindet. Gebraucht werden nur
 * die gut 1.200 Vereine, die tatsächlich in footsys vorkommen — alles andere
 * sind fast 5 GB, die niemand ausliefern will.
 *
 * Der Abgleich läuft über normalisierte Namen innerhalb desselben Landes:
 * Vereinsformen wie „FC" und Gründungsjahre fallen weg, danach wird auf
 * Gleichheit und auf Teilmengen geprüft („Schalke" ⊂ „FC Schalke 04").
 *
 *   node scripts/match-badges.js            Probelauf, schreibt nichts
 *   node scripts/match-badges.js --write    kopiert die Treffer
 */

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(repoRoot, 'assets/_source/fm-badges');
const targetDir = path.join(repoRoot, 'assets/clubs');
const mappingFile = path.join(repoRoot, '.cache/fm-clubs.json');
const clubsDir = path.join(repoRoot, 'data/football/clubs');

const write = process.argv.includes('--write');
const verbose = process.argv.includes('--verbose');

// ------------------------------------------------------------ Normalisierung

/** Wörter, die keinen Verein unterscheiden. */
const GENERIC = new Set([
  'fc', 'cf', 'sc', 'sv', 'ac', 'as', 'ss', 'us', 'ca', 'cd', 'ud', 'rc', 'sd', 'afc', 'cfc',
  'fk', 'sk', 'nk', 'hk', 'bk', 'if', 'ff', 'aik', 'club', 'clube', 'cs', 'csd', 'ad', 'aa',
  'ec', 'se', 'sp', 'spvgg', 'tsv', 'tsg', 'vfb', 'vfl', 'vfr', 'sg', 'bsc', 'dsc', 'msv',
  'ssv', 'ksv', 'fsv', 'stade', 'sporting', 'sportiva', 'sportif', 'calcio', 'futbol',
  'futebol', 'football', 'fussball', 'fusball', 'de', 'del', 'des', 'du', 'la', 'le', 'el',
  'los', 'the', 'und', 'and', 'e', 'y', 'i',
]);

/** Zusätze, die eine zweite Mannschaft kennzeichnen. */
const RESERVE = new Set(['b', 'ii', 'iii', '2', 'u21', 'u23', 'reserve', 'reserves', 'amateure']);

/**
 * Ortsnamen, die je nach Quelle in Landes- oder englischer Schreibweise
 * stehen. Ohne diese Angleichung findet „AC Sparta Praha" das FM-Wappen von
 * „Sparta Prague" nicht.
 */
const ALIASES = new Map(Object.entries({
  praha: 'prague', warszawa: 'warsaw', wien: 'vienna', moskva: 'moscow',
  nikosia: 'nicosia', larnaca: 'larnaka', muenchen: 'munich', koeln: 'cologne',
  napoli: 'naples', milano: 'milan', torino: 'turin', roma: 'rome', firenze: 'florence',
  genova: 'genoa', venezia: 'venice', lisboa: 'lisbon', sevilla: 'seville',
  bucuresti: 'bucharest', beograd: 'belgrade', zagreb: 'zagreb', athina: 'athens',
  kobenhavn: 'copenhagen', goteborg: 'gothenburg', bruxelles: 'brussels',
  antwerpen: 'antwerp', gent: 'ghent', luik: 'liege', den: 'the',
  istanbul: 'istanbul', ankara: 'ankara', kyiv: 'kiev', kharkiv: 'kharkov',
  bratislava: 'bratislava', ljubljana: 'ljubljana', tirane: 'tirana',
  chisinau: 'kishinev', sarajevo: 'sarajevo', skopje: 'skopje',
}));

/** Vereinheitlicht Schreibweisen, die sich zwischen Quellen unterscheiden. */
function fold(text) {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/ı/g, 'i').replace(/ł/g, 'l').replace(/đ/g, 'd').replace(/ø/g, 'o')
    .replace(/æ/g, 'ae').replace(/å/g, 'a').replace(/þ/g, 'th')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function tokenize(name) {
  const cleaned = fold(name)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  return cleaned
    .split(/\s+/)
    .filter((t) => t.length > 0 && !GENERIC.has(t) && !/^\d+$/.test(t))
    .map((t) => ALIASES.get(t) ?? t);
}

/** Inhalt der Klammer, z. B. „LP" aus „Estudiantes (LP)". */
function parenthetical(name) {
  const match = name.match(/\(([^)]*)\)/);
  return match ? fold(match[1]).replace(/[^a-z0-9]/g, '') : '';
}

/** Levenshtein-Distanz, begrenzt — für Schreibweisen wie Praha/Prague. */
function distance(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = temp;
    }
  }
  return previous[b.length];
}

function key(tokens) {
  return [...tokens].sort().join('-');
}

function isReserve(tokens) {
  return tokens.some((t) => RESERVE.has(t));
}

// ------------------------------------------------------------------ Daten

function loadOurClubs() {
  const clubs = [];
  for (const file of fs.readdirSync(clubsDir)) {
    if (!file.endsWith('.json')) continue;
    const data = JSON.parse(fs.readFileSync(path.join(clubsDir, file), 'utf8'));
    for (const club of data.clubs) {
      clubs.push({ ...club, country: data.country, tokens: tokenize(club.name) });
    }
  }
  return clubs;
}

function loadFmEntries() {
  const raw = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
  const byCountry = new Map();
  for (const entry of raw) {
    const tokens = tokenize(entry.name);
    if (tokens.length === 0) continue;
    const record = {
      ...entry,
      tokens,
      key: key(tokens),
      paren: parenthetical(entry.name),
      flat: key(tokens).replace(/-/g, ''),
    };
    const list = byCountry.get(entry.country);
    if (list) list.push(record);
    else byCountry.set(entry.country, [record]);
  }
  return byCountry;
}

// ----------------------------------------------------------------- Abgleich

/**
 * Sucht den passenden FM-Eintrag. Erst exakte Übereinstimmung der
 * bedeutungstragenden Wörter, dann Teilmengen. Mehrdeutige Treffer werden
 * verworfen — ein falsches Wappen ist schlimmer als keins.
 */
function findMatch(club, candidates) {
  if (!candidates || club.tokens.length === 0) return null;

  const ourKey = key(club.tokens);
  const ourReserve = isReserve(club.tokens);
  const ourTokens = new Set(club.tokens);

  /**
   * Football Manager unterscheidet Namensvettern durch einen Klammerzusatz:
   * „River" ist River Plate, „River (Chacabuco)" ein Amateurverein. Ohne
   * Klammer ist deshalb fast immer der gemeinte Verein. Steht in unserem Namen
   * ein Ort, dessen Anfangsbuchstaben zur Klammer passen („Estudiantes de La
   * Plata" → „Estudiantes (LP)"), gewinnt dieser Eintrag.
   */
  const pickBest = (list, quality) => {
    if (list.length === 1) return { entry: list[0], quality };

    const byInitials = list.filter((c) => {
      if (!c.paren) return false;
      const rest = club.tokens.filter((t) => !c.tokens.includes(t));
      if (rest.length === 0) return false;
      const initials = rest.map((t) => t[0]).join('');
      return c.paren === initials || rest.some((t) => t.startsWith(c.paren)) || c.paren === rest.join('');
    });
    if (byInitials.length === 1) return { entry: byInitials[0], quality };

    // Einträge ohne Klammerzusatz sind die Hauptvereine.
    const plain = list.filter((c) => !c.paren);
    if (plain.length === 1) return { entry: plain[0], quality };

    if (plain.length > 1) {
      // Das erste Wort unseres Namens ist das kennzeichnende: „Dinamo Zagreb"
      // meint Dinamo, nicht Zagreb.
      const leading = plain.filter((c) => c.tokens[0] === club.tokens[0]);
      const pool = leading.length > 0 ? leading : plain;

      // Der knappste Name ist bei FM der bekannteste Verein („River", nicht
      // „River Plate Azuleño").
      const fewest = Math.min(...pool.map((c) => c.tokens.length));
      const shortest = pool.filter((c) => c.tokens.length === fewest);
      if (shortest.length === 1) return { entry: shortest[0], quality };

      const byLength = [...shortest].sort((a, b) => a.name.length - b.name.length);
      if (byLength[0].name.length < byLength[1].name.length) {
        return { entry: byLength[0], quality };
      }
    }

    return { entry: null, quality: 'mehrdeutig', options: list.slice(0, 8).map((c) => c.name) };
  };

  const exact = candidates.filter((c) => c.key === ourKey && isReserve(c.tokens) === ourReserve);
  if (exact.length > 0) return pickBest(exact, 'exakt');

  const subset = candidates.filter((candidate) => {
    if (isReserve(candidate.tokens) !== ourReserve) return false;
    const theirSet = new Set(candidate.tokens);
    const [small, large] = ourTokens.size <= theirSet.size ? [ourTokens, theirSet] : [theirSet, ourTokens];
    if (![...small].every((t) => large.has(t))) return false;
    return [...small].some((t) => t.length >= 4);
  });

  if (subset.length > 0) {
    // Möglichst wenig zusätzliche Wörter — der nächstliegende Name gewinnt.
    const fewestExtras = Math.min(
      ...subset.map((c) => Math.abs(c.tokens.length - club.tokens.length)),
    );
    const closest = subset.filter(
      (c) => Math.abs(c.tokens.length - club.tokens.length) === fewestExtras,
    );
    const result = pickBest(closest, 'teilmenge');
    if (result.entry) return result;
    return result;
  }

  // Letzter Versuch: abweichende Schreibweisen wie Praha/Prague oder
  // Larnaca/Larnaka. Nur bei eindeutigem, deutlich bestem Treffer.
  const ourFlat = ourKey.replace(/-/g, '');
  if (ourFlat.length >= 6) {
    const scored = candidates
      .filter((c) => isReserve(c.tokens) === ourReserve)
      .map((c) => ({ candidate: c, score: distance(ourFlat, c.flat) }))
      .filter((s) => s.score <= 2)
      .sort((a, b) => a.score - b.score);

    if (scored.length > 0) {
      const best = scored[0];
      const rivals = scored.filter((s) => s.score === best.score);
      if (rivals.length === 1) return { entry: best.candidate, quality: 'schreibweise' };
      return pickBest(rivals.map((r) => r.candidate), 'schreibweise');
    }
  }
  return null;
}

// -------------------------------------------------------------------- Lauf

function main() {
  if (!fs.existsSync(mappingFile)) {
    console.error('Fehlt: .cache/fm-clubs.json — zuerst den PDF-Text extrahieren.');
    process.exit(1);
  }
  if (!fs.existsSync(sourceDir)) {
    console.error(`Fehlt: ${path.relative(repoRoot, sourceDir)} — dort werden die FM-Dateien erwartet.`);
    process.exit(1);
  }

  const available = new Set(
    fs.readdirSync(sourceDir)
      .filter((f) => f.toLowerCase().endsWith('.png'))
      .map((f) => f.replace(/_club\.png$/i, '').replace(/\.png$/i, '')),
  );
  console.log(`Wappen im Quellordner: ${available.size}`);

  const clubs = loadOurClubs();
  const fmByCountry = loadFmEntries();
  console.log(`Vereine in footsys:    ${clubs.length}\n`);

  const overrides = JSON.parse(fs.readFileSync(path.join(__dirname, 'badge-overrides.json'), 'utf8'));
  const byId = new Map();
  for (const list of fmByCountry.values()) for (const entry of list) byId.set(entry.id, entry);

  const matched = [];
  const noEntry = [];
  const ambiguous = [];
  const noFile = [];

  for (const club of clubs) {
    const override = overrides[club.id];
    if (override) {
      const entry = byId.get(override) ?? { id: override, name: `(ID ${override})` };
      if (available.has(override)) {
        matched.push({ club, entry, quality: 'von Hand' });
        continue;
      }
      noFile.push({ club, entry });
      continue;
    }

    const result = findMatch(club, fmByCountry.get(club.country));
    if (!result) { noEntry.push(club); continue; }
    if (!result.entry) { ambiguous.push({ club, options: result.options }); continue; }
    if (!available.has(result.entry.id)) { noFile.push({ club, entry: result.entry }); continue; }
    matched.push({ club, entry: result.entry, quality: result.quality });
  }

  console.log(`Zugeordnet:      ${matched.length}`);
  console.log(`  exakt:         ${matched.filter((m) => m.quality === 'exakt').length}`);
  console.log(`  über Teilmenge:${matched.filter((m) => m.quality === 'teilmenge').length}`);
  console.log(`  über Schreibweise:${matched.filter((m) => m.quality === 'schreibweise').length}`);
  console.log(`Kein PDF-Eintrag:${noEntry.length}`);
  console.log(`Mehrdeutig:      ${ambiguous.length}`);
  console.log(`Eintrag ohne Datei: ${noFile.length}`);

  if (verbose) {
    console.log('\nOhne Zuordnung (Auszug):');
    noEntry.slice(0, 30).forEach((c) => console.log(`  ${c.country} ${c.name}`));
    console.log('\nMehrdeutig (Auszug):');
    ambiguous.slice(0, 15).forEach((a) => console.log(`  ${a.club.name} → ${a.options.join(' / ')}`));
  }

  if (!write) {
    console.log('\nProbelauf — es wurde nichts kopiert. Mit --write ausführen.');
    return;
  }

  fs.mkdirSync(targetDir, { recursive: true });
  let copied = 0;
  for (const { club, entry } of matched) {
    const source = path.join(sourceDir, `${entry.id}_club.png`);
    const target = path.join(targetDir, `${club.id}.png`);
    try {
      fs.copyFileSync(source, target);
      copied++;
    } catch {
      // Datei kann trotz Index fehlen — dann bleibt das generierte Wappen.
    }
  }
  console.log(`\n${copied} Wappen nach assets/clubs/ kopiert.`);

  fs.writeFileSync(
    path.join(repoRoot, '.cache/badge-report.json'),
    JSON.stringify({
      matched: matched.map((m) => ({ club: m.club.id, name: m.club.name, fm: m.entry.name, id: m.entry.id, quality: m.quality })),
      noEntry: noEntry.map((c) => ({ club: c.id, country: c.country, name: c.name })),
      ambiguous: ambiguous.map((a) => ({ club: a.club.id, name: a.club.name, options: a.options })),
    }, null, 2),
    'utf8',
  );
  console.log('Bericht: .cache/badge-report.json');
}

main();
