import { describe, expect, it } from 'vitest';
import { mijnWedstrijden, ploegenPerCompetitie, perDag, weekStart, aftrap, dagNaam, nlDag, oranjeZender } from '../src/voetbal.js';

const ploeg = (id, naam) => ({ id, naam, logo: '' });
const feyenoord = ploeg(1, 'Feyenoord');
const ajax = ploeg(2, 'Ajax');
const az = ploeg(3, 'AZ');
const liverpool = ploeg(4, 'Liverpool');
const w = (id, competitie, start, thuis, uit) => ({ id, competitie, start, thuis, uit, status: 'SCHEDULED' });
const schema = [
  w(1, 'DED', '2026-10-31T14:30:00Z', feyenoord, az),
  w(2, 'DED', '2026-11-01T13:30:00Z', ajax, az),
  w(3, 'PL', '2026-11-01T16:30:00Z', liverpool, ploeg(5, 'Arsenal')),
  w(4, 'CL', '2026-11-04T20:00:00Z', ploeg(6, 'Real Madrid'), feyenoord),
];

describe('mijnWedstrijden', () => {
  it('toont je clubs in elke competitie', () => {
    expect(mijnWedstrijden(schema, { clubs: [1], alles: [] }).map((x) => x.id)).toEqual([1, 4]);
  });
  it('en alles van een competitie die je helemaal volgt', () => {
    expect(mijnWedstrijden(schema, { clubs: [1], alles: ['PL'] }).map((x) => x.id)).toEqual([1, 3, 4]);
  });
  it('niets zonder keuzes', () => {
    expect(mijnWedstrijden(schema, { clubs: [], alles: [] })).toEqual([]);
  });
});

describe('ploegenPerCompetitie', () => {
  it('geeft elke ploeg één keer, op naam', () => {
    const p = ploegenPerCompetitie(schema);
    expect(p.DED.map((x) => x.naam)).toEqual(['Ajax', 'AZ', 'Feyenoord']);
    expect(Object.keys(p)).toEqual(['DED', 'CL', 'PL']);
  });
});

describe('dagen en tijden', () => {
  it('groepeert per Nederlandse dag', () => {
    const avond = [w(9, 'CL', '2026-11-04T23:30:00Z', az, ajax), w(8, 'CL', '2026-11-04T20:00:00Z', az, ajax)];
    expect(perDag(avond).map((d) => [d.dag, d.wedstrijden.map((x) => x.id)])).toEqual([['2026-11-04', [8]], ['2026-11-05', [9]]]);
  });
  it('rekent aftrap om naar Nederlandse tijd', () => {
    expect(aftrap('2026-10-31T14:30:00Z')).toBe('15:30');
    expect(nlDag('2026-07-01T22:30:00Z')).toBe('2026-07-02');
  });
  it('weet de maandag van de week', () => {
    expect(weekStart('2026-11-01')).toBe('2026-10-26');
    expect(weekStart('2026-10-26')).toBe('2026-10-26');
  });
  it('noemt vandaag en morgen bij naam', () => {
    expect(dagNaam('2026-10-31', '2026-10-31')).toBe('Vandaag');
    expect(dagNaam('2026-11-01', '2026-10-31')).toBe('Morgen');
    expect(dagNaam('2026-11-04', '2026-10-31')).toBe('woensdag 4 november');
  });
});

describe('oranjeZender', () => {
  it('Nations League en kwalificatie bij Ziggo Sport, de rest bij de NOS', () => {
    expect(oranjeZender('UEFA Nations League')[0].naam).toBe('Ziggo Sport');
    expect(oranjeZender('International Friendlies')[0].naam).toBe('NOS');
  });
});
