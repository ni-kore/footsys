import React, { useEffect, useRef, useState } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Bewegung.
 *
 * Zahlen springen nicht, sie zählen. Bildschirme wechseln nicht hart, sie
 * blenden über. Beides läuft über `requestAnimationFrame` beziehungsweise die
 * Animated-Schnittstelle und verhält sich auf Web und Gerät gleich.
 */

/**
 * Zählt weich auf den neuen Stand, in beide Richtungen.
 *
 * Große Sprünge laufen länger als kleine: ein Zuwachs von zehntausend auf zwei
 * Millionen soll das Gewicht bekommen, das ihm zusteht.
 */
export function useCountUp(target: number, duration = 1400): number {
  const [display, setDisplay] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const from = current.current;
    if (from === target) return;

    // Bis zum Doppelten der Grunddauer, je nach Größe des Sprungs.
    const magnitude = Math.min(1, Math.log10(1 + Math.abs(target - from)) / 6);
    const span = duration * (0.75 + magnitude);

    let frame = 0;
    const started = Date.now();
    const tick = () => {
      const progress = Math.min(1, (Date.now() - started) / span);
      // Zum Ende hin auslaufen, damit die letzte Ziffer nicht flackert.
      const eased = 1 - (1 - progress) ** 3;
      current.current = progress < 1 ? from + (target - from) * eased : target;
      setDisplay(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return display;
}

/**
 * Wechsel zwischen zwei Schritten: der alte Inhalt blendet ab, erst dann
 * kommt der neue von unten herein. Ohne das springt nach jeder Wahl sofort
 * ein anderer Bildschirm ins Bild.
 */
export function StepTransition({ stepKey, children, style }: {
  stepKey: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(stepKey);

  // Solange abgeblendet wird, bleibt der alte Inhalt stehen.
  const shown = useRef(children);
  if (visible === stepKey) shown.current = children;

  useEffect(() => {
    if (visible === stepKey) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(lift, { toValue: -10, duration: 220, useNativeDriver: true }),
    ]).start(() => setVisible(stepKey));
  }, [stepKey, visible, opacity, lift]);

  useEffect(() => {
    lift.setValue(14);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(lift, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [visible, opacity, lift]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY: lift }] }]}>
      {shown.current}
    </Animated.View>
  );
}

/** Blendet beim Erscheinen ein. Mit `delay` lassen sich Listen staffeln. */
export function Fade({ children, delay = 0, style }: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.timing(lift, { toValue: 0, duration: 380, delay, useNativeDriver: true }),
    ]).start();
  }, [opacity, lift, delay]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY: lift }] }]}>
      {children}
    </Animated.View>
  );
}

/**
 * Druckpunkt für Auswahlflächen: die Fläche gibt kurz nach. Erst danach
 * schaltet der nächste Schritt um.
 */
export function usePressScale() {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 26, bounciness: 5 }).start();
  return {
    scale,
    onPressIn: () => to(0.98),
    onPressOut: () => to(1),
  };
}
