import { describe, expect, it } from 'vitest';
import { VELDRIJDEN, MOUNTAINBIKE, komendeKoersen, koersDatum } from '../src/wielrennen.js';
import { SCHAATSEN } from '../src/schaatsen.js';

const geldig = (k) => /^\d{4}-\d{2}-\d{2}$/.test(k.van) && (!k.tot || k.tot >= k.van) && k.zenders.length > 0;

describe('kalenders schaatsen, veldrijden en MTB', () => {
  it('alle wedstrijden hebben geldige datums en een zender, op volgorde', () => {
    for (const kal of [VELDRIJDEN, MOUNTAINBIKE, SCHAATSEN]) {
      expect(kal.koersen.every(geldig)).toBe(true);
      const van = kal.koersen.map((k) => k.van);
      expect(van).toEqual([...van].sort());
    }
  });
  it('veldrijden: alleen de 12 wereldbekerrondes, Hoogerheide als laatste', () => {
    expect(VELDRIJDEN.koersen).toHaveLength(12);
    expect(VELDRIJDEN.koersen.every((k) => k.naam.startsWith('Wereldbeker'))).toBe(true);
    expect(VELDRIJDEN.koersen.at(-1)).toMatchObject({ naam: 'Wereldbeker Hoogerheide', van: '2027-01-24' });
  });
  it('schaatsen: zes wereldbekers plus EK en WK; op 8 november is Beijing de eerstvolgende', () => {
    expect(SCHAATSEN.koersen.filter((k) => k.soort.startsWith('Wereldbeker'))).toHaveLength(6);
    expect(komendeKoersen(SCHAATSEN.koersen, '2026-11-08')[0].naam).toBe('Wereldbeker Beijing');
    expect(koersDatum(SCHAATSEN.koersen[0])).toBe('13 – 15 nov');
  });
});
