import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  canStillSwitch, liveTotals, partnerOf, titleName, trophyCabinet,
  type CareerState, type GameData, type PartnerKind,
} from '@footsys/engine';
import { fans as formatFans, money, roleLabel, roleTone, seasonLabel } from '../format';
import { color, font, radius, space } from '../theme';
import {
  AssociationMark, Card, ClubBlock, Flag, Label, Meter, overallTint, PartnerLogo, StatCard,
  valueTint,
} from './ui';
import { AppsIcon, AssistIcon, CleanSheetIcon, FansIcon, GoalIcon } from './icons';
import { Trophy } from './Trophy';

/**
 * Die Spielerkarte. Sie steht auf jedem Bildschirm links und zeigt in
 * denselben Wertkarten wie beim Karrierestart, wo der Spieler gerade steht.
 *
 * Der Aufbau folgt dem, worauf man zuerst schaut: links die beiden gefüllten
 * Flächen für Stärke und Marktwert, rechts daneben die Angaben zur Person,
 * der Verein und die Zahlen der gesamten Karriere. Was sich ändert, zählt an
 * seinem Platz hoch, statt zu springen.
 */
export function PlayerCard({ data, state, style }: {
  data: GameData;
  state: CareerState;
  style?: object;
}) {
  const player = state.player;
  const club = state.clubId ? data.clubById.get(state.clubId) : null;
  const league = club ? data.leagueById.get(club.league) : null;
  const position = data.positionById.get(player.position);
  const formation = data.formations.find((f) => f.id === player.formationId);
  const isKeeper = position?.group === 'GK';
  const totals = liveTotals(state);

  const bound = player.nationalTeam !== null && !canStillSwitch(data, state);
  const nationalTeam = player.nationalTeam
    ? data.countryByCode.get(player.nationalTeam)
    : null;

  // Die Vitrine zeigt so viele Titel, wie in ihre feste Höhe passen. Der Rest
  // steht als Zahl daneben, damit die Fläche nicht mitwächst.
  const cabinet = [...trophyCabinet(state).entries()];
  const shownTrophies = cabinet.slice(0, TROPHY_SLOTS);
  const hiddenTrophies = cabinet.length - shownTrophies.length;

  // Die Rolle der zuletzt gespielten Halbserie. Vor dem ersten Anpfiff gibt
  // es sie noch nicht.
  const lastHalf = state.currentSeasonHalves[state.currentSeasonHalves.length - 1];
  const lastSeason = state.seasons[state.seasons.length - 1];
  const role = lastHalf?.role ?? lastSeason?.role ?? null;

  return (
    <Card style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.flags}>
          <Flag code={player.nationality} size={18} />
          {player.secondNationality ? (
            <>
              <Text style={styles.flagSlash}>/</Text>
              <Flag code={player.secondNationality} size={18} />
            </>
          ) : null}
        </View>
        <Text style={styles.name} numberOfLines={1}>{player.surname}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.hero}>
          <StatCard
            size="hero" filled grow
            count={player.overall}
            label="OVR"
            tint={overallTint(player.overall)}
          />
          <StatCard
            size="hero" filled grow
            count={player.marketValue}
            format={money}
            label="Value"
            tint={valueTint(player.marketValue)}
          />
        </View>

        <View style={styles.side}>
          <View style={styles.row}>
            <StatCard grow style={styles.slim} count={player.age} label="Age" />
            <StatCard grow style={styles.slim} value={position?.abbr.en ?? ''} label="Pos" />
            <StatCard grow style={styles.slim} value={player.shirtNumber} label="No." />
            <StatCard grow style={styles.slim} value={player.strongFoot === 'left' ? 'L' : 'R'} label="Foot" />
            <StatCard grow style={styles.slim} value={player.weakFoot} label="Weak" />
          </View>

          {/* Der Verein braucht keine Beschriftung: an seiner Stelle stehen
              die Liga und die eigene Rolle darin. */}
          <ClubBlock
            {...(club ? { clubId: club.id } : {})}
            name={club ? club.name : 'No club'}
            colors={club ? club.colors : ['#2B2B38', '#2B2B38']}
            abbr={club ? club.abbr : ''}
            league={league ? league.name : 'Free agent'}
            {...(state.activeLoan ? { loan: 'On loan' } : {})}
            {...(role ? { status: roleLabel(role), statusTone: roleTone(role) } : {})}
          />

          <View style={styles.row}>
            {isKeeper ? (
              <StatCard grow count={totals.cleanSheets} label="Clean sheets" icon={<CleanSheetIcon />} />
            ) : (
              <StatCard grow count={totals.goals} label="Goals" icon={<GoalIcon />} />
            )}
            <StatCard grow count={totals.assists} label="Assists" icon={<AssistIcon />} />
            <StatCard grow count={player.fans} format={formatFans} label="Fans" icon={<FansIcon />} />
            <StatCard grow count={totals.appearances} label="Apps" icon={<AppsIcon />} />
          </View>
        </View>
      </View>

      <View style={styles.row}>
        {/* Die Flagge steht neben dem Kürzel, nicht darüber: so sieht die
            Karte aus wie System und Saison daneben und bleibt gleich hoch,
            ob ein Verband angerufen hat oder nicht. */}
        <StatCard
          grow
          value={nationalTeam ? nationalTeam.code : 'None'}
          label={bound ? 'National team' : 'Called up by'}
          {...(nationalTeam ? { inlineIcon: <AssociationMark code={nationalTeam.code} size={16} /> } : {})}
        />
        <StatCard grow value={formation?.label ?? ''} label="System" />
        <StatCard grow value={seasonLabel(state.year)} label="Season" />
      </View>

      <View style={styles.trophies}>
        <Label>Trophies</Label>
        {cabinet.length > 0 ? (
          <View style={styles.trophyRow}>
            {shownTrophies.map(([id, count]) => (
              <Trophy key={id} count={count} size={30} label={titleName(data, id)} />
            ))}
            {hiddenTrophies > 0 ? (
              <View style={styles.moreTrophies}>
                <Text style={styles.moreTrophiesText}>+{hiddenTrophies}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <Text style={styles.trophyEmpty}>Nothing won yet</Text>
        )}
      </View>

      {/* Ausrüster und Medienpartner. Beide bleiben leer, bis sich jemand
          meldet, und stehen trotzdem da: man soll sehen, dass es sie gibt. */}
      <View style={styles.partners}>
        <PartnerPanel data={data} state={state} kind="kit" label="Kit supplier" />
        <PartnerPanel data={data} state={state} kind="media" label="Media partner" />
      </View>

      <View style={styles.meters}>
        <Meter fill steps={10} label="Morale" value={player.meters.morale} />
        <Meter fill steps={10} label="Fans" value={player.meters.fanSupport} />
        <Meter fill steps={10} label="Media" value={player.meters.mediaRelation} />
      </View>
    </Card>
  );
}

/** Eine der beiden Partnerflächen. */
function PartnerPanel({ data, state, kind, label }: {
  data: GameData;
  state: CareerState;
  kind: PartnerKind;
  label: string;
}) {
  const partner = partnerOf(data, state, kind);
  return (
    <View style={styles.partner}>
      <Label>{label}</Label>
      {partner ? (
        <View style={styles.partnerRow}>
          <PartnerLogo partnerId={partner.id} light={partner.light} size={26} />
          <Text style={styles.partnerName} numberOfLines={2}>{partner.name}</Text>
        </View>
      ) : (
        <Text style={styles.partnerEmpty}>Nobody yet</Text>
      )}
    </View>
  );
}

/** So viele Titel stehen in der Vitrine, danach zählt eine Zahl weiter. */
const TROPHY_SLOTS = 8;

const styles = StyleSheet.create({
  card: { gap: space[3] },
  header: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  flags: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  // Zwei Pässe sind zwei Möglichkeiten, kein Doppelname.
  flagSlash: { fontSize: 13, color: color.text.muted },
  name: { fontSize: 24, fontWeight: '700', color: color.text.primary, letterSpacing: -0.4, flexShrink: 1 },

  body: { flexDirection: 'row', gap: space[2], alignItems: 'stretch' },
  hero: { width: 108, gap: space[2] },
  side: { flex: 1, gap: space[2] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  // Fünf Angaben nebeneinander gehen nur mit schmalerer Grundbreite auf.
  slim: { flexBasis: 46, minWidth: 46 },

  // Die Vitrine bleibt auch leer stehen, damit die Karte nicht springt,
  // sobald der erste Titel dazukommt.
  trophies: {
    gap: space[2], padding: space[3],
    zIndex: 20,
    backgroundColor: color.surface[2],
    borderRadius: radius.md,
    borderWidth: 1, borderColor: color.border.default,
    // Feste Höhe für zwei Reihen: die Fläche wächst nicht mit dem Erfolg.
    height: 132,
  },
  trophyRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: space[4], alignItems: 'center',
    paddingVertical: space[1], zIndex: 30,
  },
  moreTrophies: {
    height: 30, paddingHorizontal: 8,
    borderRadius: radius.pill, borderWidth: 1, borderColor: color.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  moreTrophiesText: { ...font.micro, color: color.text.secondary },
  trophy: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: radius.pill, borderWidth: 1, borderColor: color.rating.elite,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  trophyName: { fontSize: 11, fontWeight: '600', color: color.rating.elite },
  trophyCount: { ...font.micro, color: color.rating.elite },
  trophyEmpty: { ...font.caption, color: color.text.muted },

  partners: { flexDirection: 'row', gap: space[2] },
  partner: {
    flex: 1, gap: space[2], padding: space[3],
    backgroundColor: color.surface[2],
    borderRadius: radius.md,
    borderWidth: 1, borderColor: color.border.default,
    // Auch hier eine feste Höhe: mit Logo so groß wie ohne.
    height: 104,
    overflow: 'hidden',
  },
  partnerRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], flex: 1 },
  partnerName: { ...font.bodyStrong, flex: 1 },
  partnerEmpty: { ...font.caption, color: color.text.muted },

  meters: { flexDirection: 'row', gap: space[3] },
});
