import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import placeholder from '../../../../assets/trophies/22.png';
import { color, font, radius, space } from '../theme';

/**
 * Eine gewonnene Trophäe als Bild.
 *
 * In `assets/trophies` liegen 2460 Dateien, benannt nach Nummern ohne
 * erkennbare Zuordnung. Bis die steht, zeigen alle Titel dasselbe Bild. Ein
 * falsch beschriftetes Wappen wäre schlimmer als eines, das für alle gleich
 * aussieht. Damit man trotzdem weiß, was man sieht, nennt ein Hinweis beim
 * Darüberfahren den Titel.
 *
 * Wurde ein Titel mehrfach gewonnen, sitzt unten rechts am Bild ein kleiner
 * Kreis mit der Anzahl, wie man es von Abzeichen kennt.
 */
export function Trophy({ count = 1, size = 28, label }: {
  count?: number;
  size?: number;
  /** Name des Titels, für den Hinweis und für Vorlesehilfen. */
  label?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <View style={{ width: size, height: size }}>
      <Pressable
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        accessibilityRole="image"
        {...(label ? { accessibilityLabel: label } : {})}
      >
        <Image source={placeholder} style={{ width: size, height: size }} resizeMode="contain" />
      </Pressable>

      {count > 1 ? (
        <View style={[styles.badge, { minWidth: size * 0.46, height: size * 0.46 }]}>
          <Text style={[styles.badgeText, { fontSize: size * 0.32 }]}>{count}</Text>
        </View>
      ) : null}

      {hovered && label ? (
        <View style={styles.tip} pointerEvents="none">
          <Text style={styles.tipText} numberOfLines={1}>
            {label}{count > 1 ? '  ×' + count : ''}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', right: -2, bottom: -2,
    borderRadius: radius.pill, paddingHorizontal: 3,
    backgroundColor: color.accent.base,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { ...font.micro, color: color.text.onAccent, letterSpacing: 0 },

  // Der Hinweis schwebt über allem und schiebt nichts beiseite. Er ist so
  // breit wie sein Text und bleibt einzeilig.
  tip: {
    position: 'absolute', top: '100%', left: -8, marginTop: 4,
    paddingHorizontal: space[2], paddingVertical: 4,
    backgroundColor: color.bg.root,
    borderRadius: radius.sm,
    borderWidth: 1, borderColor: color.border.strong,
    zIndex: 999, elevation: 12,
  },
  tipText: {
    ...font.micro, color: color.text.primary,
    textTransform: 'none', letterSpacing: 0, whiteSpace: 'nowrap',
  } as never,
});
