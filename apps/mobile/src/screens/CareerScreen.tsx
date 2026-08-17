import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  careerTotals, titleName, awardName,
  type CareerState, type GameData, type SeasonRecord,
} from '@footsys/engine';
import { flag, money, roleLabel, seasonLabel } from '../format';
import { breakpointFor, color, font, ratingColor, radius, space, statColumns } from '../theme';
import { Card, Chip, ClubBadge, Label, Meter, Ring, StatTile } from '../components/ui';

/**
 * Der Karriere-Hub: oben wer du gerade bist, darunter was passiert ist.
 */
export function CareerScreen({ data, state }: { data: GameData; state: CareerState }) {
  const { width } = useWindowDimensions();
  const breakpoint = breakpointFor(width);
  const wide = breakpoint !== 'compact';
  const totals = useMemo(() => careerTotals(state), [state]);

  const club = state.clubId ? data.clubById.get(state.clubId) : null;
  const league = club ? data.leagueById.get(club.league) : null;
  const position = data.positionById.get(state.player.position);
  const columns = statColumns(breakpoint);

  const playerCard = (
    <Card style={{ gap: space[4] }}>
      <View style={styles.playerHeader}>
        <Ring value={state.player.overall} caption="OVR" />

        <View style={{ flex: 1, gap: 2 }}>
          <Text style={font.headline}>{state.player.surname}</Text>
          <Text style={font.caption}>
            {flag(state.player.nationality)}  #{state.player.shirtNumber} · {position?.abbr.de}
            {state.player.isCaptain ? ' · Kapitän' : ''}
          </Text>
          <View style={styles.clubLine}>
            {club ? <ClubBadge clubId={club.id} colors={club.colors} abbr={club.abbr} size={26} /> : null}
            <Text style={font.bodyStrong}>{club ? club.short : 'Vereinslos'}</Text>
          </View>
          {league ? <Text style={font.caption}>{league.name}</Text> : null}
          {state.activeLoan ? (
            <Text style={[font.caption, { color: color.status.warning }]}>
              Leihe von {data.clubById.get(state.activeLoan.parentClubId)?.short}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.quickRow}>
        <View style={{ flex: 1 }}>
          <Label>Alter</Label>
          <Text style={font.title}>{state.player.age}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Label>Marktwert</Label>
          <Text style={font.title}>{money(state.player.marketValue)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Label>Saison</Label>
          <Text style={font.title}>{seasonLabel(state.year)}</Text>
        </View>
      </View>

      <View style={styles.metersRow}>
        <Meter label="Moral" value={state.player.meters.morale} />
        <Meter label="Fans" value={state.player.meters.fanSupport} />
        <Meter label="Presse" value={state.player.meters.mediaRelation} />
      </View>
    </Card>
  );

  const stats = (
    <View style={[styles.tileGrid, { gap: space[3] }]}>
      {[
        { label: 'Einsätze', value: totals.appearances },
        { label: 'Tore', value: totals.goals },
        { label: 'Vorlagen', value: totals.assists },
        { label: 'Titel', value: totals.titles, tone: totals.titles > 0 ? color.rating.elite : undefined },
        { label: 'Auszeichnungen', value: totals.awards },
        { label: 'Länderspiele', value: totals.caps },
        { label: 'Länderspieltore', value: totals.nationalGoals },
        { label: 'Bester OVR', value: totals.peakOverall, tone: ratingColor(totals.peakOverall) },
      ].map((tile) => (
        <View key={tile.label} style={{ width: `${100 / columns}%`, padding: space[1] }}>
          <StatTile label={tile.label} value={tile.value} tone={tile.tone} />
        </View>
      ))}
    </View>
  );

  const recentEvents = state.timeline.slice(-8).reverse();

  const feed = (
    <Card style={{ gap: space[3] }}>
      <Text style={font.title}>Zuletzt passiert</Text>
      {recentEvents.length === 0 ? (
        <Text style={font.caption}>Noch nichts — deine Karriere fängt gerade erst an.</Text>
      ) : (
        recentEvents.map((entry, index) => (
          <View key={`${entry.year}-${index}`} style={styles.feedRow}>
            <Text style={styles.feedYear}>{seasonLabel(entry.year)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={font.body}>{entry.text}</Text>
              {entry.detail ? <Text style={font.caption}>{entry.detail}</Text> : null}
            </View>
            <Text style={styles.feedIcon}>{iconFor(entry.type)}</Text>
          </View>
        ))
      )}
    </Card>
  );

  const timeline = (
    <Card style={{ gap: space[3] }}>
      <Text style={font.title}>Laufbahn</Text>
      <View style={styles.tableHead}>
        <Text style={[styles.cellAge, font.micro]}>ALTER</Text>
        <Text style={[styles.cellClub, font.micro]}>VEREIN</Text>
        <Text style={[styles.cellNum, font.micro]}>OVR</Text>
        <Text style={[styles.cellNum, font.micro]}>SP</Text>
        <Text style={[styles.cellNum, font.micro]}>T</Text>
        <Text style={[styles.cellNum, font.micro]}>V</Text>
      </View>
      {state.seasons.length === 0 ? (
        <Text style={font.caption}>Die erste Saison läuft noch.</Text>
      ) : (
        [...state.seasons].reverse().map((season) => (
          <SeasonRow key={`${season.year}-${season.clubId}`} data={data} season={season} />
        ))
      )}
    </Card>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg.canvas }}
      contentContainerStyle={[styles.content, { maxWidth: 1280, alignSelf: 'center', width: '100%' }]}
    >
      {wide ? (
        <View style={{ flexDirection: 'row', gap: space[4] }}>
          <View style={{ flex: 3, gap: space[4] }}>
            {stats}
            {timeline}
          </View>
          <View style={{ flex: 2, gap: space[4] }}>
            {playerCard}
            {feed}
          </View>
        </View>
      ) : (
        <View style={{ gap: space[4] }}>
          {playerCard}
          {stats}
          {feed}
          {timeline}
        </View>
      )}
    </ScrollView>
  );
}

function SeasonRow({ data, season }: { data: GameData; season: SeasonRecord }) {
  const club = data.clubById.get(season.clubId);
  return (
    <View style={styles.tableRow}>
      <View style={styles.mainLine}>
        <Text style={[styles.cellAge, font.body]}>{season.age}</Text>
        <View style={styles.cellClub}>
          <Text style={font.body} numberOfLines={1}>{club?.short ?? season.clubId}</Text>
          <Text style={font.micro}>{roleLabel(season.role).toUpperCase()}</Text>
        </View>
        <Text style={[styles.cellNum, font.bodyStrong, { color: ratingColor(season.overall) }]}>
          {season.overall}
        </Text>
        <Text style={[styles.cellNum, font.body]}>{season.appearances}</Text>
        <Text style={[styles.cellNum, font.body]}>{season.goals}</Text>
        <Text style={[styles.cellNum, font.body]}>{season.assists}</Text>
      </View>

      {season.titles.length > 0 || season.awards.length > 0 ? (
        <View style={styles.chipRow}>
          {season.titles.map((id) => (
            <Chip key={id} label={`🏆 ${titleName(data, id)}`} tone={color.rating.elite} />
          ))}
          {season.awards.map((id) => (
            <Chip key={id} label={`★ ${awardName(data, id)}`} tone={color.status.warning} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function iconFor(type: string): string {
  switch (type) {
    case 'title': return '🏆';
    case 'award': return '★';
    case 'transfer': return '→';
    case 'loan': return '⇄';
    case 'injury': return '✚';
    case 'retirement': return '⏹';
    case 'decision': return '◆';
    default: return '·';
  }
}

const styles = StyleSheet.create({
  content: { padding: space[4], paddingBottom: space[9], gap: space[4] },
  playerHeader: { flexDirection: 'row', gap: space[4], alignItems: 'center' },
  clubLine: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[1] },
  quickRow: { flexDirection: 'row', gap: space[3] },
  metersRow: { flexDirection: 'row', gap: space[5] },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', margin: -space[1] },
  feedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  feedYear: { ...font.micro, width: 38, paddingTop: 2 },
  feedIcon: { fontSize: 14, color: color.text.muted },
  tableHead: {
    flexDirection: 'row', paddingBottom: space[2],
    borderBottomWidth: 1, borderBottomColor: color.border.subtle,
  },
  tableRow: { gap: space[1], paddingVertical: space[2], borderBottomWidth: 1, borderBottomColor: color.border.subtle },
  mainLine: { flexDirection: 'row', alignItems: 'center' },
  cellAge: { width: 42 },
  cellClub: { flex: 1, paddingRight: space[2] },
  cellNum: { width: 42, textAlign: 'right' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1], paddingLeft: 42 },
});
