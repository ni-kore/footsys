# Fußball-Daten

## Stand

| | Anzahl |
|---|---|
| Länder | 210 |
| Ligen | 110 |
| Nationale Pokale | 81 |
| Vereine | 1.275 |

Vereine je Spielklasse: Tier 1 → 765 · Tier 2 → 252 · Tier 3 → 132 · Tier 4 → 102 · Tier 5 → 24

Von den 1.275 Vereinen haben 228 gepflegte Farben, Stadt und Reputation. Die
übrigen 1.047 stammen aus dem Import und tragen Platzhalterfarben
(`#2B2B38`) sowie geschätzte Reputationswerte.

## Herkunft

Der Bestand kam in zwei Schritten zustande:

1. **Von Hand gepflegt** — die großen Ligen Europas und Südamerikas mit
   recherchierten Farben, Städten und abgestimmter Reputation.
2. **Importiert** — `npm run import:clubs` zieht Ligakader aus den
   [openfootball](https://github.com/openfootball)-Repositories (Public Domain),
   Saisons 2026-27 → 2025-26 → 2024-25, je Spielklasse gewinnt die
   vollständigste Datei.

Der Import ist ein **einmaliger Vorgang**. Die App holt zur Laufzeit nichts nach
— sie liest ausschließlich die JSON-Dateien in diesem Verzeichnis. Der Importer
existiert nur, damit ein Nachziehen später reproduzierbar bleibt.

Gepflegte Einträge werden beim Import nie überschrieben: erkannt an gesetzter
Stadt und echten Farben. Namensvarianten desselben Vereins („NEC" neben „NEC
Nijmegen") werden zusammengeführt, zweite Mannschaften („Barcelona B") bleiben
eigenständig.

## Abdeckung gegen die Zielliste

Gemessen an der gewünschten Länder- und Spielklassenliste:

| | |
|---|---|
| Länder auf der Liste | 80 |
| davon vollständig | 3 |
| davon teilweise | 47 |
| davon gar nicht | 30 |
| Spielklassen abgedeckt | 71 von 236 (30 %) |

Die größten Lücken:

| Land | vorhanden / gewünscht |
|---|---|
| Schottland | 1 / 10 |
| Belgien | 0 / 6 |
| England | 5 / 10 |
| Spanien | 2 / 7 |
| Frankreich | 2 / 6 |
| Saudi-Arabien | 1 / 5 |
| Dänemark | 2 / 5 |
| Niederlande | 2 / 5 |

## Warum die Lücken bestehen

openfootball ist sauber und rechtlich unbedenklich, deckt aber im Wesentlichen
die höchste, teils die zweite Spielklasse ab. Für England reicht es bis Tier 5,
für Deutschland und Italien bis Tier 4 — darunter existieren dort schlicht keine
Datensätze.

Andere geprüfte Quellen:

| Quelle | Ergebnis |
|---|---|
| **Wikidata (SPARQL)** | unbrauchbar. Historische Ligen von 1963 stehen gleichberechtigt neben aktuellen, Frauen- und Männerligen sind vermischt, und ausgerechnet die Bundesliga trägt keine Spielklassen-Angabe. Die Vereins-Liga-Verknüpfung (P118) ist lückenhaft. |
| **football-data.org** | kostenlose Stufe umfasst 12 Wettbewerbe. |
| **Transfermarkt, Soccerway** | vollständig, aber Scraping ist dort untersagt und die Datenbank urheberrechtlich geschützt. |

## Wie die Lücken geschlossen werden

Für Tier 5–10 führt kein Weg an einer kommerziellen Vollquelle vorbei.
Realistisch sind **API-Football** (rund 1.100 Ligen inklusive unterer
Spielklassen, ab etwa 19 €/Monat) oder **SportMonks** (ähnlicher Umfang).

Der Importer ist dafür vorbereitet: Ein Adapter liefert
`{ country, tier, clubNames[] }`, alles danach — Zusammenführen, Dubletten,
Reputationsschätzung, Schreiben — ist quellenunabhängig. Ein neuer Anbieter ist
eine neue Funktion neben `collectFromRegionRepo`, kein neuer Importer. Ein
Monat Abo reicht, weil der Import einmalig läuft und das Ergebnis im Repo
liegt.

## Offene Punkte

- Farben und Städte für die 1.047 importierten Vereine. Sobald Wappen unter
  `assets/clubs/` liegen, lässt sich die dominante Farbe daraus ableiten,
  statt sie von Hand zu pflegen.
- Reputationswerte der importierten Vereine sind aus Spielklasse und
  Ligastärke geschätzt und noch nicht abgestimmt.
- FIFA-Ländercodes in `core/countries.json` (210 Einträge, offiziell sind es
  211) sind nicht gegen die offizielle Liste geprüft.
- `abbr` ist innerhalb eines Landes nicht garantiert eindeutig.
