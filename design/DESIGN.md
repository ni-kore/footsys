# footsys — Design

Referenz: `design/reference/tactics-ui-reference.webp`
Tokens: `design/tokens.json` (verbindlich, keine Hex-Werte im Code)

## Designsprache

Die Referenz ist eine Taktik-Oberfläche im Football-Manager-Stil. Was wir davon
übernehmen:

| Element | Umsetzung in footsys |
|---|---|
| Fast schwarzer Hintergrund, minimal blaustichig | `bg.root` / `bg.canvas` |
| Karten als leicht hellere Flächen mit dünnem Rand | `surface.1` + `border.subtle` |
| Ein einziger Akzent (Indigo) für Auswahl & Primäraktion | `accent.base` |
| Versalien-Mikrolabels über dem Wert | `typography.style.micro` |
| 5-stufige Balken-Meter statt Zahlenkolonnen | `component.meter` |
| Ringe für Prozentwerte | `component.ring` |
| Segment-Controls statt Dropdowns bei ≤ 3 Optionen | `component.segmentedControl` |
| Sparsame Farbe: grün/amber/rot nur als Bewertung | `color.status`, `color.rating` |

Grundregel: **Farbe bedeutet etwas.** Indigo = auswählbar/ausgewählt.
Grün/Amber/Rot = Bewertung eines Werts. Alles andere ist grau.

## Übertragung auf die footsys-Screens

Die Referenz zeigt drei Spalten (In Defense / In Transition / In Possession).
Unsere Screens haben dieselbe Struktur aus Karten, aber andere Inhalte:

1. **Karriere-Start** — Identität: Name, Nummer, Fuß (Segment-Control),
   Nationalität (Suchliste mit Flaggen), Position (Platzgrafik wie die
   Taktik-Pitch-Ansicht der Referenz, Positionen als antippbare Punkte).
2. **Saison-Hub** — Spielerkarte oben (OVR-Ring, Verein, Alter, Marktwert),
   darunter Statistik-Kacheln (Einsätze/Tore/Vorlagen) im Kachelraster der
   Referenz, darunter die Karriere-Timeline.
3. **Entscheidung** — Vollflächiges Blatt mit 2–4 Optionskarten. Die
   Optionskarte ist visuell die Vereins-Zeile der Referenz-Sidebar:
   Wappen, Name, Liga, rechts die Reputations-Meter.
4. **Timeline** — Tabelle Alter/Verein/OVR/Sp./Tore/Vorlagen, eine Zeile je
   Saison, Titel als Chips.
5. **Vitrine** — Trophäen-Grid, gesperrte Einträge ausgegraut wie
   "Community Creations" in der Referenz.

## Responsive Verhalten

Zielgeräte: iPhone SE (375 pt) bis iPad Pro 12,9" (1024 pt Portrait / 1366 pt
Landscape). Layout richtet sich nach **Breite**, nicht nach Gerätetyp.

### Compact (< 600 pt) — iPhone, iPad Slide Over
- Eine Spalte, vertikal gescrollt
- Die drei Referenz-Spalten werden zu einem Segment-Control oben; jeweils eine
  Sektion sichtbar
- Entscheidungen als Sheet von unten, Optionskarten gestapelt, volle Breite
- Navigation: Tab Bar unten (Karriere · Timeline · Vitrine · Profil)
- Statistik-Kacheln: 2 Spalten
- Platzgrafik: volle Breite, Seitenverhältnis 2:3, Positionen mind. 44 pt Trefferfläche

### Medium (600–839 pt) — iPad Portrait, Split View 1/2
- Zwei Spalten: Inhalt + Kontext-Spalte (Spielerkarte bleibt sichtbar)
- Statistik-Kacheln: 3 Spalten
- Entscheidungen als zentriertes Modal, max. 640 pt breit
- Navigation: Sidebar einklappbar

### Expanded (≥ 840 pt) — iPad Landscape
- Drei Spalten wie in der Referenz: Sidebar (Karriere-Liste) · Hauptinhalt · Kontext
- Statistik-Kacheln: 4 Spalten
- Optionskarten nebeneinander statt gestapelt
- Inhalt auf `layout.maxContentWidth` begrenzt und zentriert

### Regeln, die überall gelten
- Trefferflächen mind. 44×44 pt, auch wenn das sichtbare Element kleiner ist
  (Meter, Positionspunkte)
- Safe Areas respektieren: Home-Indikator, Dynamic Island, iPad-Ecken
- Dynamic Type bis "XL" ohne Layoutbruch; Kacheln wachsen in die Höhe,
  Kachelraster fällt bei sehr großem Text auf eine Spalte zurück
- Keine Hover-abhängige Information — alles muss per Tap erreichbar sein
- Landscape auf dem iPhone: unterstützt, aber einspaltig mit reduzierter
  Kopfzeile
- Dark Mode ist der einzige Modus. Ein Light Mode ist nicht vorgesehen;
  falls er kommt, über Token-Austausch, nicht über Sonderfälle im Code.

## Nicht übernehmen

Die Referenz ist eine Desktop-Anwendung mit hoher Informationsdichte. Auf dem
iPhone ist das der falsche Maßstab. Pro Screen gilt: **eine Entscheidung, eine
Information im Fokus.** Die Dichte der Referenz erreichen wir erst in der
Expanded-Klasse.
