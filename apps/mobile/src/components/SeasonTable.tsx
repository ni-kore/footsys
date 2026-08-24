import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  isNationalTitle, liveTotals, titleName, tr, trophyCabinet,
  type CareerState, type GameData,
} from '@footsys/engine';
import { fansDelta, readableOn } from '../format';
import { color, font, radius, space } from '../theme';
import { AssociationMark, Card, ClubBadge, Flag, Label, overallTint } from './ui';
import { Trophy } from './Trophy';
import { useT } from '../i18n';
import { trophyArt } from '../trophy-art';
import { AppsIcon, AssistIcon, CleanSheetIcon, FansIcon, GoalIcon, LoanIcon } from './icons';

/** Eine Zeile der Tabelle, egal ob abgeschlossene oder laufende Saison. */
interface Row {
  key: string;
  age: number;
  clubId: string | null;
  loanFrom?: string | undefined;
  overall: number;
  appearances: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  /** Zuwachs an Anhängern in dieser Saison, nicht der Bestand. */
  fans: number;
  /** Was in dieser Saison gewonnen wurde. */
  titles: string[];
  /** Die laufende Saison steht blasser da, sie ist noch nicht entschieden. */
  running: boolean;
}

/**
 * Die Karriere Saison für Saison.
 *
 * Sie steht unter den beiden Flächen und wächst mit jedem Jahr nach unten.
 * Ganz am Ende der Liste die Summe über alles, und darunter noch einmal
 * getrennt, was für das Land zusammengekommen ist: das zählt nicht je Saison,
 * sondern über die ganze Laufbahn.
 */
export function SeasonTable({ data, state }: { data: GameData; state: CareerState }) {
  const { t, locale } = useT();
  const isKeeper = data.positionById.get(state.player.position)?.group === 'GK';
  const startFans = data.progression.fans.start as number;

  // Die Engine hält den Bestand am Saisonende fest. Der Zuwachs einer Saison
  // ist die Strecke zwischen zwei solchen Ständen.
  let previousFans = startFans;
  const rows: Row[] = state.seasons.map((season) => {
    const row: Row = {
      key: 'season:' + season.year,
      age: season.age,
      clubId: season.clubId,
      loanFrom: season.loanFrom,
      overall: season.overall,
      appearances: season.appearances,
      goals: season.goals,
      assists: season.assists,
      cleanSheets: season.cleanSheets,
      fans: season.fans - previousFans,
      titles: [...season.titles, ...season.awards].filter((id) => !isNationalTitle(data, id)),
      running: false,
    };
    previousFans = season.fans;
    return row;
  });

  // Die laufende Saison bekommt eine eigene Zeile, sobald es eine gibt.
  if (!state.retired) {
    const running = state.currentSeasonHalves.reduce(
      (sum, half) => ({
        appearances: sum.appearances + half.appearances,
        goals: sum.goals + half.goals,
        assists: sum.assists + half.assists,
        cleanSheets: sum.cleanSheets + half.cleanSheets,
      }),
      { appearances: 0, goals: 0, assists: 0, cleanSheets: 0 },
    );
    const choosing = state.pendingSet.some((d) => d.options.some((o) => o.clubId));
    rows.push({
      key: 'running',
      age: state.player.age,
      clubId: choosing ? null : state.clubId,
      ...(state.activeLoan ? { loanFrom: state.activeLoan.parentClubId } : {}),
      overall: state.player.overall,
      ...running,
      fans: state.player.fans - previousFans,
      titles: [],
      running: true,
    });
  }

  // Grob geschätzte Textbreite: lieber etwas zu viel Platz als ein Name, der
  // umbricht.
  const clubWidth = Math.max(
    150,
    ...rows.map((row) => {
      const club = row.clubId ? data.clubById.get(row.clubId) : null;
      const label = club ? club.short : t('choosingClub');
      return 26 + label.length * 7.6 + (row.loanFrom ? 88 : 0);
    }),
  );
  const clubColumn = { minWidth: clubWidth };

  // Titel mit der Nationalmannschaft, über die ganze Laufbahn gezählt.
  const nationalTitles = [...trophyCabinet(state).entries()]
    .filter(([id]) => isNationalTitle(data, id));

  const totals = liveTotals(state);
  const passports = [state.player.nationality, state.player.secondNationality]
    .filter((code): code is string => !!code);
  const nationalTeam = state.player.nationalTeam
    ? data.countryByCode.get(state.player.nationalTeam)
    : null;

  return (
    <Card style={styles.card}>
      <Label>{t('seasonBySeason')}</Label>

      {/* Sieben Spalten passen auf ein Telefon nicht nebeneinander. Statt
          etwas abzuschneiden, lässt sich die Tabelle seitlich schieben; auf
          breiten Geräten füllt sie die Fläche wie vorher. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.table}
      >
        <View style={styles.tableInner}>
        <View style={styles.head}>
        <Text style={[styles.cellAge, styles.headText]}>{t('age')}</Text>
        <Text style={[styles.cellClub, clubColumn, styles.headText]}>{t('club')}</Text>
        <Text style={[styles.cellOverall, styles.headText, styles.centred]}>{t('ovr')}</Text>
        <Text style={[styles.cellNumber, styles.headText, styles.centred]}>{t('colApps')}</Text>
        <Text style={[styles.cellNumber, styles.headText, styles.centred]}>
          {isKeeper ? t('colSheets') : t('colGoals')}
        </Text>
        <Text style={[styles.cellNumber, styles.headText, styles.centred]}>{t('colAst')}</Text>
        <Text style={[styles.cellFans, styles.headText, styles.centred]}>{t('colFans')}</Text>
      </View>

      {rows.map((row) => {
        const club = row.clubId ? data.clubById.get(row.clubId) : null;
        const tint = overallTint(row.overall);
        const played = !row.running || row.appearances > 0;
        return (
          <View key={row.key} style={[styles.row, row.running && styles.rowRunning]}>
            <View style={styles.cellAge}>
              <View style={styles.ageBox}>
                <Text style={styles.ageText}>{row.age}</Text>
              </View>
            </View>

            <View style={[styles.cellClub, clubColumn, styles.clubCell]}>
              {/* Der abknickende Pfeil sagt vor dem Wappen: hier ist der
                  Spieler nur zu Gast. */}
              {row.loanFrom ? (
                <View style={styles.loanArrow}><LoanIcon size={12} tone={color.text.muted} /></View>
              ) : null}
              {club ? (
                <ClubBadge clubId={club.id} colors={club.colors} abbr={club.abbr} size={18} />
              ) : (
                <View style={styles.noBadge}><Text style={styles.noBadgeText}>?</Text></View>
              )}
              <Text style={[styles.clubName, !club && styles.clubNameMuted]}>
                {club ? club.short : t('choosingClub')}
              </Text>
              {row.loanFrom ? (
                <View style={styles.loan}><Text style={styles.loanText}>{t('onLoan')}</Text></View>
              ) : null}
              {/* Was in dieser Saison gewonnen wurde, direkt neben dem Verein.
                  Über die Jahre wird die Liste damit zur Chronik. */}
              {row.titles.map((id) => (
                <Trophy key={id} art={trophyArt(data, id)} size={18} label={titleName(data, id, locale)} />
              ))}
            </View>

            <View style={styles.cellOverall}>
              <View style={[styles.overallPill, { backgroundColor: tint }]}>
                <Text style={[styles.overallText, { color: readableOn(tint) }]}>
                  {Math.round(row.overall)}
                </Text>
              </View>
            </View>

            {/* Das Symbol steht direkt am Wert, so wie in den Wertkarten. */}
            <View style={styles.cellNumber}>
              {played ? <AppsIcon size={12} /> : null}
              <Text style={styles.number}>{played ? row.appearances : ''}</Text>
            </View>
            <View style={styles.cellNumber}>
              {played ? (isKeeper ? <CleanSheetIcon size={12} /> : <GoalIcon size={12} />) : null}
              <Text style={styles.number}>
                {played ? (isKeeper ? row.cleanSheets : row.goals) : ''}
              </Text>
            </View>
            <View style={styles.cellNumber}>
              {played ? <AssistIcon size={12} /> : null}
              <Text style={styles.number}>{played ? row.assists : ''}</Text>
            </View>
            <View style={styles.cellFans}>
              {played ? <FansIcon size={12} /> : null}
              <Text style={[styles.number, row.fans < 0 && styles.negative]}>
                {played ? fansDelta(row.fans) : ''}
              </Text>
            </View>
          </View>
        );
      })}

      {/* Die Summe rutscht mit jeder Saison weiter nach unten. */}
      <View style={[styles.row, styles.totalRow]}>
        <View style={styles.cellAge} />
        <View style={[styles.cellClub, clubColumn]} />
        <View style={styles.cellOverall} />
        <View style={styles.cellNumber}>
          <AppsIcon size={12} />
          <Text style={styles.number}>{totals.appearances}</Text>
        </View>
        <View style={styles.cellNumber}>
          {isKeeper ? <CleanSheetIcon size={12} /> : <GoalIcon size={12} />}
          <Text style={styles.number}>{isKeeper ? totals.cleanSheets : totals.goals}</Text>
        </View>
        <View style={styles.cellNumber}>
          <AssistIcon size={12} />
          <Text style={styles.number}>{totals.assists}</Text>
        </View>
        <View style={styles.cellFans}>
          <FansIcon size={12} />
          <Text style={styles.number}>{fansDelta(state.player.fans - startFans)}</Text>
        </View>
      </View>

      {/* Das Land zählt getrennt: dort spielt man über die Jahre hinweg. Die
          Pässe stehen dort, wo sonst das Wappen steht, und bleiben blass, bis
          die Wahl gefallen ist. */}
      <View style={[styles.row, styles.nationalRow]}>
        <View style={styles.cellAge} />
        <View style={[styles.cellClub, clubColumn, styles.clubCell]}>
          {/* Vor der Entscheidung stehen die Pässe zur Wahl, danach das
              Wappen des Verbands, für den man aufläuft. */}
          {nationalTeam ? (
            <AssociationMark code={nationalTeam.code} size={18} />
          ) : (
            <View style={styles.nationalFlags}>
              {passports.map((code, index) => (
                <React.Fragment key={code}>
                  {index > 0 ? <Text style={styles.flagSlash}>/</Text> : null}
                  <Flag code={code} size={14} muted />
                </React.Fragment>
              ))}
            </View>
          )}
          {nationalTeam ? (
            <Text style={styles.clubName}>{tr(nationalTeam.name, locale)}</Text>
          ) : null}
          {/* Was mit der Nationalmannschaft gewonnen wurde, steht hier und
              nicht beim Verein. */}
          {nationalTitles.map(([id, count]) => (
            <Trophy key={id} art={trophyArt(data, id)} size={18} count={count} label={titleName(data, id, locale)} />
          ))}
        </View>
        <View style={styles.cellOverall} />
        <View style={styles.cellNumber}>
          <AppsIcon size={12} />
          <Text style={styles.number}>{state.player.caps}</Text>
        </View>
        <View style={styles.cellNumber}>
          <GoalIcon size={12} />
          <Text style={styles.number}>{state.player.nationalGoals}</Text>
        </View>
        <View style={styles.cellNumber}>
          <AssistIcon size={12} />
          <Text style={styles.number}>{state.player.nationalAssists}</Text>
        </View>
        <View style={styles.cellFans}>
          <FansIcon size={12} />
          <Text style={styles.number}>{fansDelta(state.player.nationalFans)}</Text>
        </View>
      </View>
        </View>
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 0, paddingVertical: space[3] },
  table: { flexGrow: 1, minWidth: 500 },
  tableInner: { flex: 1 },

  head: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    paddingVertical: space[2], marginTop: space[2],
    borderBottomWidth: 1, borderBottomColor: color.border.subtle,
  },
  headText: { ...font.micro, textTransform: 'uppercase' },
  centred: { textAlign: 'center' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    minHeight: 38,
    borderBottomWidth: 1, borderBottomColor: color.border.subtle,
  },
  // Die laufende Saison ist noch offen und steht deshalb zurückhaltender da.
  rowRunning: { opacity: 0.75 },

  cellAge: { width: 30 },
  cellClub: { flex: 1, minWidth: 150 },
  cellOverall: { width: 40, alignItems: 'center' },
  cellNumber: {
    width: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  // Der Zuwachs an Fans wird schnell sechsstellig, die Spalte braucht Luft.
  cellFans: {
    width: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },

  // Das Alter ist eine Angabe, keine Auszeichnung: neutral statt grün.
  ageBox: {
    width: 28, height: 22, borderRadius: radius.sm,
    backgroundColor: color.surface[3],
    alignItems: 'center', justifyContent: 'center',
  },
  ageText: { fontSize: 12, fontWeight: '700', color: color.text.secondary },

  clubCell: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  loanArrow: { width: 12, flexShrink: 0 },
  clubName: { ...font.bodyStrong, flex: 1, minWidth: 28 },
  clubNameMuted: { color: color.text.muted, fontWeight: '400' },
  noBadge: {
    width: 18, height: 18, borderRadius: 5,
    backgroundColor: color.surface[3],
    alignItems: 'center', justifyContent: 'center',
  },
  noBadgeText: { fontSize: 11, fontWeight: '700', color: color.text.muted },
  // Als eigene Fläche steht die Leihe sauber auf halber Zeilenhöhe.
  loan: {
    borderRadius: radius.pill, borderWidth: 1, borderColor: color.border.default,
    paddingHorizontal: 7, paddingVertical: 2,
    flexShrink: 0,
  },
  loanText: { ...font.micro, textTransform: 'uppercase' },
  // Zwei Pässe stehen so breit wie ein Wappen, damit die Spalte nicht wandert.
  nationalFlags: { flexDirection: 'row', alignItems: 'center', gap: 3, minWidth: 18 },
  flagSlash: { fontSize: 12, color: color.text.muted },

  overallPill: {
    minWidth: 34, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: radius.pill, alignItems: 'center',
  },
  overallText: { fontSize: 12, fontWeight: '700' },

  number: { ...font.bodyStrong, textAlign: 'center' },
  negative: { color: color.status.negative },

  // Summe und Land sitzen abgesetzt unter der Liste.
  totalRow: { borderBottomWidth: 0, borderTopWidth: 2, borderTopColor: color.border.default, minHeight: 40 },
  nationalRow: { borderTopWidth: 1, borderTopColor: color.border.subtle, minHeight: 34 },
});
