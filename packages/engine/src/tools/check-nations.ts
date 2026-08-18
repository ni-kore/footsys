/** Prüft, dass jede Nation einen spielbaren Karrierestart bekommt. */
import { createCareer } from '../career';
import { loadGameData } from '../data-node';

const data = loadGameData();
const problems: string[] = [];

for (const country of data.countries) {
  try {
    const state = createCareer(data, {
      seed: 'check-' + country.code,
      mode: 'normal',
      identity: {
        surname: 'Test', shirtNumber: 9, strongFoot: 'right', weakFoot: 3,
        nationality: country.code, position: 'ST', formationId: '4-2-3-1',
      },
    });
    const options = state.pending?.options ?? [];
    if (options.length < 3) problems.push(`${country.code}: nur ${options.length} Angebote`);
  } catch (error) {
    problems.push(`${country.code}: ${(error as Error).message}`);
  }
}

console.log(`${data.countries.length} Nationen geprüft`);
console.log(problems.length === 0 ? 'Alle bekommen drei Jugendangebote' : problems.join('\n'));

const sample = ['FIJ', 'NEP', 'SUD', 'ISL'];
for (const code of sample) {
  const state = createCareer(data, {
    seed: 'sample-' + code, mode: 'normal',
    identity: { surname: 'T', shirtNumber: 9, strongFoot: 'right', weakFoot: 3, nationality: code, position: 'ST', formationId: '4-2-3-1' },
  });
  const offers = (state.pending?.options ?? [])
    .map((o) => data.clubById.get(o.clubId!)?.short)
    .join(', ');
  console.log(`  ${code} → ${offers}`);
}
