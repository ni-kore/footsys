import React, { useMemo, useState } from 'react';
import {
  Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View,
} from 'react-native';
import type { GameMode, PlayerIdentity, PositionId } from '@footsys/engine';
import { staticData } from '../game-data';
import { breakpointFor, color, font, radius, space } from '../theme';
import {
  Button, Card, CONTROL_HEIGHT, Disclaimer, Flag, Label, Segmented, Stars, Toggle,
} from '../components/ui';
import { ScrollArea } from '../components/ScrollArea';
import { Pitch } from '../components/Pitch';
import ranking from '../../../../data/core/fifa-ranking.json';

const logo = require('../../../../assets/footsys-icon.png');

/** Vorbelegung, damit das Spielfeld sofort besetzt ist. */
const DEFAULT_FORMATION = '4-2-3-1';

/**
 * Wie oft die Simulation anhält. Die Beschreibungen stehen in den Daten, die
 * Reihenfolge hier: von der ausführlichen Laufbahn bis zum Durchlauf am Stück.
 */
const PACES: GameMode[] = ['normal', 'fast', 'very_fast', 'instant'];

/**
 * Der erste Bildschirm: aus wenigen Angaben entsteht eine ganze Laufbahn.
 *
 * Die Reihenfolge ist bewusst so gewählt — erst die Formation, dann die
 * Position. Die Formation entscheidet, welche Plätze es überhaupt gibt, und
 * wirkt später auf Tore, Vorlagen und Zu-Null-Spiele.
 */
export function IdentityScreen({ onStart }: {
  onStart: (identity: PlayerIdentity, mode: GameMode) => void;
}) {
  const { width } = useWindowDimensions();
  const twoColumn = breakpointFor(width) !== 'compact';

  const [surname, setSurname] = useState('');
  const [number, setNumber] = useState('10');
  const [foot, setFoot] = useState<'left' | 'right'>('right');
  const [weakFoot, setWeakFoot] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [nationality, setNationality] = useState('GER');
  const [dualNationality, setDualNationality] = useState(false);
  const [secondNationality, setSecondNationality] = useState<string | null>(null);
  const [formationId, setFormationId] = useState(DEFAULT_FORMATION);
  const [position, setPosition] = useState<PositionId | null>(null);
  const [showAllNations, setShowAllNations] = useState(false);
  const [pace, setPace] = useState<GameMode>('normal');

  const formations = useMemo(
    () => staticData.formations.filter((f) => f.selectable),
    [],
  );
  // Es ist immer ein System gewählt.
  const formation = formations.find((f) => f.id === formationId) ?? formations[0]!;

  // Alle Positionen stehen immer offen — die Formation schränkt sie nicht ein.
  // Der Libero bleibt draußen, er gehört zu einem System, das es nicht mehr gibt.
  const pitchPositions = useMemo(
    () => staticData.positions.filter((position) => position.id !== 'SW'),
    [],
  );

  // Alle FIFA-Nationen. Wo es keine eigenen Vereine gibt, sucht die Engine
  // das erste Angebot in der Konföderation — genau wie im echten Fußball, wo
  // Talente aus kleinen Verbänden früh ins Ausland gehen.
  const nations = useMemo(() => {
    const order = new Map((ranking.top as string[]).map((code, index) => [code, index]));

    return [...staticData.countries].sort((a, b) => {
      const rankA = order.get(a.code) ?? Number.MAX_SAFE_INTEGER;
      const rankB = order.get(b.code) ?? Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      return a.name.en.localeCompare(b.name.en);
    });
  }, []);

  const [showAllSecond, setShowAllSecond] = useState(false);
  const pitchWidth = Math.min(twoColumn ? 340 : width - space[4] * 4, 360);
  const ready = surname.trim().length >= 2
    && position !== null
    && (!dualNationality || secondNationality !== null);

  const identityCard = (
    <Card style={[styles.section, twoColumn && styles.cardStretch]}>
      <Text style={font.title}>Who are you?</Text>

      {/* Name, Nummer und Fuß sind drei kurze Angaben — sie stehen
          nebeneinander und brechen erst um, wenn es wirklich zu eng wird. */}
      <View style={styles.row}>
        <View style={[styles.field, styles.nameField]}>
          <Label>Name</Label>
          <TextInput
            value={surname}
            onChangeText={setSurname}
            placeholder="Name"
            placeholderTextColor={color.text.disabled}
            style={styles.input}
            maxLength={20}
            autoCorrect={false}
          />
        </View>

        <View style={[styles.field, styles.numberField]}>
          <Label>No.</Label>
          <TextInput
            value={number}
            onChangeText={(text) => setNumber(text.replace(/\D/g, '').slice(0, 2))}
            keyboardType="number-pad"
            style={[styles.input, { textAlign: 'center' }]}
          />
        </View>

        <View style={[styles.field, styles.footField]}>
          <Label>Strong foot</Label>
          <Segmented
            value={foot}
            onChange={setFoot}
            options={[{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }]}
          />
        </View>

        <View style={[styles.field, styles.weakFootField]}>
          <Label>Weak foot</Label>
          <Stars value={weakFoot} onChange={(step) => setWeakFoot(step as 1 | 2 | 3 | 4 | 5)} />
        </View>
      </View>

      {/* Beide Listen teilen sich den Platz, der nach den festen Elementen
          übrig bleibt. Ohne zweiten Pass bekommt die erste alles — und der
          Schalter rutscht dadurch an den unteren Rand der Karte. */}
      <View style={[styles.field, twoColumn && styles.grow]}>
        <Label>Nationality</Label>
        <NationPicker
          nations={nations}
          selected={nationality}
          exclude={secondNationality}
          showAll={showAllNations}
          onShowAll={() => setShowAllNations(true)}
          onSelect={setNationality}
          rows={dualNationality ? NATION_ROWS_DUAL : NATION_ROWS}
          flexible={twoColumn}
        />
      </View>

      <Toggle
        label="Second nationality"
        value={dualNationality}
        onChange={(on) => {
          setDualNationality(on);
          if (!on) setSecondNationality(null);
        }}
      />

      {dualNationality ? (
        <View style={[styles.field, twoColumn && styles.grow]}>
          <NationPicker
            nations={nations}
            selected={secondNationality}
            exclude={nationality}
            showAll={showAllSecond}
            onShowAll={() => setShowAllSecond(true)}
            onSelect={setSecondNationality}
            rows={NATION_ROWS_DUAL}
            flexible={twoColumn}
          />
        </View>
      ) : null}
    </Card>
  );

  const tacticsCard = (
    <Card style={[styles.section, twoColumn && styles.cardStretch]}>
      <Text style={font.title}>Where do you play?</Text>

      <View style={styles.field}>
        <Label>Favourite formation</Label>
        <View style={styles.formationGrid}>
          {formations.map((item) => {
            const active = item.id === formationId;
            return (
              <Pressable
                key={item.id}
                onPress={() => setFormationId(item.id)}
                style={[styles.formation, active && styles.formationActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.formationLabel, active && { color: color.accent.onSubtle }]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <Label>Your position</Label>
        <Pitch
          positions={pitchPositions}
          value={position}
          onChange={setPosition}
          width={pitchWidth}
        />
        <Text style={[font.caption, { textAlign: 'center', marginTop: space[2] }]}>
          {position
            ? staticData.positionById.get(position)?.name.en
            : 'Tap your position on the pitch.'}
        </Text>
      </View>

    </Card>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.bg.canvas }}
      contentContainerStyle={[styles.content, { maxWidth: 1100, alignSelf: 'center', width: '100%' }]}
    >
      <View style={styles.header}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.wordmark}>footsys</Text>
      </View>

      <View style={twoColumn ? styles.twoColumn : undefined}>
        <View style={{ flex: 1 }}>{identityCard}</View>
        <View style={{ flex: 1 }}>{tacticsCard}</View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          {/* Links die Gangart, rechts der Start: beides gehört zum selben
              Schritt und steht deshalb auf einer Linie. */}
          <View style={styles.pace}>
            <Label>Pace</Label>
            <View style={styles.formationGrid}>
              {PACES.map((id) => {
                const active = id === pace;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setPace(id)}
                    style={[styles.formation, active && styles.formationActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[styles.formationLabel, active && { color: color.accent.onSubtle }]}
                      numberOfLines={1}
                    >
                      {staticData.progression.career.modes[id].label.en as string}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Button
            label="Start career"
            disabled={!ready}
            onPress={() =>
              onStart(
                {
                  surname: surname.trim(),
                  shirtNumber: Number(number) || 10,
                  strongFoot: foot,
                  weakFoot,
                  nationality,
                  ...(dualNationality && secondNationality ? { secondNationality } : {}),
                  position: position!,
                  formationId: formation.id,
                },
                pace,
              )
            }
          />
        </View>

        <Text style={[font.caption, styles.footerNote]}>
          {ready
            ? staticData.progression.career.modes[pace].description.en as string
            : surname.trim().length < 2
              ? 'Enter a name to continue.'
              : position === null
                ? 'Choose your position on the pitch.'
                : 'Pick your second nationality.'}
        </Text>
      </View>

      <Disclaimer />
    </ScrollView>
  );
}

/** Die Länderliste — einmal für den Pass, einmal für den zweiten. */
function NationPicker({ nations, selected, exclude, showAll, onShowAll, onSelect, rows, flexible }: {
  nations: { code: string; name: { en: string } }[];
  selected: string | null;
  exclude: string | null;
  showAll: boolean;
  onShowAll: () => void;
  onSelect: (code: string) => void;
  /** Feste Zeilenzahl, wenn die Höhe nicht aus dem Layout kommt. */
  rows: number;
  /**
   * Nebeneinander hat die Karte eine feste Höhe. Dann misst die Liste den ihr
   * verbleibenden Platz und zeigt so viele ganze Zeilen, wie hineinpassen —
   * nie eine halbe.
   */
  flexible?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [space_, setSpace] = useState(0);
  const term = search.trim().toLowerCase();

  const fittingRows = flexible && space_ > 0
    ? Math.max(2, Math.floor(space_ / NATION_ROW_HEIGHT))
    : rows;

  // Das im anderen Feld gewählte Land bleibt in der Liste stehen, nur
  // ausgegraut. Würde es verschwinden, rutschten alle folgenden Länder eine
  // Position weiter — und man klickt beim nächsten Mal daneben.
  const matching = term
    ? nations.filter((country) => country.name.en.toLowerCase().includes(term))
    : nations;

  // Beim Suchen ist die Kürzung sinnlos — man sucht ja gerade das, was nicht
  // unter den ersten sechzehn steht.
  // Die eigene Wahl steht immer ganz oben — so sieht man sie auch dann,
  // wenn sie eigentlich weit hinten in der Rangliste stünde.
  const ordered = selected
    ? [...matching].sort((a, b) => Number(b.code === selected) - Number(a.code === selected))
    : matching;

  const visible = term || showAll ? ordered : ordered.slice(0, TOP_COUNT);
  const total = nations.length;

  return (
    <View style={[{ gap: space[2] }, flexible && { flex: 1 }]}>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search nation"
        placeholderTextColor={color.text.disabled}
        style={styles.input}
        autoCorrect={false}
      />
      {/* Der Rahmen bekommt seine Höhe vom Flex-Layout, die Liste darin liegt
          absolut darüber. Damit kann die Liste die Höhe ihres Rahmens nicht
          beeinflussen — sonst entsteht eine Rückkopplung, die beim Umschalten
          einen Frame lang die halbe Seite aufbläht. */}
      <View
        style={flexible ? { flex: 1, overflow: 'hidden' } : undefined}
        onLayout={(event) => setSpace(event.nativeEvent.layout.height)}
      >
      <ScrollArea
        style={flexible
          ? {
              position: 'absolute', top: 0, left: 0, right: 0,
              ...(space_ === 0 ? { bottom: 0 } : { height: NATION_ROW_HEIGHT * fittingRows }),
            }
          : { height: NATION_ROW_HEIGHT * fittingRows }}
        contentStyle={styles.nationGrid}
        snapInterval={NATION_ROW_HEIGHT}
      >
      {visible.map((country) => {
          const active = country.code === selected;
          const blocked = country.code === exclude;
          return (
            <Pressable
              key={country.code}
              onPress={() => onSelect(country.code)}
              disabled={blocked}
              style={[styles.nation, active && styles.nationActive, blocked && styles.nationBlocked]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, disabled: blocked }}
              {...({ dataSet: { snapItem: 'true' } } as object)}
            >
              <Flag code={country.code} size={16} />
              <Text
                style={[styles.nationName, active && styles.nationNameActive]}
                numberOfLines={1}
              >
                {country.name.en}
              </Text>
              {active ? <Text style={styles.nationCheck}>✓</Text> : null}
            </Pressable>
          );
        })}

      {matching.length === 0 ? (
        <Text style={[font.caption, { padding: space[2] }]}>No nation matches that.</Text>
      ) : null}

      {!term && !showAll && total > TOP_COUNT ? (
        <Pressable onPress={onShowAll} style={styles.showMore}>
          <Text style={styles.showMoreText}>Show more</Text>
        </Pressable>
      ) : null}
      </ScrollArea>
      </View>
    </View>
  );
}

/** So viele Nationen stehen ohne Aufklappen zur Wahl. */
const TOP_COUNT = 16;

/**
 * Höhe einer Länderzeile samt Abstand. Die sichtbare Höhe der Liste ist ein
 * ganzes Vielfaches davon — so steht am unteren Rand nie eine halbe Zeile.
 */
const NATION_ROW_HEIGHT = 44;

/**
 * Sichtbare Zeilen je Liste. Mit zweitem Pass stehen zwei Listen untereinander
 * — dann zeigt jede weniger, damit die Karte nicht höher wird als die
 * Spielfeldkarte daneben.
 */
const NATION_ROWS = 5;
const NATION_ROWS_DUAL = 3;

const styles = StyleSheet.create({
  content: { padding: space[4], paddingBottom: space[9], gap: space[4] },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    marginTop: space[5], marginBottom: space[3],
  },
  logo: { width: 44, height: 44, borderRadius: 10 },
  wordmark: { fontSize: 30, fontWeight: '700', color: color.text.primary, letterSpacing: -0.8 },
  // 'stretch' statt 'flex-start': nur so ziehen sich beide Spalten auf die
  // Höhe der höheren.
  twoColumn: { flexDirection: 'row', gap: space[4], alignItems: 'stretch' },
  section: { gap: space[4] },
  // Nebeneinander sollen beide Karten gleich hoch sein — die kürzere füllt
  // den Rest mit Leerraum, statt eine Stufe zu bilden.
  cardStretch: { flex: 1 },
  grow: { flex: 1 },
  field: { gap: space[2] },
  // Gleicher Abstand wie zwischen den Formationsschaltern; den Rest der
  // Breite nimmt das Namensfeld.
  row: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start',
    gap: space[2], rowGap: space[3],
  },
  // Der Name darf wachsen, aber nicht so weit, dass die Beidfüßigkeit
  // aus der Zeile fliegt.
  // Der Name nimmt den ganzen Rest der Zeile — der kleine Grundwert sorgt
  // dafür, dass die vier Felder überhaupt nebeneinander passen.
  nameField: { flexGrow: 1, flexShrink: 1, flexBasis: 78, minWidth: 74 },
  numberField: { width: 48 },
  footField: { flexGrow: 0, flexBasis: 124 },
  weakFootField: { width: 92 },
  input: {
    backgroundColor: color.surface[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border.default,
    color: color.text.primary,
    paddingHorizontal: space[3],
    minHeight: CONTROL_HEIGHT,
    fontSize: 15,
  },
  // Die Liste bekommt bewusst keinen eigenen Rahmen und keine Fläche — sie
  // steht direkt auf der Karte, nur die Auswahl hebt sich ab.
  nationGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingRight: space[3], rowGap: space[1], columnGap: space[1],
  },
  nation: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    width: '48%', height: NATION_ROW_HEIGHT - space[1],
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    // Der Rahmen ist immer da, nur unsichtbar — sonst springt die Zeile
    // beim Auswählen um einen Pixel.
    borderWidth: 1, borderColor: 'transparent',
  },
  nationActive: { borderColor: color.text.primary },
  nationBlocked: { opacity: 0.3 },
  nationName: { ...font.body, flexShrink: 1 },
  nationNameActive: { ...font.bodyStrong },
  nationCheck: { ...font.bodyStrong, marginLeft: 'auto' },
  showMore: {
    width: '100%', minHeight: NATION_ROW_HEIGHT - space[1],
    alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: color.surface[2],
    marginTop: space[1],
  },
  showMoreText: {
    ...font.label,
    textTransform: 'uppercase',
    color: color.accent.base,
  },
  formationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  formation: {
    minHeight: 38, paddingHorizontal: space[3], justifyContent: 'center',
    borderRadius: radius.md, backgroundColor: color.surface[2],
    borderWidth: 1, borderColor: color.border.default,
  },
  formationActive: { backgroundColor: color.accent.subtle, borderColor: color.accent.base },
  formationLabel: { ...font.bodyStrong, color: color.text.secondary },
  // Der Startknopf sitzt rechts — dort, wo der Blick nach dem Ausfüllen
  // der rechten Spalte ohnehin endet. Die Gangart steht ihm gegenüber.
  footer: { marginTop: space[2], gap: space[2] },
  footerRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', gap: space[4], flexWrap: 'wrap',
  },
  pace: { gap: space[2] },
  footerNote: { textAlign: 'right' },
});
