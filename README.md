# footsys

Fußball-Karriere-Simulator. Du erstellst einen Spieler mit wenigen Variablen
(Name, Nummer, Fuß, Nationalität, Position) und begleitest seine Karriere von
16 bis zum Karriereende. An festen Punkten triffst du Entscheidungen, die den
Verlauf verändern.

Ziel-Plattform: iOS. Entwicklung aktuell unter Windows.

## Aufbau

```
data/                      Stack-neutrale Spieldaten (reines JSON)
  core/
    confederations.json    6 Konföderationen
    countries.json         210 FIFA-Nationen (Code, Name, Konföderation, Stärke)
    positions.json         17 Positionen inkl. Platzkoordinaten
    formations.json        22 Formationen mit Slot-Belegung
  football/
    leagues.json           110 Ligen (Land, Tier, Pokal, Kontinentalplätze)
    cups.json              81 nationale Pokalwettbewerbe
    competitions.json      Kontinental- und Nationalwettbewerbe, Einzelauszeichnungen
    clubs/<FIFA>.json      1.275 Vereine je Land, nach Liga gruppiert
  game/
    progression.json       Entwicklungskurven, Rollen-Schwellen, Marktwert, Verletzungen
    trophy-odds.json       Titelwahrscheinlichkeiten nach Reputation
    events.json            Katalog der Karriere-Entscheidungen
    meters.json            Moral, Fan-Rückhalt, Presse
    random-events.json     Zufallsereignisse ohne Entscheidung
design/
  DESIGN.md                Designsprache und Responsive-Verhalten (iPhone/iPad)
  tokens.json              Farben, Abstände, Radien, Typografie, Komponenten
  reference/               Referenz-Screenshot
assets/                    Bilddateien — Ablage nach Dateiname, siehe assets/README.md
  clubs/                   <club-id>.png
  trophies/                <trophy-key>.png
  competitions/            <competition-id>.png
  leagues/                 <league-id>.png
  _fallback/trophies/      eigene SVG-Platzhalter
apps/mobile/               Expo-App (iPhone, iPad, Web)
  App.tsx                  Zustandswechsel Start → Karriere → Karriereende
  src/theme.ts             Tokens aus design/tokens.json
  src/game-data.ts         gebündelte Spieldaten, je Karriere eine eigene Kopie
  src/components/          Karte, Meter, Ring, Segment-Control, Wappen, Spielfeld
  src/screens/             Start, Karriere-Hub, Entscheidungsblatt, Vitrine
packages/engine/src/       Spiel-Logik (rein funktional, deterministisch per Seed)
  types.ts                 Typen zu allen Datendateien und zum Spielstand
  rng.ts                   Deterministischer Zufallsgenerator
  data.ts / data-node.ts   Datenzugriff (injiziert bzw. aus dem Dateisystem)
  progression.ts           Entwicklung, Potenzial, Kaderrolle, Marktwert
  simulation.ts            Halbserie rechnen, Saison abschließen, Titel würfeln
  events.ts                Ereignisauswahl, Vereinsangebote, Modifikatoren
  career.ts                Ablaufsteuerung der Karriere
  tools/simulate.ts        Balancing-Werkzeug
```

## Stack

TypeScript, App als Expo/React Native. Entwicklung läuft unter Windows; der
iOS-Build entsteht über EAS auf Apples Cloud-Rechnern, ein eigener Mac ist dafür
nicht nötig. Die Engine ist bewusst frei von UI und Plattform-APIs — falls das
Projekt später auf natives SwiftUI wechselt, wird nur sie portiert.

## Kommandos

```bash
npm install
cd apps/mobile && npm install && cd ../..

npm run app           # App starten — http://localhost:8081
npm test              # Engine-Tests, inklusive Determinismus-Nachweis
npm run typecheck
npm run sim -- --runs 300 --position ST --country GER --verbose
npm run assets        # zeigt, welche Wappen und Trophäen noch fehlen
npm run import:clubs  # einmaliger Datenimport, siehe data/football/README.md
```

## App ausprobieren

`npm run app` startet Metro und öffnet die App im Browser. Im Terminal steht
zusätzlich ein QR-Code: mit **Expo Go** (App Store) gescannt, läuft dieselbe
App auf deinem iPhone oder iPad — Rechner und Gerät müssen im selben WLAN sein.
Ein Mac ist dafür nicht nötig.

Für eine echte `.ipa` zum Verteilen später `eas build --platform ios`; das läuft
auf Apples Rechnern in der Cloud und braucht nur ein Apple-Entwicklerkonto.

`npm run sim` spielt hunderte Karrieren mit zufälligen Entscheidungen durch und
gibt die Verteilung aus — das ist das Werkzeug fürs Balancing.

## Zeitmodell

Kleinste simulierte Einheit ist die **Halbserie**. Daraus ergibt sich:

- Hin- und Rückrunde werden getrennt gerechnet, Statistiken addieren sich zur Saison
- In der **Winterpause** können Entscheidungen anstehen (Wintertransfer,
  Formkrise, OP-Termin, Turniervorbereitung) — mit 45 % Wahrscheinlichkeit
- In der **Sommerpause** steht immer eine Entscheidung an: Transfer, Leihe,
  Vertrag, Karriereende oder ein erzähltes Karriereereignis
- Nach jeder Halbserie treten 0–2 **Zufallsereignisse** ein, die niemand wählt:
  Trainerwechsel, Formhoch, Verletzung, Abstieg, Investoreneinstieg, Rote Karte

Eine typische Karriere umfasst damit rund 27 Entscheidungen und 36
Zufallsereignisse über gut 20 Saisons.

## Verstecktes Potenzial

Jeder Spieler bekommt beim Start ein Leistungsmaximum, das nie angezeigt wird.
Je näher der aktuelle OVR daran liegt, desto stärker bremst das Wachstum. Ohne
diesen Mechanismus wird in einem solchen Spiel jeder Spieler Weltklasse — mit
ihm erreichen etwa 3 % je einen OVR von 88 und rund 10 % kommen nie über 65
hinaus.

## Prinzipien

1. **Daten sind Daten.** Kein Balancing im Code, alles in `data/`. Wer eine Liga
   ergänzt oder eine Kurve anpasst, fasst keinen Code an.
2. **Deterministisch.** Gleicher Seed + gleiche Entscheidungen = gleiche Karriere.
   Kein `Math.random()` in der Engine, nur ein seeded RNG, dessen State Teil des
   Spielstands ist. Das macht Replays, Sharing und Tests möglich.
3. **Engine ist portierbar.** Die Engine kennt keine UI und kein Framework.
   Falls das Projekt später auf natives Swift wechselt, wird nur die Engine
   portiert — die Daten bleiben unverändert.
4. **i18n von Anfang an.** Alle sichtbaren Texte über Keys, Daten tragen
   `de`/`en`-Felder.

## Datenstand

- Konföderationen, Länder, Positionen, Formationen: vollständig
- Ligen: die relevanten Wettbewerbe aller Konföderationen als Metadaten
- Vereine: erste Ausbaustufe (siehe `data/football/clubs/`) — Rest folgt über
  Import, siehe `data/football/README.md`
- Länder-Codes und -Zuordnungen sind nach FIFA-Standard erfasst, aber noch nicht
  gegen eine offizielle Quelle validiert.
