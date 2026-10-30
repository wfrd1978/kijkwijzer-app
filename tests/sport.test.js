import { describe, expect, it } from 'vitest';
import { naarRaces, komendeRaces, nlTijd } from '../src/sport.js';

const data = {
  MRData: { RaceTable: { Races: [
    {
      round: '19', raceName: 'Mexico City Grand Prix', date: '2026-11-01', time: '20:00:00Z',
      Circuit: { Location: { locality: 'Mexico City', country: 'Mexico' } },
      FirstPractice: { date: '2026-10-30', time: '18:30:00Z' },
      Qualifying: { date: '2026-10-31', time: '21:00:00Z' },
      Sprint: { date: '2026-10-31', time: '17:00:00Z' },
    },
    { round: '18', raceName: 'United States Grand Prix', date: '2026-10-25', time: '19:00:00Z', Circuit: { Location: { locality: 'Austin', country: 'USA' } } },
    { round: '20', raceName: 'Brazilian Grand Prix', date: '2026-11-08' },
  ] } },
};

describe('naarRaces', () => {
  it('zet races op volgorde, sessies op tijd en de race als laatste', () => {
    const races = naarRaces(data);
    expect(races.map((r) => r.ronde)).toEqual([18, 19, 20]);
    expect(races[1].naam).toBe('Mexico City GP');
    expect(races[1].sessies.map((s) => s.naam)).toEqual(['Vrije training 1', 'Sprintrace', 'Kwalificatie', 'Race']);
    expect(races[2].sessies[0].metTijd).toBe(false);
  });
});

describe('komendeRaces', () => {
  it('laat afgelopen races weg, maar een race die net bezig is niet', () => {
    const races = naarRaces(data);
    expect(komendeRaces(races, new Date('2026-10-27T12:00:00Z')).map((r) => r.ronde)).toEqual([19, 20]);
    expect(komendeRaces(races, new Date('2026-10-25T20:30:00Z')).map((r) => r.ronde)).toEqual([18, 19, 20]);
  });
});

describe('nlTijd', () => {
  it('toont Nederlandse tijd, ook rond de wisseling naar wintertijd', () => {
    expect(nlTijd({ start: '2026-10-31T21:00:00Z', metTijd: true })).toBe('za 31 okt 22:00');
    expect(nlTijd({ start: '2026-07-05T14:00:00Z', metTijd: true })).toBe('zo 5 jul 16:00');
    expect(nlTijd({ start: '2026-11-08T12:00:00Z', metTijd: false })).toBe('zo 8 nov');
  });
});

describe('ZENDER_GIDS', () => {
  it('linkt alleen naar veilige adressen van bekende sportzenders', async () => {
    const { ZENDER_GIDS, SPORTZENDERS } = await import('../src/sport.js');
    for (const [naam, url] of Object.entries(ZENDER_GIDS)) {
      expect(SPORTZENDERS).toContain(naam);
      expect(url).toMatch(/^https:\/\//);
    }
    expect(ZENDER_GIDS['Ziggo Sport']).toContain('programmagids');
  });
});
