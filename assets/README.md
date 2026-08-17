# Assets

Hier liegen alle Bilddateien. Der Dateiname ist die Verbindung zu den Daten —
es gibt keine Zuordnungstabelle, die gepflegt werden muss. Wer eine Datei mit
dem richtigen Namen ablegt, hat das Bild damit im Spiel.

## Ordner

| Ordner | Dateiname | Beispiel |
|---|---|---|
| `clubs/` | `<club-id>.png` — die `id` aus `data/football/clubs/<LAND>.json` | `bayern-munich.png` |
| `trophies/` | `<trophy-key>.png` — der `trophy`-Wert aus `competitions.json` | `continental-primary.png` |
| `competitions/` | `<competition-id>.png` — für konkrete Wettbewerbslogos | `uefa-champions-league.png` |
| `leagues/` | `<league-id>.png` — die `id` aus `leagues.json` | `ger-bundesliga.png` |
| `_fallback/` | eigene SVG-Platzhalter, greifen wenn kein PNG da ist | |

## Vorgaben für die Dateien

| | Wappen (`clubs/`) | Trophäen & Wettbewerbe |
|---|---|---|
| Format | PNG, 32 Bit mit Alpha | PNG, 32 Bit mit Alpha |
| Größe | 512 × 512 px | 512 × 512 px |
| Inhalt | quadratisch, zentriert, ca. 8 % Rand | Objekt freigestellt, hochkant zentriert |
| Hintergrund | transparent | transparent |
| Farbe | Original | Original, wir tönen nicht nach |

Wichtig: **transparenter Hintergrund**. Die App zeigt alles auf sehr dunklem
Grund — ein weißer Kasten hinter dem Wappen fällt sofort auf. Bei Wappen, die
selbst fast schwarz sind, setzt die App automatisch einen hellen Rand.

Dateinamen sind kleingeschrieben, ohne Leerzeichen und ohne Umlaute — genau so,
wie die `id` in den Daten steht.

## Football-Manager-Wappen

Der Bestand stammt aus einem FM2024-Wappenpaket: 77.162 Dateien mit
numerischen IDs plus ein PDF, das ID, Ländercode und Vereinsname verbindet.

- Rohdaten liegen unter `assets/_source/fm-badges/` (4,7 GB, in `.gitignore` —
  sie werden nicht mit ausgeliefert)
- `node scripts/match-badges.js` ordnet sie unseren Vereinen zu und kopiert die
  Treffer als `<club-id>.png` hierher
- `scripts/badge-overrides.json` löst die Fälle, die der Abgleich nicht schafft,
  weil FM Kurznamen verwendet („Man City", „Nottm Forest", „Wolves")
- `node scripts/generate-badge-imports.js` erzeugt danach die Bundler-Einträge

Zugeordnet sind aktuell **1.164 von 1.275 Vereinen (91 %)**, zusammen 48,5 MB.
Die verbliebenen 111 sind fast ausschließlich Vereine aus Marokko, Ägypten,
der Türkei und der Ukraine, deren Umschrift zwischen den Quellen abweicht — sie
behalten das generierte Wappen. Wer einen davon nachtragen will, sucht die
FM-ID im PDF und trägt sie in `scripts/badge-overrides.json` ein.

Nach neuen Uploads oder neuen Vereinen im Datenbestand:

```bash
node scripts/match-badges.js --write
node scripts/generate-badge-imports.js
```

## Was passiert, wenn eine Datei fehlt

Nichts bricht. Die Reihenfolge ist:

1. PNG in `assets/clubs/` bzw. `assets/trophies/`
2. SVG in `assets/_fallback/`
3. Automatisch erzeugtes Wappen aus `colors` und `abbr` des Vereins

Das generierte Wappen sieht ordentlich aus, deshalb kannst du Bilder nach und
nach nachliefern, ohne dass zwischendurch etwas leer bleibt.

## Prüfen, was noch fehlt

```bash
npm run assets
```

Das Skript vergleicht die Dateien mit den Daten und schreibt
`assets/MANIFEST.json`. Es meldet drei Dinge:

- **fehlend** — in den Daten vorhanden, aber kein Bild da
- **verwaist** — Bild da, aber kein passender Eintrag in den Daten (meist ein
  Tippfehler im Dateinamen)
- **abgedeckt** — Anteil je Kategorie

Mit `--missing clubs` bekommst du die Liste der fehlenden Vereins-IDs, sortiert
nach Reputation — damit lohnt sich die Arbeit zuerst dort, wo die Vereine
tatsächlich oft auftauchen.

## Rechtliches

Vereinswappen und Trophäenformen sind Marken der Vereine und Verbände. Für die
Verwendung in einer veröffentlichten App brauchst du entweder eine Erlaubnis
oder du bleibst bei den generierten Wappen. Das ist deine Entscheidung — die
Technik unterstützt beides, und der Wechsel ist ein Löschen des Ordners.

Die Dateien in `_fallback/` sind eigene Zeichnungen und dürfen wir uneingeschränkt
verwenden. Sie sind bewusst abstrahiert und bilden keine konkrete Trophäe nach.

### Trophäen-Keys

Diese Keys werden von `competitions.json` verwendet. Ein PNG unter diesem Namen
ersetzt den Platzhalter:

`league` · `domestic-cup` · `continental-primary` · `continental-secondary` ·
`continental-tertiary` · `supercup` · `world-club` · `world-cup` ·
`continental-national` · `olympic` · `individual-golden-ball` ·
`individual-golden-boot` · `individual-golden-glove` · `individual-playmaker` ·
`individual-young`

### Farbstufen in der Vitrine

| Zustand | Farbe |
|---|---|
| gewonnen, Prestige 5 | `#F5C542` (Gold) |
| gewonnen, Prestige 3–4 | `#C9CBD4` (Silber) |
| gewonnen, Prestige 1–2 | `#B08D57` (Bronze) |
| nicht gewonnen | `color.text.disabled`, 40 % Deckkraft |

Bei hochgeladenen PNGs wird nicht eingefärbt — die zeigen wir wie geliefert,
nicht gewonnene Trophäen nur abgedunkelt.
