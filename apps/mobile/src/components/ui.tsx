import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { color, font, meterColor, radius, space } from '../theme';
import { readableOn } from '../format';
import { clubBadges } from '../club-badges';

/** Karte mit dünnem Rand — die Grundfläche der gesamten Oberfläche. */
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/**
 * Versalien-Mikrolabel über einem Wert. Die Großschreibung übernimmt der
 * Textstil — so bleiben zusammengesetzte Kinder (Text plus Variable) intakt.
 */
export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

/** Statistik-Kachel: Label oben, Wert groß darunter. */
export function StatTile({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <Card style={styles.tile}>
      <Label>{label}</Label>
      <Text style={[styles.tileValue, tone ? { color: tone } : null]}>{value}</Text>
    </Card>
  );
}

/**
 * Fünfstufiger Balken — die Darstellung aus der Design-Referenz. Ersetzt
 * Zahlenkolonnen für alles, was eine Bewertung ist.
 */
export function Meter({ value, label }: { value: number; label?: string }) {
  const filled = Math.round((value / 100) * 5);
  const tone = meterColor(value);
  return (
    <View>
      {label ? <Label>{label}</Label> : null}
      <View style={styles.meterRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[styles.meterSegment, { backgroundColor: i < filled ? tone : color.meter.empty }]}
          />
        ))}
      </View>
    </View>
  );
}

/** Ring mit Zahl in der Mitte — für OVR und Prozentwerte. */
export function Ring({ value, max = 99, size = 76, caption }: {
  value: number; max?: number; size?: number; caption?: string;
}) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(1, value / max));
  const tone = color.accent.base;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color.surface[3]} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={tone} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${circumference * progress} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={styles.ringValue}>{Math.round(value)}</Text>
      {caption ? <Text style={styles.ringCaption}>{caption}</Text> : null}
    </View>
  );
}

/** Segment-Control für zwei bis vier Optionen. */
export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Vereinswappen.
 *
 * Liegt unter assets/clubs/ eine Datei mit der Vereins-ID, wird sie gezeigt.
 * Sonst entsteht das Wappen aus Vereinsfarben und Kürzel — so hat jeder der
 * über 1.200 Vereine ein Erscheinungsbild, auch die ohne Bilddatei.
 */
export function ClubBadge({ clubId, colors, abbr, size = 40 }: {
  clubId?: string; colors: [string, string]; abbr: string; size?: number;
}) {
  const badge = clubId ? clubBadges[clubId] : undefined;
  if (badge) {
    return (
      <Image
        source={badge}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityLabel={abbr}
      />
    );
  }

  const primary = colors[0] ?? '#2B2B38';
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size * 0.28,
        backgroundColor: primary,
        borderWidth: 1, borderColor: color.border.strong,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <View style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: size * 0.18,
        backgroundColor: colors[1] ?? '#E8E8F0', opacity: 0.85,
      }} />
      <Text style={{ fontSize: size * 0.3, fontWeight: '700', color: readableOn(primary) }}>
        {abbr}
      </Text>
    </View>
  );
}

export function Button({ label, onPress, variant = 'primary', disabled }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary'; disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? styles.buttonPrimary : styles.buttonSecondary,
        pressed && { opacity: 0.85 },
        disabled && { opacity: 0.4 },
      ]}
      accessibilityRole="button"
    >
      <Text style={variant === 'primary' ? styles.buttonPrimaryText : styles.buttonSecondaryText}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({ label, tone }: { label: string; tone?: string }) {
  return (
    <View style={[styles.chip, tone ? { borderColor: tone } : null]}>
      <Text style={[styles.chipText, tone ? { color: tone } : null]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface[1],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border.subtle,
    padding: space[4],
  },
  label: { ...font.label, textTransform: 'uppercase' },
  tile: { flex: 1, minWidth: 120, padding: space[3] },
  tileValue: { fontSize: 24, fontWeight: '700', color: color.text.primary, marginTop: space[1] },
  meterRow: { flexDirection: 'row', gap: 3, marginTop: space[1] },
  meterSegment: { width: 7, height: 16, borderRadius: radius.xs },
  ringValue: { fontSize: 22, fontWeight: '700', color: color.text.primary },
  ringCaption: { ...font.micro, marginTop: -2 },
  segmented: {
    flexDirection: 'row',
    backgroundColor: color.surface[2],
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1, minHeight: 34, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[2],
  },
  segmentActive: { backgroundColor: color.accent.subtle },
  segmentText: { ...font.bodyStrong, color: color.text.secondary },
  segmentTextActive: { color: color.accent.onSubtle },
  button: {
    minHeight: 44, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[5],
  },
  buttonPrimary: { backgroundColor: color.accent.base },
  buttonSecondary: { backgroundColor: color.surface[2], borderWidth: 1, borderColor: color.border.default },
  buttonPrimaryText: { ...font.bodyStrong, color: color.text.onAccent },
  buttonSecondaryText: { ...font.bodyStrong, color: color.text.primary },
  chip: {
    borderRadius: radius.pill, borderWidth: 1, borderColor: color.border.default,
    paddingHorizontal: 10, paddingVertical: 3, backgroundColor: color.surface[2],
  },
  chipText: { fontSize: 11, fontWeight: '600', color: color.text.secondary },
});
