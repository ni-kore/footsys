import React, { useRef, useState } from 'react';
import {
  Platform, ScrollView, StyleSheet, View,
  type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type ViewStyle,
} from 'react-native';
import { color, radius } from '../theme';

/**
 * Scrollbereich mit eigener Bildlaufleiste.
 *
 * Die System-Leiste passt nicht zum dunklen Design und sieht auf jeder
 * Plattform anders aus. Deshalb wird sie ausgeblendet und der Balken selbst
 * gezeichnet — aus Scrollposition und Inhaltshöhe.
 */
export function ScrollArea({ children, style, contentStyle, snapInterval }: {
  children: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  /** Zeilenhöhe, auf die eingerastet wird. */
  snapInterval?: number;
}) {
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [offset, setOffset] = useState(0);
  const scrollable = contentHeight > viewportHeight + 1;
  const trackRef = useRef<View>(null);

  const thumbHeight = scrollable
    ? Math.max(28, (viewportHeight / contentHeight) * viewportHeight)
    : 0;
  const maxOffset = Math.max(1, contentHeight - viewportHeight);
  const thumbTop = scrollable
    ? (Math.min(offset, maxOffset) / maxOffset) * (viewportHeight - thumbHeight)
    : 0;

  return (
    <View style={[styles.wrapper, style]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onLayout={(e: LayoutChangeEvent) => setViewportHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_w, h) => setContentHeight(h)}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) =>
          setOffset(e.nativeEvent.contentOffset.y)}
        contentContainerStyle={contentStyle}
        nestedScrollEnabled
        // Auf nativen Geräten rastet die Liste über snapToInterval ein, im
        // Browser über die Regeln aus web-styles.ts. Im Browser stören die
        // nativen Eigenschaften das Mausrad, deshalb bleiben sie dort weg.
        {...(snapInterval && Platform.OS !== 'web'
          ? { snapToInterval: snapInterval, decelerationRate: 'fast' as const }
          : {})}
        {...({ dataSet: { snapList: 'true' } } as object)}
      >
        {children}
      </ScrollView>

      {scrollable ? (
        <View style={styles.track} pointerEvents="none" ref={trackRef}>
          <View style={[styles.thumb, { height: thumbHeight, top: thumbTop }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', overflow: 'hidden' },
  track: {
    position: 'absolute', right: 2, top: 4, bottom: 4, width: 4,
    borderRadius: radius.pill, backgroundColor: color.surface[2],
  },
  thumb: {
    position: 'absolute', left: 0, right: 0,
    borderRadius: radius.pill, backgroundColor: color.border.strong,
  },
});
