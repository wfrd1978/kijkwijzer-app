import { describe, expect, it } from 'vitest';
import { TENNIS, DARTEN, GLORY, naarUfc } from '../src/sporten.js';

describe('tennis, darten en vechtsport', () => {
  it('kalenders met geldige datums, op volgorde, met zender', () => {
    for (const kal of [TENNIS, DARTEN, GLORY]) {
      for (const k of kal.koersen) {
        expect(k.van).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        if (k.tot) expect(k.tot >= k.van).toBe(true);
        expect(k.zenders.length).toBeGreaterThan(0);
      }
      const van = kal.koersen.map((k) => k.van);
      expect(van).toEqual([...van].sort());
    }
  });
  it('UFC: een avond in Amerika is in Nederland de nacht erna', () => {
    const u = naarUfc({ strEvent: 'UFC 334 Gane vs Hokit', dateEvent: '2026-11-14', strCountry: 'United States' });
    expect(u).toMatchObject({ naam: 'UFC 334 Gane – Hokit', van: '2026-11-14', soort: 'UFC · grote avond', noot: 'In de nacht van zaterdag op zondag.' });
    expect(naarUfc({ strEvent: 'UFC Fight Night Abu Dhabi', dateEvent: '2026-10-24', strCountry: 'United Arab Emirates' })).toMatchObject({ soort: 'UFC · Fight Night', noot: '' });
    expect(naarUfc({})).toBeNull();
  });
});
