import React from 'react';
import CardSvg from '../../../../assets/icons/card.svg';
import FansSvg from '../../../../assets/icons/fans.svg';
import GloveSvg from '../../../../assets/icons/glove.svg';
import GoalSvg from '../../../../assets/icons/goal.svg';
import BootSvg from '../../../../assets/icons/soccer-shoes.svg';

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

export function CardIcon({ size = 16 }: { size?: number }) {
  return <CardSvg width={size} height={size} />;
}

export function FansIcon({ size = 16 }: { size?: number }) {
  return <FansSvg width={size} height={size} />;
}
