import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { color } from '../theme';

/**
 * Text mit hervorgehobenen Namen.
 *
 * Die Engine sagt, welche Namen sie in den Text gesetzt hat: Vereine, Länder,
 * Positionen. Hier werden sie in der Akzentfarbe gezeigt, damit man auf einen
 * Blick sieht, worum es geht, ohne den Satz zu zerreißen.
 */
export function Highlighted({ text, terms, style }: {
  text: string;
  terms: string[];
  style?: StyleProp<TextStyle>;
}) {
  const names = [...new Set(terms)].filter(Boolean).sort((a, b) => b.length - a.length);
  if (names.length === 0) return <Text style={style}>{text}</Text>;

  const pattern = new RegExp('(' + names.map(escapeName).join('|') + ')', 'g');

  return (
    <Text style={style}>
      {text.split(pattern).map((piece, index) => (
        names.includes(piece)
          ? <Text key={index} style={{ color: color.accent.base, fontWeight: '600' }}>{piece}</Text>
          : <Text key={index}>{piece}</Text>
      ))}
    </Text>
  );
}

/** Namen können Zeichen enthalten, die in einem Muster etwas bedeuten. */
function escapeName(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}
