import { describe, expect, it, beforeEach } from 'vitest';
import { leesVoetbalKeuzes, zetVoetbalKeuzes, competitieNl, oranjeZender, VOLG_LANDEN, COMPETITIES } from '../src/voetbal.js';

const opslag = new Map();
globalThis.localStorage = { getItem: (k) => opslag.get(k) ?? null, setItem: (k, v) => opslag.set(k, String(v)), removeItem: (k) => opslag.delete(k) };

describe('landen volgen', () => {
  beforeEach(() => opslag.clear());
  it('volgt Oranje als je nooit landen koos (zoals altijd al)', () => {
    opslag.set('voetbal', JSON.stringify({ clubs: [678], alles: ['DED'] }));
    expect(leesVoetbalKeuzes().landen).toEqual(['NL']);
  });
  it('bewaart je landen en laat onbekende weg', () => {
    zetVoetbalKeuzes({ clubs: [], alles: ['UNL'], landen: ['BE', 'XX'] });
    expect(leesVoetbalKeuzes()).toEqual({ clubs: [], alles: ['UNL'], landen: ['BE'] });
  });
  it('kan ook geen enkel land volgen', () => {
    zetVoetbalKeuzes({ clubs: [], alles: [], landen: [] });
    expect(leesVoetbalKeuzes().landen).toEqual([]);
  });
  it('kent EK, WK en Nations League als landentoernooi', () => {
    expect(['UNL', 'EC', 'WC'].every((c) => COMPETITIES[c].landen)).toBe(true);
    expect(Object.keys(VOLG_LANDEN)).toContain('NL');
  });
  it('geeft competities een Nederlandse naam', () => {
    expect(competitieNl('UEFA Nations League')).toBe('Nations League');
    expect(competitieNl('International Friendlies')).toBe('Oefeninterland');
    expect(competitieNl('FIFA World Cup')).toBe('WK');
  });
  it('zet alleen bij Oranje zeker een zender', () => {
    expect(oranjeZender('International Friendlies', 'BE')).toEqual([]);
    expect(oranjeZender('FIFA World Cup', 'BE')[0].naam).toBe('NOS');
  });
});
