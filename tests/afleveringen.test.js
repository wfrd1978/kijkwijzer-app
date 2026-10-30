import { beforeEach, describe, expect, it } from 'vitest';
import { naarAfleveringen } from '../src/tmdb.js';
import { afleveringenOp, werkAfleveringenBij, leesAfleveringen, afleveringKort } from '../src/afleveringen.js';

const opslag = new Map();
globalThis.localStorage = { getItem: (k) => opslag.get(k) ?? null, setItem: (k, v) => opslag.set(k, String(v)) };

const borgen = { tmdbId: 1, soort: 'serie', titel: 'Borgen', status: 'Wil ik zien' };
const gezien = { tmdbId: 2, soort: 'serie', titel: 'Klaar', status: 'Gezien' };
const film = { tmdbId: 3, soort: 'film', titel: 'Dune', status: 'Wil ik zien' };

describe('naarAfleveringen', () => {
  it('leest laatste en volgende aflevering, rare waarden niet', () => {
    const x = naarAfleveringen({
      last_episode_to_air: { air_date: '2026-10-27', season_number: 5, episode_number: 2, name: 'Twee' },
      next_episode_to_air: { air_date: 'morgen', season_number: 5, episode_number: 3 },
    });
    expect(x.laatste).toEqual({ dag: '2026-10-27', seizoen: 5, aflevering: 2, naam: 'Twee' });
    expect(x.volgende).toBeNull();
  });
});

describe('werkAfleveringenBij', () => {
  beforeEach(() => opslag.clear());
  it('alleen series die je volgt, en één keer per dag', async () => {
    const gevraagd = [];
    const haal = async (id) => (gevraagd.push(id), { laatste: null, volgende: { dag: '2026-10-29', seizoen: 1, aflevering: 4, naam: '' } });
    await werkAfleveringenBij([borgen, gezien, film], '2026-10-28', haal, { wacht: 0 });
    await werkAfleveringenBij([borgen, gezien, film], '2026-10-28', haal, { wacht: 0 });
    expect(gevraagd).toEqual([1]);
    await werkAfleveringenBij([borgen], '2026-10-29', haal, { wacht: 0 });
    expect(gevraagd).toEqual([1, 1]);
  });
  it('vergeet series die niet meer op je lijst staan', async () => {
    const haal = async () => ({ laatste: null, volgende: null });
    await werkAfleveringenBij([borgen], '2026-10-28', haal, { wacht: 0 });
    await werkAfleveringenBij([], '2026-10-28', haal, { wacht: 0 });
    expect(leesAfleveringen()).toEqual({});
  });
});

describe('afleveringenOp', () => {
  it('per dag, alleen voor series die je volgt', () => {
    const stand = {
      1: { laatste: { dag: '2026-10-27', seizoen: 5, aflevering: 2 }, volgende: { dag: '2026-11-03', seizoen: 5, aflevering: 3 } },
      2: { laatste: { dag: '2026-10-27', seizoen: 1, aflevering: 8 }, volgende: null },
    };
    const x = afleveringenOp([borgen, gezien], stand, ['2026-10-26', '2026-10-27', '2026-10-28']);
    expect(x.map((e) => `${e.titel.titel} ${afleveringKort(e)} ${e.dag}`)).toEqual(['Borgen S5 · A2 2026-10-27']);
  });
});
