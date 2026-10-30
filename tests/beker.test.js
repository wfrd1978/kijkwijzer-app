import { describe, expect, it } from 'vitest';
import { kiesTeam, naarWedstrijd, alBekend, haalExtraWedstrijden, zoeknamen } from '../src/beker.js';

const bayern = { id: 5, naam: 'Bayern', vol: 'FC Bayern München', logo: 'https://crests.football-data.org/5.png' };
const beker = { idEvent: '9', strTimestamp: '2026-10-28T19:45:00', strLeague: 'DFB-Pokal', idHomeTeam: '133664', idAwayTeam: '1', strHomeTeam: 'Bayern Munich', strAwayTeam: 'Magdeburg', strAwayTeamBadge: 'https://r2.thesportsdb.com/x.png' };

describe('beker en andere wedstrijden', () => {
  it('vindt de juiste club, ook bij een andere schrijfwijze', () => {
    const teams = [{ idTeam: '155704', strTeam: 'Bayern Hof', strSport: 'Soccer', strLeague: 'German Oberliga Bayern Nord', strTeamAlternate: '' }, { idTeam: '133664', strTeam: 'Bayern Munich', strSport: 'Soccer', strLeague: 'German Bundesliga', strTeamAlternate: 'FC Bayern München, FC Bayern' }];
    expect(kiesTeam(teams, bayern).idTeam).toBe('133664');
    // Amateurteams met dezelfde naam vallen weg.
    const ajax = { id: 678, naam: 'Ajax', vol: 'AFC Ajax' };
    expect(kiesTeam([{ idTeam: '142699', strTeam: 'AFC Ajax Amateurs', strSport: 'Soccer', strLeague: 'Dutch KNVB Cup' }], ajax)).toBeNull();
    expect(zoeknamen({ naam: 'AZ', vol: 'AZ' })[0]).toBe('AZ Alkmaar');
    expect(zoeknamen(ajax)).toEqual(['Ajax', 'AFC Ajax']);
    expect(kiesTeam([{ idTeam: '1', strTeam: 'Bayern', strSport: 'Basketball' }], bayern)).toBeNull();
  });
  it('maakt van een bekerwedstrijd een wedstrijd in het schema, met je club herkenbaar', () => {
    const w = naarWedstrijd(beker, bayern, '133664');
    expect(w).toMatchObject({ competitie: 'EXTRA', competitieNaam: 'DFB-Pokal', start: '2026-10-28T19:45:00Z', thuis: { id: 5, naam: 'Bayern' }, uit: { id: null, naam: 'Magdeburg' } });
  });
  it('slaat competities over die het schema al heeft', () => {
    expect(naarWedstrijd({ ...beker, strLeague: 'German Bundesliga' }, bayern, '133664')).toBeNull();
  });
  it('herkent een wedstrijd die al in het schema staat', () => {
    const w = naarWedstrijd(beker, bayern, '133664');
    expect(alBekend(w, [{ start: '2026-10-28T19:45:00Z', thuis: { id: 5 }, uit: { id: 8 } }])).toBe(true);
    expect(alBekend(w, [{ start: '2026-10-31T17:30:00Z', thuis: { id: 5 }, uit: { id: 4 } }])).toBe(false);
  });
  it('zoekt eerst op de volledige naam en onthoudt de koppeling', async () => {
    const gevraagd = [];
    const fetcher = async (url) => {
      gevraagd.push(decodeURIComponent(url.split('/').pop()));
      if (url.includes('searchteams')) return { ok: true, json: async () => ({ teams: [{ idTeam: '133664', strTeam: 'Bayern Munich', strSport: 'Soccer', strLeague: 'German Bundesliga', strTeamAlternate: 'FC Bayern München' }] }) };
      return { ok: true, json: async () => ({ events: [beker] }) };
    };
    const { wedstrijden, koppelingen } = await haalExtraWedstrijden([bayern], {}, fetcher, 0);
    expect(wedstrijden).toHaveLength(1);
    expect(koppelingen).toEqual({ 5: '133664' });
    expect(gevraagd[0]).toBe('searchteams.php?t=Bayern Munich');
    await haalExtraWedstrijden([bayern], koppelingen, fetcher, 0);
    expect(gevraagd.filter((x) => x.startsWith('searchteams'))).toHaveLength(1);
  });
});
