import React from 'react';
import {
  Image, Linking, Pressable, StyleSheet, Text, View,
  type StyleProp, type ViewStyle,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { LOCALES, LOCALE_LABEL } from '@footsys/engine';
import { color, font, meterColor, radius, space } from '../theme';
import { readableOn } from '../format';
import { clubBadges } from '../club-badges';
import { flagImages } from '../flags';
import { associationLogos } from '../association-logos';
import { partnerLogos } from '../partner-logos';
import kofiImage from '../../../../assets/ui/kofi.png';
import { LoanIcon } from './icons';
import { useCountUp } from './motion';
import { useLocale, useT } from '../i18n';

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
export function Flag({ code, size = 18, muted }: {
  code: string;
  size?: number;
  /** Blass, solange die Entscheidung für dieses Land nicht gefallen ist. */
  muted?: boolean;
}) {
  const image = flagImages[code];
  if (!image) {
    return <Text style={[styles.flagFallback, { fontSize: size * 0.6 }]}>{code}</Text>;
  }
  return (
    <Image
      source={image}
      style={{
        width: size * 1.5, height: size, borderRadius: 2,
        backgroundColor: color.surface[2],
        opacity: muted ? 0.3 : 1,
      }}
      resizeMode="cover"
      accessibilityLabel={code}
    />
  );
}

/**
 * Balkenanzeige aus der Design-Referenz. Die Stufenzahl ist frei: Meter der
 * Karriere laufen über fünf, die Vereinsreputation über zehn.
 */
export function Meter({ value, label, steps = 5, fill }: {
  value: number; label?: string; steps?: number;
  /** Streckt die Stufen über die volle verfuegbare Breite. */
  fill?: boolean;
}) {
  const filled = Math.round((value / 100) * steps);
  const tone = meterColor(value);
  return (
    <View style={fill ? { flex: 1 } : undefined}>
      {label ? <Label>{label}</Label> : null}
      <View style={styles.meterRow}>
        {Array.from({ length: steps }, (_, i) => (
          <View
            key={i}
            style={[
              styles.meterSegment,
              steps > 5 && styles.meterSegmentNarrow,
              fill && styles.meterSegmentFill,
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
export function StatCard({
  value, label, tint, size = 'normal', icon, inlineIcon, grow, filled, count, format, style,
}: {
  value?: string | number;
  label: string;
  tint?: string;
  size?: 'normal' | 'wide' | 'hero';
  /** Wappen oder Flagge über dem Wert. */
  icon?: React.ReactNode;
  /**
   * Symbol neben dem Wert statt darüber. Die Karte bleibt damit so flach wie
   * eine ohne Symbol, und ob eines da ist, ändert nichts an ihrer Höhe.
   */
  inlineIcon?: React.ReactNode;
  /** Füllt die Breite im Raster statt sich an den Inhalt zu schmiegen. */
  grow?: boolean;
  /** Fläche in der Stufenfarbe statt nur der Rand. */
  filled?: boolean;
  /** Zahl, die bei jeder Änderung weich auf den neuen Stand zählt. */
  count?: number;
  format?: (value: number) => string;
  style?: StyleProp<ViewStyle>;
}) {
  const counted = useCountUp(count ?? 0);
  const shown = count === undefined
    ? value
    : format
      ? format(counted)
      : String(Math.round(counted));

  const front = filled && tint ? readableOn(tint) : tint;
  // Die Spitzenstufe bekommt eine hellere, breitere Kante — dieselbe Karte,
  // aber sie liegt sichtbar eine Stufe höher.
  const elite = isEliteTint(tint);

  return (
    <View
      style={[
        styles.statCard,
        size === 'wide' && styles.statCardWide,
        grow && styles.statCardGrow,
        size === 'hero' && styles.statCardHero,
        tint ? { borderColor: tint } : null,
        filled && tint ? { backgroundColor: tint } : null,
        elite && styles.statCardElite,
        style,
      ]}
    >
      {icon ? <View style={styles.statCardIcon}>{icon}</View> : null}
      <View style={styles.statCardLine}>
        {inlineIcon}
        <Text
          style={[
            styles.statCardValue,
            size === 'hero' && styles.statCardValueHero,
            front ? { color: front } : null,
          ]}
          numberOfLines={1}
        >
          {shown}
        </Text>
      </View>
      <Text style={[styles.statCardLabel, filled && front ? { color: front, opacity: 0.72 } : null]}>
        {label}
      </Text>
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
/**
 * Die Stufe einer Wertkarte, wie man sie von Sammelkarten kennt.
 *
 * Bronze, Silber, Gold — und darüber eine eigene Stufe für die Spitze. Ab 85
 * wird das Gold heller und die Karte bekommt eine zweite, noch hellere Kante:
 * ein Ausnahmespieler soll sich nicht nur um eine Zahl von einem sehr guten
 * unterscheiden.
 */
export function overallTint(overall: number): string {
  if (overall >= 85) return color.tier.elite;
  if (overall >= 75) return color.tier.gold;
  if (overall >= 65) return color.tier.silver;
  return color.tier.bronze;
}

export function valueTint(marketValue: number): string {
  if (marketValue >= 50_000_000) return color.tier.elite;
  if (marketValue >= 10_000_000) return color.tier.gold;
  if (marketValue >= 1_000_000) return color.tier.silver;
  return color.tier.bronze;
}

/** Ab hier trägt die Karte die helle Kante der Spitzenstufe. */
export function isEliteTint(tint?: string): boolean {
  return tint === color.tier.elite;
}

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

/**
 * Wappen eines Verbands.
 *
 * Die Nationalmannschaft ist der Verband, nicht das Land, deshalb steht hier
 * sein Wappen und nicht die Flagge. Für Verbände ohne hinterlegtes Wappen
 * bleibt die Flagge stehen, damit die Stelle nie leer ist.
 */
export function AssociationMark({ code, size = 16 }: { code: string; size?: number }) {
  const logo = associationLogos[code];
  if (!logo) return <Flag code={code} size={Math.round(size * 0.85)} />;
  return (
    <Image
      source={logo}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel={code}
    />
  );
}

/**
 * Logo eines Partners.
 *
 * Die Vorlagen kommen aus aller Welt und sind unterschiedlich gebaut: manche
 * hell, viele schwarz auf durchsichtig. Auf dem dunklen Untergrund der App
 * wären die schwarzen unsichtbar, deshalb steht jedes Logo auf einer hellen
 * Fläche, so wie auf einem Trikotärmel.
 */
export function PartnerLogo({ partnerId, light, size = 30 }: {
  partnerId: string;
  /** Helles Logo: dann steht es auf dunklem Grund. */
  light?: boolean;
  size?: number;
}) {
  const logo = partnerLogos[partnerId];
  if (!logo) return null;
  return (
    <View
      style={[
        styles.partnerLogo,
        light && styles.partnerLogoDark,
        { height: size, width: size * 1.9 },
      ]}
    >
      <Image
        source={logo}
        style={{ width: '100%', height: '100%' }}
        resizeMode="contain"
        accessibilityLabel={partnerId}
      />
    </View>
  );
}

/**
 * Der Verein, wie er überall steht: Wappen, voller Name, darunter die Liga
 * und darunter, sobald gespielt wurde, die eigene Rolle in der Mannschaft.
 */
export function ClubBlock({
  clubId, name, colors, abbr, league, leagueCode, status, statusTone, loan, badgeSize = 30, style,
}: {
  clubId?: string;
  name: string;
  colors: [string, string];
  abbr: string;
  league?: string;
  /** Land der Liga: davor steht dann seine Fahne. */
  leagueCode?: string;
  status?: string;
  statusTone?: string;
  /** Beschriftung des Leihkennzeichens, etwa "On loan from Girona". */
  loan?: string;
  badgeSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.clubBlock, style]}>
      {/* Der abknickende Pfeil sagt vor dem Wappen: hier ist der Spieler nur
          zu Gast. Dieselbe Sprache wie in der Saisontabelle. */}
      {loan ? <View style={styles.clubBlockArrow}><LoanIcon size={12} /></View> : null}
      <ClubBadge clubId={clubId} colors={colors} abbr={abbr} size={badgeSize} />
      <View style={styles.clubBlockText}>
        <Text style={styles.clubBlockName}>{name}</Text>
        {league ? (
          <View style={styles.clubBlockLeague}>
            {/* Eine kleine Fahne sagt vor dem Namen, in welchem Land die Liga
                spielt. */}
            {leagueCode ? <Flag code={leagueCode} size={12} /> : null}
            <Text style={styles.clubBlockLine}>{league}</Text>
          </View>
        ) : null}
      </View>
      {loan ? (
        <View style={styles.clubBlockLoan}>
          <Text style={styles.clubBlockLoanText}>{loan}</Text>
        </View>
      ) : null}
      {/* Die eigene Rolle steht rechts im Kasten, auf halber Höhe zwischen
          Vereinsname und Liga. */}
      {status ? (
        <Text
          style={[styles.clubBlockStatus, statusTone ? { color: statusTone } : null]}
          numberOfLines={1}
        >
          {status}
        </Text>
      ) : null}
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

const GITHUB_URL = 'https://github.com/ni-kore/footsys';
const KOFI_URL = 'https://ko-fi.com/X7X41TZDHJ';
// Das Ko-fi-Bild ist 580x146; bei Höhe 34 bleibt es unverzerrt und bleibt unter
// der Höhe des Logos (44), sitzt also sauber auf einer Linie mit ihm.
const KOFI_HEIGHT = 34;
const KOFI_WIDTH = Math.round(KOFI_HEIGHT * (580 / 146));
const brandLogo = require('../../../../assets/footsys-icon.png');

/**
 * Die beiden Verweise: das GitHub-Zeichen zum Quelltext und der Ko-fi-Knopf zur
 * Unterstützung. Beide Bilder liegen im Projekt; zur Laufzeit wird nichts
 * nachgeladen.
 */
function HeaderLinks() {
  return (
    <View style={styles.headerLinks}>
      <LanguageSelector />
      <Pressable
        onPress={() => { void Linking.openURL(GITHUB_URL); }}
        accessibilityRole="link"
        accessibilityLabel="footsys on GitHub"
        hitSlop={10}
        style={({ pressed }) => [pressed && styles.linkPressed]}
      >
        <Svg width={30} height={30} viewBox="0 0 16 16">
          <Path
            fillRule="evenodd"
            clipRule="evenodd"
            fill={color.text.secondary}
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
          />
        </Svg>
      </Pressable>

      <Pressable
        onPress={() => { void Linking.openURL(KOFI_URL); }}
        accessibilityRole="link"
        accessibilityLabel="Buy me a coffee at ko-fi.com"
        hitSlop={10}
        style={({ pressed }) => [pressed && styles.linkPressed]}
      >
        <Image
          source={kofiImage}
          style={{ width: KOFI_WIDTH, height: KOFI_HEIGHT }}
          resizeMode="contain"
        />
      </Pressable>
    </View>
  );
}

/**
 * Die Sprachauswahl: drei Kürzel nebeneinander, das gewählte hervorgehoben.
 * Sie steht links neben den Verweisen, also oben rechts in der Kopfzeile.
 */
function LanguageSelector() {
  const { locale, setLocale } = useLocale();
  return (
    <View style={styles.langSelector} accessibilityRole="radiogroup" accessibilityLabel="Language">
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <Pressable
            key={code}
            onPress={() => setLocale(code)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={LOCALE_LABEL[code]}
            style={({ pressed }) => [
              styles.langOption,
              active && styles.langOptionActive,
              pressed && !active && styles.linkPressed,
            ]}
          >
            <Text style={[styles.langText, active && styles.langTextActive]}>
              {code.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Kopfzeile mit Logo und Namen links, den Verweisen rechtsbündig. Sie steht am
 * Anfang jeder Ansicht: beim Anlegen des Spielers, beim Start der Karriere und
 * über der laufenden Karriere. Rechts die Sprachauswahl und die Verweise.
 */
export function BrandHeader({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.brandHeader, style]}>
      <Image source={brandLogo} style={styles.brandLogo} resizeMode="contain" />
      <Text style={styles.brandWordmark}>footsys</Text>
      {/* marginLeft:auto drückt die Verweise an den rechten Rand; wird es zu
          eng, rutschen sie in eine zweite Zeile und bleiben dort rechtsbündig. */}
      <HeaderLinks />
    </View>
  );
}

/**
 * Rechtlicher Hinweis zu den Vereinsnamen. Steht am unteren Rand dort, wo eine
 * Karriere beginnt, während sie läuft und wo sie endet.
 */
export function Disclaimer() {
  const { t } = useT();
  return <Text style={styles.disclaimer}>{t('disclaimer')}</Text>;
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
  meterSegmentFill: { flex: 1, width: undefined },
  meterSegmentNarrow: { width: 5, height: 14 },
  statCard: {
    minWidth: 62, paddingHorizontal: space[2], paddingVertical: space[1],
    borderRadius: radius.md,
    backgroundColor: color.surface[2],
    borderWidth: 1, borderColor: color.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  statCardWide: { minWidth: 84, flexBasis: 116 },
  statCardHero: { minWidth: 104, paddingVertical: space[3] },
  // Die Spitzenstufe: hellere Kante um das ohnehin hellere Gold.
  statCardElite: { borderWidth: 2, borderColor: color.tier.eliteEdge },
  statCardGrow: { flexGrow: 1, flexBasis: 74, paddingVertical: space[2] },
  statCardIcon: { marginBottom: 2 },
  statCardLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statCardValue: { fontSize: 17, fontWeight: '700', color: color.text.primary },
  statCardValueHero: { fontSize: 21, letterSpacing: -0.3 },
  statCardLabel: { ...font.micro, textTransform: 'uppercase', marginTop: -1 },
  partnerLogoDark: { backgroundColor: color.bg.root, borderWidth: 1, borderColor: color.border.default },
  partnerLogo: {
    backgroundColor: '#F2F2F4',
    borderRadius: radius.sm,
    padding: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  clubBlock: {
    flexDirection: 'row', alignItems: 'center', gap: space[3], flexWrap: 'wrap',
    paddingHorizontal: space[3], paddingVertical: space[2],
    minHeight: 54,
    backgroundColor: color.surface[2],
    borderRadius: radius.md,
    borderWidth: 1, borderColor: color.border.default,
  },
  clubBlockText: { flex: 1, gap: 1, minWidth: 120 },
  clubBlockArrow: { width: 12, flexShrink: 0, marginRight: -space[1] },
  clubBlockName: { fontSize: 15, fontWeight: '700', color: color.text.primary },
  clubBlockLoan: {
    borderRadius: radius.pill, borderWidth: 1, borderColor: color.border.default,
    paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0,
  },
  clubBlockLoanText: { ...font.micro, textTransform: 'uppercase' },
  clubBlockLeague: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  clubBlockLine: { ...font.micro, textTransform: 'uppercase' },
  clubBlockStatus: { ...font.micro, textTransform: 'uppercase', textAlign: 'right' },
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
  brandHeader: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    rowGap: space[2], flexWrap: 'wrap', alignSelf: 'stretch',
  },
  brandLogo: { width: 44, height: 44, borderRadius: 10 },
  brandWordmark: { fontSize: 30, fontWeight: '700', color: color.text.primary, letterSpacing: -0.8 },
  headerLinks: {
    flexDirection: 'row', alignItems: 'center', gap: space[4],
    flexShrink: 0, marginLeft: 'auto',
  },
  langSelector: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    padding: 2, borderRadius: radius.md,
    backgroundColor: color.surface[2],
    borderWidth: 1, borderColor: color.border.default,
  },
  langOption: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  langOptionActive: { backgroundColor: color.accent.subtle },
  langText: { ...font.micro, color: color.text.secondary, letterSpacing: 0.5 },
  langTextActive: { color: color.accent.onSubtle, fontWeight: '700' },
  linkPressed: { opacity: 0.6 },
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
