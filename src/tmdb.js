// Alles wat met TMDB (The Movie Database) praat. Teksten in het Nederlands waar die er zijn.
import { soortSleutel, leesSleutel } from './sleutel.js';

const BASIS = 'https://api.themoviedb.org/3';
const POSTERS = 'https://image.tmdb.org/t/p/';

// TMDB weigert de sleutel: dan moet je hem in Instellingen opnieuw plakken.
export class SleutelFout extends Error {}
// TMDB kent deze titel niet (meer): bijvoorbeeld verwijderd of samengevoegd. Dan gewoon door met de volgende.
export class NietGevonden extends Error {
  name = 'NietGevonden';
}

// Bouwt het adres en de kopregels voor één vraag aan TMDB.
export function maakVerzoek(pad, params, sleutel) {
  const url = new URL(BASIS + pad);
  url.searchParams.set('language', 'nl-NL');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const headers = { accept: 'application/json' };
  if (soortSleutel(sleutel) === 'token') headers.Authorization = `Bearer ${sleutel}`;
  else url.searchParams.set('api_key', sleutel);
  return { url: url.toString(), headers };
}

async function vraag(pad, params = {}, sleutel = leesSleutel()) {
  if (!sleutel) throw new SleutelFout('Geen sleutel');
  const { url, headers } = maakVerzoek(pad, params, sleutel);
  const antwoord = await fetch(url, { headers });
  if (antwoord.status === 401) throw new SleutelFout('Sleutel geweigerd');
  if (antwoord.status === 404) throw new NietGevonden('Niet gevonden bij TMDB');
  if (!antwoord.ok) throw new Error(`TMDB gaf ${antwoord.status}`);
  return antwoord.json();
}

// Klopt de sleutel? Vraagt TMDB om een kleine controle.
export async function testSleutel(sleutel) {
  await vraag('/authentication', {}, sleutel);
  return true;
}

export function posterUrl(pad, breedte = 'w185') {
  return pad ? POSTERS + breedte + pad : '';
}

// Zet een zoekresultaat van TMDB om naar de vorm die de app gebruikt.
// Personen en andere soorten resultaten vallen weg. Lijsten met maar één soort (zoals
// 'populair bij Netflix') noemen de soort niet per titel; die geef je dan zelf mee.
export function naarTitel(r, standaard) {
  const soort = r.media_type ?? standaard;
  if (soort !== 'movie' && soort !== 'tv') return null;
  return {
    tmdbId: r.id,
    soort: soort === 'movie' ? 'film' : 'serie',
    titel: r.title ?? r.name ?? 'Onbekende titel',
    origineel: r.original_title ?? r.original_name ?? '',
    jaar: (r.release_date ?? r.first_air_date ?? '').slice(0, 4),
    poster: r.poster_path ?? '',
    beschrijving: r.overview ?? '',
  };
}

// Een acteur uit de zoekresultaten, met waar hij of zij het bekendst van is.
// Regisseurs en andere makers vallen weg: hun pagina zou geen rollen tonen.
export function naarPersoon(r) {
  if (r.media_type !== 'person' || r.known_for_department !== 'Acting') return null;
  return {
    id: r.id,
    naam: r.name ?? 'Onbekend',
    foto: r.profile_path ?? '',
    bekendVan: (r.known_for ?? []).map((k) => k.title ?? k.name).filter(Boolean).slice(0, 2),
  };
}

export const MAX_PERSONEN = 5;

// Films, series en acteurs, op volgorde van TMDB (meest bekende eerst).
export async function zoekTitels(zoekterm) {
  const data = await vraag('/search/multi', { query: zoekterm, include_adult: 'false' });
  const r = data.results ?? [];
  return { titels: r.map((x) => naarTitel(x)).filter(Boolean), personen: r.map(naarPersoon).filter(Boolean).slice(0, MAX_PERSONEN) };
}

// Waar kun je het kijken in Nederland? TMDB krijgt deze gegevens van JustWatch.
// Gratis (met of zonder reclame, zoals NPO Start) komt apart van een betaald abonnement.
export function naarDiensten(nl) {
  if (!nl) return null;
  const lijst = (...soorten) => {
    const gezien = new Set();
    return soorten
      .flatMap((s) => nl[s] ?? [])
      .sort((a, b) => (a.display_priority ?? 99) - (b.display_priority ?? 99))
      .filter((d) => !gezien.has(d.provider_id) && gezien.add(d.provider_id))
      .map((d) => ({ id: d.provider_id, naam: d.provider_name, logo: d.logo_path ?? '' }));
  };
  const diensten = { abonnement: lijst('flatrate'), gratis: lijst('free', 'ads'), huren: lijst('rent'), kopen: lijst('buy'), link: nl.link ?? '' };
  return diensten.abonnement.length || diensten.gratis.length || diensten.huren.length || diensten.kopen.length ? diensten : null;
}

export async function haalDiensten(soort, tmdbId) {
  const data = await vraag(`/${soort === 'film' ? 'movie' : 'tv'}/${tmdbId}/watch/providers`);
  return naarDiensten(data.results?.NL);
}

// Alle streamingdiensten die TMDB voor Nederland kent (films en series samen),
// de bekendste eerst.
export function naarDienstenLijst(...lijsten) {
  const per = new Map();
  for (const d of lijsten.flatMap((l) => l?.results ?? [])) {
    const prio = d.display_priorities?.NL ?? d.display_priority ?? 999;
    const bestaand = per.get(d.provider_id);
    if (!bestaand || prio < bestaand.prio) per.set(d.provider_id, { id: d.provider_id, naam: d.provider_name, logo: d.logo_path ?? '', prio });
  }
  return [...per.values()].sort((a, b) => a.prio - b.prio || a.naam.localeCompare(b.naam));
}

export async function haalAlleDiensten() {
  const [films, series] = await Promise.all([
    vraag('/watch/providers/movie', { watch_region: 'NL' }),
    vraag('/watch/providers/tv', { watch_region: 'NL' }),
  ]);
  return naarDienstenLijst(films, series);
}

const TMDB_SOORT = { film: 'movie', serie: 'tv' };

// Wat deze week veel bekeken wordt.
export async function haalTrending(soort, pagina = 1) {
  const s = TMDB_SOORT[soort];
  const data = await vraag(`/trending/${s}/week`, { page: pagina });
  return (data.results ?? []).map((r) => naarTitel(r, s)).filter(Boolean);
}

// Populair bij jouw diensten in Nederland: met abonnement of gratis, niet huren of kopen.
export function dienstenParams(ids, pagina = 1) {
  return {
    watch_region: 'NL',
    with_watch_providers: ids.join('|'),
    with_watch_monetization_types: 'flatrate|free|ads',
    sort_by: 'popularity.desc',
    page: pagina,
  };
}

export async function haalOpDiensten(soort, ids, pagina = 1) {
  const s = TMDB_SOORT[soort];
  const data = await vraag(`/discover/${s}`, dienstenParams(ids, pagina));
  return (data.results ?? []).map((r) => naarTitel(r, s)).filter(Boolean);
}

// Wat TMDB aanraadt bij één titel (zelfde soort: films bij een film, series bij een serie).
export async function haalAanbevelingen(soort, tmdbId) {
  const s = TMDB_SOORT[soort];
  const data = await vraag(`/${s}/${tmdbId}/recommendations`);
  return (data.results ?? []).map((r) => naarTitel(r, s)).filter(Boolean);
}

// --- Trailer en acteurs ---

// De beste trailer op YouTube: eerst een Nederlandse, dan een Engelse; een echte trailer
// gaat voor een teaser, een officiële voor een andere.
export function kiesTrailer(videos) {
  const geschikt = (videos ?? []).filter((v) => v.site === 'YouTube' && /^[\w-]{6,20}$/.test(v.key ?? '') && ['Trailer', 'Teaser'].includes(v.type));
  const punten = (v) => (v.type === 'Trailer' ? 4 : 0) + (v.iso_639_1 === 'nl' ? 2 : 0) + (v.official ? 1 : 0);
  return geschikt.sort((a, b) => punten(b) - punten(a))[0]?.key ?? '';
}

export const MAX_ACTEURS = 15;

// De belangrijkste acteurs met hun rol. Bij series telt TMDB alle seizoenen samen
// (aggregate_credits), met de rollen in een lijst.
export function naarActeurs(credits) {
  return (credits?.cast ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .slice(0, MAX_ACTEURS)
    .map((c) => ({
      id: c.id,
      naam: c.name,
      rol: c.character ?? c.roles?.[0]?.character ?? '',
      foto: c.profile_path ?? '',
    }));
}

// Seizoenen van een serie, zonder 'specials' (seizoen 0) en zonder lege seizoenen.
export function naarSeizoenen(seasons) {
  return (seasons ?? [])
    .filter((x) => Number.isInteger(x.season_number) && x.season_number > 0 && x.episode_count > 0)
    .sort((a, b) => a.season_number - b.season_number)
    .map((x) => ({ nr: x.season_number, afleveringen: x.episode_count }));
}

export async function haalTrailerEnActeurs(soort, tmdbId) {
  const s = TMDB_SOORT[soort];
  const data = await vraag(`/${s}/${tmdbId}`, {
    append_to_response: s === 'tv' ? 'videos,aggregate_credits' : 'videos,credits',
    include_video_language: 'nl,en',
  });
  return {
    trailer: kiesTrailer(data.videos?.results),
    acteurs: naarActeurs(s === 'tv' ? data.aggregate_credits : data.credits),
    // Een breed beeld uit de film of serie, als 'voorplaat' van de trailer.
    achtergrond: data.backdrop_path ?? '',
    // Bij series: de seizoenen met hun aantal afleveringen, voor 'Waar ben je?'.
    ...(s === 'tv' ? { seizoenen: naarSeizoenen(data.seasons) } : {}),
  };
}

// --- Acteurs ---

// Praatprogramma's, nieuws en realityshows tellen niet mee: daar zit iemand meestal als zichzelf.
const GEEN_ROL_GENRES = [10763, 10764, 10767];
const ALS_ZICHZELF = /^(self|himself|herself|themselves|zichzelf|host|presenter|narrator)\b/i;
export const MAX_ROLLEN = 40;

// De films en series van een acteur, de bekendste eerst (meeste stemmen bij TMDB),
// elke titel één keer, met de rol erbij.
export function naarRollen(credits) {
  const gezien = new Set();
  return (credits?.cast ?? [])
    .filter((c) => !(c.genre_ids ?? []).some((g) => GEEN_ROL_GENRES.includes(g)) && !ALS_ZICHZELF.test(c.character ?? ''))
    .sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
    .map((c) => {
      const t = naarTitel(c);
      return t && { ...t, rol: c.character ?? '' };
    })
    .filter((t) => {
      if (!t) return false;
      const k = `${t.soort}:${t.tmdbId}`;
      if (gezien.has(k)) return false;
      gezien.add(k);
      return true;
    })
    .slice(0, MAX_ROLLEN);
}

export async function haalActeur(id) {
  const data = await vraag(`/person/${id}`, { append_to_response: 'combined_credits' });
  return {
    id: data.id,
    naam: data.name ?? 'Onbekend',
    foto: data.profile_path ?? '',
    geboren: data.birthday ?? '',
    plaats: data.place_of_birth ?? '',
    rollen: naarRollen(data.combined_credits),
  };
}

// --- Nieuwe afleveringen van series ---

// Uit de seriegegevens van TMDB: de laatst verschenen en de eerstvolgende aflevering.
export function naarAfleveringen(data) {
  const ep = (e) =>
    e && /^\d{4}-\d{2}-\d{2}$/.test(e.air_date ?? '') && Number.isInteger(e.season_number) && Number.isInteger(e.episode_number)
      ? { dag: e.air_date, seizoen: e.season_number, aflevering: e.episode_number, naam: typeof e.name === 'string' ? e.name : '' }
      : null;
  return { laatste: ep(data?.last_episode_to_air), volgende: ep(data?.next_episode_to_air), seizoenen: naarSeizoenen(data?.seasons) };
}

export async function haalAfleveringen(tmdbId) {
  return naarAfleveringen(await vraag(`/tv/${tmdbId}`));
}

// --- Nieuw voor jou ---

// De genres (TMDB-nummers) van één film of serie.
export async function haalGenres(soort, tmdbId) {
  const data = await vraag(`/${TMDB_SOORT[soort]}/${tmdbId}`);
  return (data.genres ?? []).map((g) => g.id).filter(Number.isInteger);
}

// Goed gewaardeerde films of series bij jouw diensten (veel stemmen, hoogste waardering eerst),
// eventueel alleen in de genres die je graag ziet. Met de waardering (0 tot 10) erbij.
export async function haalTopOpDiensten(soort, ids, genres) {
  const s = TMDB_SOORT[soort];
  const data = await vraag(`/discover/${s}`, {
    ...dienstenParams(ids),
    sort_by: 'vote_average.desc',
    'vote_count.gte': s === 'movie' ? 1000 : 300,
    ...(genres.length ? { with_genres: genres.join('|') } : {}),
    ...(s === 'tv' ? { without_genres: '10762,10763,10766,10767' } : {}),
  });
  return (data.results ?? [])
    .map((r) => {
      const t = naarTitel(r, s);
      return t && { ...t, genreIds: (r.genre_ids ?? []).filter(Number.isInteger), achtergrond: r.backdrop_path ?? '', score: typeof r.vote_average === 'number' ? Math.round(r.vote_average * 10) / 10 : null };
    })
    .filter(Boolean);
}

// Recent verschenen films of series bij jouw diensten, eventueel alleen in de genres die je graag ziet.
// Nieuws, praatprogramma's, soaps en kinderseries vallen weg.
export async function haalNieuwOpDiensten(soort, ids, genres, vanaf) {
  const s = TMDB_SOORT[soort];
  const data = await vraag(`/discover/${s}`, {
    ...dienstenParams(ids),
    ...(genres.length ? { with_genres: genres.join('|') } : {}),
    ...(s === 'movie' ? { 'primary_release_date.gte': vanaf } : { 'first_air_date.gte': vanaf, without_genres: '10762,10763,10766,10767' }),
  });
  return (data.results ?? [])
    .map((r) => {
      const t = naarTitel(r, s);
      return t && { ...t, genreIds: (r.genre_ids ?? []).filter(Number.isInteger), achtergrond: r.backdrop_path ?? '' };
    })
    .filter(Boolean);
}
