import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { titleName, type GameData, type PeriodReport } from '@footsys/engine';
import { periodSummary, roleLabel, roleTone, seasonLabel } from '../format';
import { color, font, radius, space } from '../theme';
import { Button, ClubBlock } from '../components/ui';
import { CardIcon } from '../components/icons';
import { Fade } from '../components/motion';
import { Trophy } from '../components/Trophy';

/** Ein Ereignis, wie es im Bericht steht. */
type Happening = PeriodReport['randomEvents'][number];

/**
 * Was in einer Halbserie passiert ist. Der Bildschirm bleibt stehen, bis er
 * bestätigt wird. Die Zahlen dazu stehen dauerhaft darüber und zählen dort
 * hoch, sobald der Bericht erscheint.
 */
export function ReportScreen({ data, report, onContinue }: {
  data: GameData;
  report: PeriodReport;
  onContinue: () => void;
}) {
  const club = data.clubById.get(report.clubId);
  const league = data.leagueById.get(report.leagueId);
  const isSeason = report.kind === 'season';

  // Was gut lief, steht links, was schieflief, rechts. Was sich nicht
  // einordnen lässt, steht darunter über die ganze Breite.
  const won = [...report.titles, ...report.awards];
  const good = report.randomEvents.filter((event) => event.tone === 'positive');
  const bad = report.randomEvents.filter((event) => event.tone === 'negative');
  const rest = report.randomEvents.filter(
    (event) => event.tone !== 'positive' && event.tone !== 'negative',
  );

  // Auch eine Spielzeit, in der nichts passiert ist, ist eine Spielzeit. Statt
  // eines leeren Bildschirms steht dann der Bericht selbst da — aus nichts als
  // den Zahlen der Halbserie.
  const quiet = report.randomEvents.length === 0 && won.length === 0
    ? periodSummary(report)
    : null;

  return (
    <View style={styles.screen}>
      <View style={{ gap: space[2] }}>
        <Text style={styles.title}>
          {isSeason ? 'Season review' : 'Half-season review'}
        </Text>

        {/* Derselbe Block wie links auf der Spielerkarte. */}
        <ClubBlock
          {...(club ? { clubId: club.id } : {})}
          name={club?.name ?? ''}
          colors={club ? club.colors : ['#2B2B38', '#2B2B38']}
          abbr={club?.abbr ?? ''}
          {...(league ? { league: league.name } : {})}
          status={roleLabel(report.role)}
          statusTone={roleTone(report.role)}
        />
      </View>

      <View style={{ gap: space[3] }}>
        <Text style={font.title}>What happened</Text>

        <View style={styles.columns}>
          <Column
            label="Went well"
            tone={color.status.positive}
            sign="+"
            events={good}
            empty="Nothing stood out"
          />
          <Column
            label="Went wrong"
            tone={color.status.negative}
            sign="−"
            events={bad}
            empty="Nothing went against you"
          />
        </View>

        {/* Was gewonnen wurde, steht als Bilder unter der linken Spalte,
            nicht darin: Titel sind das Ergebnis der Saison, nicht ein
            Vorkommnis daraus. */}
        {won.length > 0 ? (
          <View style={styles.columns}>
            <Fade style={styles.trophyRow} delay={220}>
              {won.map((id) => (
                <Trophy key={id} size={34} label={titleName(data, id)} />
              ))}
            </Fade>
            <View style={{ flex: 1 }} />
          </View>
        ) : null}

        {rest.length > 0 ? (
          <View style={{ gap: space[3] }}>
            {rest.map((event, index) => (
              <Happening key={event.id} event={event} delay={index * 130} />
            ))}
          </View>
        ) : null}

        {quiet ? (
          <Fade delay={220} style={styles.quiet}>
            <Text style={font.bodyStrong}>{quiet.title}</Text>
            <Text style={[font.caption, { lineHeight: 18 }]}>{quiet.text}</Text>
          </Fade>
        ) : null}
      </View>

      <View style={{ alignItems: 'flex-start', marginTop: 'auto' }}>
        {/* Von hier geht es nicht direkt aufs Feld, sondern zu den
            Entscheidungen, die vor der nächsten Halbserie zu treffen sind. */}
        <Button label="Your decisions" onPress={onContinue} />
      </View>
    </View>
  );
}

/** Eine der beiden Spalten: was gut lief oder was schieflief. */
function Column({ label, tone, sign, events, empty }: {
  label: string;
  tone: string;
  /** Vorzeichen vor jedem Eintrag der Spalte. */
  sign: string;
  events: Happening[];
  empty: string;
}) {
  return (
    <View style={styles.column}>
      <Text style={[styles.columnLabel, { color: tone }]}>{label}</Text>
      {events.length > 0 ? (
        events.map((event, index) => (
          <Happening
            key={event.id}
            event={event}
            sign={sign}
            tone={tone}
            delay={180 + index * 130}
          />
        ))
      ) : (
        <Text style={styles.columnEmpty}>{empty}</Text>
      )}
    </View>
  );
}

/**
 * Ein einzelnes Vorkommnis. Ob es gut oder schlecht war, sagt das Vorzeichen
 * davor; der Text selbst bleibt in der normalen Farbe und damit lesbar.
 */
function Happening({ event, sign, tone, delay }: {
  event: Happening;
  sign?: string;
  tone?: string;
  delay: number;
}) {
  return (
    <Fade delay={delay} style={styles.eventRow}>
      {/* Wo sonst das Vorzeichen steht, steht bei einem Platzverweis die
          Karte. Sie füllt denselben Platz, damit die Zeilen daneben nicht
          verrutschen. */}
      {event.id === 'red_card_ban' ? (
        <View style={styles.signSlot}><CardIcon size={13} /></View>
      ) : sign ? (
        <Text style={[styles.sign, tone ? { color: tone } : null]}>{sign}</Text>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={font.bodyStrong}>{event.title.en}</Text>
        <Text style={[font.caption, { lineHeight: 18 }]}>{event.text}</Text>
      </View>
    </Fade>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: space[4] },
  title: { fontSize: 26, fontWeight: '700', color: color.text.primary, letterSpacing: -0.4 },
  // Der Hinweis an einer Trophäe schwebt nach oben heraus, deshalb muss diese
  // Reihe über ihren Nachbarn liegen.
  trophyRow: {
    flex: 1, flexDirection: 'row', flexWrap: 'wrap',
    gap: space[4], alignItems: 'center',
    paddingVertical: space[2], paddingHorizontal: space[2],
  },
  // Das Symbol steht auf halber Höhe des ganzen Eintrags, nicht an der
  // ersten Zeile.
  columns: { flexDirection: 'row', gap: space[4] },
  // Derselbe Rahmen wie bei den Flächen der Spielerkarte.
  column: {
    flex: 1, gap: space[3], minWidth: 0, padding: space[3],
    backgroundColor: color.surface[2],
    borderRadius: radius.md,
    borderWidth: 1, borderColor: color.border.default,
  },
  columnLabel: { ...font.micro, textTransform: 'uppercase' },
  columnEmpty: { ...font.caption, color: color.text.muted },
  eventRow: { flexDirection: 'row', gap: space[2], alignItems: 'center' },
  // Der Bericht einer ruhigen Spielzeit steht über die ganze Breite, ohne
  // Vorzeichen: er ist weder gut noch schlecht.
  quiet: { gap: 2 },
  // Das Vorzeichen steht auf der Zeile der Überschrift, nicht auf halber
  // Höhe des ganzen Eintrags.
  // Dieselbe Zeilenhöhe wie die Überschrift: so liegen beide Mitten
  // aufeinander, unabhängig von der Schriftgröße des Zeichens.
  sign: {
    fontSize: 15, fontWeight: '700', lineHeight: 18, width: 10, textAlign: 'center',
    alignSelf: 'flex-start',
  },
  signSlot: {
    width: 10, height: 18, alignSelf: 'flex-start',
    alignItems: 'center', justifyContent: 'center',
  },
});
