import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CareerState } from '@footsys/engine';
import { color, font, space } from '../theme';
import { Button, Label } from '../components/ui';

/**
 * Karriereende.
 *
 * Über die Zusammenfassung ist noch nicht entschieden, deshalb endet eine
 * Laufbahn vorerst schlicht: Spielerkarte und Saisontabelle daneben erzählen
 * sie ohnehin schon. Hier steht nur, dass es vorbei ist.
 */
export function EndScreen({ state, onRestart }: {
  state: CareerState;
  onRestart: () => void;
}) {
  const clubs = new Set(state.seasons.map((season) => season.clubId)).size;

  return (
    <View style={styles.screen}>
      <View style={{ gap: space[2] }}>
        <Label>End of career</Label>
        <Text style={styles.title}>That was the career</Text>
        <Text style={[font.caption, { lineHeight: 20 }]}>
          {state.seasons.length} seasons at {clubs} {clubs === 1 ? 'club' : 'clubs'},
          {' '}played out to the age of {state.player.age}.
        </Text>
      </View>

      <View style={{ alignItems: 'flex-start', marginTop: 'auto' }}>
        <Button label="New career" onPress={onRestart} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: space[4] },
  title: { fontSize: 26, fontWeight: '700', color: color.text.primary, letterSpacing: -0.4 },
});
