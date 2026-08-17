import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  awardName, careerTotals, titleName, trophyCabinet,
  type CareerState, type GameData,
} from '@footsys/engine';
import { flag, money, seasonLabel } from '../format';
import { breakpointFor, color, font, radius, space, statColumns } from '../theme';
import { Button, Card, Label, StatTile } from '../components/ui';

/**
 * Karriereende: die Vitrine und die Bilanz. Nicht gewonnene Trophäen bleiben
 * sichtbar, aber ausgegraut — was fehlt, gehört zur Geschichte.
 */
export function EndScreen({ data, state, onRestart }: {
  data: GameData; state: CareerState; onRestart: () => void;
}) {
  const { width } = useWindowDimensions();
  const columns = statColumns(breakpointFor(width));
  const totals = useMemo(() => careerTotals(state), [state]);
  const cabinet = useMemo(() => trophyCabinet(state), [state]);

  const majorCompetitions = useMemo(() => {
    const relevant = [
      ...data.competitions.club.filter((c) => c.gender !== 'women' && c.prestige >= 3),
      ...data.competitions.national.filter((c) => c.gender !== 'women' && c.prestige >= 3),
    ];
    return relevant.map((competition) => ({
      id: competition.id,
      name: competition.name,
      count: cabinet.get(competition.id) ?? 0,
    }));
  }, [data, cabinet]);

  const wonEntries = useMemo(
    () => [...cabinet.entries()].sort((a, b) => b[1] - a[1]),
    [cabinet],
  );

  const clubs = useMemo(
    () => [...new Set(state.seasons.map((s) => s.clubId))],
    [state],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg.canvas }}
      contentContainerStyle={[styles.content, { maxWidth: 1100, alignSelf: 'center', width: '100%' }]}
    >
      <View style={{ gap: space[1], marginTop: space[4] }}>
        <Label>Karriereende {seasonLabel(state.year)}</Label>
        <Text style={styles.name}>
          {flag(state.player.nationality)} {state.player.surname}
        </Text>
        <Text style={font.caption}>
          {state.seasons.length} Saisons · Karriereende mit {state.player.age} · letzter Marktwert {money(state.player.marketValue)}
        </Text>
      </View>

      <View style={styles.tileGrid}>
        {[
          { label: 'Bester OVR', value: totals.peakOverall },
          { label: 'Einsätze', value: totals.appearances },
          { label: 'Tore', value: totals.goals },
          { label: 'Vorlagen', value: totals.assists },
          { label: 'Titel', value: totals.titles },
          { label: 'Auszeichnungen', value: totals.awards },
          { label: 'Vereine', value: clubs.length },
          { label: 'Länderspiele', value: totals.caps },
        ].map((tile) => (
          <View key={tile.label} style={{ width: `${100 / columns}%`, padding: space[1] }}>
            <StatTile label={tile.label} value={tile.value} />
          </View>
        ))}
      </View>

      <Card style={{ gap: space[3] }}>
        <Text style={font.title}>Vitrine</Text>
        {wonEntries.length === 0 ? (
          <Text style={font.caption}>Keine Titel. Auch das ist eine Karriere.</Text>
        ) : (
          <View style={styles.trophyGrid}>
            {wonEntries.map(([id, count]) => (
              <View key={id} style={styles.trophy}>
                <Text style={styles.trophyIcon}>🏆</Text>
                <Text style={styles.trophyName} numberOfLines={2}>
                  {titleName(data, id) !== id ? titleName(data, id) : awardName(data, id)}
                </Text>
                <Text style={styles.trophyCount}>×{count}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card style={{ gap: space[3] }}>
        <Text style={font.title}>Die großen Wettbewerbe</Text>
        <View style={styles.trophyGrid}>
          {majorCompetitions.map((competition) => {
            const won = competition.count > 0;
            return (
              <View key={competition.id} style={[styles.trophy, !won && styles.trophyLocked]}>
                <Text style={[styles.trophyIcon, !won && { opacity: 0.35 }]}>🏆</Text>
                <Text
                  style={[styles.trophyName, !won && { color: color.text.disabled }]}
                  numberOfLines={2}
                >
                  {competition.name}
                </Text>
                {won ? <Text style={styles.trophyCount}>×{competition.count}</Text> : null}
              </View>
            );
          })}
        </View>
      </Card>

      <View style={{ alignItems: 'flex-start', marginTop: space[2] }}>
        <Button label="Neue Karriere" onPress={onRestart} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[4], paddingBottom: space[9], gap: space[4] },
  name: { fontSize: 30, fontWeight: '700', color: color.text.primary, letterSpacing: -0.6 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', margin: -space[1] },
  trophyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  trophy: {
    width: 132, padding: space[3], gap: space[1],
    backgroundColor: color.surface[2],
    borderRadius: radius.md,
    borderWidth: 1, borderColor: color.border.subtle,
    alignItems: 'center',
  },
  trophyLocked: { backgroundColor: 'transparent', borderStyle: 'dashed' },
  trophyIcon: { fontSize: 22 },
  trophyName: { ...font.caption, textAlign: 'center', color: color.text.primary },
  trophyCount: { ...font.micro, color: color.rating.elite },
});
