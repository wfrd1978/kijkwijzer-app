import { describe, expect, it } from 'vitest';
import { WIELRENNEN, komendeKoersen, kanIkKijken, koersDatum } from '../src/wielrennen.js';

describe('wielerkalender', () => {
  it('staat op datumvolgorde en elke koers heeft een zender', () => {
    const data = WIELRENNEN.koersen.map((k) => k.van);
    expect([...data].sort()).toEqual(data);
    expect(WIELRENNEN.koersen.every((k) => k.zenders.length && /^\d{4}-\d{2}-\d{2}$/.test(k.van))).toBe(true);
  });
  it('laat afgelopen koersen weg, maar een lopende ronde niet', () => {
    const k = komendeKoersen(WIELRENNEN.koersen, '2027-05-20');
    expect(k[0].naam).toBe("Giro d'Italia");
  });
  it('weet of je kunt kijken met jouw zenders', () => {
    const tour = WIELRENNEN.koersen.find((k) => k.naam === 'Tour de France');
    const amstel = WIELRENNEN.koersen.find((k) => k.naam === 'Amstel Gold Race');
    const giro = WIELRENNEN.koersen.find((k) => k.naam === "Giro d'Italia");
    expect(kanIkKijken(tour, ['NOS'])).toBe('ja');
    expect(kanIkKijken(amstel, ['NOS'])).toBe('misschien');
    expect(kanIkKijken(giro, ['NOS', 'Viaplay'])).toBe('nee');
  });
  it('schrijft data kort', () => {
    expect(koersDatum({ van: '2027-02-27' })).toBe('27 feb');
    expect(koersDatum({ van: '2027-05-08', tot: '2027-05-30' })).toBe('8 – 30 mei');
    expect(koersDatum({ van: '2027-08-24', tot: '2027-09-05' })).toBe('24 aug – 5 sep');
  });
});
