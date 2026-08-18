import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { canStillSwitch, type CareerState, type GameData } from '@footsys/engine';
import { fans as formatFans, money, seasonLabel } from '../format';
import { color, font, space } from '../theme';
import {
  Button, Card, ClubBadge, Flag, Meter, overallTint, StatCard, valueTint,
} from './ui';
import { FansIcon } from './icons';

/**
 * Die Spielerkarte. Sie steht auf jedem Bildschirm links und zeigt in
 * denselben Wertkarten wie beim Karrierestart, wo der Spieler gerade steht —
 * nur die Zahlen darin ändern sich im Lauf der Karriere.
 */
export function PlayerCard({ data, state, onOpenCareer, style }: {
  data: GameData;
  state: CareerState;
  onOpenCareer: () => void;
  style?: object;
}) {
  const player = state.player;
  const club = state.clubId ? data.clubById.get(state.clubId) : null;
  const league = club ? data.leagueById.get(club.league) : null;
  const position = data.positionById.get(player.position);
  const formation = data.formations.find((f) => f.id === player.formationId);

  const bound = player.nationalTeam !== null && !canStillSwitch(data, state);
  const nationalTeam = player.nationalTeam
    ? data.countryByCode.get(player.nationalTeam)
    : null;

  return (
    <Card style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.flags}>
          <Flag code={player.nationality} size={18} />
          {player.secondNationality ? <Flag code={player.secondNationality} size={18} /> : null}
        </View>
        <Text style={styles.name} numberOfLines={1}>{player.surname}</Text>
      </View>

      <View style={styles.grid}>
        <StatCard grow value={Math.round(player.overall)} label="OVR" tint={overallTint(player.overall)} />
        <StatCard grow value={position?.abbr.en ?? ''} label="Pos" />
        <StatCard grow value={player.shirtNumber} label="No." />
        <StatCard grow value={player.age} label="Age" tint={color.accent.onSubtle} />

        <StatCard grow value={player.strongFoot === 'left' ? 'L' : 'R'} label="Foot" />
        <StatCard grow value={player.weakFoot} label="Weak" />
        <StatCard grow value={formation?.label ?? ''} label="System" />
        <StatCard grow value={seasonLabel(state.year)} label="Season" />

        <StatCard
          grow
          value={money(player.marketValue)}
          label="Value"
          tint={valueTint(player.marketValue)}
        />
        <StatCard grow value={formatFans(player.fans)} label="Fans" icon={<FansIcon size={16} />} />
        <StatCard
          grow
          size="wide"
          value={club ? club.short : 'None'}
          label="Club"
          icon={club ? <ClubBadge clubId={club.id} colors={club.colors} abbr={club.abbr} size={22} /> : undefined}
        />
        <StatCard
          grow
          size="wide"
          value={nationalTeam ? nationalTeam.code : 'None'}
          label={bound ? 'National team' : 'Called up by'}
          icon={nationalTeam ? <Flag code={nationalTeam.code} size={14} /> : undefined}
        />
      </View>

      {league ? (
        <Text style={font.caption} numberOfLines={1}>
          {league.name}
          {state.activeLoan
            ? `  ·  on loan from ${data.clubById.get(state.activeLoan.parentClubId)?.short}`
            : ''}
        </Text>
      ) : null}

      <View style={styles.meters}>
        <Meter label="Morale" value={player.meters.morale} />
        <Meter label="Fans" value={player.meters.fanSupport} />
        <Meter label="Media" value={player.meters.mediaRelation} />
      </View>

      <View style={styles.footer}>
        <Button label="Career history" variant="secondary" onPress={onOpenCareer} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[4] },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  flags: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: 24, fontWeight: '700', color: color.text.primary, letterSpacing: -0.4, flexShrink: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  meters: { flexDirection: 'row', gap: space[5] },
  // Der Verlauf sitzt unten in der Karte, damit die Werte darüber ruhig bleiben.
  footer: { marginTop: 'auto', alignItems: 'flex-start' },
});
