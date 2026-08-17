import React, { useMemo, useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View,
} from 'react-native';
import type { GameMode, PlayerIdentity, PositionId } from '@footsys/engine';
import { staticData } from '../game-data';
import { flag } from '../format';
import { breakpointFor, color, font, radius, space } from '../theme';
import { Button, Card, Label, Segmented } from '../components/ui';
import { Pitch } from '../components/Pitch';

/**
 * Karrierestart: die wenigen Variablen, aus denen eine ganze Laufbahn wird.
 */
export function StartScreen({ onStart }: {
  onStart: (identity: PlayerIdentity, mode: GameMode) => void;
}) {
  const { width } = useWindowDimensions();
  const breakpoint = breakpointFor(width);
  const twoColumn = breakpoint !== 'compact';

  const [surname, setSurname] = useState('');
  const [number, setNumber] = useState('10');
  const [foot, setFoot] = useState<'left' | 'right'>('right');
  const [nationality, setNationality] = useState('GER');
  const [position, setPosition] = useState<PositionId>('AM');
  const [mode, setMode] = useState<GameMode>('normal');
  const [search, setSearch] = useState('');

  // Nur Länder, für die es auch Vereine gibt — sonst startet die Karriere im
  // Nichts und der Spieler landet über die Konföderation im Ausland.
  const countries = useMemo(() => {
    const withClubs = new Set(
      staticData.leagues
        .filter((league) => (staticData.clubsByLeague.get(league.id)?.length ?? 0) > 0)
        .map((league) => league.country),
    );
    return staticData.countries
      .filter((c) => withClubs.has(c.code))
      .sort((a, b) => a.name.de.localeCompare(b.name.de, 'de'));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return countries;
    return countries.filter(
      (c) => c.name.de.toLowerCase().includes(term) || c.code.toLowerCase().includes(term),
    );
  }, [countries, search]);

  const pitchWidth = Math.min(twoColumn ? 320 : width - space[4] * 4, 340);
  const canStart = surname.trim().length >= 2;

  const identityCard = (
    <Card style={styles.section}>
      <Text style={font.title}>Identität</Text>

      <View style={styles.field}>
        <Label>Nachname</Label>
        <TextInput
          value={surname}
          onChangeText={setSurname}
          placeholder="Nachname"
          placeholderTextColor={color.text.disabled}
          style={styles.input}
          maxLength={20}
          autoCorrect={false}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.field, { flex: 1 }]}>
          <Label>Nummer</Label>
          <TextInput
            value={number}
            onChangeText={(text) => setNumber(text.replace(/\D/g, '').slice(0, 2))}
            keyboardType="number-pad"
            style={styles.input}
          />
        </View>
        <View style={[styles.field, { flex: 2 }]}>
          <Label>Starker Fuß</Label>
          <Segmented
            value={foot}
            onChange={setFoot}
            options={[{ value: 'left', label: 'Links' }, { value: 'right', label: 'Rechts' }]}
          />
        </View>
      </View>

      <View style={styles.field}>
        <Label>Nationalität</Label>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Land suchen"
          placeholderTextColor={color.text.disabled}
          style={styles.input}
        />
        <ScrollView style={styles.countryList} nestedScrollEnabled>
          {filtered.map((country) => {
            const active = country.code === nationality;
            return (
              <Pressable
                key={country.code}
                onPress={() => setNationality(country.code)}
                style={[styles.countryRow, active && styles.countryRowActive]}
              >
                <Text style={styles.flag}>{flag(country.code)}</Text>
                <Text style={[styles.countryName, active && { color: color.accent.onSubtle }]}>
                  {country.name.de}
                </Text>
                <Text style={styles.countryCode}>{country.code}</Text>
              </Pressable>
            );
          })}
          {filtered.length === 0 ? (
            <Text style={[font.caption, { padding: space[3] }]}>Kein Land gefunden.</Text>
          ) : null}
        </ScrollView>
      </View>
    </Card>
  );

  const positionCard = (
    <Card style={styles.section}>
      <Text style={font.title}>Position</Text>
      <Text style={[font.caption, { marginBottom: space[3] }]}>
        {staticData.positionById.get(position)?.name.de}
      </Text>
      <Pitch
        positions={staticData.positions.filter((p) => p.id !== 'SW')}
        value={position}
        onChange={setPosition}
        width={pitchWidth}
      />

      <View style={[styles.field, { marginTop: space[5] }]}>
        <Label>Entscheidungsdichte</Label>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'intense', label: 'Intensiv' },
            { value: 'normal', label: 'Normal' },
            { value: 'express', label: 'Express' },
          ]}
        />
        <Text style={[font.caption, { marginTop: space[2] }]}>
          {staticData.progression.career.modes[mode].description.de}
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
        <Text style={styles.wordmark}>footsys</Text>
        <Text style={font.caption}>
          Bau deine Karriere. Ein paar Angaben, danach entscheidest du.
        </Text>
      </View>

      <View style={twoColumn ? styles.twoColumn : undefined}>
        <View style={{ flex: 1 }}>{identityCard}</View>
        <View style={{ flex: 1 }}>{positionCard}</View>
      </View>

      <View style={styles.footer}>
        <Button
          label="Karriere starten"
          disabled={!canStart}
          onPress={() =>
            onStart(
              {
                surname: surname.trim(),
                shirtNumber: Number(number) || 10,
                strongFoot: foot,
                nationality,
                position,
              },
              mode,
            )
          }
        />
        {!canStart ? (
          <Text style={[font.caption, { marginTop: space[2] }]}>Gib zuerst einen Nachnamen ein.</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[4], paddingBottom: space[9], gap: space[4] },
  header: { gap: space[1], marginTop: space[4], marginBottom: space[2] },
  wordmark: { fontSize: 30, fontWeight: '700', color: color.text.primary, letterSpacing: -0.8 },
  twoColumn: { flexDirection: 'row', gap: space[4] },
  section: { gap: space[4] },
  field: { gap: space[1] },
  row: { flexDirection: 'row', gap: space[3] },
  input: {
    backgroundColor: color.surface[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border.default,
    color: color.text.primary,
    paddingHorizontal: space[3],
    minHeight: 40,
    fontSize: 15,
  },
  countryList: {
    maxHeight: 190,
    marginTop: space[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border.subtle,
    backgroundColor: color.surface[2],
  },
  countryRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    paddingHorizontal: space[3], minHeight: 44,
  },
  countryRowActive: { backgroundColor: color.accent.subtle },
  flag: { fontSize: 18 },
  countryName: { ...font.body, flex: 1 },
  countryCode: { ...font.micro },
  footer: { marginTop: space[2], alignItems: 'flex-start' },
});
