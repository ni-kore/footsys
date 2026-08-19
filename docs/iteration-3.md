# footsys, dritte Ausbaustufe

Plan für den nächsten Umbau. Die zweite Stufe hat die Simulation richtig
gestellt: Titel hängen an der Mannschaft, Meter verstärken, Entscheidungen
folgen aus dem Bericht. Was jetzt fehlt, liegt eine Ebene darüber.

Das Ziel in einem Satz: eine Karriere soll man **behalten, lesen und in seiner
eigenen Sprache erleben** können — und in den mittleren Jahren soll etwas
passieren.

Geprüft wird wie immer mit `npm run balance` über einige hundert Karrieren,
nicht nach Gefühl.

---

## 1. Wo es heute klemmt

Elf Befunde aus dem Quelltext und aus Messläufen, nicht aus dem Bauch.

### 1.1 Das OVR-Plateau

Eine Beispielkarriere aus `npm run sim -- --runs 1 --position ST --verbose`:

    2033 Alter 23 OVR 78 starter        14 Sp  8 T
    2034 Alter 24 OVR 78 low_rotation   13 Sp  4 T
    2035 Alter 25 OVR 78 substitute     12 Sp  2 T
    ...
    2042 Alter 32 OVR 77 low_rotation   25 Sp  9 T

Elf Saisons, in denen die zentrale Zahl des Spiels sich um einen Punkt bewegt.
Das ist die logische Folge der Wachstumsdämpfung in `progression.ts`: sobald
der OVR nah am Potenzial liegt, bleibt eine Asymptote, und der Verfall setzt
erst ab etwa 34 ein. Genau die Jahre, in denen ein Fußballer auf dem Höhepunkt
ist, sind im Spiel die ereignislosesten.

Es fehlt eine kurzfristige Größe. Der OVR ist das Können und soll träge sein —
aber daneben gehört die **Form**, die schwankt und die man sieht.

### 1.2 Der Trainer wird zweimal je Saison neu erfunden

In `simulation.ts` wird `coachBias` **in jeder Halbserie neu gewürfelt**:

```ts
const coachBias = rng.float(coachMin, coachMax);
```

Der Trainer wechselt also alle sechs Monate seine Fußballphilosophie, obwohl es
ein eigenes Zufallsereignis "Trainerwechsel" gibt. Damit ist der Formations-Fit
reines Rauschen. Er kann keine Lage sein, auf die man reagiert, weil er sich
ändert, bevor eine Reaktion wirken könnte. Eine der teuersten Mechaniken des
Spiels verpufft an einer Zeile.

### 1.3 Die Rolle springt ohne Erklärung

`computeRole` ist eine Stufenfunktion aus OVR gegen Vereinsreputation. In der
Beispielkarriere oben: OVR 78 Stammspieler, nächste Saison OVR 78 Reservist.
Sachlich richtig — anderer Verein —, aber der Spieler sieht nur, dass eine Zahl
gleich blieb und sein Leben sich änderte.

Der Grund dafür ist tiefer: **es gibt keinen Kader.** Das Ereignis
`position_competition` sagt "Der Verein verpflichtet einen Spieler für genau
deine Position" — und dieser Spieler existiert nirgends. Er hat keinen Namen,
kein Alter, keinen OVR, und nächste Saison ist er vergessen. Die Hälfte aller
guten Fußballgeschichten braucht einen zweiten Menschen.

### 1.4 Der Bericht meldet, statt zu erzählen

Eine Halbserie liefert Einsätze, Tore, Vorlagen, dazu die Zufallsereignisse.
Keine Spielmomente. Es gibt kein "Hattrick im Derby", kein "Elfmeter im
Pokalfinale verschossen", kein "erstes Tor für den neuen Verein" — obwohl all
das in den vorhandenen Zahlen bereits steckt und nur benannt werden müsste.

Dazu fehlt die Begründung. Der Bericht sagt "14 Einsätze". Er sagt nicht,
warum es nicht 24 waren.

### 1.5 Nichts wird gespeichert

Es gibt kein `AsyncStorage`, kein `localStorage`, keine Serialisierung. Eine
Karriere sind rund 24 Saisons, 50 Entscheidungen und eine gute Stunde. Beim
Schließen der App ist alles weg. Für eine iOS-App, die man in der Bahn spielt,
ist das ein Ausschlusskriterium.

Der Aufwand ist dabei klein: die Engine ist deterministisch, `CareerState` ist
ein reines Objekt ohne Funktionen, und der RNG-Zustand ist Teil davon. Es
fehlt buchstäblich das Schreiben und Lesen.

### 1.6 Die Sprache steckt im Spielstand

Prinzip 5 der README lautet: "i18n von Anfang an. Alle sichtbaren Texte über
Keys." Der Quelltext hält sich nicht daran. Es gibt **keine i18n-Schicht**,
kein Sprachpaket ist installiert, und 37 Stellen greifen fest auf `.en` zu.

Schwerwiegender ist, wo das passiert. Die Engine schreibt **fertiges Englisch
in den Spielstand**:

```ts
log(state, 'transfer', 'Signed for ' + club.short, leagueOf(data, club).name);
log(next, 'decision', event.title.en + ': ' + eventOption.label.en);
```

Die Timeline einer Karriere ist damit eine Liste englischer Sätze. Ein
Sprachschalter kann sie nicht mehr übersetzen, weil die Bausteine weg sind.

Das hat Vorrang vor dem Speichern: **wer zuerst speichert und danach
übersetzt, hat Spielstände, die für immer einsprachig bleiben.** Die
Reihenfolge in Abschnitt 4 folgt daraus.

### 1.7 Das Design lässt sich nicht wechseln

`theme.ts` reicht die Tokens statisch weiter:

```ts
import tokens from '../../../design/tokens.json';
export const color = tokens.color;
```

Dazu kommen 17 `StyleSheet.create`-Blöcke, die ihre Farben beim Laden des
Moduls einbacken. Ein Themenwechsel zur Laufzeit ist damit unmöglich, ohne die
App neu zu starten.

`DESIGN.md` sieht das übrigens vor: "Dark Mode ist der einzige Modus. Falls ein
Light Mode kommt, über Token-Austausch, nicht über Sonderfälle im Code." Genau
dieser Austausch ist der fehlende Baustein — und er ist zugleich die Bedingung
für jedes weitere Design.

Nebenbei sind schon zehn Hex-Werte am Token-System vorbei in den Code
gewandert (`ui.tsx`, `format.ts`, `CareerStartScreen.tsx`), obwohl `DESIGN.md`
"keine Hex-Werte im Code" verlangt.

### 1.8 Der Trophäenname ist auf dem iPhone unerreichbar

`Trophy.tsx` zeigt den Titel nur so:

```tsx
<Pressable onHoverIn={show} onHoverOut={tooltip.hide}>
```

Auf iPhone und iPad gibt es kein Hover. Weil zugleich **alle Titel dasselbe
Platzhalterbild** tragen, kann ein Spieler auf der Zielplattform nicht
erkennen, welche Trophäen in seiner Vitrine stehen. Die Vitrine ist der
emotionale Höhepunkt des Spiels und derzeit eine Reihe identischer Bilder.

`DESIGN.md` verbietet das ausdrücklich: "Keine Hover-abhängige Information —
alles muss per Tap erreichbar sein."

### 1.9 Die Nationalmannschaft ist ein Würfelwurf

`simulateNationalTeamHalf` vergibt jedem Berufenen pauschal drei bis sechs
Spiele je Halbserie, Tore rein positionsskaliert. `rollNationalTitles` würfelt
den Turniersieg allein aus der Landesstärke. Keine Qualifikation, kein
Turnierverlauf, keine Kaderkonkurrenz. `captainMinOverall: 86` steht in
`progression.json` und wird von keiner Zeile Code gelesen.

Der volle Ausbau gehört in die vierte Stufe. Hier reicht, dass ein Turnier
sichtbar stattfindet statt lautlos gewürfelt zu werden.

### 1.10 Zu wenig Vorrat

62 Karriereereignisse und 22 Zufallsereignisse stehen rund 50 Entscheidungen
und 33 Zufallsereignissen **je Karriere** gegenüber. Wiederholungen sind schon
im ersten Durchgang garantiert, nicht erst im zweiten.

### 1.11 Kleinkram

- `executePendingTransfer` in `career.ts` ist toter Code: definiert, nie
  aufgerufen.
- Der EndScreen zeigt Emoji-Pokale, während die Spielerkarte längst
  `Trophy.tsx` benutzt. Zwei Darstellungen für dieselbe Sache.
- `DESIGN.md` nennt Indigo als einzigen Akzent, `tokens.json` führt Grün
  (`#1FBD4B`). Dokument und Daten sind auseinandergelaufen.
- `DESIGN.md` beschreibt eine Navigation aus Tab Bar und Sidebar
  (Karriere · Timeline · Vitrine · Profil). Die gibt es nicht; `App.tsx` zeigt
  immer genau einen Bildschirm.

---

## 2. Der Umbau

### 2.1 Texte aus dem Spielstand heraus

**Zuerst, weil alles andere darauf aufbaut.**

Die Engine hört auf, Sätze zu bauen. Sie liefert, was passiert ist, als Struktur:

```ts
log(state, 'transfer', { key: 'timeline.signed_for', params: { club: club.id } });
```

Die Oberfläche setzt daraus den Satz — in der eingestellten Sprache, mit den
Namen aus den Daten, und mit den Hervorhebungen aus 4.3 der zweiten Stufe, die
dabei von selbst abfallen: ein `params.club` ist ein Verein und wird als
solcher gefärbt.

Dazu eine kleine Schicht in der App, kein Fremdpaket:

```
apps/mobile/src/i18n/
  index.ts        useText(), Sprachwahl, Zahlen- und Datumsformat
  de.json         alle Oberflächentexte
  en.json
```

Regeln:

- **Kein sichtbarer Text im Quelltext der Bildschirme.** Heute steht dort
  `What happened`, `Peak OVR`, `Trophy cabinet`, `Winter break`.
- Die Spieldaten führen ihre `de`/`en`-Felder weiter. Der Zugriff läuft über
  eine Funktion, nicht über `.en`.
- Sprachen sind Daten. Eine dritte Sprache ist eine JSON-Datei, kein Umbau.
  Nach Deutsch und Englisch stehen Spanisch, Französisch, Portugiesisch und
  Türkisch an — die vier Sprachen, in denen über Fußball geredet wird.
- Zahlen, Währungen und Datum über `Intl`, nicht von Hand. Marktwerte lesen
  sich in `de-DE` anders als in `en-US`.

Der Aufwand liegt im Übersetzen, nicht in der Mechanik. Die Mechanik ist einen
Tag Arbeit, und sie muss **vor** dem Speichern stehen.

### 2.2 Spielstand speichern und fortsetzen

Danach, und dann ist es klein:

- `CareerState` als JSON in `AsyncStorage`, ein Eintrag je Karriere.
- Automatisch nach jedem Schritt, den die Engine ohnehin anhält — also nach
  jeder Entscheidung und jedem Bericht. Kein "Speichern"-Knopf.
- Der Startbildschirm zeigt die laufenden Karrieren: Name, Verein, Alter,
  Saison, OVR. Antippen setzt fort.
- Ein `version`-Feld im Spielstand. Ändert sich das Format, wird beim Laden
  migriert oder der Stand sauber als "aus einer älteren Fassung" abgelehnt —
  nicht mit einem Absturz quittiert.
- Mehrere Karrieren nebeneinander, damit man eine zweite anfangen kann, ohne
  die erste zu verlieren.

Weil die Engine deterministisch ist, reicht das aus. Der RNG-Zustand ist Teil
von `CareerState`, dieselbe Datei ergibt exakt dieselbe Fortsetzung.

### 2.3 Themes als Daten

`design/tokens.json` wird zu `design/themes/<name>.json`, alle nach demselben
Schema. Der Code bekommt eine Schicht darüber:

```tsx
const theme = useTheme();
const styles = useStyles((t) => ({ card: { backgroundColor: t.color.surface[1] } }));
```

Die 17 `StyleSheet.create`-Blöcke werden auf `useStyles` umgestellt. Das ist
stumpfe, aber gefahrlose Arbeit: gleiche Werte, andere Herkunft.

Damit wird Prinzip 1 auch für das Aussehen wahr — Daten sind Daten. Ein neues
Design ist eine JSON-Datei.

Vier Themes zum Start:

| Name | Charakter |
|---|---|
| **Floodlight** (Voreinstellung) | das heutige Dunkelgrau mit Grün |
| **Terrace** | warmes Schwarz, Bernstein als Akzent, wie ein Abendspiel |
| **Chalk** | heller Modus, Papier und Tinte, für draußen und für tagsüber |
| **Kit** | nimmt die Vereinsfarben des aktuellen Vereins als Akzent |

**Kit** ist der interessanteste: die Vereinsfarben liegen bereits in den Daten
(`club.colors`, in `PlayerCard.tsx` schon benutzt). Ein Wechsel zu Ajax färbt
die Oberfläche rot-weiß. Das bindet das Design an die Geschichte, statt es
danebenzustellen — und kostet, wenn die Theme-Schicht einmal steht, fast
nichts.

Nebenher aufzuräumen: die zehn Hex-Werte, die am System vorbei im Code stehen,
und der Widerspruch zwischen Indigo in `DESIGN.md` und Grün in den Tokens.
Entweder das Dokument oder die Tokens haben recht — beides zugleich geht nicht.

### 2.4 Alles per Tap erreichbar

`Trophy.tsx` bekommt `onPress` neben `onHoverIn`, und der Hinweis bleibt nach
dem Tippen stehen, bis man woandershin tippt. Dasselbe für jede andere Stelle,
die heute nur bei Mauszeigern etwas verrät.

Zusätzlich, weil der Hinweis eine Krücke ist, solange die Trophäenbilder
Platzhalter sind: in der Vitrine steht der Name **unter** dem Bild, nicht nur
im Hinweis. Ein Name, den man liest, ist besser als einer, den man suchen muss.

Der EndScreen wird auf `Trophy.tsx` umgestellt, damit es eine Darstellung gibt
statt zweier.

### 2.5 Momente statt Zahlen

Der Bericht bekommt drei bis fünf **Momente** je Halbserie, abgeleitet aus dem,
was ohnehin gerechnet wurde. Keine neue Simulationsebene, nur eine Auswertung:

| Bedingung aus den vorhandenen Zahlen | Moment |
|---|---|
| drei Tore in einem Spiel möglich, Zufall entscheidet | Hattrick, gegen den Ligarivalen aus `rivalOf` |
| erstes Tor nach einem Wechsel | Debüttor, vor der eigenen Kurve |
| Titel gewonnen und selbst getroffen | Tor im Finale |
| Titel gewonnen, kaum gespielt | du hast zugesehen — auch das ist eine Geschichte |
| Saison ohne Tor bei hoher Erwartung | Ladehemmung, Pfiffe im eigenen Stadion |
| Serie über zwei Halbserien | Lauf, Titelseite |

Dazu **eine Begründungszeile** über den Zahlen. Nicht "14 Einsätze", sondern
"14 Einsätze — der Trainer spielt eng, dein System passt nicht dazu". Die
Werte dafür liegen bereits im Spielstand: `lastCoachBias`, `lastFormationFit`,
die Rolle, die Moral.

Das ist die billigste Verbesserung des Spielgefühls im ganzen Dokument. Es
wird nichts neu gerechnet, es wird nur ausgesprochen.

### 2.6 Form statt Plateau

Eine zweite Größe neben dem OVR, 0–100, mit eigener Anzeige:

```
form(halbserie) = trägheit × form(vorher)
                + (1 − trägheit) × (grundniveau + moral + spielzeit + zufall)
```

- Die Form schwankt spürbar über eine Saison und wirkt auf Ertrag und Rolle,
  nicht auf das Können.
- Ein Formhoch ist eine Lage, aus der Ereignisse entstehen können; ein
  Formtief ebenso. `facts.ts` bekommt beide als Tatsachen.
- Der OVR bleibt träge und ehrlich. Er ist das, was man kann; die Form ist
  das, was man gerade abruft.

Damit haben die mittleren Jahre wieder eine Bewegung, ohne dass die
Potenzialmechanik angefasst werden muss — die ist richtig und soll bleiben.

### 2.7 Der Trainer bekommt eine Amtszeit

`coachBias` wandert aus `simulateHalf` in den Spielstand:

```ts
coach: { name, style, sinceYear, trustInPlayer }
```

- Der Stil wird bei Amtsantritt einmal gezogen und bleibt.
- Ein Trainerwechsel ist das Ereignis, das ihn ändert — und wird dadurch
  bedeutsam, weil er vorher etwas war.
- `trustInPlayer` wächst mit Leistung und mit Entscheidungen, die dem Trainer
  gefallen, und fällt mit Streit. Es wirkt auf die Spielzeit, wo heute nur die
  Moral wirkt.
- Der Name macht ihn zu einer Person. "Der neue Trainer setzt auf Tempo" ist
  eine Nachricht; "Trainerwechsel" ist eine Zeile.

### 2.8 Ein Kader mit Namen

Je Verein 15 bis 20 erzeugte Mitspieler: Name aus dem Sprachraum des Landes,
Alter, Position, OVR passend zur Vereinsreputation. Sie werden **beim ersten
Betreten des Vereins erzeugt** und im Spielstand gehalten, nicht bei jedem
Aufruf neu.

Was das freischaltet:

- Der Konkurrent auf deiner Position ist eine Person mit Namen und Alter.
  `position_competition` erhält damit endlich den Spieler, von dem es redet.
- Kapitän, Sturmpartner, Freund in der Kabine, Rivale. Ereignisse können auf
  sie zeigen.
- Ein alternder Mitspieler geht, ein junger drängt nach. Über acht Saisons bei
  einem Verein entsteht ein Umfeld.
- Beim Wechsel trifft man alte Bekannte wieder — die Ketten aus der zweiten
  Stufe bekommen Menschen statt Vereine.

Das ist der größte Posten dieser Stufe und der, der die meisten Türen öffnet.

---

## 3. UX im Einzelnen

Über die Punkte oben hinaus, sortiert nach dem, was ein Spieler zuerst merkt.

### 3.1 Bewegung, die man abschalten kann

`motion.tsx` animiert Zahlen und Übergänge. iOS kennt "Bewegung reduzieren",
und die App fragt nicht danach. `AccessibilityInfo.isReduceMotionEnabled()`
abfragen und Animationen auf Einblenden reduzieren. Das ist eine Stunde Arbeit
und für Menschen mit Reisekrankheit der Unterschied zwischen spielbar und
nicht.

### 3.2 Schriftgrößen

`DESIGN.md` fordert "Dynamic Type bis XL ohne Layoutbruch". Die Schriftgrößen
in `theme.ts` stehen als feste Zahlen. Beides zugleich geht nicht. Die
Größenskala gehört an die Systemeinstellung gekoppelt, mit den in `DESIGN.md`
schon beschriebenen Rückfallregeln für das Kachelraster.

### 3.3 Der Weg zurück

Es gibt keine Navigation. Man sieht immer genau den einen Bildschirm, den die
Engine gerade vorgibt. Für den Ablauf ist das richtig und soll so bleiben —
aber Timeline und Vitrine will man **zwischendurch** ansehen können, nicht nur
am Ende. `CareerLayout` hat rechts bereits die Fläche dafür; es fehlt der
Umschalter.

### 3.4 Rückmeldung beim Anfassen

Kein Haptik-Feedback. Eine getroffene Entscheidung, ein gewonnener Titel, das
Ende einer Karriere: drei Stellen, an denen ein kurzer Impuls
(`expo-haptics`) den Unterschied zwischen Formular und Spiel ausmacht.

### 3.5 Der Startbildschirm

Heute beginnt jede Sitzung bei der Identität. Mit Spielständen wird daraus
eine Übersicht: laufende Karrieren, darunter "Neue Karriere". Dort gehört auch
die Einstellung hin — Sprache, Theme, Bewegung —, damit sie nicht mitten im
Spiel gesucht werden muss.

### 3.6 Barrierefreiheit

Die Grundlagen fehlen an vielen Stellen: Trefferflächen unter 44 pt bei
Metern und Positionspunkten, fehlende `accessibilityLabel` an Wappen und
Kacheln, Farbe als einziger Bedeutungsträger bei den Metern (grün/amber/rot
ohne Zweitkodierung). Ein Durchgang durch alle Bildschirme mit VoiceOver
gehört in diese Stufe, nicht in die übernächste.

---

## 4. Reihenfolge

Jeder Schritt endet mit grünen Tests und einem Messlauf.

1. **Texte aus dem Spielstand heraus.** Muss vor dem Speichern stehen, sonst
   sind alle Spielstände für immer einsprachig. Deutsch und Englisch
   vollständig.
2. **Speichern und fortsetzen.** Danach verliert niemand mehr eine Karriere.
3. **Alles per Tap erreichbar** und der EndScreen auf `Trophy.tsx`. Klein,
   behebt einen Fehler auf der Zielplattform.
4. **Theme-Schicht**, dann die vier Themes. Erst die Mechanik, dann die
   Dateien.
5. **Momente und die Begründungszeile.** Größter Gewinn fürs Spielgefühl je
   Zeile Code.
6. **Form** und **Trainer mit Amtszeit.** Zusammen, weil beide auf die
   Spielzeit wirken und gemeinsam ausbalanciert werden müssen.
7. **Kader mit Namen.** Der große Posten.
8. **UX-Durchgang**: Bewegung, Schriftgrößen, Haptik, VoiceOver, Startbildschirm.
9. **Ereignisvorrat** auf 120 aufstocken, mit den neuen Anknüpfungspunkten
   (Trainer, Mitspieler, Form).
10. **Balancing** über einige hundert Karrieren gegen die Zieltabelle der
    zweiten Stufe. Form und Trainervertrauen dürfen die Verteilung nicht
    verschieben, nur ihre Streuung erhöhen.

Die Schritte 1 bis 3 sind zusammen etwa eine Woche und beheben die drei Dinge,
die einen Spieler heute verlieren: die Sprache, den Spielstand und die
Vitrine.

---

## 5. Was ausdrücklich nicht kommt

**Kein Geld, keine Verträge, keine Gehälter.** In vielen Karrierespielen ist
das der halbe Umfang — hier gehört es nicht hin. footsys fragt, was für eine
Laufbahn du hast, nicht was du verdienst. Ein Kontostand macht aus
Entscheidungen Rechenaufgaben, und die beste Entscheidung wäre plötzlich
ablesbar statt spürbar.

`salary()` in `progression.ts` bleibt ungenutzt oder fällt raus. Der Marktwert
bleibt, was er heute ist: ein Maß für Ansehen, keine Währung.

Was aus dem Bereich trotzdem vorkommen darf, sind **Ereignisse ohne
Kontostand** — Steuerprüfung, Investment, ein Sponsor, ein neuer Berater. Sie
wirken auf Moral, Presse und Konzentration, nicht auf eine Zahl mit
Währungszeichen. Genau so stehen sie schon in `events.json`, und genau so
bleiben sie.

Ebenfalls nicht in dieser Stufe, sondern in der vierten: Attribute statt einer
OVR-Zahl, die Liga-Tabelle mit echten Mitkonkurrenten, die Nationalmannschaft
als eigener Strang, Schlüsselspiele. Siehe `docs/iteration-4.md`.

---

## 6. Wie geprüft wird

| Größe | Zielwert nach dieser Stufe |
|---|---|
| Spitzen-OVR | unverändert p10 67, p50 74, p90 86 |
| Titel | unverändert p50 3, p90 16 |
| ohne Titel | unverändert etwa 20 Prozent |
| Streuung des Ertrags je Saison | **steigt** — die Form soll man merken |
| Saisons mit mindestens einem Moment | über 90 Prozent |
| Oberflächentexte im Quelltext der Bildschirme | 0 |
| Zugriffe auf `.en` außerhalb der i18n-Schicht | 0 |
| Information, die nur per Hover erreichbar ist | 0 |

Die ersten drei Zeilen sind Bedingungen, keine Ziele: diese Stufe soll das
Balancing der zweiten **nicht** verschieben. Verschiebt es sich doch, ist etwas
schiefgegangen.
