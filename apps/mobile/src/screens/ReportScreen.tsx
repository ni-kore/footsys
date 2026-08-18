import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { awardName, titleName, type GameData, type PeriodReport } from '@footsys/engine';
import { delta, fans as formatFans, money, roleLabel, seasonLabel } from '../format';
import { color, font, radius, space } from '../theme';
import { Button, ClubBadge, Label, StatCard } from '../components/ui';
import { AssistIcon, CardIcon, CleanSheetIcon, FansIcon, GoalIcon } from '../components/icons';

/** Wie der Trainer die Halbserie über spielen ließ. */
function coachApproach(bias: number): string {
  if (bias >= 0.7) return 'very attacking';
  if (bias >= 0.55) return 'attacking';
  if (bias >= 0.4) return 'balanced';
  if (bias >= 0.3) return 'cautious';
  return 'very defensive';
}

/** Wie gut das Lieblingssystem des Spielers dazu passte. */
function fitLabel(fit: number): { text: string; tone: string } {
  if (fit >= 0.95) return { text: 'a perfect fit for you', tone: color.status.positive };
  if (fit >= 0.85) return { text: 'a decent fit for you', tone: color.status.positive };
  if (fit >= 0.78) return { text: 'not really your game', tone: color.status.warning };
  return { text: 'the wrong system for you', tone: color.status.negative };
}

const TONE_COLOR: Record<string, string> = {
  positive: color.status.positive,
  negative: color.status.negative,
  neutral: color.text.secondary,
};

/**
 * Was in einer Halbserie passiert ist. Der Bildschirm bleibt stehen, bis er
 * bestätigt wird — sonst rauscht die Karriere vorbei, ohne dass man etwas
 * mitbekommt.
 */
export function ReportScreen({ data, report, onContinue }: {
  data: GameData;
  report: PeriodReport;
  onContinue: () => void;
}) {
  const club = data.clubById.get(report.clubId);
  const league = data.leagueById.get(report.leagueId);
  const overallChange = report.overallAfter - report.overallBefore;
  const isSeason = report.kind === 'season';
  const isKeeper = data.positionById.get(report.position)?.group === 'GK';
  const fit = fitLabel(report.formationFit);

  return (
    <View style={styles.screen}>
      <View style={{ gap: space[2] }}>
        <Label>
          {isSeason
            ? `Season ${seasonLabel(report.year)} · second half`
            : `Season ${seasonLabel(report.year)} · first half`}
        </Label>
        <Text style={styles.title}>{isSeason ? 'Season review' : 'Half-season review'}</Text>

        <View style={styles.clubLine}>
          {club ? <ClubBadge clubId={club.id} colors={club.colors} abbr={club.abbr} size={26} /> : null}
          <Text style={font.bodyStrong}>{club?.short ?? ''}</Text>
          <Text style={font.caption}>{league?.name ?? ''}</Text>
          <Text style={styles.roleChip}>{roleLabel(report.role).toUpperCase()}</Text>
        </View>

        <Text style={font.caption}>
          The coach played {coachApproach(report.coachBias)} —{' '}
          <Text style={{ color: fit.tone }}>{fit.text}</Text>
        </Text>
      </View>

      <View style={styles.grid}>
        <StatCard grow value={report.appearances} label="Apps" />
        {/* Der Torhüter schießt keine Tore — bei ihm steht die weiße Weste. */}
        {isKeeper ? (
          <StatCard grow value={report.cleanSheets} label="Clean sheets" icon={<CleanSheetIcon />} />
        ) : (
          <StatCard grow value={report.goals} label="Goals" icon={<GoalIcon />} />
        )}
        <StatCard grow value={report.assists} label="Assists" icon={<AssistIcon />} />
        <StatCard
          grow
          value={formatFans(report.fansAfter)}
          label="Fans"
          icon={<FansIcon />}
          tint={report.fansAfter >= report.fansBefore ? color.status.positive : color.status.negative}
        />
        {report.nationalCaps > 0 ? <StatCard grow value={report.nationalCaps} label="Caps" /> : null}
        {report.nationalGoals > 0 ? <StatCard grow value={report.nationalGoals} label="Int. goals" /> : null}
        {isSeason ? (
          <StatCard
            grow
            value={delta(overallChange)}
            label="OVR change"
            tint={overallChange >= 0 ? color.status.positive : color.status.negative}
          />
        ) : null}
        {isSeason ? <StatCard grow value={money(report.marketValueAfter)} label="Value" /> : null}
      </View>

      {report.titles.length > 0 || report.awards.length > 0 ? (
        <View style={styles.silverware}>
          <Text style={font.title}>Silverware</Text>
          {report.titles.map((id) => (
            <Text key={id} style={styles.trophyLine}>🏆  {titleName(data, id)}</Text>
          ))}
          {report.awards.map((id) => (
            <Text key={id} style={styles.trophyLine}>★  {awardName(data, id)}</Text>
          ))}
        </View>
      ) : null}

      {report.randomEvents.length > 0 ? (
        <View style={{ gap: space[3] }}>
          <Text style={font.title}>What happened</Text>
          {report.randomEvents.map((event) => (
            <View key={event.id} style={styles.eventRow}>
              {event.id === 'red_card_ban' ? (
                <View style={styles.eventIcon}><CardIcon size={14} /></View>
              ) : (
                <View style={[styles.eventDot, { backgroundColor: TONE_COLOR[event.tone] ?? color.text.muted }]} />
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={font.bodyStrong}>{event.title.en}</Text>
                <Text style={[font.caption, { lineHeight: 18 }]}>{event.text}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ alignItems: 'flex-start', marginTop: 'auto' }}>
        <Button
          label={isSeason ? 'Into the new season' : 'Into the second half'}
          onPress={onContinue}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: space[4] },
  title: { fontSize: 26, fontWeight: '700', color: color.text.primary, letterSpacing: -0.4 },
  clubLine: { flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' },
  roleChip: {
    ...font.micro, textTransform: 'uppercase',
    borderWidth: 1, borderColor: color.border.default, borderRadius: radius.pill,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  silverware: { gap: space[2] },
  trophyLine: { ...font.body, color: color.rating.elite },
  eventRow: { flexDirection: 'row', gap: space[3], alignItems: 'flex-start' },
  eventDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  eventIcon: { width: 14, marginTop: 2, marginLeft: -3 },
});

