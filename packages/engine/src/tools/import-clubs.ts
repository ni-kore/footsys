/**
 * Vereins-Import.
 *
 * Holt Ligakader aus offenen Quellen und schreibt sie in unser Format nach
 * `data/football/clubs/<FIFA>.json`. Der Importer ist bewusst quellenagnostisch
 * aufgebaut: ein Adapter liefert `{ country, tier, leagueName, clubs[] }`,
 * alles danach ist gemeinsam. Ein Wechsel auf eine kostenpflichtige Vollquelle
 * ist damit ein neuer Adapter, kein neuer Importer.
 *
 * Wichtig: bereits gepflegte Vereine werden **nicht** überschrieben. Reputation
 * und Farben sind Balancing-Entscheidungen; was einmal von Hand gesetzt wurde,
 * bleibt stehen. Der Import ergänzt nur.
 *
 *   npm run import:clubs -- --dry-run
 *   npm run import:clubs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Club, ClubFile, League, ReputationLevel } from '../types';

const dataRoot = fileURLToPath(new URL('../../../../data/', import.meta.url));
/** Neueste zuerst. Pro Spielklasse gewinnt die Datei mit den meisten Vereinen. */
const SEASONS = ['2026-27', '2025-26', '2024-25'];

// ------------------------------------------------------------- Quellen

/** Ordnername in den openfootball-Repos → FIFA-Code. */
const COUNTRY_SLUGS: Record<string, string> = {
  albania: 'ALB', andorra: 'AND', armenia: 'ARM', austria: 'AUT', azerbaijan: 'AZE',
  belarus: 'BLR', belgium: 'BEL', 'bosnia-herzegovina': 'BIH', bulgaria: 'BUL',
  croatia: 'CRO', cyprus: 'CYP', 'czech-republic': 'CZE', denmark: 'DEN',
  england: 'ENG', estonia: 'EST', 'faroe-islands': 'FRO', finland: 'FIN', france: 'FRA',
  georgia: 'GEO', germany: 'GER', deutschland: 'GER', gibraltar: 'GIB', greece: 'GRE',
  hungary: 'HUN', iceland: 'ISL', ireland: 'IRL', israel: 'ISR', italy: 'ITA',
  kazakhstan: 'KAZ', kosovo: 'KVX', latvia: 'LVA', lithuania: 'LTU', luxembourg: 'LUX',
  malta: 'MLT', moldova: 'MDA', montenegro: 'MNE', netherlands: 'NED',
  'north-macedonia': 'MKD', 'northern-ireland': 'NIR', norway: 'NOR', poland: 'POL',
  portugal: 'POR', romania: 'ROU', russia: 'RUS', 'san-marino': 'SMR', scotland: 'SCO',
  serbia: 'SRB', slovakia: 'SVK', slovenia: 'SVN', spain: 'ESP', espana: 'ESP',
  sweden: 'SWE', switzerland: 'SUI', turkey: 'TUR', ukraine: 'UKR', wales: 'WAL',
  algeria: 'ALG', angola: 'ANG', botswana: 'BOT', cameroon: 'CMR', 'congo-dr': 'COD',
  egypt: 'EGY', eswatini: 'SWZ', ghana: 'GHA', kenya: 'KEN', lesotho: 'LES',
  morocco: 'MAR', namibia: 'NAM', nigeria: 'NGA', senegal: 'SEN', 'south-africa': 'RSA',
  tanzania: 'TAN', tunisia: 'TUN', uganda: 'UGA', zambia: 'ZAM',
  bahrain: 'BHR', china: 'CHN', 'hong-kong': 'HKG', india: 'IND', indonesia: 'IDN',
  iran: 'IRN', japan: 'JPN', kuwait: 'KUW', oman: 'OMA', qatar: 'QAT',
  'saudi-arabia': 'KSA', singapore: 'SIN', 'south-korea': 'KOR', thailand: 'THA',
  'united-arab-emirates': 'UAE', uzbekistan: 'UZB', vietnam: 'VIE',
  'costa-rica': 'CRC', 'el-salvador': 'SLV', guatemala: 'GUA', honduras: 'HON',
  jamaica: 'JAM', mexico: 'MEX', nicaragua: 'NCA', panama: 'PAN',
  canada: 'CAN', 'united-states': 'USA',
  argentina: 'ARG', bolivia: 'BOL', brazil: 'BRA', chile: 'CHI', colombia: 'COL',
  ecuador: 'ECU', paraguay: 'PAR', peru: 'PER', uruguay: 'URU', venezuela: 'VEN',
  australia: 'AUS', 'new-zealand': 'NZL',
};

/** Repos, die je Saison einen Ordner mit `<tier>-<name>.txt` haben. */
const TIERED_REPOS: { repo: string; country: string }[] = [
  { repo: 'deutschland', country: 'GER' },
  { repo: 'england', country: 'ENG' },
  { repo: 'espana', country: 'ESP' },
  { repo: 'italy', country: 'ITA' },
  { repo: 'austria', country: 'AUT' },
  { repo: 'belgium', country: 'BEL' },
];

/** Repos, die nach `<land>/<saison>_<code><tier>.txt` sortiert sind. */
const REGION_REPOS = ['europe', 'world', 'south-america', 'north-america-gold-cup'];

interface ImportedLeague {
  country: string;
  tier: number;
  sourcePath: string;
  clubNames: string[];
}

/** Kennzeichnet einen importierten, noch nicht von Hand nachgezogenen Verein. */
const PLACEHOLDER_COLOR = '#2B2B38';

// ------------------------------------------------------------- Abrufen

/**
 * Die GitHub-API erlaubt ohne Token nur 60 Anfragen pro Stunde. Die
 * Verzeichnislisten ändern sich während eines Imports nicht, also werden sie
 * lokal zwischengespeichert — sonst ist der Import nach ein paar Läufen tot.
 */
const cacheRoot = fileURLToPath(new URL('../../../../.cache/openfootball/', import.meta.url));

async function githubTree(repo: string): Promise<string[]> {
  const cachePath = `${cacheRoot}${repo}.json`;
  if (existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, 'utf8')) as string[];
  }

  const url = `https://api.github.com/repos/openfootball/${repo}/git/trees/master?recursive=1`;
  const response = await fetch(url, { headers: { 'User-Agent': 'footsys-import/0.1' } });
  if (!response.ok) {
    console.warn(`  (${repo}: HTTP ${response.status} — übersprungen)`);
    return [];
  }
  const json = (await response.json()) as { tree?: { path: string; type: string }[] };
  const paths = (json.tree ?? []).filter((t) => t.type === 'blob').map((t) => t.path);

  mkdirSync(cacheRoot, { recursive: true });
  writeFileSync(cachePath, JSON.stringify(paths), 'utf8');
  return paths;
}

async function rawFile(repo: string, path: string): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/openfootball/${repo}/master/${path}`;
  const response = await fetch(url, { headers: { 'User-Agent': 'footsys-import/0.1' } });
  return response.ok ? response.text() : null;
}

/**
 * Vereinsnamen aus einer openfootball-Spielplandatei ziehen.
 *
 * Eine Spielzeile sieht so aus:
 *   `  19:00   Liverpool  4-2 (1-0)  Bournemouth`
 *   `  Bayern München  3-1  Werder Bremen`
 *
 * Direkt darunter stehen eingerückte Torschützenzeilen in Klammern. Die
 * dürfen nicht mitgelesen werden — deshalb muss die Zeile zwingend auf das
 * Ergebnismuster passen, und Namen mit Minutenangaben fliegen raus.
 */
/** `19:00   Liverpool  4-2 (1-0)  Bournemouth` — Ergebnis in der Mitte. */
const MATCH_LINE_SCORE_MIDDLE =
  /^\s*(?:\d{1,2}[:.]\d{2}\s+)?(\S.*?)\s{2,}(?:\d{1,2}\s*[-:]\s*\d{1,2}|-)(?:\s*\(\s*\d{1,2}\s*[-:]\s*\d{1,2}\s*\))?(?:\s*(?:aet|pen\.?)\S*)?\s{2,}(\S.*?)\s*$/i;

/** `19:30  FC Schalke 04    v Hertha BSC    2-1 (2-0)` — Ergebnis am Ende. */
const MATCH_LINE_SCORE_END =
  /^\s*(?:\d{1,2}[:.]\d{2}\s+)?(\S.*?)\s{2,}v(?:s)?\.?\s+(\S.*?)(?:\s{2,}.*)?$/i;

function cleanClubName(raw: string): string | null {
  const name = raw
    .replace(/^\[\d+\]\s*/, '')
    .replace(/\s*\[[^\]]*\]\s*$/, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();

  if (name.length < 3 || name.length > 48) return null;
  // Torschützen, Minutenangaben, Kommentare
  if (/['’;]|\d{1,2}\+|^\(|\bmin\b/.test(name)) return null;
  if (!/\p{L}/u.test(name)) return null;
  if (/^\d/.test(name)) return null;
  return name;
}

function parseClubNames(text: string): string[] {
  const names = new Set<string>();

  for (const rawLine of text.split('\n')) {
    // Eingerückte Fortsetzungszeilen der Torschützen beginnen mit einer Klammer.
    if (/^\s{6,}\(/.test(rawLine)) continue;

    const line = rawLine.replace(/\s+$/, '');
    const trimmed = line.trim();
    if (!trimmed || /^[#=►▪•]/.test(trimmed)) continue;

    const match = line.match(MATCH_LINE_SCORE_END) ?? line.match(MATCH_LINE_SCORE_MIDDLE);
    if (!match) continue;

    const home = cleanClubName(match[1]!);
    const away = cleanClubName(match[2]!);
    if (home) names.add(home);
    if (away) names.add(away);
  }
  return [...names];
}

/**
 * Behält je Spielklasse die Variante mit den meisten Vereinen. Die laufende
 * Saison ist oft erst zur Hälfte gespielt und enthält dann nicht alle Teams —
 * die Vorsaison ist in dem Fall die bessere Quelle.
 */
function keepBest(found: Map<string, ImportedLeague>, entry: ImportedLeague): void {
  const key = `${entry.country}:${entry.tier}`;
  const existing = found.get(key);
  if (!existing || entry.clubNames.length > existing.clubNames.length) {
    found.set(key, entry);
  }
}

async function collectFromTieredRepo(repo: string, country: string): Promise<ImportedLeague[]> {
  const tree = await githubTree(repo);
  const found = new Map<string, ImportedLeague>();

  for (const season of SEASONS) {
    const files = tree.filter(
      (p) => p.startsWith(`${season}/`) && p.endsWith('.txt') &&
        /\/\d-/.test(p) && !/cup|pokal|copa|coppa|playoff|relegation/i.test(p),
    );

    // Eine Spielklasse kann in mehrere Staffeln zerfallen (Regionalliga Nord,
    // West, … oder Serie C A/B/C). Die gehören zusammen und werden vereinigt.
    const perTier = new Map<number, { names: Set<string>; paths: string[] }>();
    for (const path of files) {
      const tier = Number(path.split('/')[1]!.match(/^(\d)/)?.[1]);
      if (!tier) continue;
      const text = await rawFile(repo, path);
      if (!text) continue;
      const names = parseClubNames(text);
      if (names.length < 4) continue;

      const bucket = perTier.get(tier) ?? { names: new Set<string>(), paths: [] };
      names.forEach((n) => bucket.names.add(n));
      bucket.paths.push(path);
      perTier.set(tier, bucket);
    }

    for (const [tier, bucket] of perTier) {
      keepBest(found, {
        country, tier,
        sourcePath: `${repo}/${bucket.paths.join(', ')}`,
        clubNames: [...bucket.names],
      });
    }
  }
  return [...found.values()];
}

async function collectFromRegionRepo(repo: string): Promise<ImportedLeague[]> {
  const tree = await githubTree(repo);
  const found = new Map<string, ImportedLeague>();

  const candidates = tree.filter(
    (p) => p.endsWith('.txt') && SEASONS.some((s) => p.includes(s)) &&
      !/cup|pokal|copa|coppa|playoff|champions-league|sudamericana|libertadores/i.test(p),
  );

  for (const path of candidates) {
    const segments = path.split('/');
    const slug = segments[segments.length - 2] ?? '';
    const country = COUNTRY_SLUGS[slug];
    if (!country) continue;

    const tier = Number(path.match(/_[a-z]{2,3}(\d)\.txt$/)?.[1] ?? '1');
    const text = await rawFile(repo, path);
    if (!text) continue;
    const clubNames = parseClubNames(text);
    if (clubNames.length < 4) continue;

    keepBest(found, { country, tier, sourcePath: `${repo}/${path}`, clubNames });
  }
  return [...found.values()];
}

// ------------------------------------------------------- Umwandlung

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const NOISE_WORDS = /^(fc|sc|sv|vf[lbr]|tsv|tsg|spvgg|1|ac|as|ss|us|ca|cd|cf|rc|sd|ud|afc|cfc|club|deportivo|real|athletic|atletico)$/i;

/**
 * Drei Buchstaben fürs generierte Wappen. Gründungsjahre und Vereinsformen
 * ("FC", "1899") tragen nichts bei — aus "FC Ingolstadt 04" wird ING, nicht IN0.
 */
function abbreviate(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^\d+$/.test(w));

  const meaningful = words.filter((w) => !NOISE_WORDS.test(w));
  const source = meaningful.length > 0 ? meaningful : words;
  if (source.length === 0) return name.slice(0, 3).toUpperCase();

  if (source.length >= 3) return source.slice(0, 3).map((w) => w[0]!).join('').toUpperCase();
  if (source.length === 2) {
    const [first, second] = source as [string, string];
    return (first.length >= 2 ? first.slice(0, 2) + second[0]! : first + second.slice(0, 2)).toUpperCase();
  }
  return source[0]!.slice(0, 3).toUpperCase();
}

function shortName(name: string): string {
  const cleaned = name.replace(/\s+(FC|CF|SC|AC|BC|FK|SK)$/i, '').trim();
  return cleaned.length <= 16 ? cleaned : cleaned.split(/\s+/).slice(0, 2).join(' ');
}

/**
 * Reputation aus Spielklasse und Ligastärke schätzen. Bewusst konservativ:
 * ein importierter Verein ist erst mal ein Durchschnittsverein seiner Klasse.
 * Feintuning passiert von Hand und bleibt beim nächsten Import erhalten.
 */
function estimateReputation(tier: number, leagueStrength: number): Club['reputation'] {
  const base = Math.max(0, Math.round(leagueStrength - (tier - 1) * 1.5) - 2) * 2;
  const domestic = Math.min(8, Math.max(0, base)) as ReputationLevel;
  return {
    domestic,
    continental: Math.max(0, domestic - 2) as ReputationLevel,
    international: Math.max(0, domestic - 4) as ReputationLevel,
  };
}

// ------------------------------------------------------------- Dubletten

/** Wörter, die keinen Verein unterscheiden. */
const GENERIC_TOKENS = new Set([
  'fc', 'cf', 'sc', 'sv', 'ac', 'as', 'ss', 'us', 'ca', 'cd', 'ud', 'rc', 'sd', 'afc', 'cfc',
  'fk', 'sk', 'nk', 'hk', 'bk', 'if', 'ff', 'aik', 'club', 'de', 'du', 'la', 'le', 'el',
  'the', 'und', 'and', 'calcio', 'futbol', 'football', 'fussball', 'fußball', 'atletico',
  'atlético', 'athletic', 'deportivo', 'sporting', 'racing', 'real', 'city', 'town', 'united',
  'wanderers', 'rovers', 'albion', 'county', 'athletic',
]);

/** Zusätze, die eine zweite Mannschaft kennzeichnen — die ist ein eigener Verein. */
const RESERVE_TOKENS = new Set(['b', 'ii', 'iii', '2', 'u21', 'u23', 'reserve', 'amateure']);

function nameTokens(name: string): Set<string> {
  return new Set(
    slug(name).split('-').filter((t) => t.length > 0 && !GENERIC_TOKENS.has(t)),
  );
}

function isSameClub(a: string, b: string): boolean {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.size === 0 || tb.size === 0) return false;

  // Zweite Mannschaften sind eigenständig: "Barcelona" ≠ "Barcelona B".
  const reserveA = [...ta].some((t) => RESERVE_TOKENS.has(t));
  const reserveB = [...tb].some((t) => RESERVE_TOKENS.has(t));
  if (reserveA !== reserveB) return false;

  const [small, large] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
  if (![...small].every((t) => large.has(t))) return false;

  // Mindestens ein aussagekräftiges Wort muss übereinstimmen.
  return [...small].some((t) => t.length >= 3);
}

/**
 * Entfernt Namensvarianten desselben Vereins. Der gepflegte Eintrag gewinnt —
 * erkennbar daran, dass Stadt und Farben gesetzt sind.
 */
function dedupeClubs(clubs: Club[]): { kept: Club[]; removed: string[] } {
  const isCurated = (c: Club): boolean => c.city !== '' && c.colors[0] !== PLACEHOLDER_COLOR;
  const ordered = [...clubs].sort((a, b) => Number(isCurated(b)) - Number(isCurated(a)));

  const kept: Club[] = [];
  const removed: string[] = [];

  for (const club of ordered) {
    const duplicate = kept.find((k) => k.id === club.id || isSameClub(k.name, club.name));
    if (duplicate) removed.push(`${club.name} → ${duplicate.name}`);
    else kept.push(club);
  }
  return { kept, removed };
}

// -------------------------------------------------------------- Schreiben

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(dataRoot + path, 'utf8')) as T;
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(dataRoot + path, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

interface Stats {
  countries: Set<string>;
  leaguesAdded: number;
  clubsAdded: number;
  clubsKept: number;
  duplicatesRemoved: number;
  perCountry: Map<string, { tiers: Set<number>; clubs: number }>;
}

function integrate(imported: ImportedLeague[], dryRun: boolean): Stats {
  const leagues = readJson<League[]>('football/leagues.json');
  const leagueById = new Map(leagues.map((l) => [l.id, l]));
  const stats: Stats = {
    countries: new Set(), leaguesAdded: 0, clubsAdded: 0, clubsKept: 0, duplicatesRemoved: 0, perCountry: new Map(),
  };

  const byCountry = new Map<string, ImportedLeague[]>();
  for (const entry of imported) {
    const list = byCountry.get(entry.country);
    if (list) list.push(entry);
    else byCountry.set(entry.country, [entry]);
  }

  for (const [country, entries] of byCountry) {
    const filePath = `football/clubs/${country}.json`;
    const existing: ClubFile = existsSync(dataRoot + filePath)
      ? readJson<ClubFile>(filePath)
      : { country, clubs: [] };

    const byId = new Map(existing.clubs.map((c) => [c.id, c]));
    const knownNames = new Set(existing.clubs.map((c) => slug(c.name)));
    const countryStats = { tiers: new Set<number>(), clubs: 0 };

    for (const entry of entries.sort((a, b) => a.tier - b.tier)) {
      const league = leagues.find((l) => l.country === country && l.tier === entry.tier)
        ?? createLeague(country, entry.tier, leagues, leagueById, stats);

      countryStats.tiers.add(entry.tier);

      for (const name of entry.clubNames) {
        const id = slug(name);
        if (byId.has(id) || knownNames.has(id)) {
          stats.clubsKept += 1;
          continue;
        }
        byId.set(id, {
          id,
          league: league.id,
          name,
          short: shortName(name),
          abbr: abbreviate(name),
          city: '',
          colors: [PLACEHOLDER_COLOR, '#E8E8F0'],
          reputation: estimateReputation(entry.tier, league.strength),
        });
        stats.clubsAdded += 1;
        countryStats.clubs += 1;
      }
    }

    // Kürzel importierter Vereine bei jedem Lauf neu berechnen — so wirken
    // Verbesserungen an der Regel auch auf bereits importierte Vereine.
    for (const club of byId.values()) {
      if (club.colors[0] === PLACEHOLDER_COLOR) club.abbr = abbreviate(club.name);
    }

    const { kept, removed } = dedupeClubs([...byId.values()]);
    stats.duplicatesRemoved += removed.length;
    if (removed.length > 0 && process.argv.includes('--verbose')) {
      removed.forEach((entry) => console.log(`    Dublette ${country}: ${entry}`));
    }

    stats.countries.add(country);
    stats.perCountry.set(country, countryStats);

    if (!dryRun) {
      writeJson(filePath, { country, clubs: kept });
    }
  }

  if (!dryRun) writeJson('football/leagues.json', leagues);
  return stats;
}

function createLeague(
  country: string, tier: number, leagues: League[], leagueById: Map<string, League>, stats: Stats,
): League {
  const topLeague = leagues.find((l) => l.country === country && l.tier === 1);
  const id = `${country.toLowerCase()}-tier-${tier}`;
  const existing = leagueById.get(id);
  if (existing) return existing;

  const countryName = readJson<{ code: string; name: { de: string } }[]>('core/countries.json')
    .find((c) => c.code === country)?.name.de ?? country;

  const league: League = {
    id,
    name: `${countryName} · ${tier}. Liga`,
    country,
    tier,
    teams: 18,
    strength: Math.max(1, (topLeague?.strength ?? 2) - (tier - 1)) as League['strength'],
    cup: topLeague?.cup ?? null,
    continentalSlots: { primary: 0, secondary: 0, tertiary: 0 },
  };
  leagues.push(league);
  leagueById.set(id, league);
  stats.leaguesAdded += 1;
  return league;
}

// -------------------------------------------------------------- Ablauf

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`\nQuelle: openfootball (Public Domain), Saisons ${SEASONS.join(' → ')}`);
  console.log(dryRun ? 'Probelauf — es wird nichts geschrieben.\n' : 'Schreibmodus.\n');

  const imported: ImportedLeague[] = [];

  for (const { repo, country } of TIERED_REPOS) {
    process.stdout.write(`  ${repo} … `);
    const found = await collectFromTieredRepo(repo, country);
    imported.push(...found);
    console.log(`${found.length} Ligen, ${found.reduce((n, f) => n + f.clubNames.length, 0)} Vereine`);
  }

  for (const repo of REGION_REPOS) {
    process.stdout.write(`  ${repo} … `);
    const found = await collectFromRegionRepo(repo);
    imported.push(...found);
    console.log(`${found.length} Ligen, ${found.reduce((n, f) => n + f.clubNames.length, 0)} Vereine`);
  }

  const stats = integrate(imported, dryRun);

  console.log(`\nLänder:          ${stats.countries.size}`);
  console.log(`Ligen angelegt:  ${stats.leaguesAdded}`);
  console.log(`Vereine neu:     ${stats.clubsAdded}`);
  console.log(`bereits gepflegt:${stats.clubsKept}`);
  console.log(`Dubletten weg:   ${stats.duplicatesRemoved}`);

  console.log('\nJe Land (Spielklassen · neue Vereine):');
  [...stats.perCountry.entries()]
    .sort((a, b) => b[1].clubs - a[1].clubs)
    .forEach(([country, s]) => {
      console.log(`  ${country}  Tier ${[...s.tiers].sort().join(',')}  ${s.clubs}`);
    });
}

main().catch((error) => {
  console.error('Import fehlgeschlagen:', error);
  process.exit(1);
});
