import { describe, expect, it } from 'vitest';
import { maakVerzoek, naarTitel, posterUrl, naarDiensten, dienstenParams, kiesTrailer, naarActeurs, naarRollen, naarPersoon, naarSeizoenen } from '../src/tmdb.js';

describe('maakVerzoek', () => {
  it('zet de korte sleutel in het adres', () => {
    const { url, headers } = maakVerzoek('/search/multi', { query: 'dune' }, '0123456789abcdef0123456789abcdef');
    expect(url).toContain('api_key=0123456789abcdef0123456789abcdef');
    expect(url).toContain('language=nl-NL');
    expect(url).toContain('query=dune');
    expect(headers.Authorization).toBeUndefined();
  });
  it('zet de lange token in de kopregel, niet in het adres', () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJ4In0.abc';
    const { url, headers } = maakVerzoek('/search/multi', {}, token);
    expect(url).not.toContain(token);
    expect(headers.Authorization).toBe(`Bearer ${token}`);
  });
});

describe('naarTitel', () => {
  it('zet een film om', () => {
    expect(
      naarTitel({ media_type: 'movie', id: 1, title: 'Dune', original_title: 'Dune', release_date: '2021-09-15', poster_path: '/a.jpg', overview: 'Zand.' })
    ).toEqual({ tmdbId: 1, soort: 'film', titel: 'Dune', origineel: 'Dune', jaar: '2021', poster: '/a.jpg', beschrijving: 'Zand.' });
  });
  it('zet een serie om, ook zonder datum en poster', () => {
    const t = naarTitel({ media_type: 'tv', id: 2, name: 'Thuis' });
    expect(t).toMatchObject({ soort: 'serie', titel: 'Thuis', jaar: '', poster: '' });
  });
  it('laat personen weg', () => {
    expect(naarTitel({ media_type: 'person', id: 3, name: 'Iemand' })).toBe(null);
  });
});

describe('posterUrl', () => {
  it('geeft niets zonder poster', () => {
    expect(posterUrl('')).toBe('');
    expect(posterUrl('/a.jpg')).toBe('https://image.tmdb.org/t/p/w185/a.jpg');
  });
});

describe('naarDiensten', () => {
  const d = (id, naam, prio) => ({ provider_id: id, provider_name: naam, logo_path: `/${id}.jpg`, display_priority: prio });
  it('verdeelt over abonnement, gratis, huren en kopen', () => {
    const uit = naarDiensten({
      link: 'https://www.themoviedb.org/movie/1/watch?locale=NL',
      flatrate: [d(2, 'Videoland', 5), d(8, 'Netflix', 1)],
      ads: [d(1867, 'NPO Start', 3)],
      rent: [d(35, 'Rakuten TV', 2)],
      buy: [d(35, 'Rakuten TV', 2), d(2, 'Apple TV', 4)],
    });
    expect(uit.abonnement.map((x) => x.naam)).toEqual(['Netflix', 'Videoland']);
    expect(uit.gratis).toEqual([{ id: 1867, naam: 'NPO Start', logo: '/1867.jpg' }]);
    expect(uit.huren.map((x) => x.naam)).toEqual(['Rakuten TV']);
    expect(uit.kopen.map((x) => x.naam)).toEqual(['Rakuten TV', 'Apple TV']);
    expect(uit.link).toContain('watch');
  });
  it('telt een dienst die gratis én met reclame staat maar één keer', () => {
    expect(naarDiensten({ free: [d(1, 'A', 1)], ads: [d(1, 'A', 1)] }).gratis).toHaveLength(1);
  });
  it('geeft niets als het in Nederland nergens te zien is', () => {
    expect(naarDiensten(undefined)).toBe(null);
    expect(naarDiensten({ link: 'x' })).toBe(null);
  });
});

describe('ontdekken', () => {
  it('gebruikt de meegegeven soort als TMDB die niet per titel noemt', () => {
    expect(naarTitel({ id: 3, name: 'Thuis' }, 'tv')).toMatchObject({ soort: 'serie', titel: 'Thuis' });
    expect(naarTitel({ id: 3, title: 'Dune' })).toBe(null);
  });
  it('vraagt alleen abonnement en gratis bij jouw diensten', () => {
    expect(dienstenParams([8, 1867])).toMatchObject({
      watch_region: 'NL',
      with_watch_providers: '8|1867',
      with_watch_monetization_types: 'flatrate|free|ads',
    });
  });
});

describe('kiesTrailer', () => {
  const v = (key, extra) => ({ site: 'YouTube', key, type: 'Trailer', iso_639_1: 'en', official: true, ...extra });
  it('kiest een Nederlandse trailer boven een Engelse, en een trailer boven een teaser', () => {
    expect(kiesTrailer([v('teaserNL1', { type: 'Teaser', iso_639_1: 'nl' }), v('trailerEN'), v('trailerNL', { iso_639_1: 'nl' })])).toBe('trailerNL');
    expect(kiesTrailer([v('teaserNL1', { type: 'Teaser', iso_639_1: 'nl' }), v('trailerEN')])).toBe('trailerEN');
  });
  it('slaat andere sites, soorten en rare codes over', () => {
    expect(kiesTrailer([v('abcdefg', { site: 'Vimeo' }), v('abcdefg', { type: 'Featurette' }), v('a"><x')])).toBe('');
    expect(kiesTrailer(undefined)).toBe('');
  });
});

describe('naarActeurs', () => {
  it('neemt de hoofdrollen op volgorde, ook bij series met meerdere rollen', () => {
    const a = naarActeurs({ cast: [
      { id: 2, name: 'B', order: 1, roles: [{ character: 'Rol B' }] },
      { id: 1, name: 'A', order: 0, character: 'Rol A', profile_path: '/a.jpg' },
    ] });
    expect(a).toEqual([{ id: 1, naam: 'A', rol: 'Rol A', foto: '/a.jpg' }, { id: 2, naam: 'B', rol: 'Rol B', foto: '' }]);
  });
  it('maximaal 15 en leeg zonder gegevens', () => {
    expect(naarActeurs({ cast: Array.from({ length: 30 }, (_, i) => ({ id: i, name: `N${i}`, order: i })) })).toHaveLength(15);
    expect(naarActeurs(undefined)).toEqual([]);
  });
});

describe('naarRollen', () => {
  it('bekendste eerst, elke titel één keer, zonder talkshows en zichzelf', () => {
    const rollen = naarRollen({ cast: [
      { media_type: 'movie', id: 1, title: 'Klein', vote_count: 10, character: 'Bijrol' },
      { media_type: 'movie', id: 2, title: 'Groot', vote_count: 9000, character: 'Hoofdrol' },
      { media_type: 'tv', id: 3, name: 'Talkshow', vote_count: 5000, character: 'Self', genre_ids: [10767] },
      { media_type: 'tv', id: 4, name: 'Prijsuitreiking', vote_count: 4000, character: 'Himself - Guest' },
      { media_type: 'movie', id: 2, title: 'Groot', vote_count: 9000, character: 'Tweede rol' },
      { media_type: 'tv', id: 5, name: 'Serie', vote_count: 300, character: 'Agent' },
    ] });
    expect(rollen.map((r) => `${r.titel} (${r.rol})`)).toEqual(['Groot (Hoofdrol)', 'Serie (Agent)', 'Klein (Bijrol)']);
    expect(rollen[1].soort).toBe('serie');
  });
  it('leeg zonder gegevens', () => {
    expect(naarRollen(undefined)).toEqual([]);
  });
});

describe('naarPersoon', () => {
  it('neemt acteurs met hun bekendste titels', () => {
    expect(naarPersoon({ media_type: 'person', id: 7, name: 'Zendaya', known_for_department: 'Acting', profile_path: '/z.jpg', known_for: [{ name: 'Euphoria' }, { title: 'Dune' }, { title: 'Spider-Man' }] }))
      .toEqual({ id: 7, naam: 'Zendaya', foto: '/z.jpg', bekendVan: ['Euphoria', 'Dune'] });
  });
  it('laat regisseurs, films en series weg', () => {
    expect(naarPersoon({ media_type: 'person', id: 8, name: 'Villeneuve', known_for_department: 'Directing' })).toBe(null);
    expect(naarPersoon({ media_type: 'movie', id: 1, title: 'Dune' })).toBe(null);
  });
});

describe('naarSeizoenen', () => {
  it('zonder specials en lege seizoenen, op volgorde', () => {
    expect(naarSeizoenen([{ season_number: 2, episode_count: 8 }, { season_number: 0, episode_count: 3 }, { season_number: 1, episode_count: 10 }, { season_number: 3, episode_count: 0 }]))
      .toEqual([{ nr: 1, afleveringen: 10 }, { nr: 2, afleveringen: 8 }]);
  });
});
