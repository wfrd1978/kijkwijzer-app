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
