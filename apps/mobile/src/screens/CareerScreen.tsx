import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  awardName, careerTotals, titleName,
  type CareerState, type GameData, type SeasonRecord,
} from '@footsys/engine';
import { money, roleLabel, seasonLabel } from '../format';
import { breakpointFor, color, font, ratingColor, space, statColumns } from '../theme';
import { Button, Card, Chip, ClubBadge, Flag, Label, Meter, Ring, StatTile } from '../components/ui';

/**
 * Die Karriereübersicht. Sie unterbricht den Ablauf nicht — man ruft sie
 * bewusst auf und kehrt danach dorthin zurück, wo man war.
 */
export function CareerScreen({ data, state, onClose }: {
  data: GameData; state: CareerState; onClose: () => void;
}) {
  const { width } = useWindowDimensions();
  const breakpoint = breakpointFor(width);
  const wide = breakpoint !== 'compact';
  const columns = statColumns(breakpoint);
  const totals = useMemo(() => careerTotals(state), [state]);

  const club = state.clubId ? data.clubById.get(state.clubId) : null;
  const league = club ? data.leagueById.get(club.league) : null;
  const position = data.positionById.get(state.player.position);
  const formation = data.formations.find((f) => f.id === state.player.formationId);

  const playerCard = (
    <Card style={{ gap: space[4] }}>
      <View style={styles.playerHeader}>
        <Ring value={state.player.overall} caption="OVR" />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={font.headline}>{state.player.surname}</Text>
          <View style={styles.metaLine}>
            <Flag code={state.player.nationality} size={14} />
            <Text style={font.caption}>
              #{state.player.shirtNumber} · {position?.abbr.en} · {formation?.label ?? ''}
              {state.player.isCaptain ? ' · Captain' : ''}
            </Text>
          </View>
          <View style={styles.metaLine}>
            {club ? <ClubBadge clubId={club.id} colors={club.colors} abbr={club.abbr} size={24} /> : null}
            <Text style={font.bodyStrong}>{club ? club.short : 'No club'}</Text>
          </View>
          {league ? <Text style={font.caption}>{league.name}</Text> : null}
          {state.activeLoan ? (
            <Text style={[font.caption, { color: color.status.warning }]}>
              On loan from {data.clubById.get(state.activeLoan.parentClubId)?.short}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.quickRow}>
        <View style={{ flex: 1 }}>
          <Label>Age</Label>
          <Text style={font.title}>{state.player.age}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Label>Market value</Label>
          <Text style={font.title}>{money(state.player.marketValue)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Label>Season</Label>
          <Text style={font.title}>{seasonLabel(state.year)}</Text>
        </View>
      </View>

      <View style={styles.metersRow}>
        <Meter label="Morale" value={state.player.meters.morale} />
        <Meter label="Fans" value={state.player.meters.fanSupport} />
        <Meter label="Media" value={state.player.meters.mediaRelation} />
      </View>
    </Card>
  );

  const stats = (
    <View style={styles.tileGrid}>
      {[
        { label: 'Appearances', value: totals.appearances },
        { label: 'Goals', value: totals.goals },
        { label: 'Assists', value: totals.assists },
        { label: 'Trophies', value: totals.titles, tone: totals.titles > 0 ? color.rating.elite : undefined },
        { label: 'Awards', value: totals.awards },
        { label: 'Caps', value: totals.caps },
        { label: 'Int. goals', value: totals.nationalGoals },
        { label: 'Peak OVR', value: totals.peakOverall, tone: ratingColor(totals.peakOverall) },
      ].map((tile) => (
        <View key={tile.label} style={{ width: `${100 / columns}%`, padding: space[1] }}>
          <StatTile label={tile.label} value={tile.value} tone={tile.tone} />
        </View>
      ))}
    </View>
  );

  const timeline = (
    <Card style={{ gap: space[3] }}>
      <Text style={font.title}>Season by season</Text>
      <View style={styles.tableHead}>
        <Text style={[styles.cellAge, font.micro]}>AGE</Text>
        <Text style={[styles.cellClub, font.micro]}>CLUB</Text>
        <Text style={[styles.cellNum, font.micro]}>OVR</Text>
        <Text style={[styles.cellNum, font.micro]}>APP</Text>
        <Text style={[styles.cellNum, font.micro]}>G</Text>
        <Text style={[styles.cellNum, font.micro]}>A</Text>
      </View>
      {state.seasons.length === 0 ? (
        <Text style={font.caption}>Your first season is still running.</Text>
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
      <View style={styles.topBar}>
        <Text style={font.headline}>Career</Text>
        <Button label="Back" variant="secondary" onPress={onClose} />
      </View>

      {wide ? (
        <View style={{ flexDirection: 'row', gap: space[4] }}>
          <View style={{ flex: 3, gap: space[4] }}>{stats}{timeline}</View>
          <View style={{ flex: 2 }}>{playerCard}</View>
        </View>
      ) : (
        <View style={{ gap: space[4] }}>{playerCard}{stats}{timeline}</View>
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

const styles = StyleSheet.create({
  content: { padding: space[4], paddingBottom: space[9], gap: space[4] },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: space[3],
  },
  playerHeader: { flexDirection: 'row', gap: space[4], alignItems: 'center' },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  quickRow: { flexDirection: 'row', gap: space[3] },
  metersRow: { flexDirection: 'row', gap: space[5] },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', margin: -space[1] },
  tableHead: {
    flexDirection: 'row', paddingBottom: space[2],
    borderBottomWidth: 1, borderBottomColor: color.border.subtle,
  },
  tableRow: {
    gap: space[1], paddingVertical: space[2],
    borderBottomWidth: 1, borderBottomColor: color.border.subtle,
  },
  mainLine: { flexDirection: 'row', alignItems: 'center' },
  cellAge: { width: 40 },
  cellClub: { flex: 1, paddingRight: space[2] },
  cellNum: { width: 44, textAlign: 'right' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1], paddingLeft: 40 },
});
