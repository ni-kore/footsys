# footsys, vierte Ausbaustufe

Setzt auf `docs/iteration-3.md` auf. Nach der dritten Stufe ist die Karriere
sicher, mehrsprachig, gestaltbar und erzählt. Diese Stufe macht sie **groß**.

Das Ziel in einem Satz: eine Karriere soll nicht nur eine Laufbahn sein,
sondern eine **Welt, in der sie stattfindet** — mit einer Liga, die eine
Tabelle hat, Gegnern, die Namen tragen, und Spielen, an die man sich erinnert.

Alles hier setzt voraus, dass die Punkte aus der dritten Stufe stehen. Vor
allem der **Kader mit Namen** (3. Stufe, 2.8) und die **Theme-Schicht**
(3. Stufe, 2.3) sind Fundamente, auf denen die Hälfte dieser Stufe ruht.

---

## 1. Die Welt um den Spieler

### 1.1 Die Liga bekommt eine Tabelle

Heute wird in `team-season.ts` nur **dein** Tabellenplatz gewürfelt. Die
anderen siebzehn Vereine der Liga existieren nicht — sie haben keinen Platz,
keine Punkte, keine Saison. Damit fehlt dem Spiel der Rahmen, in dem eine
Saison überhaupt Bedeutung bekommt.

Der Umbau ist kleiner, als er klingt: für jeden Verein der Liga liegt eine
Reputation bereits in den Daten. Daraus eine vollständige Tabelle zu rechnen,
kostet einen Durchlauf über achtzehn Zahlen.

```
für jeden Verein: stärke = reputation + rauschen
                  (beim eigenen Verein zusätzlich der eigene Beitrag)
tabelle = nach stärke sortiert, Punkte plausibel verteilt
```

Was das freischaltet:

| Neu möglich | Warum es vorher nicht ging |
|---|---|
| Titelrennen: "zwei Punkte hinter Inter, vier Spiele offen" | es gab keinen Zweiten |
| Abstiegskampf mit Namen | es gab kein unteres Tabellenende |
| Derby gegen einen Verein, der gerade Dritter ist | `rivalOf` liefert einen Verein ohne Zustand |
| Aufstieg und Abstieg des eigenen Vereins über Jahre | der Verein war jede Saison gleich stark |
| "Dein alter Verein ist abgestiegen" als Ereignis | alte Vereine hörten beim Wechsel auf zu existieren |

Der letzte Punkt ist der schönste. Ein Verein, den man verlassen hat, spielt
weiter. Man liest im Bericht, wie es ihm ergeht. Nach zwölf Jahren kehrt man
zurück, und er ist ein anderer.

**Ligen laufen dabei nur dort mit, wo der Spieler gerade ist**, plus die
Ligen, in denen er einmal war. Nicht 75 Ligen weltweit — das wäre Rechenzeit
ohne Gegenwert.

### 1.2 Auf- und Abstieg

Mit einer Tabelle wird der Auf- und Abstieg zur Folge statt zum Zufall. Das
ändert die Vereinsreputation über die Zeit, und damit den Bezugsrahmen für
Rolle, Angebote und Entwicklung.

Für den Spieler heißt das: der Verein, bei dem man mit zwanzig unterschrieben
hat, kann mit sechsundzwanzig ein anderer sein. Bleiben oder gehen wird zu
einer Wette auf eine Entwicklung, nicht auf eine feste Zahl.

`freshGameData()` in `game-data.ts` legt bereits je Karriere eine eigene Kopie
der Vereinsdaten an — genau dafür. Der Mechanismus ist da, er wird nur noch
nicht benutzt.

### 1.3 Schlüsselspiele

Die Halbserie bleibt die Recheneinheit. Aber zwei bis vier Spiele je Saison
werden herausgehoben und einzeln gezeigt:

- das Pokalfinale
- das Derby
- das entscheidende Spiel im Titelrennen oder im Abstiegskampf
- das Rückspiel gegen den Verein, der einen abgegeben hat

Ein Schlüsselspiel ist ein eigener Bildschirm mit **einer** Entscheidung —
Elfmeter schießen oder abgeben, auf Sicherheit spielen oder das Risiko suchen,
mit Schmerzen auflaufen oder passen. Danach das Ergebnis, mit Gewicht.

Damit bekommt eine Saison einen Höhepunkt, und die Halbserien-Zusammenfassung
verliert ihren Charakter als Kontoauszug.

---

## 2. Der Spieler wird mehr als eine Zahl

### 2.1 Attribute statt eines OVR

Sechs Werte statt einer Zahl:

| Attribut | wirkt vor allem auf |
|---|---|
| Abschluss | Tore |
| Passen | Vorlagen |
| Tempo | Rolle in offensiven Systemen, Verfall im Alter |
| Zweikampf | Defensivbeitrag, Karten |
| Technik | Formations-Fit, Auszeichnungen |
| Physis | Verletzungsanfälligkeit, Einsatzzeit im Alter |

Der OVR bleibt und wird daraus errechnet — positionsgewichtet aus
`positions.json`, wo die Gewichte ohnehin schon hingehören. Nach außen ändert
sich also wenig; nach innen sehr viel:

- **Trainingsschwerpunkt** wird zur echten wiederkehrenden Entscheidung. Jede
  Vorbereitung: worauf setzt du dieses Jahr? Das ist die Art von Wahl, die ein
  Karrierespiel trägt, weil sie klein, häufig und folgenreich ist.
- **Positionswechsel** wird spielbar. Ein Außenstürmer, der Tempo verliert und
  Technik behält, wird mit dreißig Zehner. Das ist eine der schönsten
  Fußballgeschichten und heute unmöglich, weil es nur eine Zahl gibt.
- **Alterung wird differenziert.** Tempo fällt früh, Technik hält, Physis
  bricht spät weg. Der Verfall bekommt eine Gestalt statt einer Kurve.
- **Spielertypen entstehen von selbst.** Zwei Stürmer mit OVR 80 sind
  verschiedene Spieler.

Das ist der größte Einzelposten dieser Stufe. Er berührt `progression.ts`,
`simulation.ts` und jede Anzeige des OVR — und er ist die Grundlage für alles
in 2.2 und 2.3.

### 2.2 Verletzungen mit Gedächtnis

Heute ist eine Verletzung ein Ereignis mit einem Modifikator, der nach ein
oder zwei Halbserien abläuft. Danach ist sie vergessen.

Mit Attributen wird sie zu dem, was sie im Fußball ist:

- Eine schwere Knieverletzung kostet dauerhaft Tempo.
- Wer dreimal am selben Muskel verletzt war, verletzt sich dort wieder eher.
- Eine Verletzungshistorie senkt das Interesse anderer Vereine, ohne dass es
  jemand ausspricht.
- Die Entscheidung "früher zurückkommen" aus `events.json` bekommt endlich
  echte Fallhöhe — heute kostet ein Fehlschlag vier OVR-Punkte, die in zwei
  Saisons wieder da sind.

### 2.3 Der Ruf

Ein zusätzlicher, langsamer Wert neben dem Marktinteresse: was für einer bist
du? Er entsteht ausschließlich aus getroffenen Entscheidungen, nie aus
Leistung.

    loyal ←→ wechselwillig
    ruhig ←→ laut
    profi ←→ lebemann

Der Ruf entscheidet mit, welche Ereignisse überhaupt vorkommen, wie die Presse
über einen schreibt, ob eine Kurve einen aufnimmt oder auspfeift, und ob ein
Verein, den man einmal sitzengelassen hat, Jahre später wieder anruft.

Das ist die Antwort auf die Frage "wirken meine Entscheidungen eigentlich?"
Bisher wirken sie über Modifikatoren, die man nicht sieht. Der Ruf ist die
sichtbare Summe.

---

## 3. Die Nationalmannschaft als eigener Strang

Heute vier Zeilen Würfel (3. Stufe, 1.9). Sie verdient mehr, weil sie im
echten Fußballerleben der zweite Handlungsstrang neben dem Verein ist.

- **Qualifikation** über zwei Jahre, mit Spielen, die im Bericht auftauchen.
- **Turnier** als Runden — die Mechanik dafür steht bereits in `team-season.ts`
  für die Pokale und muss nur angewendet werden. Ein Turnier läuft dann sichtbar
  ab: Gruppenphase, Achtelfinale, und irgendwann ist Schluss oder eben nicht.
- **Kaderkonkurrenz.** Nicht jeder Berufene fährt mit, und nicht jeder
  Mitgefahrene spielt. `minOverallByCountryStrength` ist ein Schwellwert; ein
  Kaderplatz ist ein Vergleich.
- **Die Binde.** `captainMinOverall: 86` steht seit der zweiten Stufe in den
  Daten und wird nicht gelesen. Nationalmannschaftskapitän zu werden ist einer
  der wenigen Momente, die ein Karrierespiel als Auszeichnung anbieten kann,
  ohne eine Trophäe zu erfinden.
- **Das Ende.** Ein Rücktritt aus der Nationalmannschaft, Jahre vor dem
  Karriereende, ist eine eigene Entscheidung mit eigenem Gewicht.

Dazu ein eigener Turnierbildschirm, weil ein Turnier alle zwei Jahre der
größte Einzelmoment einer Karriere ist und heute in einer Zeile des
Saisonberichts steht.

---

## 4. Gründe, noch einmal anzufangen

Die dritte Stufe sorgt dafür, dass man eine Karriere zu Ende spielt. Diese
sorgt dafür, dass man eine zweite beginnt.

### 4.1 Ziele, die man sich selbst setzt

Beim Start wählt man ein Karriereziel: Weltmeister werden, Champions League
gewinnen, in fünf Ligen gespielt haben, dem Heimatverein treu bleiben, 500
Tore. Das Ziel ändert nichts an den Regeln — es ändert, woran man die Karriere
misst, und gibt der Vereinsauswahl eine Richtung.

Für den Weg dahin: der **Wunschverein**. Von 1.164 Vereinen sieht man je
Wechsel drei bis vier, gefiltert auf ±2 Reputationsstufen. Wer einen
Wunschverein nennt, sieht sein Interesse an ihm wachsen oder eben nicht — und
hat einen Grund, ein Angebot auszuschlagen.

### 4.2 Die Bilanz am Ende

Der EndScreen ist heute eine Vitrine. Er soll ein **Urteil** werden:

- eine Einordnung der Laufbahn in Worten, aus den Zahlen abgeleitet — nicht
  "Peak OVR 78", sondern was das bedeutet
- die drei Momente, die die Karriere ausgemacht haben
- der Vergleich mit den eigenen früheren Karrieren
- das Ziel aus 4.1: erreicht oder nicht

### 4.3 Vermächtnis über Karrieren hinweg

Ein kleiner Bestand außerhalb der einzelnen Karriere:

- eine Ruhmeshalle der eigenen Spieler
- Bestwerte über alle Läufe
- Themes, Startländer oder Ereignisstränge, die sich freispielen

**Vorsicht an dieser Stelle.** Freispielbares darf nie eine Karriere stärker
machen — sonst wird aus einem Spiel über Entscheidungen eines über Fleiß.
Freigespielt wird Auswahl und Aussehen, nie Vorteil.

### 4.4 Die Karriere teilen

Ein Bild, das man verschicken kann: Name, Verein, Vitrine, die drei Momente.
Weil die Engine deterministisch ist, kann daneben der Seed stehen — wer ihn
eingibt, spielt dieselbe Ausgangslage und trifft eigene Entscheidungen. Das
ist eine Art, ein Spiel weiterzugeben, die kein Netz und keinen Dienst
braucht.

---

## 5. UX: der volle Ausbau

Die dritte Stufe legt die Schichten (Sprachen, Themes, Tap statt Hover). Hier
wird daraus Gestaltung.

### 5.1 Mehr Sprachen, richtig gemacht

Nach Deutsch und Englisch: Spanisch, Französisch, Portugiesisch, Türkisch,
Italienisch, Niederländisch. Jede ist eine JSON-Datei — aber jede braucht
Prüfung an Stellen, die man leicht übersieht:

- **Pluralregeln** über `Intl.PluralRules`, nicht über `n === 1`. Türkisch und
  Portugiesisch zählen anders als Deutsch.
- **Wortstellung.** Ein Satz aus Bausteinen darf die Reihenfolge nicht fest
  verdrahten. Deshalb Platzhalter mit Namen, nie Verkettung.
- **Textlänge.** Deutsch ist rund 30 Prozent länger als Englisch. Jeder
  Bildschirm wird einmal mit der längsten Sprache geprüft.
- **Wettbewerbsnamen bleiben, wie sie heißen.** Die Coppa Italia heißt in
  jeder Sprache Coppa Italia. Übersetzt wird die Oberfläche, nicht der Fußball.
  (Heute stehen einige Namen deutsch in den Daten — das gehört bei der
  Gelegenheit vereinheitlicht.)

### 5.2 Themes, die etwas erzählen

Auf der Schicht aus der dritten Stufe wird das Angebot breiter:

| Theme | Idee |
|---|---|
| **Floodlight** | die Voreinstellung, Flutlicht auf Dunkelgrau |
| **Terrace** | warm, Bernstein, Abendspiel |
| **Chalk** | hell, Papier und Tinte |
| **Kit** | die Farben des aktuellen Vereins |
| **Broadsheet** | Sportzeitung: Serifen, Raster, sehr wenig Farbe |
| **Retro** | die Achtziger: körnig, gesättigt, Versalien |

**Kit** und **Broadsheet** sind die beiden, die das Spiel wirklich verändern.
Kit bindet das Aussehen an die eigene Geschichte. Broadsheet ändert den Ton:
dieselbe Karriere liest sich als Zeitungsbericht anders als auf einem
Taktikbildschirm.

Dazu gehört eine Vorschau in der Einstellung — ein Miniaturbildschirm, kein
Farbfeld. Man wählt kein Theme nach einem Punkt in einer Liste.

### 5.3 Das Layout endlich ausnutzen

`DESIGN.md` beschreibt drei Größenklassen im Detail. Umgesetzt ist bislang die
zweispaltige Fläche. Was fehlt:

- **Compact**: Entscheidungen als Sheet von unten statt als Vollbild. Der
  Daumen erreicht die unteren zwei Drittel, die Optionen gehören dorthin.
- **Expanded** (iPad quer): die dritte Spalte aus der Referenz — links die
  Karriere-Chronik, mittig das Geschehen, rechts die Spielerkarte. Auf dem
  iPad Pro ist das Bild heute sehr leer.
- **Landscape auf dem iPhone**: laut Dokument unterstützt, in der Praxis
  ungeprüft.

### 5.4 Die Entscheidungskarte weiterdenken

Der Kartenstapel ist die zentrale Interaktion des Spiels und funktioniert. Was
ihm fehlt:

- **Gewicht sichtbar machen.** Eine Entscheidung, die eine Karriere dreht,
  sieht heute aus wie eine, die eine Halbserie kitzelt. Ein Rand, ein
  ruhigerer Auftritt, mehr Platz — sichtbar, ohne das Ergebnis zu verraten.
- **Der Rückblick.** Nach der Wahl kurz zeigen, was daraus geworden ist —
  nicht nur der Text aus `outcome.ts`, sondern beim nächsten Bericht ein
  Rückbezug: "die Reha, die du abgekürzt hast, meldet sich."
- **Die Wischgeste**, wie man sie von Entscheidungsspielen kennt: nach links
  oder rechts für zwei Möglichkeiten. Bei drei oder vier bleibt es beim
  Antippen.

### 5.5 Ton

Kein Soundtrack — footsys ist ein Spiel für zwischendurch und läuft oft
stumm. Aber vier oder fünf sehr kurze Töne an den richtigen Stellen (Anpfiff,
Tor, Titel, Karriereende) tragen weit, wenn sie sich abschalten lassen und
nicht die laufende Musik unterbrechen.

### 5.6 Barrierefreiheit zu Ende

Die dritte Stufe räumt die Grundlagen auf. Hier der vollständige Durchgang:
VoiceOver-Reihenfolge auf jedem Bildschirm, Kontrast in **allen** Themes gegen
WCAG AA geprüft (das ist der Preis für mehrere Designs), Schalter für
Bewegung, Ton und Schriftgröße im Spiel selbst statt nur im System.

---

## 6. Ereignisse: von 120 auf 300

Nach der dritten Stufe stehen rund 120 Ereignisse. Mit den neuen Anknüpfungs-
punkten dieser Stufe wird der Vorrat erst richtig nutzbar, weil Ereignisse auf
Dinge zeigen können, die es vorher nicht gab:

- auf **Mitspieler** mit Namen und Geschichte
- auf den **Trainer** und seine Amtszeit
- auf die **Tabelle** — Titelrennen, Abstiegskampf, das Derby nächste Woche
- auf die **Attribute** — Tempoverlust, Trainingsschwerpunkt, Positionswechsel
- auf den **Ruf** — was man als Lauter erlebt, erlebt ein Leiser nie
- auf die **Nationalmannschaft** — Turnierkader, Binde, Rücktritt

Ziel sind 300 Karriereereignisse und 80 Zufallsereignisse. Bei rund 50
Entscheidungen je Karriere heißt das: **zwei Spieler erleben verschiedene
Spiele**, und derselbe Spieler erlebt in seiner dritten Karriere noch Neues.

Der Aufwand liegt im Schreiben, nicht in der Mechanik — die steht dann. Der
Vorrat kann in Wellen wachsen, ohne dass die Engine sich noch einmal ändert.

---

## 7. Reihenfolge

1. **Attribute statt eines OVR.** Zuerst, weil Training, Positionswechsel,
   Alterung und Verletzungsgedächtnis alle darauf sitzen.
2. **Die Liga-Tabelle**, dann Auf- und Abstieg. Der zweite große Rahmen.
3. **Verletzungen mit Gedächtnis** und der **Ruf**. Beide klein, sobald 1
   steht.
4. **Nationalmannschaft als Strang**, mit eigenem Turnierbildschirm.
5. **Schlüsselspiele.** Braucht die Tabelle aus 2, um zu wissen, welches Spiel
   wichtig ist.
6. **Ziele, Wunschverein, Bilanz, Vermächtnis.**
7. **UX-Ausbau**: Sprachen, Themes, Layoutklassen, Karte, Ton,
   Barrierefreiheit.
8. **Ereignisvorrat** in Wellen auf 300.
9. **Balancing.** Diese Stufe **darf** die Verteilung verschieben — mehr
   Simulation heißt andere Zahlen. Die Zieltabelle wird dabei neu gesetzt,
   nicht verteidigt.

Die Punkte 1 und 2 zusammen sind der eigentliche Sprung. Alles danach wird
davon getragen.

---

## 8. Was auch hier nicht kommt

Unverändert gegenüber der dritten Stufe:

- **Kein Geld, keine Verträge, keine Gehälter.** Steht dort begründet und gilt
  weiter. Steuerprüfung, Sponsor und Berater bleiben Ereignisse ohne
  Kontostand.
- **Kein Netz zur Laufzeit.** Prinzip 3. Bestenlisten, Konten, Herunterladbares
  sind ausgeschlossen; das Teilen aus 4.4 ist ein Bild und ein Seed, kein
  Dienst.
- **Kein Live-Spiel.** Die kleinste Einheit bleibt die Halbserie, und
  Schlüsselspiele sind eine Ausnahme mit einer Entscheidung — keine
  Spielminute mit Ball.
- **Kein Trainerkarriere-Anschluss.** Nach dem Karriereende ist die Karriere zu
  Ende. Das ist eine Stärke, keine Lücke.
