import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CareerState, GameData } from '@footsys/engine';
import { seasonLabel } from '../format';
import { color, font, space } from '../theme';
import { Button, ClubBadge, Flag, Label } from '../components/ui';
import { useT } from '../i18n';

/**
 * Zwischen der Jugendakademie und dem ersten Spiel steht ein Moment: man
 * sieht, wo man gelandet ist, und pfeift selbst an. Das passiert genau einmal.
 * Jede weitere Saison beginnt mit der Entscheidung, die zu ihr geführt hat.
 */
export function KickoffScreen({ data, state, onStart }: {
  data: GameData;
  state: CareerState;
  onStart: () => void;
}) {
  const { t } = useT();
  const club = state.clubId ? data.clubById.get(state.clubId) : null;
  const league = club ? data.leagueById.get(club.league) : null;

  return (
    <View style={styles.screen}>
      <View style={{ gap: space[2] }}>
        <Label>{t('season')} {seasonLabel(state.year)}</Label>
        <Text style={styles.title}>{t('yourFirstSeason')}</Text>
      </View>

      {club ? (
        <View style={styles.club}>
          <ClubBadge clubId={club.id} colors={club.colors} abbr={club.abbr} size={56} />
          <View style={{ gap: 2, flex: 1 }}>
            <Text style={font.title}>{club.name}</Text>
            {/* Eine kleine Fahne vor dem Ligennamen sagt, in welchem Land
                gespielt wird. */}
            <View style={styles.leagueLine}>
              {league ? <Flag code={league.country} size={13} /> : null}
              <Text style={font.caption}>{league?.name ?? ''}</Text>
            </View>
          </View>
        </View>
      ) : null}

      <Text style={styles.lead}>{t('preSeasonOver')}</Text>

      <View style={{ alignItems: 'flex-start', marginTop: 'auto' }}>
        <Button label={t('startTheSeason')} onPress={onStart} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: space[4] },
  title: { fontSize: 26, fontWeight: '700', color: color.text.primary, letterSpacing: -0.4 },
  club: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  leagueLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lead: { ...font.body, color: color.text.secondary, lineHeight: 21 },
});
