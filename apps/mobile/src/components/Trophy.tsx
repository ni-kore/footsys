import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, radius } from '../theme';
import type { TrophyArt } from '../trophy-art';
import { useTooltip } from './Tooltip';

/**
 * Eine gewonnene Trophäe als Bild.
 *
 * In `assets/trophies` liegen 2460 Dateien, benannt nach Nummern ohne
 * erkennbare Zuordnung. Bis die steht, zeigen alle Titel dasselbe Bild. Ein
 * falsch beschriftetes Wappen wäre schlimmer als eines, das für alle gleich
 * aussieht. Damit man trotzdem weiß, was man sieht, nennt ein Hinweis beim
 * Darüberfahren den Titel.
 *
 * Der Hinweis wird nicht hier gezeichnet, sondern von der Hinweisebene über
 * der ganzen Anwendung. Nur so liegt er verlässlich über Tabellenzeilen und
 * wird nicht am Rand einer rollenden Fläche abgeschnitten.
 *
 * Wurde ein Titel mehrfach gewonnen, sitzt unten rechts am Bild ein kleiner
 * Kreis mit der Anzahl, wie man es von Abzeichen kennt.
 */
export function Trophy({ art, count = 1, size = 28, label }: {
  /** Die Form der Trophäe. Fehlt sie, steht die Kontinentaltrophäe als Rückfall. */
  art?: TrophyArt;
  count?: number;
  size?: number;
  /** Name des Titels, für den Hinweis und für Vorlesehilfen. */
  label?: string;
}) {
  const anchor = useRef<View>(null);
  const tooltip = useTooltip();
  const text = label ? label + (count > 1 ? '  ×' + count : '') : '';

  const show = () => {
    if (!label) return;
    anchor.current?.measureInWindow((x, y, width, height) => {
      tooltip.show(text, { x, y, width, height });
    });
  };

  const Art = art;

  return (
    <View ref={anchor} style={{ width: size, height: size }}>
      <Pressable
        onHoverIn={show}
        onHoverOut={tooltip.hide}
        accessibilityRole="image"
        {...(label ? { accessibilityLabel: label } : {})}
      >
        {Art ? <Art width={size} height={size} color={color.status.warning} /> : null}
      </Pressable>

      {count > 1 ? (
        <View style={[styles.badge, { minWidth: size * 0.46, height: size * 0.46 }]}>
          <Text style={[styles.badgeText, { fontSize: size * 0.32 }]}>{count}</Text>
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
});
