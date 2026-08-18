import React, { useCallback, useRef, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import {
  acknowledge, createCareer, decide, kickOff,
  type CareerState, type GameData, type GameMode, type PlayerIdentity,
} from '@footsys/engine';
import { freshGameData } from './src/game-data';
import { installWebStyles } from './src/web-styles';
import { color } from './src/theme';
import { IdentityScreen } from './src/screens/IdentityScreen';
import { DecisionScreen } from './src/screens/DecisionScreen';
import { CareerStartScreen } from './src/screens/CareerStartScreen';
import { KickoffScreen } from './src/screens/KickoffScreen';
import { CareerLayout } from './src/components/CareerLayout';
import { ReportScreen } from './src/screens/ReportScreen';
import { CareerScreen } from './src/screens/CareerScreen';
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
  const [careerOpen, setCareerOpen] = useState(false);

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
    setCareerOpen(false);
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

    if (careerOpen) {
      return <CareerScreen data={data} state={state} onClose={() => setCareerOpen(false)} />;
    }

    // Der Auftakt liegt über allem: dort gibt es noch keinen Verein und
    // damit auch noch keine Spielerkarte.
    if (state.pending?.eventId === 'academy_offer') {
      return (
        <CareerStartScreen data={data} state={state} decision={state.pending} onChoose={choose} />
      );
    }

    // Alles Laufende teilt sich dieselbe Fläche: links die Spielerkarte,
    // rechts das, was gerade ansteht.
    return (
      <CareerLayout data={data} state={state} onOpenCareer={() => setCareerOpen(true)}>
        {state.pendingKickoff ? (
          <KickoffScreen data={data} state={state} onStart={startSeason} />
        ) : state.pendingReport ? (
          <ReportScreen data={data} report={state.pendingReport} onContinue={advance} />
        ) : state.pending ? (
          <DecisionScreen data={data} decision={state.pending} onChoose={choose} />
        ) : null}
      </CareerLayout>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg.canvas },
});
