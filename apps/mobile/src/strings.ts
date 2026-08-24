import type { LocalizedText } from '@footsys/engine';

/**
 * Alle festen Texte der Oberfläche in drei Sprachen.
 *
 * Was aus den Daten kommt (Vereine, Ligen, Ereignisse), wird über `tr()`
 * aufgelöst; was hier steht, ist die Oberfläche selbst: Beschriftungen, Knöpfe,
 * Überschriften. Ein Eigenname wie ein Vereinsname taucht hier nie auf.
 */
const L = (en: string, de: string, es: string): LocalizedText => ({ en, de, es });

export const STRINGS = {
  // Identität
  whoAreYou: L('Who are you?', 'Wer bist du?', '¿Quién eres?'),
  whereDoYouPlay: L('Where do you play?', 'Wo spielst du?', '¿Dónde juegas?'),
  name: L('Name', 'Name', 'Nombre'),
  namePlaceholder: L('NAME', 'NAME', 'NOMBRE'),
  number: L('No.', 'Nr.', 'Nº'),
  strongFoot: L('Strong foot', 'Starker Fuß', 'Pie fuerte'),
  weakFoot: L('Weak foot', 'Schw. Fuß', 'Pie débil'),
  left: L('Left', 'Links', 'Izquierdo'),
  right: L('Right', 'Rechts', 'Derecho'),
  nationality: L('Nationality', 'Nationalität', 'Nacionalidad'),
  secondNationality: L('Second nationality', 'Zweite Nationalität', 'Segunda nacionalidad'),
  searchNation: L('Search nation', 'Nation suchen', 'Buscar país'),
  noNationMatches: L('No nation matches that.', 'Keine Nation passt dazu.', 'Ningún país coincide.'),
  showMore: L('Show more', 'Mehr zeigen', 'Mostrar más'),
  yourPosition: L('Your position', 'Deine Position', 'Tu posición'),
  favouriteFormation: L('Favourite formation', 'Lieblingssystem', 'Formación favorita'),
  pace: L('Pace', 'Gangart', 'Ritmo'),
  tapPosition: L(
    'Tap your position on the pitch.',
    'Tippe deine Position auf dem Feld an.',
    'Toca tu posición en el campo.',
  ),
  startCareer: L('Start career', 'Karriere starten', 'Empezar carrera'),
  enterNameToContinue: L(
    'Enter a name to continue.',
    'Gib einen Namen ein, um fortzufahren.',
    'Introduce un nombre para continuar.',
  ),
  pickSecondNationality: L(
    'Pick your second nationality.',
    'Wähle deine zweite Nationalität.',
    'Elige tu segunda nacionalidad.',
  ),
  choosePosition: L(
    'Choose your position on the pitch.',
    'Wähle deine Position auf dem Feld.',
    'Elige tu posición en el campo.',
  ),
  back: L('Back', 'Zurück', 'Atrás'),

  // Werte und Beschriftungen
  ovr: L('OVR', 'OVR', 'OVR'),
  value: L('Value', 'Wert', 'Valor'),
  age: L('Age', 'Alter', 'Edad'),
  pos: L('Pos', 'Pos', 'Pos'),
  foot: L('Foot', 'Fuß', 'Pie'),
  weak: L('Weak', 'Schwach', 'Flojo'),
  goals: L('Goals', 'Tore', 'Goles'),
  assists: L('Assists', 'Vorlagen', 'Asistencias'),
  fans: L('Fans', 'Fans', 'Afición'),
  apps: L('Apps', 'Spiele', 'Partidos'),
  system: L('System', 'System', 'Sistema'),
  season: L('Season', 'Saison', 'Temporada'),
  calledUpBy: L('Called up by', 'Nominiert von', 'Convocado por'),
  none: L('None', 'Keine', 'Ninguna'),
  trophies: L('Trophies', 'Trophäen', 'Trofeos'),
  nothingWonYet: L('Nothing won yet', 'Noch nichts gewonnen', 'Aún nada ganado'),
  kitSupplier: L('Kit supplier', 'Ausrüster', 'Proveedor'),
  mediaPartner: L('Media partner', 'Medienpartner', 'Socio de medios'),
  nobodyYet: L('Nobody yet', 'Noch niemand', 'Nadie aún'),
  morale: L('Morale', 'Moral', 'Moral'),
  media: L('Media', 'Presse', 'Prensa'),
  freeAgent: L('Free agent', 'Vereinslos', 'Sin club'),
  noClub: L('No club', 'Kein Verein', 'Sin club'),
  onLoan: L('On loan', 'Leihe', 'Cesión'),
  choosingClub: L('Choosing club...', 'Verein wird gewählt...', 'Eligiendo club...'),
  reputation: L('Reputation', 'Reputation', 'Reputación'),

  // Kaderrollen
  roleStarter: L('First choice', 'Stammplatz', 'Titular'),
  roleHighRotation: L('Rotation', 'Rotation', 'Rotación'),
  roleLowRotation: L('Fringe player', 'Ergänzung', 'Suplente habitual'),
  roleSubstitute: L('Benchwarmer', 'Bankdrücker', 'Banquillo'),

  // Saisontabelle
  seasonBySeason: L('Season by season', 'Saison für Saison', 'Temporada a temporada'),
  club: L('Club', 'Verein', 'Club'),
  colApps: L('Apps', 'Sp.', 'PJ'),
  colGoals: L('Goals', 'Tore', 'Goles'),
  colSheets: L('Sheets', 'Zu Null', 'Cero'),
  colAst: L('Ast', 'Vorl.', 'Asis'),
  colFans: L('Fans', 'Fans', 'Afic.'),
  nationalTeam: L('National team', 'Nationalmannschaft', 'Selección'),

  // Laufende Karriere / Auftakt
  beforeFirstMatch: L('Before your first match', 'Vor deinem ersten Spiel', 'Antes de tu primer partido'),
  cleanSheets: L('Clean sheets', 'Zu-null-Spiele', 'Porterías a cero'),
  firstHalf: L('first half', 'Hinrunde', 'primera vuelta'),
  yourFirstSeason: L('Your first season', 'Deine erste Saison', 'Tu primera temporada'),
  preSeasonOver: L(
    'Pre-season is over. Nothing has been decided yet.',
    'Die Vorbereitung ist vorbei. Noch ist nichts entschieden.',
    'La pretemporada ha terminado. Aún no hay nada decidido.',
  ),
  startTheSeason: L('Start the season', 'Saison starten', 'Empezar la temporada'),
  aCareerBegins: L('A career begins', 'Eine Karriere beginnt', 'Comienza una carrera'),

  // Bericht
  seasonReview: L('Season review', 'Saisonrückblick', 'Resumen de temporada'),
  halfSeasonReview: L('Half-season review', 'Halbserien-Rückblick', 'Resumen de media temporada'),
  whatHappened: L('What happened', 'Was passiert ist', 'Qué pasó'),
  wentWell: L('Went well', 'Lief gut', 'Salió bien'),
  wentWrong: L('Went wrong', 'Lief schief', 'Salió mal'),
  nothingStoodOut: L('Nothing stood out', 'Nichts Besonderes', 'Nada destacable'),
  nothingAgainstYou: L('Nothing went against you', 'Nichts lief gegen dich', 'Nada fue en tu contra'),
  yourDecisions: L('Your decisions', 'Deine Entscheidungen', 'Tus decisiones'),

  // Entscheidung
  nextDecision: L('Next decision', 'Nächste Entscheidung', 'Siguiente decisión'),
  confirm: L('Confirm', 'Bestätigen', 'Confirmar'),
  careerStart: L('Career start', 'Karrierestart', 'Inicio de carrera'),
  winterBreak: L('Winter break', 'Winterpause', 'Parón invernal'),
  summerBreak: L('Summer break', 'Sommerpause', 'Parón veraniego'),
  intoSecondHalf: L('Into the second half', 'In die Rückrunde', 'A la segunda vuelta'),
  intoSeason: L('Into season', 'In Saison', 'A la temporada'),

  // Karriereende
  endOfCareer: L('End of career', 'Karriereende', 'Fin de la carrera'),
  thatWasTheCareer: L('That was the career', 'Das war die Karriere', 'Esa fue la carrera'),
  newCareer: L('New career', 'Neue Karriere', 'Nueva carrera'),
  clubOne: L('club', 'Verein', 'club'),
  clubMany: L('clubs', 'Vereinen', 'clubes'),
  endSummary: L(
    '{n} seasons at {c} {club}, played out to the age of {a}.',
    '{n} Saisons bei {c} {club}, ausgespielt bis zum Alter von {a}.',
    '{n} temporadas en {c} {club}, hasta los {a} años.',
  ),

  // Fußzeile
  disclaimer: L(
    'The club names and references are used solely for identification purposes within the simulation. This platform is not affiliated with, sponsored by, or endorsed by the mentioned clubs, unless expressly stated otherwise.',
    'Die Vereinsnamen und Bezüge dienen ausschließlich der Kennzeichnung innerhalb der Simulation. Diese Anwendung steht in keiner Verbindung zu den genannten Vereinen, wird von ihnen weder gesponsert noch unterstützt, sofern nicht ausdrücklich anders angegeben.',
    'Los nombres de clubes y las referencias se usan únicamente con fines de identificación dentro de la simulación. Esta plataforma no está afiliada, patrocinada ni respaldada por los clubes mencionados, salvo que se indique expresamente lo contrario.',
  ),
  language: L('Language', 'Sprache', 'Idioma'),
} as const;

export type StringKey = keyof typeof STRINGS;
