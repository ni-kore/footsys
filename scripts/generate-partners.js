/**
 * Erzeugt `data/game/partners.json` und `apps/mobile/src/partner-logos.ts`.
 *
 * Quellen sind die beiden Bilderordner:
 *   assets/mediapartner  Sender, Zeitungen, Fankanäle
 *   assets/ausruester    Ausrüster
 *
 * Aus dem Dateinamen wird der Anzeigename: Auflösungspräfixe, Endungen der
 * Vorlage und Jahreszahlen der Logoversion fallen weg. Mehrere Fassungen
 * derselben Marke werden zu einem Eintrag zusammengefasst, die neueste
 * gewinnt.
 *
 * Vorhandene Einträge behalten ihre Reichweite und ihre Bindung: wer sie in
 * der JSON von Hand angepasst hat, verliert das beim nächsten Lauf nicht.
 *
 *   node scripts/generate-partners.js
 */

const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');

const repoRoot = path.resolve(__dirname, '..');
const mediaDir = path.join(repoRoot, 'assets/mediapartner');
const kitDir = path.join(repoRoot, 'assets/ausruester');
const dataTarget = path.join(repoRoot, 'data/game/partners.json');
const logoTarget = path.join(repoRoot, 'apps/mobile/src/partner-logos.ts');

// ------------------------------------------------------------ Namensgebung

/** Macht aus einem Dateinamen einen lesbaren Markennamen. */
function displayName(file) {
  let name = file.replace(/\.png$/i, '');
  name = name.replace(/_media$/i, '');
  name = name.replace(/^\d+px-/, '');
  name = name.replace(/\.svg$/i, '');
  name = name.replace(/[_-]?logo([_-]actuel)?$/i, '');
  name = name.replace(/[-_]\(\d+\)$/, '');
  name = name.replace(/\s*copy$/i, '');
  name = name.replace(/_/g, ' ');
  name = name.replace(/\s+/g, ' ').trim();
  return name;
}

/** Jahreszahl und Zusätze markieren nur die Fassung, nicht die Marke. */
function brandOf(name) {
  return name
    .replace(/\s+(19|20)\d{2}(\s+Alt)?$/i, '')
    .replace(/\s+Alt$/i, '')
    .trim();
}

function versionOf(name) {
  const match = name.match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : 0;
}

function slugOf(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ------------------------------------------------------------ Reichweite

/** Marken, deren Gewicht feststeht. Alles andere schätzt die Heuristik. */
const REACH = {
  'sky-sports': 9, 'fox-sports': 9, 'cnn-international': 9, 'skysports': 9,
  'sky-deutschland': 8, 'fox-sports-americas': 8, 'fox-deportes-usa': 8,
  'sky-sports-scotland': 7, 'eleven': 7, 'fox-tv': 7, 'cnn-turk': 7,
  'cnn-indonesia': 7, 'rtbf': 7, 'vrt-1': 7, 'vtm': 7, 'rtl': 7, 'rtl-tvi': 7,
  '2m': 7, 'diario-marca': 7, 'diario-sport': 7, 'abc': 6, 'marca-tv': 6,
  'radio-marca': 6, 'telenet-play-sports': 6, 'plays-sports': 6, 'play4': 6,
  'eleven': 6, 'hespress': 6, 'hln': 6, 'nieuwsblad': 6, 'le-soir': 6,
  'la-libe': 6, 'l-avenir': 6, 'sport-cz': 6, 'mls-soccer': 6,
  'abc-deporte': 5, 'sport-voetbalmagazine': 5, 'voetbalkrant': 5,
  'walfoot': 5, 'websitelogo-lecho': 5, 'grenz-echo': 4, 'brf': 4,
  'joe': 4, 'bruzz': 4, 'bx1': 4, 'voo': 4, 'vedia': 4, 'canal-c': 3,
  'canal-zoom': 3, 'ringtv': 3, 'robtv': 3, 'tvl-belgium': 3, 'tvo-belgium': 3,
  'atv-belgium': 3, 'rtc-tele-liege': 3, 'tvcom-bw': 3, 'focus': 3, 'rtv': 3,
  'fanaposten': 3, 'kana-sportowy': 4, 'clyde-1-superscoreboard': 4,
  'rmc': 6, 'sporz': 6, 'rtl-tvi-logo': 6, 'avs': 6, 'websitelogo-lecho': 5, 'rtl-tvi': 6,
  '90-minutos-de-futbol': 4, 'el-show-de-ferro': 3, 'pandit-football': 3,
};

/**
 * Dateien, die keinen Berichterstatter zeigen: Doppelungen derselben Marke,
 * Dienstleister und Unbenanntes.
 */
const DROP = new Set([
  'images', 'logotls', 'football-manager-graphics', 'fly-line-sport',
  'myphysio', 'sports-injury-clinic', 'health-and-sports',
  'vegalta-sendai-premium-fan-book',
  'canal-zoom-logo', 'sky-sports-logo', 'skysports', 'logo-eleven-sports',
]);

/** Dateinamen sind keine Markennamen. Hier stehen die richtigen. */
const RENAME = {
  '7dimanche': '7 Dimanche', 'bx1': 'BX1', 'eleven': 'Eleven Sports',
  'grenz-echo': 'Grenz-Echo', 'hln': 'Het Laatste Nieuws',
  'l-avenir': "L'Avenir", 'la-libe': 'La Libre', 'le-soir': 'Le Soir',
  'nieuwsblad': 'Het Nieuwsblad', 'plays-sports': 'Play Sports',
  'rmc': 'RMC Sport', 'rtbf': 'RTBF', 'rtl': 'RTL', 'rtl-tvi': 'RTL TVI', 'rtl-tvi-logo': 'RTL TVI',
  'sporz': 'Sporza', 'vtm': 'VTM', 'walfoot': 'Walfoot',
  'websitelogo-lecho': "L'Echo", 'voetbalkrant': 'Voetbalkrant',
  'sport-voetbalmagazine': 'Sport/Voetbalmagazine',
  'willam-hill': 'William Hill', 'tvcom-bw': 'TV Com', 'focus': 'Focus TV',
  'avs': 'AVS', 'kana-sportowy': 'Kanał Sportowy',
};

/** Ausrüster: eigene Liste, sie stehen nicht im Medienordner. */
const KIT_BRANDS = { jako: 5, fila: 6, vans: 6 };

function reachFor(slug, name) {
  if (REACH[slug]) return REACH[slug];

  // Fan- und Podcastkanäle erreichen wenige, aber die richtig.
  if (/podcast|fancast|fandom|fans|stand|baws|scarves|heart and hand|show$/i.test(name)) return 2;
  // Vereinseigene Kanäle sprechen die eigene Anhängerschaft an.
  if (/\bTV\b/.test(name) && /celtic|rangers|psv|paok|fcb|fcz|aek|vegalta/i.test(name)) return 3;
  // Wettanbieter zahlen viel und sind überall zu sehen.
  if (/bet|oddset|hill|unibet/i.test(name)) return 5;
  return 3;
}

// ------------------------------------------------------------ Helligkeit

/**
 * Wie hell ein Logo im Mittel ist, über alle sichtbaren Bildpunkte.
 *
 * Die Vorlagen sind auf durchsichtigem Grund gebaut: die meisten dunkel, ein
 * Teil weiß. Auf einer einzigen Untergrundfarbe wäre die eine oder die andere
 * Hälfte unsichtbar. Deshalb bekommt jedes Logo hier vermerkt, ob es hell ist,
 * und die Oberfläche stellt es dann auf dunklen Grund.
 */
function isLight(fullPath) {
  try {
    const png = PNG.sync.read(fs.readFileSync(fullPath));
    let sum = 0;
    let seen = 0;
    // Ein Raster reicht: es geht um den Gesamteindruck, nicht um Genauigkeit.
    const step = Math.max(1, Math.floor(Math.min(png.width, png.height) / 40));
    for (let y = 0; y < png.height; y += step) {
      for (let x = 0; x < png.width; x += step) {
        const i = (png.width * y + x) << 2;
        if (png.data[i + 3] < 40) continue;
        sum += 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2];
        seen += 1;
      }
    }
    if (seen === 0) return false;
    return sum / seen > 150;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------ Einsammeln

function collect(dir, folder, kind) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.png')).sort();

  // Mehrere Fassungen derselben Marke: die neueste gewinnt.
  const byBrand = new Map();
  for (const file of files) {
    const full = displayName(file);
    const brand = brandOf(full);
    if (!brand) continue;
    const slug = slugOf(brand);
    const version = versionOf(full);
    if (DROP.has(slug)) continue;
    const existing = byBrand.get(slug);
    if (!existing || version > existing.version) {
      byBrand.set(slug, { id: slug, name: RENAME[slug] ?? brand, folder, file, version, kind });
    }
  }

  return [...byBrand.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const media = collect(mediaDir, 'mediapartner', 'media');
const kit = collect(kitDir, 'ausruester', 'kit');

// Ein paar Ausrüster liegen im Medienordner, sie sind keine Berichterstatter.
for (let i = media.length - 1; i >= 0; i -= 1) {
  const entry = media[i];
  if (KIT_BRANDS[entry.id] !== undefined) {
    kit.push({ ...entry, kind: 'kit' });
    media.splice(i, 1);
  }
}
kit.sort((a, b) => a.name.localeCompare(b.name));

// ---------------------------------------------- Bestehende Werte behalten

const previous = new Map();
if (fs.existsSync(dataTarget)) {
  const old = JSON.parse(fs.readFileSync(dataTarget, 'utf8'));
  for (const entry of [...(old.media ?? []), ...(old.kit ?? [])]) {
    previous.set(entry.id, entry);
  }
}

function finish(entry) {
  const before = previous.get(entry.id);
  const reach = before?.reach
    ?? KIT_BRANDS[entry.id]
    ?? (entry.kind === 'kit' ? 4 : reachFor(entry.id, entry.name));
  const logo = entry.folder + '/' + entry.file;
  const light = isLight(path.join(repoRoot, 'assets', logo));
  // Ein Vereinssender oder eine Landeszeitung meldet sich nur dort, wo sie
  // hingehört. Die Zuordnung steht in der JSON und bleibt hier erhalten.
  const scope = {};
  if (before?.club) scope.club = before.club;
  else if (before?.country) scope.country = before.country;
  return { id: entry.id, ...scope, name: entry.name, logo, reach, light };
}

const partners = {
  $comment: 'Erzeugt von scripts/generate-partners.js. Die Reichweite 1 bis 10 darf von Hand angepasst werden, sie bleibt beim nächsten Lauf erhalten.',
  rules: {
    $comment: 'Partner sind ein Zusatz, kein Muss: sie kommen von selbst, wenn man auffällt, und wirken danach im Hintergrund.',
    media: {
      $comment: 'Berichterstattung bringt Fans und macht andere Vereine aufmerksam.',
      minOverall: 62,
      minFans: 50000,
      chancePerSummer: 0.35,
      fansPerReach: 0.07,
      clubInterestFromReach: 6,
    },
    kit: {
      $comment: 'Ein Ausrüster bringt weniger Fans, öffnet dafür Türen zu größeren Vereinen.',
      minOverall: 66,
      minFans: 250000,
      chancePerSummer: 0.3,
      fansPerReach: 0.035,
      clubInterestFromReach: 5,
    },
    offers: 2,
    reachSpread: 3,
    reachPerOverall: 0.12,
  },
  media: media.map(finish),
  kit: kit.map(finish),
};

fs.writeFileSync(dataTarget, JSON.stringify(partners, null, 2) + '\n', 'utf8');

// --------------------------------------------------------- Bundlereinbindung

const all = [...partners.media, ...partners.kit].sort((a, b) => a.id.localeCompare(b.id));
const entries = all
  .map((p) => `  '${p.id}': require('../../../assets/${p.logo}'),`)
  .join('\n');

const content = `/**
 * Logos der Partner für den Bundler — erzeugt von scripts/generate-partners.js.
 * Nicht von Hand bearbeiten.
 */

export const partnerLogos: Record<string, number> = {
${entries}
};
`;

fs.writeFileSync(logoTarget, content, 'utf8');

console.log(
  `${partners.media.length} Medienpartner und ${partners.kit.length} Ausrüster`
  + ` → data/game/partners.json, apps/mobile/src/partner-logos.ts`,
);
