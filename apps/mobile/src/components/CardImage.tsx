import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { ClipPath, Defs, Image as SvgImage, Polygon } from 'react-native-svg';
import { eventImages } from '../event-images';

/**
 * Das Bild links an einer Antwortmöglichkeit.
 *
 * Die rechte Kante ist schräg abgeschnitten. Das nimmt der Zeile das
 * Formularhafte und gibt jeder Möglichkeit ein Gesicht, ohne dass die
 * Zeilenführung leidet.
 *
 * Der Schnitt läuft über einen Beschneidungspfad in SVG, damit er auf dem
 * Gerät genauso aussieht wie im Browser. Zu Arten ohne hinterlegtes Bild wird
 * nichts gezeigt: lieber keine Aufnahme als eine unpassende.
 */
export function CardImage({ motif, width = 86, height = 74 }: {
  motif?: string | undefined;
  width?: number;
  height?: number;
}) {
  const image = motif ? eventImages[motif] : undefined;
  if (!image) return null;

  // Wie weit die Kante nach innen läuft.
  const slant = Math.round(width * 0.3);

  return (
    <View style={[styles.frame, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <ClipPath id="cardCut">
            <Polygon points={`0,0 ${width},0 ${width - slant},${height} 0,${height}`} />
          </ClipPath>
        </Defs>
        <SvgImage
          href={image}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid slice"
          clipPath="url(#cardCut)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
});
