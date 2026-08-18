import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  awardName, careerTotals, titleName, trophyCabinet,
  type CareerState, type GameData,
} from '@footsys/engine';
import { money, seasonLabel } from '../format';
import { breakpointFor, color, font, radius, space, statColumns } from '../theme';
import { Button, Card, Disclaimer, Flag, Label, StatTile } from '../components/ui';

/**
 * Karriereende: Vitrine und Bilanz. Nicht gewonnene Trophäen bleiben sichtbar,
 * aber ausgegraut — was fehlt, gehört zur Geschichte.
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

  const won = useMemo(() => [...cabinet.entries()].sort((a, b) => b[1] - a[1]), [cabinet]);
  const clubs = useMemo(() => [...new Set(state.seasons.map((s) => s.clubId))], [state]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg.canvas }}
      contentContainerStyle={[styles.content, { maxWidth: 1100, alignSelf: 'center', width: '100%' }]}
    >
      <View style={{ gap: space[2], marginTop: space[5] }}>
        <Label>End of career · {seasonLabel(state.year)}</Label>
        <View style={styles.nameLine}>
          <Flag code={state.player.nationality} size={22} />
          <Text style={styles.name}>{state.player.surname}</Text>
        </View>
        <Text style={font.caption}>
          {state.seasons.length} seasons · retired at {state.player.age} · last valued at {money(state.player.marketValue)}
        </Text>
      </View>

      <View style={styles.tileGrid}>
        {[
          { label: 'Peak OVR', value: totals.peakOverall },
          { label: 'Appearances', value: totals.appearances },
          { label: 'Goals', value: totals.goals },
          { label: 'Assists', value: totals.assists },
          { label: 'Trophies', value: totals.titles },
          { label: 'Awards', value: totals.awards },
          { label: 'Clubs', value: clubs.length },
          { label: 'Caps', value: totals.caps },
        ].map((tile) => (
          <View key={tile.label} style={{ width: `${100 / columns}%`, padding: space[1] }}>
            <StatTile label={tile.label} value={tile.value} />
          </View>
        ))}
      </View>

      <Card style={{ gap: space[3] }}>
        <Text style={font.title}>Trophy cabinet</Text>
        {won.length === 0 ? (
          <Text style={font.caption}>No silverware. That is a career too.</Text>
        ) : (
          <View style={styles.trophyGrid}>
            {won.map(([id, count]) => (
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
        <Text style={font.title}>The big ones</Text>
        <View style={styles.trophyGrid}>
          {majorCompetitions.map((competition) => {
            const hasWon = competition.count > 0;
            return (
              <View key={competition.id} style={[styles.trophy, !hasWon && styles.trophyLocked]}>
                <Text style={[styles.trophyIcon, !hasWon && { opacity: 0.3 }]}>🏆</Text>
                <Text
                  style={[styles.trophyName, !hasWon && { color: color.text.disabled }]}
                  numberOfLines={2}
                >
                  {competition.name}
                </Text>
                {hasWon ? <Text style={styles.trophyCount}>×{competition.count}</Text> : null}
              </View>
            );
          })}
        </View>
      </Card>

      <View style={{ alignItems: 'flex-start', marginTop: space[2] }}>
        <Button label="New career" onPress={onRestart} />
      </View>

      <Disclaimer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[4], paddingBottom: space[9], gap: space[4] },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
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
