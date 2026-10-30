import { beforeEach, describe, expect, it } from 'vitest';
import { vanVandaag, dagSleutel } from '../src/dagcache.js';

const opslag = new Map();
globalThis.localStorage = { getItem: (k) => opslag.get(k) ?? null, setItem: (k, v) => opslag.set(k, String(v)) };

describe('vanVandaag', () => {
  beforeEach(() => opslag.clear());
  it('haalt één keer per dag op', async () => {
    let n = 0;
    const haal = async () => ({ keer: ++n });
    const ochtend = new Date(2026, 9, 28, 9);
    expect(await vanVandaag('x', haal, ochtend)).toEqual({ keer: 1 });
    expect(await vanVandaag('x', haal, new Date(2026, 9, 28, 22))).toEqual({ keer: 1 });
    expect(await vanVandaag('x', haal, new Date(2026, 9, 29, 8))).toEqual({ keer: 2 });
  });
  it('vóór 06:00 opgehaald: na 06:00 nog één keer', async () => {
    let n = 0;
    const haal = async () => ++n;
    await vanVandaag('y', haal, new Date(2026, 9, 28, 5));
    expect(await vanVandaag('y', haal, new Date(2026, 9, 28, 5, 30))).toBe(1);
    expect(await vanVandaag('y', haal, new Date(2026, 9, 28, 7))).toBe(2);
    expect(dagSleutel(new Date(2026, 9, 28, 5))).toBe('2026-10-28-vroeg');
  });
  it('lukt ophalen niet, dan de laatst bewaarde versie', async () => {
    await vanVandaag('z', async () => 'oud', new Date(2026, 9, 27, 9));
    expect(await vanVandaag('z', async () => { throw new Error('geen internet'); }, new Date(2026, 9, 28, 9))).toBe('oud');
    expect(await vanVandaag('z', async () => null, new Date(2026, 9, 28, 9))).toBe('oud');
  });
});

describe('ruimOudeDagenOp', () => {
  it('gooit alleen weg wat van een eerdere dag is', async () => {
    opslag.clear();
    globalThis.localStorage.removeItem = (k) => opslag.delete(k);
    const { ruimOudeDagenOp } = await import('../src/dagcache.js');
    await vanVandaag('oud', async () => 1, new Date(2026, 9, 27, 9));
    await vanVandaag('nieuw', async () => 2, new Date(2026, 9, 28, 9));
    opslag.set('voetbal', '{"clubs":[]}');
    // In de browser geeft Object.keys(localStorage) de sleutels, met het voorvoegsel 'app:' van
    // deze app (src/opslag.js); hier nagebootst. Sleutels zonder voorvoegsel zijn van de andere app.
    opslag.set('dag:van-de-andere-app', '{}');
    const echteKeys = Object.keys;
    Object.keys = (o) => (o === globalThis.localStorage ? [...opslag.keys()].map((k) => (k === 'dag:van-de-andere-app' ? k : `app:${k}`)) : echteKeys(o));
    ruimOudeDagenOp(new Date(2026, 9, 28, 10));
    Object.keys = echteKeys;
    expect([...opslag.keys()].sort()).toEqual(['dag:nieuw', 'dag:van-de-andere-app', 'voetbal']);
  });
});
