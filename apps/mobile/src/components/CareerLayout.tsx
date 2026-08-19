import React, { useRef } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { CareerState, GameData } from '@footsys/engine';
import { fansDelta, seasonLabel } from '../format';
import { color, layout, space } from '../theme';
import { Card, Label, StatCard } from './ui';
import { AppsIcon, AssistIcon, CleanSheetIcon, FansIcon, GoalIcon } from './icons';
import { StepTransition } from './motion';
import { PlayerCard } from './PlayerCard';
import { SeasonTable } from './SeasonTable';

/** Zahlen der zuletzt gespielten Halbserie. */
interface Period {
  label: string;
  appearances: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  fans: number;
  keeper: boolean;
}

const NOTHING_YET: Period = {
  label: 'Before your first match',
  appearances: 0, goals: 0, assists: 0, cleanSheets: 0, fans: 0, keeper: false,
};

/**
 * Das Raster der laufenden Karriere: links die Spielerkarte, rechts das, was
 * gerade zu tun ist.
 *
 * Über der rechten Fläche stehen die Zahlen der letzten Halbserie dauerhaft.
 * Sie verschwinden nicht, wenn eine Entscheidung ansteht, und sie zählen auf
 * den neuen Stand, sobald eine Halbserie gerechnet ist.
 */
export function CareerLayout({ data, state, children }: {
  data: GameData;
  state: CareerState;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  // Zwei Flächen nebeneinander brauchen je gut 500 Punkte. Darunter bleibt für
  // die Spielerkarte zu wenig übrig und ihre Zeilen brechen um, deshalb steht
  // alles erst ab Tabletbreite quer nebeneinander.
  const twoColumn = width >= layout.breakpoint.large;

  // Der Bericht verschwindet nach der Bestätigung, seine Zahlen bleiben
  // stehen, bis die nächste Halbserie gerechnet ist.
  const period = useRef<Period>(NOTHING_YET);
  // Stand der Anhängerschaft zu Saisonbeginn. Einsätze, Tore und Vorlagen
  // liefert die Engine bereits als Saisonsumme; beim Zuwachs an Fans muss die
  // Hinrunde von Hand mitgezählt werden, sonst zeigt die Rückrunde weniger an
  // als die Hinrunde davor.
  const seasonStart = useRef<number | null>(null);
  const report = state.pendingReport;
  if (report) {
    if (report.half === 1) seasonStart.current = report.fansBefore;
    period.current = {
      label: report.kind === 'season'
        ? 'Season ' + seasonLabel(report.year)
        : 'Season ' + seasonLabel(report.year) + ' · first half',
      appearances: report.appearances,
      goals: report.goals,
      assists: report.assists,
      cleanSheets: report.cleanSheets,
      fans: report.fansAfter - (seasonStart.current ?? report.fansBefore),
      keeper: data.positionById.get(report.position)?.group === 'GK',
    };
  }
  const shown = period.current;

  const stepKey = state.pendingKickoff
    ? 'kickoff:' + state.year
    : state.pendingReport
      ? 'report:' + state.year + ':' + state.pendingReport.half
      : state.pendingSet.length > 0
        ? 'decisions:' + state.step
        : 'idle:' + state.step;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg.canvas }}
      contentContainerStyle={styles.content}
    >
      <View style={twoColumn ? styles.twoColumn : styles.oneColumn}>
        <View style={twoColumn ? styles.stretch : undefined}>
          <PlayerCard
            data={data}
            state={state}
            {...(twoColumn ? { style: styles.stretch } : {})}
          />
        </View>
        <View style={twoColumn ? styles.stretch : undefined}>
          <Card style={[styles.action, twoColumn && styles.stretch]}>
            <View style={styles.strip}>
              <Label>{shown.label}</Label>
              <View style={styles.stripRow}>
                <StatCard grow count={shown.appearances} label="Apps" icon={<AppsIcon />} />
                {shown.keeper ? (
                  <StatCard grow count={shown.cleanSheets} label="Clean sheets" icon={<CleanSheetIcon />} />
                ) : (
                  <StatCard grow count={shown.goals} label="Goals" icon={<GoalIcon />} />
                )}
                <StatCard grow count={shown.assists} label="Assists" icon={<AssistIcon />} />
                <StatCard
                  grow
                  count={shown.fans}
                  format={fansDelta}
                  label="Fans"
                  icon={<FansIcon />}
                  tint={shown.fans < 0 ? color.status.negative : color.status.positive}
                />
              </View>
            </View>

            <StepTransition stepKey={stepKey} style={styles.stretch}>
              {children}
            </StepTransition>
          </Card>
        </View>
      </View>

      {/* Unter beiden Flächen die Karriere Saison für Saison. */}
      <SeasonTable data={data} state={state} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space[4], paddingBottom: space[9], gap: space[4],
    maxWidth: 1100, alignSelf: 'center', width: '100%',
  },
  twoColumn: { flexDirection: 'row', gap: space[4], alignItems: 'stretch', marginTop: space[4] },
  oneColumn: { gap: space[4], marginTop: space[4] },
  stretch: { flex: 1 },
  action: { gap: space[4] },
  strip: { gap: space[2] },
  stripRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
