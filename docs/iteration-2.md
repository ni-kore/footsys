# footsys, zweite Ausbaustufe

Plan für den Umbau, und darunter in Abschnitt 7, was davon gebaut ist.

Das Ziel in einem Satz: eine Karriere soll sich anfühlen wie eine Laufbahn,
in der die eigenen Entscheidungen etwas bewirken, nicht wie eine Folge
unabhängiger Würfe. Leicht zu spielen, schwer zu meistern.

---

## 1. Wo das System heute auseinanderfällt

Drei Befunde aus dem Quelltext, nicht aus dem Bauch.

**Titel hängen allein am Verein.** `rollClubTitles` würfelt gegen
`trophyOdds.club.league.byDomesticReputation[club.reputation.domestic]`. Der
Spieler kommt in dieser Rechnung nicht vor. Ein Ergänzungsspieler bei einem
Spitzenklub gewinnt genauso oft die Meisterschaft wie dessen bester Mann, und
ein herausragender Spieler bei einem Mittelklasseverein hebt seine Mannschaft
um keinen Zentimeter.

**Die Meter sind Zierrat.** Über alle Quelldateien hinweg wirken sie an vier
Stellen: Moral verschiebt unterhalb einer Schwelle die Rolle und gibt oberhalb
von 85 einen Punkt OVR, Medienbindung gibt oberhalb von 80 einen Faktor 1,15
auf Auszeichnungen, Fanstimmung rechnet in der Anhängerschaft mit. Sonst
nichts. Sie sehen aus wie Verstärker, sind aber keine.

**Der Bericht führt zu nichts.** Was in einer Halbserie passiert, hat keinen
Einfluss darauf, welche Entscheidungen danach anstehen. Die drei Karten werden
aus dem Ereignisvorrat gezogen, nicht aus dem, was gerade geschehen ist.
Verletzung, Platzverlust, Trainerwechsel, Torserie: alles verpufft.

---

## 2. Der Umbau der Engine

### 2.1 Eine sichtbare Kette statt verstreuter Würfe

Heute liegt die Logik in `simulateHalf` und `closeSeason` nebeneinander und
greift quer aufeinander zu. Stattdessen eine benannte Kette mit einem
gemeinsamen Zusammenhang, den jede Stufe liest und beschreibt:

```
Verfügbarkeit → Rolle → Spielzeit → Ertrag → Mannschaftssaison
   → Titel → Auszeichnungen → Ansehen → Meter → Entwicklung → Marktwert
```

Jede Stufe ist eine reine Funktion `(kontext) => teilergebnis` und schreibt
ihre Begründung mit. Das kostet einmal Arbeit und bringt dreierlei: die
Abhängigkeiten stehen im Code statt im Kopf, jede Stufe ist einzeln testbar,
und der Bericht kann später erklären, **warum** etwas passiert ist statt nur
zu melden, dass es passiert ist.

### 2.2 Die Mannschaftssaison, das fehlende Stück

Der Kern des Umbaus. Statt für jeden Titel einzeln zu würfeln, wird erst die
Saison der Mannschaft bestimmt, und die Titel folgen daraus.

```
mannschaftsstärke = vereinsstärke + eigenerBeitrag
eigenerBeitrag    = f(Spielzeitanteil, OVR über Kadermittel, Positionsgewicht)
tabellenplatz     = Verteilung um die Mannschaftsstärke, mit Streuung
```

**Der Verein bleibt der bestimmende Teil.** Wer bei Bayern spielt, gewinnt
Titel, auch ohne selbst herausragend zu sein. Das ist richtig so, und der
eigene Beitrag verschiebt den Erwartungswert nur um einen begrenzten Anteil,
grob ein Fünftel der Spannweite, bei offensiven Positionen etwas mehr als bei
defensiven.

**Die Schwierigkeit liegt woanders: ob Bayern einen überhaupt will.** Das ist
die eigentliche Hürde und gehört sauber ausgespielt:

- Top-Vereine bieten erst ab einem Niveau, das zum Kader passt. Das gibt es
  heute im Ansatz über `levelForOverall`, es muss aber härter und sichtbarer
  werden.
- Wer dort unterschrieben hat und das Niveau nicht hält, verliert die Rolle,
  nicht den Titel. Man wird Meister und sitzt daneben: keine Auszeichnungen,
  wenig Wachstum, sinkender Marktwert, und im nächsten Sommer kommt das
  Angebot von unten statt von oben.
- Die Entscheidung „lieber Stammspieler beim Mittelklasseverein oder Reservist
  beim Spitzenklub" wird damit zur echten Weichenstellung. Genau die will das
  Spiel stellen.

Was der Umbau sonst noch ändert: der Tabellenplatz entscheidet über die
europäischen Plätze der **nächsten** Saison, damit hängen Jahre zusammen statt
jedes Jahr bei null anzufangen. Pokale werden als Ausscheidungsrunden mit
Überraschungsanteil gerechnet, dort ist der Zufall größer als in der Liga.

### 2.3 Das Umfeld formt den Spieler

Wer bei einem besseren Verein spielt, wird besser. Nicht als Belohnung,
sondern weil er jeden Tag gegen stärkere Leute trainiert, mit besseren
Trainern arbeitet und in Spielen gefordert wird, die ihm etwas abverlangen.
Das fehlt heute völlig: die Entwicklung kennt Profil, Alter, Spielzeit und
Potenzial, aber nicht, wo einer spielt.

Zwei Größen kommen in die Wachstumsrechnung, und sie ziehen gegeneinander:

```
wachstum = grundrate(Profil, Alter, Potenzial)
         × umfeld(Kaderniveau, Ligastärke, Wettbewerbe)
         × einsatz(Spielzeitanteil)
```

- **Umfeld** hebt an: ein Kader voller Nationalspieler, eine starke Liga und
  Europapokalabende sind ein besseres Trainingsprogramm als die dritte Liga.
- **Einsatz** bremst: wer nicht spielt, lernt das Wichtigste nicht.

Damit bekommt die Weichenstellung aus 2.2 ihre zweite Hälfte. Beim Spitzenklub
auf der Bank steht man in besserer Umgebung, aber ohne Einsatzzeit, beim
Mittelklasseverein umgekehrt. Beides zusammen ergibt eine Kurve mit einem
Optimum, das sich mit dem Alter verschiebt: für einen Zwanzigjährigen ist die
Leihe nach unten oft der schnellere Weg, für einen Sechsundzwanzigjährigen die
Bank beim Großen selten.

Das erklärt nebenbei, warum eine Karriere ohne Wechsel sich langsamer
entwickelt, ohne dass man das ausdrücklich bestrafen müsste.

### 2.4 Meter als das, was sie sein sollen: Verstärker

Jedes Meter bekommt eine Kurve in `meters.json`, die 0 bis 100 auf einen Faktor
abbildet, und jede Kurve greift an genau benannten Stellen an:

| Meter | wirkt auf |
| --- | --- |
| Moral | Spielzeit über das Vertrauen des Trainers, Streuung des Ertrags, Wachstumsrate |
| Fanstimmung | Heimstärke, Anziehungskraft bei Wechseln, Fanzuwachs, Schutz vor Aussortieren |
| Medienbindung | Auszeichnungen, Güte der Angebote, Häufigkeit und Ton der Medienereignisse |

Wichtig ist die Richtung: Meter erzeugen nichts aus dem Nichts, sie verstärken
oder dämpfen, was ohnehin geschieht. Wer nicht spielt, dem hilft auch beste
Moral nicht. Wer spielt, für den macht sie den Unterschied zwischen soliden und
herausragenden Zahlen.

### 2.5 Entscheidungen aus dem Bericht heraus

Der Bericht erzeugt **Tatsachen**: verletzt gewesen, Stammplatz verloren, Serie
getroffen, neuer Trainer, abgestiegen, erstmals berufen. Ereignisse
beschreiben in ihren Daten, worauf sie reagieren:

```json
"triggeredBy": { "fact": "lost_starting_spot", "within": 1 }
```

Der Satz der drei Entscheidungen wird dann nach Rang gefüllt: zuerst, was aus
dem Geschehenen folgt, dann was ohnehin ansteht, zuletzt der Alltag. Aus
„irgendwelche drei Karten" wird „diese drei, weil das passiert ist".

### 2.6 Ketten statt Einzelereignisse

Ereignisse dürfen Folgeereignisse planen:

```json
"schedules": { "eventId": "tattoo_infection", "chance": 0.25, "afterHalves": 1 }
```

Der Spielstand bekommt eine Warteschlange für terminierte Ereignisse. Damit
werden Geschichten möglich statt Momentaufnahmen: der Cousin will ein Tattoo,
man lässt sich darauf ein, und mit einiger Wahrscheinlichkeit entzündet es
sich und kostet Wochen. Eine zu früh beendete Reha kommt als Rückfall zurück.
Ein Streit mit dem Trainer eskaliert oder verläuft im Sand. Eine offene
Rechnung mit einem Verein taucht Jahre später beim Wiedersehen auf.

### 2.7 Viel mehr davon, und aus dem echten Leben

Heute stehen 31 Entscheidungen und 22 Zufallsereignisse in den Daten. Für eine
Karriere mit rund vierzig Pausen und drei Entscheidungen je Pause ist das zu
wenig, man sieht dieselben Lagen mehrfach. Der Vorrat soll auf ein Vielfaches
wachsen, und zwar mit Dingen, die es wirklich gibt.

Zwei Achsen, auf die alles einzahlt:

- **Leistung**: Stärke, Form, Spielzeit, Verletzungsanfälligkeit
- **Interesse**: wer einen haben will, zu welchen Bedingungen, wie oft

| Bereich | Beispiele |
| --- | --- |
| Körper | Tattoo entzündet sich, Weisheitszähne, Schlafstörungen, Ernährungsumstellung, Höhenlager, Reaktion auf eine Impfung, Rücken nach dem Langstreckenflug |
| Kopf und Umfeld | Kind kommt zur Welt, Trennung, Heimweh, Sprachkurs, Todesfall in der Familie, neuer Berater, Streit mit dem alten |
| Verein und Kabine | neuer Trainer mit anderem System, Kapitänsfrage, Rivalität mit einem Neuzugang, Ärger im Trainingslager, Gehalt kommt zu spät, Investor steigt ein, Punktabzug, Abstiegskampf |
| Medien | Interview falsch zitiert, Video geht viral, Dokumentation über die Mannschaft, Einladung zum Podcast, Ausrutscher im Netz, Pfiffe im eigenen Stadion, Werbedreh |
| Sportlich | Systemwechsel, Positionswechsel, Elfmeterschütze werden, Fehlschuss im Pokalfinale, Serie ohne Gegentor, Formtief |
| Interesse | Scout auf der Tribüne, Anfrage aus dem Ausland, Ablöse wird öffentlich, Berater streut ein Gerücht, Ausstiegsklausel im neuen Vertrag, Wechselgerücht im Winter |
| Nationalmannschaft | erste Nominierung, Verzicht auf ein Turnier, Verletzung im Länderspiel, Streit im Verband, Angebot zur Einbürgerung |
| Geld | Sponsor meldet sich, Investment geht schief, Steuerprüfung, Ausrüsterwechsel |

**Marktinteresse als eigene Größe.** Bisher gibt es nur den einmaligen
`offerQualityBonus`. Sinnvoller ist ein mitlaufender Wert, der langsam
verfällt und aus Leistung, Medienbindung, Partnern und eben diesen Ereignissen
gespeist wird. Er bestimmt im Transferfenster, wie viele Angebote kommen und
von welcher Stufe. Damit wird nachvollziehbar, warum nach einer starken
Rückrunde mit viel Presse drei Vereine anklopfen und nach einer verletzten
Saison keiner.

Der Aufwand liegt hier nicht in der Mechanik, sondern im Schreiben. Der Vorrat
kann in Wellen wachsen, ohne dass die Engine sich noch einmal ändert.

### 2.8 Partner ins Gefüge

- **Medienpartner** heben die Medienbindung schneller an, erhöhen aber auch die
  Fallhöhe: wer gefilmt wird, dessen schlechte Halbserie kostet mehr. Mehr
  Ausschlag nach oben wie nach unten.
- **Ausrüster** geben einen kleinen Schub auf Moral und Fanstimmung und ziehen
  zu Vereinen derselben Marke.

### 2.9 Ausrüster je Verein, fest hinterlegt

Jeder Verein bekommt ein Feld `kitSupplier` mit seinem **tatsächlichen**
Ausrüster nach heutigem Stand. Einmalig eingetragen, danach unveränderlich,
wie alle anderen Vereinsdaten auch. Kein Nachladen zur Laufzeit.

Vorgehen: die großen Marken decken den weitaus größten Teil der Vereine ab, die
in diesem Spiel vorkommen. Für die oberen Ligen wird von Hand gepflegt, für
kleinere Vereine bleibt das Feld leer, und ein leeres Feld heißt schlicht, dass
der Ausrüster keine Rolle spielt. Lieber eine Lücke als eine erfundene Angabe.

Damit wird aus „der Ausrüster hebt die Angebotsstufe" die wörtliche Fassung:
Vereine derselben Marke tauchen häufiger unter den Angeboten auf.

---

## 3. Was das für den Schwierigkeitsgrad heißt

Nicht schwerer, sondern anders verteilt. Der Boden bleibt weich, die Decke wird
hoch:

| Karriere | Ziel |
| --- | --- |
| Mittelfeld der Verteilung | Spitzen-OVR um 72, ein bis drei nationale Titel, nichts international |
| beste zehn Prozent | Spitzen-OVR über 82, Meisterschaften, ein internationaler Titel |
| bestes Prozent | Weltklasse, Champions League, individuelle Auszeichnungen |
| etwa jede sechste | ohne Titel |

Die letzte Zeile ist ausdrücklich **eine Folge der eigenen Wahl**, nicht des
Würfels. Wer beim Heimatverein in der dritten Liga bleibt, bleibt titellos und
hat trotzdem eine erzählbare Laufbahn. Wer sich hochspielt und den Sprung
wagt, sammelt. Deshalb bekommen auch die kleinen Wege eigene Ziele: Aufstiege,
Pokalfinals, die erste Berufung, ein Vereinsrekord.

Geprüft wird das nach jeder Änderung mit dem vorhandenen Simulationswerkzeug
über einige hundert Karrieren, nicht nach Gefühl.

---

## 4. Oberfläche

### 4.1 Ruhigere Bewegung

Alles eine Spur langsamer. Zahlen zählen heute in 750 ms hoch, das wirkt
gehetzt; 1300 bis 1500 ms lesen sich deutlich besser. Übergänge von 140/280 auf
etwa 220/420, das Einlaufen der Auswahlmöglichkeiten von 60 auf 110 ms Abstand.
Große Zahlen dürfen zudem länger laufen als kleine, das gibt einem Sprung von
zehntausend auf zwei Millionen das Gewicht, das ihm zusteht.

### 4.2 Die Entscheidungskarte mit Bild

Statt der drei Striche oben ein Bild links in der Karte, dessen rechte Kante
schräg abgeschnitten ist. Das nimmt der Karte das Formularhafte und gibt jeder
Entscheidung ein Gesicht.

Umsetzung: ein Bild in einer Fläche, darüber ein Dreieck in der Kartenfarbe,
oder sauberer über `react-native-svg` mit einem Beschnitt entlang eines Pfades.
Beides läuft auf dem Gerät wie im Browser.

**Bildbeschaffung:** passende Motive von Wikimedia Commons, ausgewählt nach
Art der Entscheidung, heruntergeladen nach `assets/events/` und dort unter
sprechenden Namen abgelegt, damit sie sich später gegen eigene Aufnahmen
tauschen lassen. Etwa acht Motive:

| Datei | Art der Entscheidung |
| --- | --- |
| `training.jpg` | Training, Vorbereitung, Ausrichtung |
| `injury.jpg` | Verletzung, Reha, Rückkehr |
| `transfer.jpg` | Wechsel, Angebote, Vertrag |
| `media.jpg` | Interviews, Presse, Medienpartner |
| `club.jpg` | Verein, Trainer, Mannschaft |
| `national.jpg` | Nationalmannschaft, Verband |
| `personal.jpg` | Privates, Familie, Umfeld |
| `contract.jpg` | Vertrag, Geld, Berater |

Zu jedem Bild wird Herkunft, Urheber und Lizenz in `assets/events/CREDITS.md`
festgehalten. Wikimedia Commons verlangt bei den meisten Lizenzen die Nennung
des Urhebers, und die gehört ins Projekt, bevor das Bild verwendet wird. Motive
werden bewusst so gewählt, dass keine erkennbare Person und kein Vereinszeichen
im Vordergrund steht.

Das Ereignis benennt seine Art in den Daten. Wo kein Bild passt, bleibt die
Karte wie heute.

### 4.3 Vereinsnamen im Text hervorheben

Heute setzt `fillPlaceholders` den Vereinsnamen als Zeichenkette in den Text,
danach ist er nicht mehr auffindbar. Stattdessen soll der Text als Folge von
Abschnitten entstehen:

```ts
[{ text: 'Ein Angebot von ' }, { text: 'Ajax', kind: 'club' }, { text: ' liegt vor.' }]
```

Die Oberfläche färbt die Abschnitte mit `kind` in der Akzentfarbe. Derselbe
Weg trägt später Ligen, Länder und Mitspieler.

### 4.4 Trophäen als Bilder

In `assets/trophies` liegen 2460 Dateien, benannt nach Nummern ohne erkennbare
Zuordnung, dasselbe Bild wie bei den Verbandslogos. Bis die Zuordnung steht,
wird durchgehend **`22.png` als Platzhalter** verwendet, die Meisterschale.

**In der Spielerkarte** ersetzt das Bild die heutige Textmarke: jede gewonnene
Trophäe erscheint einmal als Bild, und wurde sie mehrfach gewonnen, sitzt unten
rechts am Bild ein kleiner Kreis mit der Anzahl, wie man es von Abzeichen
kennt. Die feste Höhe der Fläche bleibt, das Bild richtet sich danach, etwa
28 Punkte, damit sechs bis acht Trophäen nebeneinander passen und der Rest
weiterhin als Zahl weiterzählt.

**In der Saisonliste** steht in jeder Zeile, was in dieser Saison gewonnen
wurde, als Bilder nebeneinander, klein bei etwa 16 Punkten. Zwei Titel in einer
Saison heißen zwei Bilder. Über die Karriere hinweg taucht ein wiederholt
gewonnener Titel damit in mehreren Zeilen auf, was die Liste von selbst zur
Chronik macht.

Dafür braucht die Tabelle eine zusätzliche Spalte. Weil sie ohnehin seitlich
rollt, kostet das keine andere Spalte etwas.

Die Zuordnung der übrigen 2459 Dateien läuft später über dieselben
Kontaktbögen wie bei den Verbandslogos, und bis dahin bleibt der Platzhalter
stehen. Ein Bild, das falsch beschriftet ist, wäre schlimmer als eines, das
für alle gleich aussieht.

---

## 5. Reihenfolge

Jeder Schritt endet mit grünen Tests und einem Messlauf.

1. **Kette einziehen.** Umbau ohne Verhaltensänderung, die Zahlen bleiben
   gleich. Danach ist der Rest gefahrlos.
2. **Mannschaftssaison und Titel**, samt der härteren Hürde beim Wechsel nach
   oben. Der größte Hebel für das Spielgefühl.
3. **Meterkurven.** Verstärker greifen, Balancing nachziehen.
4. **Ausgelöste Entscheidungen.** Bericht und Entscheidung verbinden.
5. **Ketten und der große Ereignisvorrat.** Tattoo, Rückfall, Fehde,
   Wiedersehen, und die Wellen aus 2.7.
6. **Ausrüster in die Vereinsdaten, Partner ins Gefüge, Marktinteresse als
   eigene Größe.**
7. **Oberfläche.** Bewegung, Trophäenbilder, Kartenbild, Hervorhebungen.
8. **Balancing über einige hundert Karrieren gegen die Zieltabelle.**

Die Schritte eins bis vier tragen den größten Teil des Gewinns. Fünf bis sieben
machen daraus ein Spiel, das man gern noch einmal startet.

Trophäenbilder und ruhigere Bewegung aus Schritt sieben sind klein und
unabhängig vom Rest. Sie lassen sich vorziehen, wenn du früher etwas sehen
willst.

---

## 7. Was davon gebaut ist

Stand nach dem Umbau. Gemessen wird mit `npx tsx packages/engine/src/tools/balance.ts`.

| Schritt | Zustand |
| --- | --- |
| Mannschaftssaison und Titel | gebaut, `packages/engine/src/team-season.ts` |
| Umfeld formt die Entwicklung | gebaut, `growthEnvironment` in `progression.json` |
| Meter als Verstärker | gebaut, Kurven in `meters.json`, `meters.ts` |
| Entscheidungen aus dem Bericht | gebaut, `facts.ts` und `triggeredBy` |
| Ketten | gebaut, `schedules` und `scheduledEvents` |
| Ereignisvorrat | 62 Karriereereignisse, davon 31 neu |
| Marktinteresse | gebaut, bestimmt Zahl und Güte der Angebote |
| Ausrüster je Verein | 96 Vereine, 14 Marken, `scripts/assign-kit-suppliers.js` |
| Partner ins Gefüge | gebaut, wirken auf Medienbindung, Moral, Rückhalt |
| Zielwahl beim Wechsel | gebaut, `transfer_destination` |
| Ruhigere Bewegung | gebaut, Zahlen 1300 bis 2800 ms je nach Sprung |
| Trophäen als Bilder | gebaut, Platzhalter `22.png`, mit Hinweis beim Darüberfahren |
| Bilder an den Antworten | 9 Motive von Commons, Nachweise in `assets/events/CREDITS.md` |
| Ergebnis der Wahl | gebaut, `outcome.ts`, entsteht aus den Wirkungen |
| Hervorhebung im Text | gebaut, Engine liefert die Namen mit |

Messwerte über 120 Karrieren mit zufälligen Entscheidungen:

| Größe | Wert |
| --- | --- |
| Spitzen-OVR | p10 67, p50 74, p90 86 |
| Titel | p50 3, p90 16 |
| ohne Titel | 21 Prozent |
| mit Kontinentaltitel | 29 Prozent |
| Fans | p50 410 Tsd., p90 42 Mio. |
| bester Tabellenplatz | p50 4 |

Das trifft die Zieltabelle aus Abschnitt 3 recht genau. Wer klug wählt, liegt
darüber: derselbe Lauf mit immer dem stärksten Angebot bringt eine Karriere in
die Weltspitze.

### Was noch offen ist

- **Bilder**: 9 von 22 Motiven sind belegt. Die Suche auf Commons liefert für
  den Rest nichts Brauchbares, das gehört von Hand ausgesucht.
- **Trophäenbilder**: alle Titel zeigen die Meisterschale, bis die 2460 Dateien
  zugeordnet sind.
- **Verbandslogos**: 50 von 246 zugeordnet, der Rest über die Kontaktbögen.
- **Wettbewerbsnamen** stehen teils deutsch in den Daten, das fällt jetzt im
  Hinweis an der Trophäe auf.
