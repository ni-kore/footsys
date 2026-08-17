import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import type { Position, PositionId } from '@footsys/engine';
import { color, font, radius } from '../theme';

/**
 * Positionsauswahl auf dem Spielfeld.
 *
 * Übernimmt die Taktik-Ansicht aus der Design-Referenz: Linien in gedecktem
 * Grau, Positionen als antippbare Punkte, die aktive Position in Akzentfarbe.
 * Jeder Punkt hat eine Trefferfläche von mindestens 44 pt, auch wenn der
 * sichtbare Kreis kleiner ist.
 */
export function Pitch({ positions, value, onChange, width }: {
  positions: Position[];
  value: PositionId;
  onChange: (id: PositionId) => void;
  width: number;
}) {
  const height = Math.round(width * 1.35);
  const dot = 34;

  return (
    <View style={[styles.pitch, { width, height }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Rect x={1} y={1} width={width - 2} height={height - 2} rx={8}
          stroke={color.pitch.line} strokeWidth={1} fill="none" />
        <Line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={color.pitch.line} strokeWidth={1} />
        <Circle cx={width / 2} cy={height / 2} r={width * 0.16} stroke={color.pitch.line} strokeWidth={1} fill="none" />
        <Rect x={width * 0.22} y={1} width={width * 0.56} height={height * 0.14}
          stroke={color.pitch.line} strokeWidth={1} fill="none" />
        <Rect x={width * 0.22} y={height - height * 0.14 - 1} width={width * 0.56} height={height * 0.14}
          stroke={color.pitch.line} strokeWidth={1} fill="none" />
      </Svg>

      {positions.map((position) => {
        const active = position.id === value;
        // y = 0 ist das eigene Tor, in der Darstellung unten.
        const left = (position.x / 100) * width - dot / 2;
        const top = ((100 - position.y) / 100) * height - dot / 2;

        return (
          <Pressable
            key={position.id}
            onPress={() => onChange(position.id)}
            style={{
              position: 'absolute',
              left: Math.max(2, Math.min(width - dot - 2, left)),
              top: Math.max(2, Math.min(height - dot - 2, top)),
              width: dot, height: dot,
              alignItems: 'center', justifyContent: 'center',
            }}
            hitSlop={8}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={position.name.de}
          >
            <View style={[styles.dot, active && styles.dotActive]}>
              <Text style={[styles.dotText, active && styles.dotTextActive]}>
                {position.abbr.de}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pitch: {
    backgroundColor: color.pitch.bg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border.subtle,
    alignSelf: 'center',
  },
  dot: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: color.surface[2],
    borderWidth: 1, borderColor: color.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  dotActive: { backgroundColor: color.accent.base, borderColor: color.accent.base },
  dotText: { ...font.micro, color: color.text.secondary, letterSpacing: 0 },
  dotTextActive: { color: color.text.onAccent },
});
