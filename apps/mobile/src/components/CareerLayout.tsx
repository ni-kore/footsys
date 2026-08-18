import React from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { CareerState, GameData } from '@footsys/engine';
import { breakpointFor, color, space } from '../theme';
import { Card } from './ui';
import { PlayerCard } from './PlayerCard';

/**
 * Das Raster der laufenden Karriere: links die Spielerkarte, rechts das, was
 * gerade zu tun ist. Maße und Verhalten sind dieselben wie beim
 * Einstellungsbildschirm — zwei gleich hohe Flächen nebeneinander, auf
 * schmalen Geräten untereinander.
 */
export function CareerLayout({ data, state, onOpenCareer, children }: {
  data: GameData;
  state: CareerState;
  onOpenCareer: () => void;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const twoColumn = breakpointFor(width) !== 'compact';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg.canvas }}
      contentContainerStyle={styles.content}
    >
      <View style={twoColumn ? styles.twoColumn : styles.oneColumn}>
        <View style={{ flex: 1 }}>
          <PlayerCard
            data={data}
            state={state}
            onOpenCareer={onOpenCareer}
            {...(twoColumn ? { style: styles.stretch } : {})}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Card style={[styles.action, twoColumn && styles.stretch]}>{children}</Card>
        </View>
      </View>
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
});
