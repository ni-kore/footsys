import React, { useCallback, useRef, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import {
  acknowledge, createCareer, decide, kickOff,
  type CareerState, type GameData, type GameMode, type PlayerIdentity,
} from '@footsys/engine';
import { freshGameData } from './src/game-data';
import { installWebStyles } from './src/web-styles';
import { color } from './src/theme';
import { seasonLabel } from './src/format';
import { IdentityScreen } from './src/screens/IdentityScreen';
import { DecisionScreen } from './src/screens/DecisionScreen';
import { CareerStartScreen } from './src/screens/CareerStartScreen';
import { KickoffScreen } from './src/screens/KickoffScreen';
import { CareerLayout } from './src/components/CareerLayout';
import { ReportScreen } from './src/screens/ReportScreen';
import { EndScreen } from './src/screens/EndScreen';

/**
 * footsys.
 *
 * Immer genau ein Bildschirm. Die Engine hält nach jedem Schritt an, und erst
 * eine Eingabe bringt den nächsten: Identität → Entscheidung → Bericht →
 * Entscheidung → … → Karriereende. Die Karriereübersicht liegt darüber und
 * unterbricht den Ablauf nicht.
 */
installWebStyles();

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

  const choose = useCallback((choice: string | string[]) => {
    const data = dataRef.current;
    setState((current) => (current && data ? decide(data, current, choice) : current));
  }, []);

  const advance = useCallback(() => {
    const data = dataRef.current;
    setState((current) => (current && data ? acknowledge(data, current) : current));
  }, []);

  const startSeason = useCallback(() => {
    const data = dataRef.current;
    setState((current) => (current && data ? kickOff(data, current) : current));
  }, []);

  const restart = useCallback(() => {
    setState(null);
  }, []);

  const data = dataRef.current;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={color.bg.root} />
      <SafeAreaView style={styles.root}>
        {renderScreen()}
      </SafeAreaView>
    </View>
  );

  function renderScreen() {
    if (!state || !data) return <IdentityScreen onStart={start} />;
    if (state.retired) return <EndScreen data={data} state={state} onRestart={restart} />;

    // Der Auftakt liegt über allem: dort gibt es noch keinen Verein und
    // damit auch noch keine Spielerkarte.
    const academy = state.pendingSet[0];
    if (academy?.eventId === 'academy_offer') {
      return (
        <CareerStartScreen data={data} state={state} decision={academy} onChoose={choose} />
      );
    }

    // Alles Laufende teilt sich dieselbe Fläche: links die Spielerkarte,
    // rechts das, was gerade ansteht.
    return (
      <CareerLayout data={data} state={state}>
        {state.pendingKickoff ? (
          <KickoffScreen data={data} state={state} onStart={startSeason} />
        ) : state.pendingReport ? (
          <ReportScreen data={data} report={state.pendingReport} onContinue={advance} />
        ) : state.pendingSet.length > 0 ? (
          <DecisionScreen
            key={state.step}
            data={data}
            decisions={state.pendingSet}
            startLabel={startLabel(state)}
            onConfirm={choose}
          />
        ) : null}
      </CareerLayout>
    );
  }
}

/**
 * Was am Ende der Pause passiert: entweder geht es in die Rückrunde, oder eine
 * neue Saison beginnt. Über das Karriereende wird gesondert entschieden.
 */
function startLabel(state: CareerState): string {
  if (state.pendingSet.some((decision) => decision.eventId === 'retirement')) return 'Confirm';
  if (state.half === 2) return 'Into the second half';
  return 'Into season ' + seasonLabel(state.year);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.canvas },
});
