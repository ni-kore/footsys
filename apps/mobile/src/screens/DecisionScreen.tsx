import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View,
  type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';
import type { Club, GameData, PendingDecision } from '@footsys/engine';
import { color, font, radius, space } from '../theme';
import { Button, ClubBadge, Label, Meter, PartnerLogo } from '../components/ui';
import { Fade, usePressScale } from '../components/motion';

const WINDOW_LABEL: Record<PendingDecision['window'], string> = {
  start: 'Career start',
  winter: 'Winter break',
  summer: 'Summer break',
};

/** Abstand zwischen zwei Karten, damit die nächste nicht hereinlugt. */
const GUTTER = space[3];

/**
 * Die Entscheidungen einer Pause, als Stapel nebeneinander.
 *
 * Man zieht die Karte nach links oder rechts, wählt in jeder eine Möglichkeit
 * und kann jede Wahl wieder ändern. Erst der Anpfiff unten macht sie
 * verbindlich und schickt die Mannschaft auf den Platz. Manchmal steht nur
 * eine Entscheidung an, dann fehlen die Punkte und es gibt nichts zu ziehen.
 */
export function DecisionScreen({ data, decisions, startLabel, onConfirm }: {
  data: GameData;
  decisions: PendingDecision[];
  /** Beschriftung des Knopfes, der die Pause beendet. */
  startLabel: string;
  onConfirm: (optionIds: string[]) => void;
}) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState<(string | null)[]>(() => decisions.map(() => null));
  const scroller = useRef<ScrollView>(null);

  // Der Ziehgriff wird einmal gebaut und sieht deshalb keine Zustandswerte.
  // Er liest sie stattdessen aus diesen Merkern.
  const widthRef = useRef(0);
  const indexRef = useRef(0);
  const grabbedAt = useRef(0);

  const complete = choices.every((choice) => choice !== null);
  const current = decisions[index];

  const goTo = (target: number) => {
    const clamped = Math.max(0, Math.min(decisions.length - 1, target));
    indexRef.current = clamped;
    setIndex(clamped);
    scroller.current?.scrollTo({ x: clamped * widthRef.current, animated: true });
  };

  const choose = (page: number, optionId: string) => {
    setChoices((previous) => previous.map((old, i) => (i === page ? optionId : old)));
    // Nach der Wahl weiterblättern, solange noch etwas offen ist.
    const nextOpen = decisions.findIndex((_, i) => i !== page && choices[i] === null);
    if (nextOpen >= 0) setTimeout(() => goTo(nextOpen), 260);
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    widthRef.current = next;
    setWidth(next);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (widthRef.current <= 0) return;
    const page = Math.round(event.nativeEvent.contentOffset.x / widthRef.current);
    if (page !== indexRef.current) {
      indexRef.current = page;
      setIndex(page);
    }
  };

  /**
   * Ziehen mit der Maus.
   *
   * Auf dem Gerät zieht man mit dem Finger, das kann die Liste von selbst.
   * Am Schreibtisch gibt es keine Berührung, deshalb hängt hier ein Griff
   * direkt am Element: aufsetzen, ziehen, loslassen, und beim Loslassen
   * rastet die nächste Karte ein.
   */
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const view = scroller.current as unknown as { getScrollableNode?: () => HTMLElement } | null;
    const node = view?.getScrollableNode?.();
    if (!node) return;

    let startX = 0;
    let startScroll = 0;
    let dragging = false;

    const move = (event: MouseEvent) => {
      if (!dragging) return;
      event.preventDefault();
      node.scrollLeft = startScroll - (event.clientX - startX);
    };

    const up = (event: MouseEvent) => {
      if (!dragging) return;
      dragging = false;
      node.style.userSelect = '';
      const travelled = event.clientX - startX;
      const threshold = widthRef.current * 0.2;
      let target = indexRef.current;
      if (travelled < -threshold) target += 1;
      else if (travelled > threshold) target -= 1;
      goTo(target);
    };

    const down = (event: MouseEvent) => {
      if (event.button !== 0) return;
      dragging = true;
      startX = event.clientX;
      startScroll = node.scrollLeft;
      // Sonst markiert der Zug den Text der Karte.
      node.style.userSelect = 'none';
    };

    node.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      node.removeEventListener('mousedown', down);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [width]);

  return (
    <View style={styles.screen}>
      <View style={styles.head}>
        <Label>{current ? WINDOW_LABEL[current.window] : ''}</Label>
        {decisions.length > 1 ? (
          <View style={styles.steps}>
            {decisions.map((decision, i) => (
              <Pressable
                key={decision.eventId}
                onPress={() => goTo(i)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={'Decision ' + (i + 1)}
              >
                <View
                  style={[
                    styles.step,
                    choices[i] !== null && styles.stepChosen,
                    i === index && styles.stepCurrent,
                  ]}
                />
              </Pressable>
            ))}
            <Text style={styles.stepText}>{index + 1} of {decisions.length}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.deck} onLayout={onLayout}>
        {width > 0 ? (
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            snapToInterval={width}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={32}
          >
            {decisions.map((decision, page) => (
              <View key={decision.eventId} style={{ width }}>
                <DecisionCard
                  data={data}
                  decision={decision}
                  chosen={choices[page] ?? null}
                  onChoose={(optionId) => choose(page, optionId)}
                />
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Button
          label={startLabel}
          disabled={!complete}
          onPress={() => onConfirm(choices.map((choice) => choice ?? ''))}
        />
      </View>
    </View>
  );
}

/**
 * Eine einzelne Entscheidung: der Sachverhalt und die Möglichkeiten dazu.
 * Sie steht in einem eigenen Rahmen, mit Abstand zu ihren Nachbarn.
 */
function DecisionCard({ data, decision, chosen, onChoose }: {
  data: GameData;
  decision: PendingDecision;
  chosen: string | null;
  onChoose: (optionId: string) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={{ gap: space[2] }}>
        <Text style={styles.title}>{decision.title.en}</Text>
        <Text style={styles.lead}>{decision.text}</Text>
      </View>

      <View style={styles.options}>
        {decision.options.map((option, index) => (
          <Fade key={option.id} delay={60 + index * 60}>
            <Option
              label={option.label.en}
              selected={chosen === option.id}
              {...(option.subtitle ? { subtitle: option.subtitle } : {})}
              {...(option.tag ? { tag: option.tag } : {})}
              {...(option.clubId ? { club: data.clubById.get(option.clubId) } : {})}
              {...(option.partnerId
                ? {
                    partnerId: option.partnerId,
                    partnerLight: data.partnerById.get(option.partnerId)?.light ?? false,
                  }
                : {})}
              onPress={() => onChoose(option.id)}
            />
          </Fade>
        ))}
      </View>
    </View>
  );
}

/** Eine Wahlmöglichkeit. Sie gibt unter dem Finger kurz nach. */
function Option({ label, subtitle, tag, club, partnerId, partnerLight, selected, onPress }: {
  label: string;
  subtitle?: string;
  /** Kurzes Kennzeichen links neben der Reputation. */
  tag?: string;
  club?: Club | undefined;
  partnerId?: string;
  partnerLight?: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const press = usePressScale();

  return (
    <Animated.View style={{ transform: [{ scale: press.scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={({ pressed }) => [
          styles.option,
          pressed && styles.optionPressed,
          selected && styles.optionSelected,
        ]}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
      >
        {club ? (
          <ClubBadge clubId={club.id} colors={club.colors} abbr={club.abbr} size={44} />
        ) : partnerId ? (
          <PartnerLogo partnerId={partnerId} light={partnerLight} size={30} />
        ) : (
          <View style={[styles.bullet, selected && styles.bulletSelected]} />
        )}

        <View style={{ flex: 1, gap: 3 }}>
          <Text style={font.bodyStrong}>{label}</Text>
          {subtitle ? <Text style={font.caption}>{subtitle}</Text> : null}
        </View>

        {/* Was die Wahl bedeutet, steht als Kennzeichen davor: bleiben,
            wechseln oder auf Leihbasis gehen. */}
        {tag ? (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ) : null}

        {club ? (
          <View style={styles.reputation}>
            <Text style={styles.reputationLabel}>Reputation</Text>
            <Meter value={club.reputation.domestic * 10} steps={10} />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: space[4] },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  steps: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  step: { width: 18, height: 4, borderRadius: 2, backgroundColor: color.surface[3] },
  stepChosen: { backgroundColor: color.accent.base },
  stepCurrent: { height: 6, borderRadius: 3 },
  stepText: { ...font.micro, marginLeft: space[1] },

  // Der Stapel richtet sich nach der höchsten Karte. Mit flex:1 fiele er in
  // der einspaltigen Ansicht auf null zusammen.
  deck: { alignSelf: 'stretch' },
  // Eigener Rahmen wie bei den Flächen der Spielerkarte, dazu der Abstand,
  // der die Nachbarkarte aus dem Bild hält.
  card: {
    gap: space[4],
    marginHorizontal: GUTTER / 2,
    padding: space[3],
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: color.border.default,
  },
  title: { fontSize: 22, fontWeight: '700', color: color.text.primary, letterSpacing: -0.4 },
  lead: { ...font.body, color: color.text.secondary, lineHeight: 21 },

  options: { gap: space[2] },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    minHeight: 66, padding: space[3],
    backgroundColor: color.surface[2],
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: color.border.default,
  },
  optionPressed: { backgroundColor: color.surface[3] },
  // Die getroffene Wahl bleibt sichtbar, bis der Anpfiff sie festschreibt.
  optionSelected: { borderColor: color.accent.base, backgroundColor: color.accent.subtle },
  bullet: {
    width: 10, height: 10, borderRadius: 5, marginHorizontal: 14,
    backgroundColor: color.surface[3],
  },
  bulletSelected: { backgroundColor: color.accent.base },
  tag: {
    borderRadius: radius.pill, borderWidth: 1, borderColor: color.border.default,
    paddingHorizontal: 8, paddingVertical: 3, marginRight: space[2], flexShrink: 0,
  },
  tagText: { ...font.micro, textTransform: 'uppercase' },
  reputation: { alignItems: 'flex-end', gap: 3 },
  reputationLabel: { ...font.micro, textTransform: 'uppercase' },

  footer: { alignItems: 'flex-start', marginTop: 'auto' },
});
