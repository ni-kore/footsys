import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CareerState, GameData } from '@footsys/engine';
import { seasonLabel } from '../format';
import { color, font, space } from '../theme';
import { Button, ClubBadge, Label } from '../components/ui';

/**
 * Zwischen der Vereinswahl und dem ersten Spiel steht ein Moment: man sieht,
 * wo man gelandet ist, und pfeift die Saison selbst an.
 */
export function KickoffScreen({ data, state, onStart }: {
  data: GameData;
  state: CareerState;
  onStart: () => void;
}) {
  const club = state.clubId ? data.clubById.get(state.clubId) : null;
  const league = club ? data.leagueById.get(club.league) : null;
  const first = state.seasons.length === 0;

  return (
    <View style={styles.screen}>
      <View style={{ gap: space[2] }}>
        <Label>Season {seasonLabel(state.year)}</Label>
        <Text style={styles.title}>
          {first ? 'Your first season' : 'A new season'}
        </Text>
      </View>

      {club ? (
        <View style={styles.club}>
          <ClubBadge clubId={club.id} colors={club.colors} abbr={club.abbr} size={56} />
          <View style={{ gap: 2, flex: 1 }}>
            <Text style={font.title}>{club.name}</Text>
            <Text style={font.caption}>{league?.name ?? ''}</Text>
          </View>
        </View>
      ) : null}

      <Text style={styles.lead}>
        {first
          ? 'Pre-season is over. Nothing has been decided yet.'
          : 'A new campaign, a fresh table, the same question every week.'}
      </Text>

      <View style={{ alignItems: 'flex-start', marginTop: 'auto' }}>
        <Button label="Start the season" onPress={onStart} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: space[4] },
  title: { fontSize: 26, fontWeight: '700', color: color.text.primary, letterSpacing: -0.4 },
  club: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  lead: { ...font.body, color: color.text.secondary, lineHeight: 21 },
});
