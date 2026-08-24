import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CareerState } from '@footsys/engine';
import { color, font, space } from '../theme';
import { Button, Disclaimer, Label } from '../components/ui';
import { useT } from '../i18n';

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
  const { t } = useT();
  const clubs = new Set(state.seasons.map((season) => season.clubId)).size;
  const summary = t('endSummary')
    .replace('{n}', String(state.seasons.length))
    .replace('{c}', String(clubs))
    .replace('{club}', t(clubs === 1 ? 'clubOne' : 'clubMany'))
    .replace('{a}', String(state.player.age));

  return (
    <View style={styles.screen}>
      <View style={{ gap: space[2] }}>
        <Label>{t('endOfCareer')}</Label>
        <Text style={styles.title}>{t('thatWasTheCareer')}</Text>
        <Text style={[font.caption, { lineHeight: 20 }]}>{summary}</Text>
      </View>

      <View style={{ alignItems: 'flex-start', marginTop: 'auto' }}>
        <Button label={t('newCareer')} onPress={onRestart} />
      </View>

      <Disclaimer />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: space[4] },
  title: { fontSize: 26, fontWeight: '700', color: color.text.primary, letterSpacing: -0.4 },
});
