import React, { createContext, useContext, useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { color, font, radius, space } from '../theme';

/** Die gemessene Stelle, an der der Hinweis hängt, in Fensterkoordinaten. */
export interface TooltipAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Api {
  show: (text: string, anchor: TooltipAnchor) => void;
  hide: () => void;
}

const TooltipContext = createContext<Api>({ show: () => {}, hide: () => {} });

/** Zugriff für alles, was einen Hinweis zeigen möchte. */
export function useTooltip(): Api {
  return useContext(TooltipContext);
}

/**
 * Eine einzige Ebene für alle Hinweise, ganz oben in der Anwendung.
 *
 * Ein Hinweis, der neben seinem Element liegt, wird von der nächsten Zeile
 * verdeckt oder vom Rand einer rollenden Fläche abgeschnitten. Deshalb wird er
 * nicht dort gezeichnet, wo er hingehört, sondern hier: über allem, außerhalb
 * jeder Fläche, an der gemessenen Stelle des Elements.
 */
export function TooltipHost({ children }: { children: React.ReactNode }) {
  const [tip, setTip] = useState<{ text: string; anchor: TooltipAnchor } | null>(null);
  const api = useMemo<Api>(
    () => ({
      show: (text, anchor) => setTip({ text, anchor }),
      hide: () => setTip(null),
    }),
    [],
  );

  return (
    <TooltipContext.Provider value={api}>
      {children}
      {tip ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Bubble text={tip.text} anchor={tip.anchor} />
        </View>
      ) : null}
    </TooltipContext.Provider>
  );
}

/**
 * Der Hinweis selbst: über dem Element, mittig, mit einer kleinen Spitze nach
 * unten. Ist oben kein Platz, klappt er darunter und die Spitze mit.
 */
function Bubble({ text, anchor }: { text: string; anchor: TooltipAnchor }) {
  const screen = useWindowDimensions();
  const [size, setSize] = useState({ width: 0, height: 0 });

  const gap = 8;
  const above = anchor.y - size.height - gap >= 4;
  const top = above ? anchor.y - size.height - gap : anchor.y + anchor.height + gap;

  const centre = anchor.x + anchor.width / 2;
  const left = clamp(centre - size.width / 2, 8, Math.max(8, screen.width - size.width - 8));
  // Die Spitze bleibt am Element, auch wenn die Blase am Rand ausweichen musste.
  const arrow = clamp(centre - left - 5, 8, Math.max(8, size.width - 18));

  return (
    <View
      onLayout={(event) => setSize(event.nativeEvent.layout)}
      style={[
        styles.bubble,
        { top, left },
        // Vor der ersten Messung steht die Blase noch falsch: dann unsichtbar.
        size.width === 0 && styles.hidden,
      ]}
    >
      <Text style={styles.text} numberOfLines={1}>{text}</Text>
      <View style={[styles.arrow, { left: arrow }, above ? styles.arrowDown : styles.arrowUp]} />
    </View>
  );
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    paddingHorizontal: space[2], paddingVertical: 5,
    backgroundColor: color.surface[3],
    borderRadius: radius.sm,
    borderWidth: 1, borderColor: color.border.strong,
    shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  hidden: { opacity: 0 },
  text: {
    ...font.micro, color: color.text.primary,
    textTransform: 'none', letterSpacing: 0, whiteSpace: 'nowrap',
  } as never,
  // Ein auf die Ecke gestelltes Quadrat: zwei Kanten stehen aus der Blase
  // heraus, der Rest verschwindet dahinter.
  arrow: {
    position: 'absolute', width: 10, height: 10,
    backgroundColor: color.surface[3],
    borderColor: color.border.strong,
    transform: [{ rotate: '45deg' }],
  },
  arrowDown: { bottom: -6, borderRightWidth: 1, borderBottomWidth: 1 },
  arrowUp: { top: -6, borderLeftWidth: 1, borderTopWidth: 1 },
});
