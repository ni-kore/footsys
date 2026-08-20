# footsys

Fußball-Karriere-Simulator. Du erstellst einen Spieler mit wenigen Variablen
(Name, Nummer, Fuß, Nationalität, Position) und begleitest seine Karriere von
16 bis zum Karriereende. In jedem Sommer liegt ein Vereinsangebot auf dem
Tisch, dazu kommt, was das Leben sonst bringt — mal nichts, mal zwei
Entscheidungen, die den Verlauf verändern.

Ziel-Plattform: iOS. Entwicklung aktuell unter Windows.

## Schnellstart

Vorausgesetzt sind Node 20 oder neuer (entwickelt wird mit Node 24) und npm.
Ein Mac wird nicht gebraucht.

```bash
npm install
npm --prefix apps/mobile install
npm run app
```

`npm run app` startet Metro und öffnet die App unter <http://localhost:8081> im
Browser. Im Terminal steht zusätzlich ein QR-Code: mit **Expo Go** (App Store)
gescannt, läuft dieselbe App auf iPhone oder iPad — Rechner und Gerät müssen im
selben WLAN sein.

Hängt Metro nach einem Datei- oder Datenwechsel, hilft ein Start ohne Cache:

```bash
npm run app:clear
```

Für eine echte `.ipa` zum Verteilen später `eas build --platform ios`; das läuft
auf Apples Rechnern in der Cloud und braucht nur ein Apple-Entwicklerkonto.

## Kommandos

```bash
npm test                # Engine-Tests, inklusive Determinismus-Nachweis
npm run typecheck       # Engine
npm run typecheck:app   # App
npm run sim -- --runs 300 --position ST --country GER --verbose
npm run balance -- 120  # Karrieren gegen die Zieltabelle aus docs/iteration-2.md
npm run assets          # zeigt, welche Wappen und Trophäen noch fehlen
npm run import:clubs    # einmaliger Datenimport, siehe data/football/README.md
```

`npm run sim` und `npm run balance` spielen hunderte Karrieren mit zufälligen
Entscheidungen durch und geben die Verteilung aus — das ist das Werkzeug fürs
Balancing. `npm run balance` prüft dabei gegen die Zielwerte der zweiten
Iteration (Spitzen-OVR, Titel, Anhänger).

## Aufbau

```
data/                      Stack-neutrale Spieldaten (reines JSON)
  core/
    confederations.json    6 Konföderationen
    countries.json         210 FIFA-Nationen (Code, Name, Konföderation, Stärke)
    positions.json         17 Positionen inkl. Platzkoordinaten
    formations.json        22 Formationen mit Slot-Belegung
    association-logos.json Zuordnung Land → Verbandswappen in assets/nations
    fifa-ranking.json      Weltrangliste als Startwert der Nationalmannschaften
  football/
    leagues.json           75 Ligen mit ihren echten Namen (Land, Tier, Pokal)
    cups.json              81 nationale Pokalwettbewerbe
    competitions.json      24 Klub-, 9 Länder- und 10 Einzelauszeichnungen
    clubs/<FIFA>.json      1.218 Vereine in 55 Ländern, nach Liga gruppiert
  game/
    progression.json       Entwicklung, Rollen, Marktwert, Anhänger, Marktinteresse
    team-season.json       Tabellenplatz, Titel, europäische Startplätze
    events.json            62 Karriere-Entscheidungen und 9 strukturelle
    random-events.json     22 Zufallsereignisse ohne Entscheidung
    meters.json            Moral, Fan-Rückhalt, Presse samt Wirkungskurven
    partners.json          98 Medienpartner, 3 Ausrüster, Bindung an Verein
                           oder Land, Regeln für Angebote
    trophy-odds.json       Titelwahrscheinlichkeiten nach Reputation
design/
  DESIGN.md                Designsprache und Responsive-Verhalten (iPhone/iPad)
  tokens.json              Farben, Abstände, Radien, Typografie, Komponenten
docs/
  iteration-2.md           Plan der zweiten Iteration samt offener Punkte
assets/                    Bilddateien — Ablage nach Dateiname, siehe assets/README.md
  clubs/                   <club-id>.png
  trophies/                2.461 Bilder, aktuell dient 22.png allen als Platzhalter
  nations/                 246 Verbandswappen
  mediapartner/            123 Sender- und Verlagslogos
  ausruester/              Ausrüsterlogos (noch leer, siehe README dort)
  events/                  Bilder für die Antworten der Entscheidungskarten
apps/mobile/               Expo-App (iPhone, iPad, Web)
  App.tsx                  Zustandswechsel Start → Karriere → Karriereende
  src/theme.ts             Tokens aus design/tokens.json
  src/game-data.ts         gebündelte Spieldaten, je Karriere eine eigene Kopie
  src/components/
    PlayerCard.tsx         Spielerkarte: Werte, Verein, Vitrine, Partner, Meter
    CareerLayout.tsx       zwei Flächen nebeneinander, gleich hoch
    SeasonTable.tsx        Saison für Saison, Summe, Nationalmannschaft
    Tooltip.tsx            eine Hinweisebene über der ganzen Anwendung
    Trophy.tsx             gewonnener Titel als Bild mit Anzahl und Hinweis
    CardImage.tsx          angeschnittenes Bild für die Antworten
    motion.tsx             Zählen, Blenden, Übergänge
  src/screens/             Identität, Karrierestart, Entscheidung, Auftakt,
                           Saisonbericht, Karriereende (schlicht)
packages/engine/src/       Spiel-Logik (rein funktional, deterministisch per Seed)
  types.ts                 Typen zu allen Datendateien und zum Spielstand
  rng.ts                   Deterministischer Zufallsgenerator
  data.ts / data-node.ts   Datenzugriff (injiziert bzw. aus dem Dateisystem)
  progression.ts           Entwicklung, Potenzial, Kaderrolle, Marktwert
  simulation.ts            Halbserie rechnen, Saison abschließen
  team-season.ts           Tabellenplatz der Mannschaft, daraus Titel und Europa
  meters.ts                Moral, Rückhalt und Presse als Verstärker
  facts.ts                 Karrierefakten, aus denen Ereignisse entstehen
  events.ts                Ereignisauswahl, Vereinsangebote, Modifikatoren
  outcome.ts               was eine Wahl bedeutet, in Worten statt Zahlen
  partners.ts / fans.ts    Medienpartner, Ausrüster, Reichweite
  national-team.ts         Nominierung, Länderspiele, Turniere
  career.ts                Ablaufsteuerung der Karriere
  tools/                   simulate, balance, assets, import-clubs, check-nations
scripts/                   einmalige Import- und Zuordnungsläufe (Node, kein Build)
```

## Stack

TypeScript, App als Expo/React Native. Entwicklung läuft unter Windows; der
iOS-Build entsteht über EAS auf Apples Cloud-Rechnern, ein eigener Mac ist dafür
nicht nötig. Die Engine ist bewusst frei von UI und Plattform-APIs — falls das
Projekt später auf natives SwiftUI wechselt, wird nur sie portiert.

## Ablauf

Die Engine hält an, wo der gewählte Rhythmus es vorsieht. Jeder Zwischenstand
bekommt einen eigenen Bildschirm, der erst auf eine Eingabe hin weitergeht:

    Identität → Vereinswahl → Auftakt → Entscheidungen → Halbserien-Bericht
              → Entscheidungen → Saison-Bericht → … → Karriereende

- Kleinste simulierte Einheit ist die **Halbserie**; Hin- und Rückrunde werden
  getrennt gerechnet und in je einem Bericht gezeigt
- In jeder **Sommerpause** fragt ein Verein an — bleiben oder gehen ist die
  Frage, die eine Karriere trägt. Nur wen gerade niemand auf dem Zettel hat,
  bei dem klingelt es auch mal nicht
- Dazu kommen **null bis zwei weitere Entscheidungen** als Kartenstapel: er
  lässt sich nach links und rechts schieben, jede Wahl ist bis zum Anpfiff noch
  änderbar. In einer Pause steht höchstens eine Vereinsfrage an — man sucht
  sich nicht zweimal hintereinander einen Klub aus
- Angebote kommen aus der **eigenen Spielklasse und Gegend**: meist dieselbe
  oder eine benachbarte Liga, ganz überwiegend derselbe Kontinent. Eine
  Karriere arbeitet sich von unten nach oben — und wer nachlässt, bekommt die
  Anrufe von weiter unten
- Nach jeder Halbserie treten zusätzlich **Zufallsereignisse** ein:
  Trainerwechsel, Formhoch, Verletzung, Abstieg, Investoreneinstieg, Rote Karte
- Erzwingt ein Ereignis einen Wechsel, wählst du das Ziel selbst
- Der **Saisonauftakt** wird nur vor der allerersten Saison gezeigt
- Am Ende bleibt die Laufbahn stehen, wie sie war — Spielerkarte und
  Saisontabelle. Eine eigene Zusammenfassung gibt es vorerst nicht

### Gangart

Vor dem Start wird gewählt, wie oft die Simulation anhält
(`data/game/progression.json`, `career.modes`):

| Gangart | Hält an |
| --- | --- |
| **Normal** | jede Pause, Winter wie Sommer |
| **Fast** | nur zur Sommerpause |
| **Very fast** | nur alle drei Saisons |
| **Instant** | gar nicht — die Engine entscheidet selbst und rechnet die ganze Laufbahn in einem Zug |

Übersprungen wird nur das Fragen und Zeigen: was in einem ungezeigten Bericht
stand, wandert in den nächsten, und eine auslaufende Leihe oder ein
Karriereende passiert in jeder Gangart.

Die Oberfläche ist englisch. Die Daten führen weiterhin deutsche und englische
Texte — eine deutsche Fassung wäre ein Sprachschalter, keine Übersetzungsrunde.

## Wie eine Saison entschieden wird

Die Liga wird gespielt, nicht gewürfelt: jeder Verein der Spielklasse bekommt
eine Saisonstärke aus seiner Reputation und einer Portion Form, danach steht
die Tabelle. Der eigene Platz ist der Rang darin, verschoben um den Beitrag des
Spielers. Deshalb gibt es je Saison genau einen Meister, und wer bei einem
kleinen Verein spielt, muss an allen Großen vorbei. Der Pokal misst sich am
eigenen Feld — dort spielt man gegen die eigene Liga, nicht gegen die Welt.

Nicht der Spieler holt den Titel, sondern die Mannschaft. `team-season.ts`
würfelt zuerst den Tabellenplatz aus der Reputation des Vereins und verschiebt
ihn dann um den Beitrag des Spielers — spürbar, aber nie so weit, dass ein
Aufsteiger mit einem starken Stürmer Meister wird. Aus dem Platz ergeben sich
Titel und der europäische Startplatz der Folgesaison. Wer etwas gewinnen will,
muss also dorthin wechseln, wo etwas zu gewinnen ist.

Rundherum:

- **Meter als Verstärker.** Moral, Rückhalt und Presse verändern über Kurven aus
  `meters.json` Einsatzzeit, Ausbeute, Schwankung und Auszeichnungen
- **Umfeld.** Ein größerer Verein macht den Spieler auch selbst besser
- **Fakten und Ketten.** Was in der Karriere passiert ist, löst später passende
  Ereignisse aus; manche Entscheidungen kommen Saisons darauf zurück
- **Marktinteresse.** Leistung und Schlagzeilen bestimmen, wie viele und wie
  gute Angebote im Sommer auf dem Tisch liegen
- **Partner.** Medienpartner und Ausrüster bringen Anhänger und bessere
  Angebote, garantiert ist dabei nichts. Unterschrieben wird auf vier bis
  sieben Saisons — solange fragt niemand nach; erst zum Vertragsende steht die
  Marke wieder zur Wahl, samt Verlängerung. Wer eine Marke hat, bekommt eigene
  Entscheidungen dazu: die Doku über die eigene Laufbahn, das Exklusivinterview
- **Wer anfragt.** Ein Vereinssender meldet sich nur beim eigenen Verein
  (`club` in `partners.json`), eine Landesmarke im eigenen Land oder bei einem
  Landsmann (`country`); ohne beides ist die Marke international. Wer den
  Verein wechselt, verliert dessen Sender
- **Anhänger.** Die Obergrenze liegt regulär bei 400 Millionen; die 700
  Millionen erreicht nur PELLE PELLE

## Verstecktes Potenzial

Jeder Spieler bekommt beim Start ein Leistungsmaximum, das nie angezeigt wird.
Je näher der aktuelle OVR daran liegt, desto stärker bremst das Wachstum. Ohne
diesen Mechanismus wird in einem solchen Spiel jeder Spieler Weltklasse. Über
120 durchgespielte Karrieren liegt der Spitzen-OVR im Median bei 74, ein Zehntel
kommt nicht über 67 hinaus und ein Zehntel über 86. Ein Fünftel aller Karrieren
endet ohne einen einzigen Titel.

## Prinzipien

1. **Daten sind Daten.** Kein Balancing im Code, alles in `data/`. Wer eine Liga
   ergänzt oder eine Kurve anpasst, fasst keinen Code an.
2. **Deterministisch.** Gleicher Seed + gleiche Entscheidungen = gleiche Karriere.
   Kein `Math.random()` in der Engine, nur ein seeded RNG, dessen State Teil des
   Spielstands ist. Das macht Replays, Sharing und Tests möglich.
3. **Kein Netz zur Laufzeit.** Alle Daten und Bilder liegen im Projekt. Importe
   laufen einmalig über `scripts/` und `tools/`, nie beim Spielen.
4. **Engine ist portierbar.** Die Engine kennt keine UI und kein Framework.
   Falls das Projekt später auf natives Swift wechselt, wird nur die Engine
   portiert — die Daten bleiben unverändert.
5. **i18n von Anfang an.** Alle sichtbaren Texte über Keys, Daten tragen
   `de`/`en`-Felder.

## Datenstand

- Konföderationen, Länder, Positionen, Formationen: vollständig
- Ligen und Pokale: die relevanten Wettbewerbe aller Konföderationen, mit ihren
  echten Namen
- Vereine: 1.218 in 55 Ländern; wählbar ist nur, wovon ein Wappen vorliegt
- Ausrüster sind für 96 Spitzenvereine fest hinterlegt, die Logos dazu fehlen
  noch
- Trophäenbilder sind noch nicht zugeordnet: alle Titel zeigen denselben
  Platzhalter, den Namen nennt der Hinweis beim Darüberfahren
- Von 246 Verbandswappen sind 50 einem Land zugeordnet
- Länder-Codes und -Zuordnungen sind nach FIFA-Standard erfasst, aber noch nicht
  gegen eine offizielle Quelle validiert

Offene Punkte der laufenden Iteration stehen in `docs/iteration-2.md`.
