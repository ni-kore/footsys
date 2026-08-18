import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { CareerState, GameData, PendingDecision } from '@footsys/engine';
import { careerOpening } from '../story';
import { breakpointFor, color, font, radius, space } from '../theme';
import { ClubBadge, Meter, overallTint, StatCard } from '../components/ui';

/**
 * Der Auftakt: links die Zusammenfassung dessen, was gewählt wurde, rechts
 * dieselben Wertkarten wie in der Kopfzeile. Darunter die Vereine, die den
 * Spieler in ihre Jugend holen wollen. Der Hintergrund bleibt abgedunkelt
 * sichtbar — die Karriere hat begonnen, sie wartet nur auf die erste Wahl.
 */
export function CareerStartScreen({ data, state, decision, onChoose }: {
  data: GameData;
  state: CareerState;
  decision: PendingDecision;
  onChoose: (optionId: string) => void;
}) {
  const { width } = useWindowDimensions();
  const compact = breakpointFor(width) === 'compact';
  const story = useMemo(() => careerOpening(data, state), [data, state]);

  const player = state.player;
  const position = data.positionById.get(player.position);
  const formation = data.formations.find((f) => f.id === player.formationId);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, compact && styles.sheetCompact]}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={[styles.header, compact && styles.headerCompact]}>
              <View style={{ gap: space[1] }}>
                <Text style={styles.eyebrow}>A career begins</Text>
                <Text style={styles.title}>{player.surname}</Text>
              </View>

              <View style={styles.statRow}>
                <StatCard value={Math.round(player.overall)} label="OVR" tint={overallTint(player.overall)} />
                <StatCard value={position?.abbr.en ?? ''} label="Pos" />
                <StatCard value={player.strongFoot === 'left' ? 'L' : 'R'} label="Foot" />
                <StatCard value={player.weakFoot} label="Weak" />
                <StatCard value={formation?.label ?? ''} label="System" size="wide" />
              </View>
            </View>

            <View style={styles.story}>
              {story.map((line, index) => (
                <Text key={index} style={styles.paragraph}>{line}</Text>
              ))}
            </View>

            <View style={styles.divider} />

            <Text style={font.title}>{decision.title.en}</Text>

            <View style={styles.options}>
              {decision.options.map((option) => {
                const club = option.clubId ? data.clubById.get(option.clubId) : undefined;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => onChoose(option.id)}
                    style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                    accessibilityRole="button"
                  >
                    {club ? (
                      <ClubBadge clubId={club.id} colors={club.colors} abbr={club.abbr} size={44} />
                    ) : null}

                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={font.bodyStrong}>{option.label.en}</Text>
                      {option.subtitle ? <Text style={font.caption}>{option.subtitle}</Text> : null}
                    </View>

                    {club ? (
                      <View style={styles.reputation}>
                        <Text style={styles.reputationLabel}>Reputation</Text>
                        <Meter value={club.reputation.domestic * 10} steps={10} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: '#000000CC',
    alignItems: 'center', justifyContent: 'center', padding: space[4],
  },
  sheet: {
    width: 760, maxWidth: '100%', maxHeight: '92%',
    backgroundColor: color.bg.sidebar,
    borderRadius: radius.xl,
    borderWidth: 1, borderColor: color.border.strong,
  },
  sheetCompact: { width: '100%' },
  content: { padding: space[5], gap: space[4] },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: space[4], flexWrap: 'wrap',
  },
  headerCompact: { flexDirection: 'column', alignItems: 'flex-start' },
  eyebrow: {
    ...font.label, textTransform: 'uppercase', color: color.accent.base,
  },
  title: { fontSize: 28, fontWeight: '700', color: color.text.primary, letterSpacing: -0.5 },
  statRow: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },
  story: { gap: space[2] },
  paragraph: { ...font.body, color: color.text.secondary, lineHeight: 21 },
  divider: { height: 1, backgroundColor: color.border.subtle },
  options: { gap: space[2] },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    minHeight: 72, padding: space[3],
    backgroundColor: color.surface[1],
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: color.border.default,
  },
  optionPressed: { backgroundColor: color.surface[3], borderColor: color.accent.base },
  reputation: { alignItems: 'flex-end', gap: 3 },
  reputationLabel: { ...font.micro, textTransform: 'uppercase' },
});
