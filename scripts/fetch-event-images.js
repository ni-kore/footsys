/**
 * Holt Bilder für die Entscheidungskarten von Wikimedia Commons.
 *
 * Jede Antwortmöglichkeit bekommt ein Bild, deshalb braucht es viele Motive.
 * Sie liegen unter `assets/events/` mit sprechendem Namen, damit sie sich
 * später gegen eigene Aufnahmen tauschen lassen. Herkunft, Urheber und Lizenz
 * landen in `assets/events/CREDITS.md`: die meisten Lizenzen auf Commons
 * verlangen die Nennung, und die gehört ins Projekt, bevor das Bild verwendet
 * wird.
 *
 * Je Motiv werden mehrere Suchbegriffe probiert, bis einer ein brauchbares
 * Foto liefert.
 *
 *   node scripts/fetch-event-images.js
 */

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'assets/events');

/** Motiv und wonach dafür gesucht wird, in absteigender Vorliebe. */
const MOTIFS = [
  { file: 'training', terms: ['soccer training session pitch', 'football players training drill'] },
  { file: 'gym', terms: ['athlete weight training gym', 'fitness room dumbbells'] },
  { file: 'rest', terms: ['hammock beach holiday', 'empty deck chair sunset'] },
  { file: 'physio', terms: ['physiotherapy treatment table', 'massage therapy sports'] },
  { file: 'hospital', terms: ['hospital corridor beds', 'medical examination room'] },
  { file: 'media', terms: ['press conference microphones table', 'television camera studio'] },
  { file: 'interview', terms: ['journalist microphone interview outdoors'] },
  { file: 'family', terms: ['family home living room', 'father child hands'] },
  { file: 'travel', terms: ['airport departure lounge window', 'airplane wing clouds'] },
  { file: 'contract', terms: ['contract signing pen document', 'fountain pen paper desk'] },
  { file: 'money', terms: ['euro banknotes coins', 'stack of coins finance'] },
  { file: 'fans', terms: ['football supporters terrace scarves', 'stadium crowd cheering'] },
  { file: 'stadium', terms: ['empty football stadium seats', 'floodlights stadium night'] },
  { file: 'dressing_room', terms: ['locker room bench sports', 'changing room lockers'] },
  { file: 'boots', terms: ['football boots pair studs', 'soccer cleats grass'] },
  { file: 'ball', terms: ['football on penalty spot', 'soccer ball grass close'] },
  { file: 'talk', terms: ['two people talking table meeting', 'handshake meeting office'] },
  { file: 'video', terms: ['video analysis screen laptop', 'person watching monitor dark'] },
  { file: 'captain', terms: ['captain armband football', 'football referee coin toss'] },
  { file: 'city', terms: ['city street night lights', 'restaurant table evening'] },
  { file: 'tattoo', terms: ['tattoo studio needle arm', 'tattoo machine equipment'] },
  { file: 'crest', terms: ['football club crest wall', 'stadium entrance gate'] },
];

const API = 'https://commons.wikimedia.org/w/api.php';

/**
 * Motive, die auf einer Entscheidungskarte nichts verloren haben.
 *
 * Die Suche von Commons liefert zu harmlosen Begriffen auch Aufnahmen, die in
 * einem Spiel deplatziert wären, und zu „football" reichlich American Football.
 * Ein Filter über den Dateinamen kostet nichts und verhindert das Gröbste.
 */
const FORBIDDEN =
  /gridiron|nfl|patriots|super.?bowl|american.?football|topless|nude|naked|bikini|underwear|body.?paint|erotic|sexy|lingerie|breast|upskirt|corpse|blood|wound/i;

async function search(term) {
  const url = API + '?' + new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: 'filetype:bitmap ' + term,
    gsrnamespace: '6',
    gsrlimit: '12',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size',
    iiurlwidth: '700',
    format: 'json',
  });

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, { headers: { 'User-Agent': 'footsys/0.1 (asset fetch)' } });
    if (response.ok) {
      const body = await response.json();
      return Object.values(body.query?.pages ?? {});
    }
    if (response.status !== 429) throw new Error('Suche fehlgeschlagen: ' + response.status);
    await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
  }
  return [];
}

/** Nur Fotos in brauchbarer Größe und mit klarer Lizenz. */
function usable(page) {
  if (FORBIDDEN.test(page.title)) return false;
  const info = page.imageinfo?.[0];
  if (!info) return false;
  // Commons hängt Nachverfolgungsparameter an, deshalb erst abschneiden.
  const clean = String(info.url).split('?')[0];
  if (!/\.(jpe?g|png)$/i.test(clean)) return false;
  if ((info.width ?? 0) < 700) return false;
  const licence = info.extmetadata?.LicenseShortName?.value ?? '';
  return /CC|Public domain|CC0/i.test(licence);
}

function plain(value) {
  return String(value ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const credits = [];

  for (const motif of MOTIFS) {
    const target = path.join(outDir, motif.file + '.jpg');
    if (fs.existsSync(target)) {
      console.log(motif.file + ': schon da');
      continue;
    }

    let page = null;
    for (const term of motif.terms) {
      // Commons drosselt schnelle Folgeanfragen.
      await new Promise((r) => setTimeout(r, 1200));
      const pages = await search(term);
      page = pages.find(usable) ?? null;
      if (page) break;
    }

    if (!page) {
      console.log(motif.file + ': nichts Brauchbares gefunden');
      continue;
    }

    const info = page.imageinfo[0];
    const image = await fetch(info.thumburl ?? info.url, {
      headers: { 'User-Agent': 'footsys/0.1 (asset fetch)' },
    });
    if (!image.ok) {
      console.log(motif.file + ': Download fehlgeschlagen');
      continue;
    }

    fs.writeFileSync(target, Buffer.from(await image.arrayBuffer()));
    credits.push({
      file: motif.file + '.jpg',
      title: page.title,
      page: info.descriptionurl,
      author: plain(info.extmetadata?.Artist?.value) || 'unbekannt',
      licence: plain(info.extmetadata?.LicenseShortName?.value),
    });
    console.log(motif.file + ': ' + page.title);
  }

  if (credits.length === 0) return;

  const header = [
    '# Bildnachweise',
    '',
    'Die Bilder auf den Entscheidungskarten stammen von Wikimedia Commons.',
    'Die meisten Lizenzen dort verlangen die Nennung des Urhebers, deshalb steht',
    'sie hier. Wer ein Bild gegen eine eigene Aufnahme tauscht, entfernt auch den',
    'zugehörigen Eintrag.',
    '',
    '| Datei | Quelle | Urheber | Lizenz |',
    '| --- | --- | --- | --- |',
  ];

  const file = path.join(outDir, 'CREDITS.md');
  const rows = credits.map(
    (c) => `| \`${c.file}\` | [${c.title}](${c.page}) | ${c.author} | ${c.licence} |`,
  );

  if (fs.existsSync(file)) {
    const existing = fs.readFileSync(file, 'utf8').trimEnd();
    fs.writeFileSync(file, existing + '\n' + rows.join('\n') + '\n');
  } else {
    fs.writeFileSync(file, header.concat(rows, ['']).join('\n'));
  }

  console.log(credits.length + ' Bilder und Nachweise gespeichert');
}

main().catch((error) => {
  console.error('Fehlgeschlagen: ' + error.message);
  process.exit(1);
});
