/**
 * Ergänzt `iso2` in data/core/countries.json.
 *
 * Der FIFA-Code ist nicht der ISO-Code — aus "GER" wird "DE", aus "SUI" wird
 * "CH". Ohne diese Zuordnung zeigt die App falsche Flaggen (ARM als Argentinien,
 * MLT als Mali). Einmalig laufen lassen:
 *
 *   node scripts/add-iso-codes.js
 */

const fs = require('node:fs');
const path = require('node:path');

const file = path.resolve(__dirname, '../data/core/countries.json');

/** FIFA-Code → ISO 3166-1 alpha-2. Leerstring = kein eigener ISO-Code. */
const ISO2 = {
  ALB: 'AL', AND: 'AD', ARM: 'AM', AUT: 'AT', AZE: 'AZ', BLR: 'BY', BEL: 'BE', BIH: 'BA',
  BUL: 'BG', CRO: 'HR', CYP: 'CY', CZE: 'CZ', DEN: 'DK', ENG: '', EST: 'EE', FRO: 'FO',
  FIN: 'FI', FRA: 'FR', GEO: 'GE', GER: 'DE', GIB: 'GI', GRE: 'GR', HUN: 'HU', ISL: 'IS',
  ISR: 'IL', ITA: 'IT', KAZ: 'KZ', KVX: 'XK', LVA: 'LV', LIE: 'LI', LTU: 'LT', LUX: 'LU',
  MLT: 'MT', MDA: 'MD', MNE: 'ME', NED: 'NL', MKD: 'MK', NIR: '', NOR: 'NO', POL: 'PL',
  POR: 'PT', IRL: 'IE', ROU: 'RO', RUS: 'RU', SMR: 'SM', SCO: '', SRB: 'RS', SVK: 'SK',
  SVN: 'SI', ESP: 'ES', SWE: 'SE', SUI: 'CH', TUR: 'TR', UKR: 'UA', WAL: '',

  ARG: 'AR', BOL: 'BO', BRA: 'BR', CHI: 'CL', COL: 'CO', ECU: 'EC', PAR: 'PY', PER: 'PE',
  URU: 'UY', VEN: 'VE',

  ATG: 'AG', ARU: 'AW', BAH: 'BS', BRB: 'BB', BLZ: 'BZ', BER: 'BM', VGB: 'VG', CAN: 'CA',
  CAY: 'KY', CRC: 'CR', CUB: 'CU', CUW: 'CW', DMA: 'DM', DOM: 'DO', SLV: 'SV', GRN: 'GD',
  GUA: 'GT', GUY: 'GY', HAI: 'HT', HON: 'HN', JAM: 'JM', MEX: 'MX', MSR: 'MS', NCA: 'NI',
  PAN: 'PA', PUR: 'PR', SKN: 'KN', LCA: 'LC', VIN: 'VC', SUR: 'SR', TRI: 'TT', TCA: 'TC',
  USA: 'US', VIR: 'VI',

  AFG: 'AF', AUS: 'AU', BHR: 'BH', BAN: 'BD', BHU: 'BT', BRU: 'BN', CAM: 'KH', CHN: 'CN',
  TPE: 'TW', GUM: 'GU', HKG: 'HK', IND: 'IN', IDN: 'ID', IRN: 'IR', IRQ: 'IQ', JPN: 'JP',
  JOR: 'JO', KUW: 'KW', KGZ: 'KG', LAO: 'LA', LBN: 'LB', MAC: 'MO', MAS: 'MY', MDV: 'MV',
  MNG: 'MN', MYA: 'MM', NEP: 'NP', PRK: 'KP', OMA: 'OM', PAK: 'PK', PLE: 'PS', PHI: 'PH',
  QAT: 'QA', KSA: 'SA', SIN: 'SG', KOR: 'KR', SRI: 'LK', SYR: 'SY', TJK: 'TJ', THA: 'TH',
  TLS: 'TL', TKM: 'TM', UAE: 'AE', UZB: 'UZ', VIE: 'VN', YEM: 'YE',

  ALG: 'DZ', ANG: 'AO', BEN: 'BJ', BOT: 'BW', BFA: 'BF', BDI: 'BI', CMR: 'CM', CPV: 'CV',
  CTA: 'CF', CHA: 'TD', COM: 'KM', CGO: 'CG', COD: 'CD', DJI: 'DJ', EGY: 'EG', EQG: 'GQ',
  ERI: 'ER', SWZ: 'SZ', ETH: 'ET', GAB: 'GA', GAM: 'GM', GHA: 'GH', GUI: 'GN', GNB: 'GW',
  CIV: 'CI', KEN: 'KE', LES: 'LS', LBR: 'LR', LBY: 'LY', MAD: 'MG', MWI: 'MW', MLI: 'ML',
  MTN: 'MR', MRI: 'MU', MAR: 'MA', MOZ: 'MZ', NAM: 'NA', NIG: 'NE', NGA: 'NG', RWA: 'RW',
  STP: 'ST', SEN: 'SN', SEY: 'SC', SLE: 'SL', SOM: 'SO', RSA: 'ZA', SSD: 'SS', SUD: 'SD',
  TAN: 'TZ', TOG: 'TG', TUN: 'TN', UGA: 'UG', ZAM: 'ZM', ZIM: 'ZW',

  ASA: 'AS', COK: 'CK', FIJ: 'FJ', NCL: 'NC', NZL: 'NZ', PNG: 'PG', SAM: 'WS', SOL: 'SB',
  TAH: 'PF', TGA: 'TO', VAN: 'VU',
};

const countries = JSON.parse(fs.readFileSync(file, 'utf8'));
const missing = [];

for (const country of countries) {
  const iso2 = ISO2[country.code];
  if (iso2 === undefined) {
    missing.push(country.code);
    continue;
  }
  country.iso2 = iso2;
}

fs.writeFileSync(file, JSON.stringify(countries, null, 2) + '\n', 'utf8');

console.log(`${countries.length - missing.length} von ${countries.length} Ländern mit ISO-Code versehen`);
if (missing.length > 0) console.log('Ohne Zuordnung:', missing.join(', '));
