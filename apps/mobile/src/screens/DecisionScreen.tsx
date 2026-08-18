import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { GameData, PendingDecision } from '@footsys/engine';
import { color, font, radius, space } from '../theme';
import { ClubBadge, Label, Meter } from '../components/ui';

const WINDOW_LABEL: Record<PendingDecision['window'], string> = {
  start: 'Career start',
  winter: 'Winter break',
  summer: 'Summer break',
};

/**
 * Eine Entscheidung. Sie füllt die rechte Fläche, links bleibt die
 * Spielerkarte stehen — man sieht beim Wählen, worüber man entscheidet.
 */
export function DecisionScreen({ data, decision, onChoose }: {
  data: GameData;
  decision: PendingDecision;
  onChoose: (optionId: string) => void;
}) {
  return (
    <View style={styles.screen}>
      <View style={{ gap: space[2] }}>
        <Label>{WINDOW_LABEL[decision.window]}</Label>
        <Text style={styles.title}>{decision.title.en}</Text>
        <Text style={styles.lead}>{decision.text}</Text>
      </View>

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
              ) : (
                <View style={styles.bullet} />
              )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: space[4] },
  title: { fontSize: 26, fontWeight: '700', color: color.text.primary, letterSpacing: -0.4 },
  lead: { ...font.body, color: color.text.secondary, lineHeight: 21 },
  options: { gap: space[2] },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    minHeight: 72, padding: space[3],
    backgroundColor: color.surface[2],
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: color.border.default,
  },
  optionPressed: { backgroundColor: color.surface[3], borderColor: color.accent.base },
  bullet: {
    width: 10, height: 10, borderRadius: 5, marginHorizontal: 17,
    backgroundColor: color.accent.base,
  },
  reputation: { alignItems: 'flex-end', gap: 3 },
  reputationLabel: { ...font.micro, textTransform: 'uppercase' },
});
