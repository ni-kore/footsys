import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { GameData, PendingDecision } from '@footsys/engine';
import { breakpointFor, color, font, radius, space } from '../theme';
import { Card, ClubBadge, Label, Meter } from '../components/ui';

/**
 * Entscheidungen unterbrechen die Simulation. Auf dem iPhone kommt das Blatt
 * von unten, ab Tablet-Breite als zentriertes Fenster.
 */
export function DecisionSheet({ data, decision, onChoose }: {
  data: GameData;
  decision: PendingDecision;
  onChoose: (optionId: string) => void;
}) {
  const { width } = useWindowDimensions();
  const wide = breakpointFor(width) !== 'compact';

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => {}}>
      <View style={[styles.backdrop, wide && styles.backdropWide]}>
        <View style={[styles.sheet, wide && styles.sheetWide]}>
          {!wide ? <View style={styles.grabber} /> : null}

          <View style={styles.header}>
            <Label>{decision.window === 'winter' ? 'Winterpause' : decision.window === 'start' ? 'Karrierestart' : 'Sommerpause'}</Label>
            <Text style={font.headline}>{decision.title.de}</Text>
            <Text style={[font.body, { color: color.text.secondary }]}>{decision.text}</Text>
          </View>

          <ScrollView contentContainerStyle={styles.options}>
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

                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={font.bodyStrong}>{option.label.de}</Text>
                    {option.subtitle ? (
                      <Text style={font.caption}>{option.subtitle}</Text>
                    ) : null}
                  </View>

                  {club ? (
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      {/* Reputation 0 ist die unterste Stufe, nicht „kein Wert" —
                          deshalb ist auch dort ein Segment gefüllt. */}
                      <Meter value={(club.reputation.domestic + 1) * 20} />
                      <Text style={font.micro}>NIVEAU</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  backdropWide: { justifyContent: 'center', alignItems: 'center' },
  sheet: {
    backgroundColor: color.bg.sidebar,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.border.strong,
    padding: space[4],
    paddingBottom: space[7],
    maxHeight: '88%',
    gap: space[4],
  },
  sheetWide: {
    width: 640, maxWidth: '92%', borderRadius: radius.xl, paddingBottom: space[4],
  },
  grabber: {
    width: 38, height: 4, borderRadius: 2, backgroundColor: color.border.strong,
    alignSelf: 'center', marginBottom: space[1],
  },
  header: { gap: space[1] },
  options: { gap: space[2], paddingBottom: space[2] },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    minHeight: 64, padding: space[3],
    backgroundColor: color.surface[1],
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: color.border.default,
  },
  optionPressed: { backgroundColor: color.surface[3], borderColor: color.accent.base },
});
