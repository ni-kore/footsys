import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { color, font, meterColor, radius, space } from '../theme';
import { readableOn } from '../format';
import { clubBadges } from '../club-badges';
import { flagImages } from '../flags';

/** Card with a hairline border — the base surface of the whole interface. */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Small uppercase label above a value. */
export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function StatTile({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <Card style={styles.tile}>
      <Label>{label}</Label>
      <Text style={[styles.tileValue, tone ? { color: tone } : null]}>{value}</Text>
    </Card>
  );
}

/**
 * Country flag.
 *
 * Emoji flags are not an option: Windows has no glyphs for the regional
 * indicator characters and falls back to two letters. Bundled images look the
 * same everywhere.
 */
export function Flag({ code, size = 18 }: { code: string; size?: number }) {
  const image = flagImages[code];
  if (!image) {
    return <Text style={[styles.flagFallback, { fontSize: size * 0.6 }]}>{code}</Text>;
  }
  return (
    <Image
      source={image}
      style={{ width: size * 1.5, height: size, borderRadius: 2, backgroundColor: color.surface[2] }}
      resizeMode="cover"
      accessibilityLabel={code}
    />
  );
}

/**
 * Balkenanzeige aus der Design-Referenz. Die Stufenzahl ist frei: Meter der
 * Karriere laufen über fünf, die Vereinsreputation über zehn.
 */
export function Meter({ value, label, steps = 5 }: {
  value: number; label?: string; steps?: number;
}) {
  const filled = Math.round((value / 100) * steps);
  const tone = meterColor(value);
  return (
    <View>
      {label ? <Label>{label}</Label> : null}
      <View style={styles.meterRow}>
        {Array.from({ length: steps }, (_, i) => (
          <View
            key={i}
            style={[
              styles.meterSegment,
              steps > 5 && styles.meterSegmentNarrow,
              { backgroundColor: i < filled ? tone : color.meter.empty },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * Wertkarte für die Kopfzeile: Zahl oben, Beschriftung darunter.
 *
 * Die Färbung folgt den Stufen, die man aus Fußballspielen kennt — Bronze,
 * Silber, Gold, und darüber die Ausnahmeklasse.
 */
export function StatCard({ value, label, tint, size = 'normal', icon, grow }: {
  value: string | number;
  label: string;
  tint?: string;
  size?: 'normal' | 'wide';
  /** Wappen oder Flagge über dem Wert. */
  icon?: React.ReactNode;
  /** Füllt die Breite im Raster statt sich an den Inhalt zu schmiegen. */
  grow?: boolean;
}) {
  return (
    <View
      style={[
        styles.statCard,
        size === 'wide' && styles.statCardWide,
        grow && styles.statCardGrow,
        tint ? { borderColor: tint } : null,
      ]}
    >
      {icon ? <View style={styles.statCardIcon}>{icon}</View> : null}
      <Text style={[styles.statCardValue, tint ? { color: tint } : null]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statCardLabel}>{label}</Text>
    </View>
  );
}

/** Rückennummer im Stil der Eingabefelder. */
export function ShirtNumber({ number }: { number: number }) {
  return (
    <View style={styles.shirtNumber}>
      <Text style={styles.shirtNumberText}>{number}</Text>
    </View>
  );
}

/** Position als Kreis — dieselbe Form wie die Punkte auf dem Spielfeld. */
export function PositionDot({ abbr }: { abbr: string }) {
  return (
    <View style={styles.positionDot}>
      <Text style={styles.positionDotText}>{abbr}</Text>
    </View>
  );
}

/**
 * Farbstufen wie in den EA-Titeln: Bronze für den Durchschnitt, Silber für
 * gute, Gold für sehr gute Spieler — darüber die Ausnahmeklasse im Markengrün.
 */
export function overallTint(overall: number): string {
  if (overall >= 85) return color.accent.base;
  if (overall >= 75) return TIER.gold;
  if (overall >= 65) return TIER.silver;
  return TIER.bronze;
}

export function valueTint(marketValue: number): string {
  if (marketValue >= 50_000_000) return color.accent.base;
  if (marketValue >= 10_000_000) return TIER.gold;
  if (marketValue >= 1_000_000) return TIER.silver;
  return TIER.bronze;
}

const TIER = {
  bronze: '#B08D57',
  silver: '#C9CBD4',
  gold: '#F5C542',
};

/** Ring with a number in the middle — for overall and percentages. */
export function Ring({ value, max = 99, size = 76, caption }: {
  value: number; max?: number; size?: number; caption?: string;
}) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(1, value / max));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color.surface[3]} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color.accent.base} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${circumference * progress} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={[styles.ringValue, { fontSize: size * 0.29 }]}>{Math.round(value)}</Text>
      {caption ? <Text style={styles.ringCaption}>{caption}</Text> : null}
    </View>
  );
}

/** Segmented control for two to four options. */
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
 * Club badge. Every club in the database ships with one, so this always
 * resolves to an image; the monogram is only a safety net.
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
      <Text style={{ fontSize: size * 0.3, fontWeight: '700', color: readableOn(primary) }}>
        {abbr}
      </Text>
    </View>
  );
}

export function Button({ label, onPress, variant = 'primary', disabled, wide }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary'; disabled?: boolean; wide?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? styles.buttonPrimary : styles.buttonSecondary,
        wide && { alignSelf: 'stretch' },
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

/**
 * Sternebewertung, wie man sie aus Fußballspielen kennt. Die Trefferfläche
 * ist deutlich größer als der Stern selbst.
 */
export function Stars({ value, onChange, max = 5 }: {
  value: number; onChange: (value: number) => void; max?: number;
}) {
  return (
    <View style={styles.starRow}>
      {Array.from({ length: max }, (_, index) => index + 1).map((step) => (
        <Pressable
          key={step}
          onPress={() => onChange(step)}
          style={styles.starHit}
          hitSlop={6}
          accessibilityRole="radio"
          accessibilityState={{ selected: step <= value }}
          accessibilityLabel={String(step)}
        >
          <Text style={[styles.star, step <= value && styles.starOn]}>
            {step <= value ? '★' : '☆'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Schalter im Stil der Referenz: 44×26, Knopf 22. */
export function Toggle({ value, onChange, label }: {
  value: boolean; onChange: (value: boolean) => void; label?: string;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={styles.toggleRow}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      {label ? <Text style={styles.toggleLabel}>{label}</Text> : null}
      <View style={[styles.toggleTrack, value && styles.toggleTrackOn]}>
        <View style={[styles.toggleKnob, value && styles.toggleKnobOn]} />
      </View>
    </Pressable>
  );
}

/**
 * Rechtlicher Hinweis zu den Vereinsnamen. Steht dort, wo eine Karriere
 * beginnt und wo sie endet — an beiden Stellen sieht ihn jeder einmal.
 */
export function Disclaimer() {
  return (
    <Text style={styles.disclaimer}>
      The club names and references are used solely for identification purposes
      within the simulation. This platform is not affiliated with, sponsored by,
      or endorsed by the mentioned clubs, unless expressly stated otherwise.
    </Text>
  );
}

export function Chip({ label, tone }: { label: string; tone?: string }) {
  return (
    <View style={[styles.chip, tone ? { borderColor: tone } : null]}>
      <Text style={[styles.chipText, tone ? { color: tone } : null]}>{label}</Text>
    </View>
  );
}

/** Einheitliche Höhe aller Eingabeelemente — sonst tanzen die Beschriftungen. */
export const CONTROL_HEIGHT = 42;

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface[1],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border.subtle,
    padding: space[4],
  },
  label: { ...font.label, textTransform: 'uppercase' },
  flagFallback: { ...font.micro, color: color.text.secondary },
  tile: { flex: 1, minWidth: 110, padding: space[3] },
  tileValue: { fontSize: 24, fontWeight: '700', color: color.text.primary, marginTop: space[1] },
  meterRow: { flexDirection: 'row', gap: 3, marginTop: space[1] },
  meterSegment: { width: 7, height: 16, borderRadius: radius.xs },
  meterSegmentNarrow: { width: 5, height: 14 },
  statCard: {
    minWidth: 62, paddingHorizontal: space[2], paddingVertical: space[1],
    borderRadius: radius.md,
    backgroundColor: color.surface[2],
    borderWidth: 1, borderColor: color.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  statCardWide: { minWidth: 84, flexBasis: 116 },
  statCardGrow: { flexGrow: 1, flexBasis: 74, paddingVertical: space[2] },
  statCardIcon: { marginBottom: 2 },
  statCardValue: { fontSize: 17, fontWeight: '700', color: color.text.primary },
  statCardLabel: { ...font.micro, textTransform: 'uppercase', marginTop: -1 },
  shirtNumber: {
    minWidth: 40, height: 38, paddingHorizontal: space[2],
    borderRadius: radius.md,
    backgroundColor: color.surface[2],
    borderWidth: 1, borderColor: color.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  shirtNumberText: { fontSize: 16, fontWeight: '700', color: color.text.primary },
  positionDot: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: color.accent.base,
    alignItems: 'center', justifyContent: 'center',
  },
  positionDotText: { fontSize: 11, fontWeight: '700', color: color.text.onAccent },
  ringValue: { fontWeight: '700', color: color.text.primary },
  ringCaption: { ...font.micro, marginTop: -2 },
  segmented: {
    flexDirection: 'row',
    backgroundColor: color.surface[2],
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
    minHeight: CONTROL_HEIGHT,
  },
  segment: {
    flex: 1, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[2],
  },
  segmentActive: { backgroundColor: color.accent.subtle },
  segmentText: { ...font.bodyStrong, color: color.text.secondary },
  segmentTextActive: { color: color.accent.onSubtle },
  button: {
    minHeight: 46, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[5],
  },
  buttonPrimary: { backgroundColor: color.accent.base },
  buttonSecondary: { backgroundColor: color.surface[2], borderWidth: 1, borderColor: color.border.default },
  buttonPrimaryText: { ...font.bodyStrong, color: color.text.onAccent },
  buttonSecondaryText: { ...font.bodyStrong, color: color.text.primary },
  // Die Sterne verteilen sich über die volle Feldbreite, damit die Zeile
  // rechts nicht ausfranst.
  starRow: {
    flexDirection: 'row', minHeight: CONTROL_HEIGHT,
    alignItems: 'center', justifyContent: 'space-between',
  },
  starHit: { paddingHorizontal: 1, justifyContent: 'center' },
  star: { fontSize: 17, lineHeight: 21, color: color.text.disabled },
  starOn: { color: color.rating.average },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 44, gap: space[3],
  },
  // Gleicher Stil wie die Feldbeschriftungen — der Schalter ist eine Angabe
  // wie jede andere.
  toggleLabel: { ...font.label, textTransform: 'uppercase', flex: 1 },
  toggleTrack: {
    width: 44, height: 26, borderRadius: 13, padding: 2,
    backgroundColor: color.surface[3],
    borderWidth: 1, borderColor: color.border.default,
    justifyContent: 'center',
  },
  toggleTrackOn: { backgroundColor: color.accent.base, borderColor: color.accent.base },
  toggleKnob: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: color.text.secondary,
  },
  toggleKnobOn: { backgroundColor: '#FFFFFF', alignSelf: 'flex-end' },
  disclaimer: {
    fontSize: 11,
    lineHeight: 16,
    color: color.text.muted,
    maxWidth: 620,
    textAlign: 'center',
    alignSelf: 'center',
  },
  chip: {
    borderRadius: radius.pill, borderWidth: 1, borderColor: color.border.default,
    paddingHorizontal: 10, paddingVertical: 3, backgroundColor: color.surface[2],
  },
  chipText: { fontSize: 11, fontWeight: '600', color: color.text.secondary },
});
