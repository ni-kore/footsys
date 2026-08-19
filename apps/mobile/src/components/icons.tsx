import React from 'react';
import { Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import FansSvg from '../../../../assets/icons/fans.svg';
import GloveSvg from '../../../../assets/icons/glove.svg';
import GoalSvg from '../../../../assets/icons/goal.svg';
import BootSvg from '../../../../assets/icons/soccer-shoes.svg';
import StopwatchSvg from '../../../../assets/icons/stopwatch.svg';
import redCard from '../../../../assets/icons/red-card.png';

/**
 * Die Symbole aus assets/icons. Sie tragen die Markenfarbe bereits in sich,
 * hier wird nur noch die Größe gesetzt.
 */
export function GoalIcon({ size = 16 }: { size?: number }) {
  return <GoalSvg width={size} height={size} />;
}

export function AssistIcon({ size = 16 }: { size?: number }) {
  return <BootSvg width={size} height={size} />;
}

export function CleanSheetIcon({ size = 16 }: { size?: number }) {
  return <GloveSvg width={size} height={size} />;
}

export function AppsIcon({ size = 16 }: { size?: number }) {
  return <StopwatchSvg width={size} height={size} />;
}

export function FansIcon({ size = 16 }: { size?: number }) {
  return <FansSvg width={size} height={size} />;
}

/**
 * Ein Pfeil, der nach unten abknickt und nach rechts zeigt: der Spieler
 * kommt von woanders her und ist nur geliehen.
 */
export function LoanIcon({ size = 12, tone = '#8A8A99' }: { size?: number; tone?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <Path
        d="M3 2 V7.6 H8.4"
        stroke={tone} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M6.6 5.8 L8.8 7.6 L6.6 9.4"
        stroke={tone} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Die rote Karte. Sie ist hochkant, deshalb bestimmt `size` die Höhe und die
 * Breite folgt dem Seitenverhältnis der Vorlage (500 × 650).
 */
export function CardIcon({ size = 16 }: { size?: number }) {
  return (
    <Image
      source={redCard}
      style={{ width: (size * 500) / 650, height: size }}
      resizeMode="contain"
      accessibilityLabel="Red card"
    />
  );
}
