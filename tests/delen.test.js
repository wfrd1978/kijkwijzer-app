import { describe, expect, it } from 'vitest';
import { uitnodigingTekst, wanneerTekst, waarTekst, inkorten, tmdbLink } from '../src/delen.js';

const borgen = { tmdbId: 2, soort: 'serie', titel: 'Borgen', jaar: '2010', beschrijving: 'Een politica wordt premier van Denemarken. Dat gaat niet vanzelf.' };
const n = { id: 8, naam: 'Netflix' };
const npo = { id: 1, naam: 'NPO Start' };
const leeg = { bijJou: [], abonnement: [], gratis: [], huren: [], kopen: [] };

describe('wanneerTekst', () => {
  it('schrijft dag en tijd uit', () => {
    expect(wanneerTekst('2026-10-30', '20:30')).toBe('vrijdag 30 oktober om 20:30');
  });
  it('werkt ook zonder tijd, en geeft niets zonder datum', () => {
    expect(wanneerTekst('2026-10-30', '')).toBe('vrijdag 30 oktober');
    expect(wanneerTekst('', '20:30')).toBe('');
  });
});

describe('waarTekst', () => {
  it('noemt eerst je eigen abonnementen', () => {
    expect(waarTekst({ ...leeg, bijJou: [n, npo], abonnement: [{ naam: 'Videoland' }] })).toBe('Te zien op Netflix en NPO Start.');
  });
  it('valt terug op andere diensten of huren', () => {
    expect(waarTekst({ ...leeg, abonnement: [{ naam: 'Videoland' }] })).toBe('Te zien op Videoland.');
    expect(waarTekst({ ...leeg, huren: [{ naam: 'Apple TV' }] })).toBe('Te huur bij Apple TV.');
    expect(waarTekst(leeg)).toBe('');
    expect(waarTekst(null)).toBe('');
  });
});

describe('uitnodigingTekst', () => {
  it('maakt een uitnodiging met dag, tijd, dienst en link', () => {
    const t = uitnodigingTekst(borgen, { datum: '2026-10-30', tijd: '20:30', verdeeld: { ...leeg, bijJou: [n] } });
    expect(t).toBe(
      'Zin om samen Borgen te kijken? Bijvoorbeeld vrijdag 30 oktober om 20:30?\n\n' +
        'Serie uit 2010. Te zien op Netflix.\n\n' +
        'Waar het over gaat:\nEen politica wordt premier van Denemarken. Dat gaat niet vanzelf.\n\n' +
        'Meer over deze serie: https://www.themoviedb.org/tv/2?language=nl-NL'
    );
  });
  it('werkt ook met alleen een titel', () => {
    const t = uitnodigingTekst({ tmdbId: 1, soort: 'film', titel: 'Dune' });
    expect(t).toBe('Zin om samen Dune te kijken?\n\nFilm.\n\nMeer over deze film: https://www.themoviedb.org/movie/1?language=nl-NL');
  });
});

describe('inkorten en tmdbLink', () => {
  it('kort in tot een hele zin', () => {
    expect(inkorten('Eerste zin hier. Tweede zin is veel langer dan toegestaan.', 28)).toBe('Eerste zin hier.');
  });
  it('linkt naar de juiste soort', () => {
    expect(tmdbLink({ soort: 'film', tmdbId: 5 })).toContain('/movie/5');
  });
});
