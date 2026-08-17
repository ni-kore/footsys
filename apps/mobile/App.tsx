import React, { useCallback, useRef, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import {
  createCareer, decide,
  type CareerState, type GameData, type GameMode, type PlayerIdentity,
} from '@footsys/engine';
import { freshGameData } from './src/game-data';
import { color } from './src/theme';
import { StartScreen } from './src/screens/StartScreen';
import { CareerScreen } from './src/screens/CareerScreen';
import { EndScreen } from './src/screens/EndScreen';
import { DecisionSheet } from './src/screens/DecisionSheet';

/**
 * footsys.
 *
 * Die Engine hält den gesamten Spielstand; die App ist nur Anzeige und
 * Eingabe. Jede Entscheidung erzeugt einen neuen Zustand — es wird nichts
 * an Ort und Stelle verändert.
 */
export default function App() {
  const dataRef = useRef<GameData | null>(null);
  const [state, setState] = useState<CareerState | null>(null);

  const start = useCallback((identity: PlayerIdentity, mode: GameMode) => {
    // Frische Daten je Karriere: Auf- und Abstiege verändern die Vereine.
    const data = freshGameData();
    dataRef.current = data;
    const seed = `${identity.surname}-${Date.now()}`;
    setState(createCareer(data, { seed, mode, identity, startYear: 2026 }));
  }, []);

  const choose = useCallback((optionId: string) => {
    const data = dataRef.current;
    setState((current) => (current && data ? decide(data, current, optionId) : current));
  }, []);

  const restart = useCallback(() => setState(null), []);

  const data = dataRef.current;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={color.bg.root} />
      <SafeAreaView style={styles.root}>
        {!state || !data ? (
          <StartScreen onStart={start} />
        ) : state.retired ? (
          <EndScreen data={data} state={state} onRestart={restart} />
        ) : (
          <>
            <CareerScreen data={data} state={state} />
            {state.pending ? (
              <DecisionSheet data={data} decision={state.pending} onChoose={choose} />
            ) : null}
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.canvas },
});
