import { describe, expect, it } from 'vitest';
import { smaakTitels, topGenres, kiesVanDag } from '../src/nieuw.js';

const t = (id, soort, extra = {}) => ({ tmdbId: id, soort, titel: `T${id}`, status: 'Wil ik zien', sterren: 0, ...extra });

describe('smaak', () => {
  it('vijf sterren telt zwaarder dan Wil ik zien', () => {
    const smaak = smaakTitels([t(1, 'film', { status: 'Gezien', sterren: 5 }), t(2, 'film'), t(3, 'film'), t(4, 'film', { status: 'Gezien', sterren: 2 })]);
    expect(smaak.map((x) => [x.t.tmdbId, x.gewicht])).toEqual([[1, 2], [2, 1], [3, 1]]);
    const genres = { 1: [80], 2: [18], 3: [35] };
    expect(topGenres(smaak, (x) => genres[x.tmdbId], 'film', 1)).toEqual([80]);
    expect(topGenres(smaak, (x) => genres[x.tmdbId], 'serie')).toEqual([]);
  });
});

describe('kiesVanDag', () => {
  const kandidaten = [t(10, 'film'), t(11, 'serie'), t(12, 'film')];
  it('de hele dag dezelfde, de volgende dag een andere, en niets van je lijst', () => {
    const a = kiesVanDag(kandidaten, new Set(['film:10']), '2026-10-28');
    expect(a.keuze.tmdbId).toBe(11);
    expect(kiesVanDag(kandidaten, new Set(), '2026-10-28', a).keuze.tmdbId).toBe(11);
    const b = kiesVanDag(kandidaten, new Set(), '2026-10-29', a);
    expect(b.keuze.tmdbId).toBe(10);
  });
});

import { kiesKijktips } from '../src/nieuw.js';
describe('kiesKijktips', () => {
  const k = [10, 11, 12, 13, 14].map((id) => ({ tmdbId: id, soort: 'film', titel: `T${id}` }));
  it('drie tips, niets van je lijst, en elke dag een ander rijtje', () => {
    const vandaag = kiesKijktips(k, new Set(['film:10']), '2026-10-30');
    expect(vandaag).toHaveLength(3);
    expect(vandaag.some((t) => t.tmdbId === 10)).toBe(false);
    expect(kiesKijktips(k, new Set(), '2026-10-31').map((t) => t.tmdbId)).not.toEqual(kiesKijktips(k, new Set(), '2026-10-30').map((t) => t.tmdbId));
    expect(kiesKijktips([], new Set(), '2026-10-30')).toEqual([]);
  });
});

import { vulGenresAan, bekendeGenres } from '../src/nieuw.js';
describe('vulGenresAan', () => {
  it('haalt alleen ontbrekende genres op en bewaart ze; geen internet stopt rustig', async () => {
    const opslag = new Map();
    globalThis.localStorage = { getItem: (k) => opslag.get(k) ?? null, setItem: (k, v) => opslag.set(k, String(v)), removeItem: (k) => opslag.delete(k) };
    opslag.set('genresPerTitel', JSON.stringify({ 'film:1': [35], 'film:99': [18] }));
    const gevraagd = [];
    const haal = async (soort, id) => {
      gevraagd.push(id);
      if (id === 3) throw new Error('offline');
      return [53];
    };
    const nieuw = await vulGenresAan([t(1, 'film'), t(2, 'serie'), t(3, 'film'), t(4, 'film')], haal, { wacht: 0 });
    expect(nieuw).toBe(true);
    expect(gevraagd).toEqual([2, 3]);
    // film:99 staat niet meer op de lijst en valt weg
    expect(bekendeGenres()).toEqual({ 'film:1': [35], 'serie:2': [53] });
    delete globalThis.localStorage;
  });
});

import { kiesMeerVanDag } from '../src/nieuw.js';
describe('kiesMeerVanDag', () => {
  const k = [10, 11, 12, 13, 14, 15, 16].map((id) => t(id, 'film'));
  it('drie per dag, de hele dag dezelfde, morgen andere, en wat je toevoegt valt weg', () => {
    const a = kiesMeerVanDag(k, new Set(['film:10']), '2026-11-06');
    expect(a.keuzes.map((x) => x.tmdbId)).toEqual([11, 12, 13]);
    // Eén op je lijst gezet: de andere twee blijven, aangevuld met een nieuwe.
    expect(kiesMeerVanDag(k, new Set(['film:12']), '2026-11-06', a).keuzes.map((x) => x.tmdbId)).toEqual([11, 13, 10]);
    expect(kiesMeerVanDag(k, new Set(), '2026-11-07', a).keuzes.map((x) => x.tmdbId)).toEqual([10, 14, 15]);
  });
});

describe('kiesMeerVanDag altijd drie', () => {
  it('te weinig nieuwe kandidaten: een eerdere tip komt terug', () => {
    const k = [20, 21, 22].map((id) => t(id, 'serie'));
    const stand = { dag: '2026-11-05', keuzes: [], getoond: ['serie:20', 'serie:21'] };
    expect(kiesMeerVanDag(k, new Set(), '2026-11-06', stand).keuzes.map((x) => x.tmdbId)).toEqual([22, 20, 21]);
  });
});

describe('Gestopt in je smaak (Nieuw voor jou)', () => {
  it('genres van gestopte titels tellen tegen', () => {
    const smaak = smaakTitels([t(1, 'film'), t(2, 'film', { status: 'Gestopt' }), t(3, 'film', { status: 'Gestopt' })]);
    const genres = { 1: [35, 27], 2: [27], 3: [27] };
    expect(topGenres(smaak, (x) => genres[x.tmdbId], 'film')).toEqual([35]);
  });
});
