/**
 * Trägt den Ausrüster in die Vereinsdaten ein.
 *
 * Nach heutigem Stand und von Hand gepflegt, danach unveränderlich, wie alle
 * anderen Vereinsdaten auch. Vereine ohne Eintrag bleiben ohne Ausrüster: eine
 * Lücke ist besser als eine erfundene Angabe.
 *
 * Neue Marken müssen zusätzlich in `assets/ausruester` liegen und über
 * scripts/generate-partners.js in die Partnerdaten wandern, sonst gibt es zwar
 * die Zuordnung, aber kein Logo dazu.
 *
 *   node scripts/assign-kit-suppliers.js
 */

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const clubDir = path.join(repoRoot, 'data/football/clubs');

/**
 * Vereins-Kennung auf Ausrüster, Stand der laufenden Saison.
 *
 * Ein paar bekannte Vereine fehlen hier, weil sie mangels Wappen gar nicht in
 * den Vereinsdaten stehen. Sobald sie dazukommen, gehören sie auch hierher.
 */
const SUPPLIERS = {
  // Deutschland
  'bayern-munich': 'adidas',
  'borussia-dortmund': 'puma',
  'bayer-leverkusen': 'castore',
  'rb-leipzig': 'nike',
  'eintracht-frankfurt': 'nike',
  'vfb-stuttgart': 'jako',
  'sc-freiburg': 'nike',
  'werder-bremen': 'hummel',
  'borussia-monchengladbach': 'puma',
  'vfl-wolfsburg': 'nike',
  '1-fc-union-berlin': 'adidas',
  'tsg-hoffenheim': 'joma',
  'fc-augsburg': 'nike',
  '1-fc-koln': 'hummel',
  'hamburger-sv': 'adidas',
  '1-fc-heidenheim': 'nike',
  'fc-st-pauli': 'puma',
  '1-fc-kaiserslautern': 'nike',
  'fc-schalke-04': 'adidas',
  'hertha-bsc': 'nike',

  // England
  'manchester-city': 'puma',
  liverpool: 'nike',
  arsenal: 'adidas',
  chelsea: 'nike',
  'tottenham-hotspur': 'nike',
  'newcastle-united': 'adidas',
  'aston-villa': 'adidas',
  everton: 'castore',
  'west-ham-united': 'umbro',
  'nottingham-forest': 'adidas',
  brighton: 'nike',
  fulham: 'adidas',
  brentford: 'umbro',
  'crystal-palace': 'macron',
  wolverhampton: 'sudu',
  bournemouth: 'umbro',
  'leeds-united': 'adidas',
  'leicester-city': 'adidas',
  southampton: 'puma',

  // Spanien
  'real-madrid': 'adidas',
  'fc-barcelona': 'nike',
  'athletic-club': 'castore',
  'real-sociedad': 'macron',
  'real-betis': 'hummel',
  sevilla: 'castore',
  valencia: 'puma',
  villarreal: 'joma',
  'celta-vigo': 'hummel',
  'rayo-vallecano': 'umbro',
  osasuna: 'adidas',
  getafe: 'joma',
  girona: 'puma',

  // Italien
  inter: 'nike',
  'ac-milan': 'puma',
  juventus: 'adidas',
  napoli: 'emporio-armani-ea7',
  'as-roma': 'adidas',
  atalanta: 'joma',
  lazio: 'mizuno',
  fiorentina: 'kappa',
  torino: 'joma',
  bologna: 'macron',
  udinese: 'macron',
  genoa: 'kappa',

  // Frankreich
  'paris-saint-germain': 'nike',
  'olympique-marseille': 'puma',
  'as-monaco': 'kappa',
  'olympique-lyon': 'adidas',
  lille: 'new-balance',
  rennes: 'puma',
  nice: 'macron',
  'rc-lens': 'puma',

  // Übriges Europa
  ajax: 'adidas',
  'psv-eindhoven': 'puma',
  feyenoord: 'castore',
  'sl-benfica': 'adidas',
  'fc-porto': 'new-balance',
  'sporting-cp': 'nike',
  'celtic-fc': 'adidas',
  'rangers-fc': 'castore',
  'galatasaray': 'puma',
  'fenerbahce': 'puma',
  'besiktas': 'adidas',
  'fc-salzburg': 'nike',
  'shakhtar-donetsk': 'puma',
  'panathinaikos': 'adidas',
  'zenit-st-petersburg': 'adidas',

  // Amerika und Asien
  'flamengo': 'adidas',
  'palmeiras': 'puma',
  'corinthians': 'nike',
  'sao-paulo': 'new-balance',
  'boca-juniors': 'adidas',
  'river-plate': 'adidas',
  'cf-america': 'nike',
  'al-hilal': 'puma',
  'al-nassr': 'nike',
};

const files = fs.readdirSync(clubDir).filter((f) => f.endsWith('.json'));
let assigned = 0;
let total = 0;

for (const file of files) {
  const full = path.join(clubDir, file);
  const content = JSON.parse(fs.readFileSync(full, 'utf8'));
  let touched = false;

  for (const club of content.clubs) {
    total += 1;
    const supplier = SUPPLIERS[club.id];
    if (!supplier) continue;
    if (club.kitSupplier !== supplier) {
      club.kitSupplier = supplier;
      touched = true;
    }
    assigned += 1;
  }

  if (touched) fs.writeFileSync(full, JSON.stringify(content, null, 2) + '\n');
}

const unmatched = Object.keys(SUPPLIERS).filter((id) => {
  return !files.some((file) => {
    const content = JSON.parse(fs.readFileSync(path.join(clubDir, file), 'utf8'));
    return content.clubs.some((c) => c.id === id);
  });
});

console.log(assigned + ' von ' + total + ' Vereinen haben einen Ausrüster');
if (unmatched.length) console.log('kein Verein zu dieser Kennung: ' + unmatched.join(', '));
