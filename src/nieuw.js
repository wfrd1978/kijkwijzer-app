// Nieuw voor jou: elke dag één recent verschenen film of serie bij jouw diensten, in jouw smaak.
import { titelSleutel } from './titels.js';

export const GENRE_NAMEN = {
  28: 'Actie', 12: 'Avontuur', 16: 'Animatie', 35: 'Komedie', 80: 'Misdaad', 99: 'Documentaire', 18: 'Drama', 10751: 'Familie',
  14: 'Fantasy', 36: 'Historisch', 27: 'Horror', 10402: 'Muziek', 9648: 'Mysterie', 10749: 'Romantiek', 878: 'Sciencefiction',
  53: 'Thriller', 10752: 'Oorlog', 37: 'Western', 10759: 'Actie en avontuur', 10764: 'Reality', 10765: 'Sciencefiction en fantasy', 10768: 'Oorlog en politiek',
};

const lees = (k, standaard) => {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null') ?? standaard;
  } catch {
    return standaard;
  }
};
const zet = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    // Geen opslag: dan morgen opnieuw.
  }
};

// Titels waar je smaak uit blijkt: wat je 4 of 5 sterren gaf telt dubbel, wat je nog wilt zien enkel.
export function smaakTitels(titels, max = 15) {
  const fijn = titels.filter((t) => t.sterren >= 4);
  const wil = titels.filter((t) => t.status === 'Wil ik zien' && !(t.sterren >= 4));
  return [...fijn.map((t) => ({ t, gewicht: 2 })), ...wil.map((t) => ({ t, gewicht: 1 }))].slice(0, max);
}

// De drie genres die het vaakst voorkomen, per soort. 'genresVan' geeft de genres van één titel.
export function topGenres(smaak, genresVan, soort, aantal = 3) {
  const telling = new Map();
  for (const { t, gewicht } of smaak.filter((x) => x.t.soort === soort)) {
    for (const g of genresVan(t) ?? []) telling.set(g, (telling.get(g) ?? 0) + gewicht);
  }
  return [...telling.entries()].sort((a, b) => b[1] - a[1]).slice(0, aantal).map(([g]) => g);
}

// Kiest de tip van vandaag: dezelfde de hele dag, en geen titel die de afgelopen tijd al tip was
// of al op je lijst staat.
export function kiesVanDag(kandidaten, opLijst, dag, stand = { dag: '', keuze: null, getoond: [] }) {
  if (stand.dag === dag && stand.keuze && !opLijst.has(titelSleutel(stand.keuze))) return stand;
  const getoond = new Set(stand.getoond ?? []);
  const keuze = kandidaten.find((t) => !opLijst.has(titelSleutel(t)) && !getoond.has(titelSleutel(t))) ?? null;
  return { dag, keuze, getoond: keuze ? [titelSleutel(keuze), ...(stand.getoond ?? [])].slice(0, 60) : stand.getoond ?? [] };
}

// Zoals kiesVanDag, maar een paar tips tegelijk, en altijd aangevuld tot 'aantal'.
// De tips van vandaag blijven staan; wat je intussen op je lijst zette, wordt vervangen.
// Zijn er te weinig nieuwe, dan mag een eerdere tip terugkomen.
export function kiesMeerVanDag(kandidaten, opLijst, dag, stand = { dag: '', keuzes: [], getoond: [] }, aantal = 3) {
  const vrij = (t) => !opLijst.has(titelSleutel(t));
  const blijft = stand.dag === dag ? (stand.keuzes ?? []).filter(vrij) : [];
  if (blijft.length >= aantal) return { ...stand, keuzes: blijft.slice(0, aantal) };
  const al = new Set(blijft.map(titelSleutel));
  const getoond = new Set(stand.getoond ?? []);
  const over = kandidaten.filter((t) => vrij(t) && !al.has(titelSleutel(t)));
  const erbij = [...over.filter((t) => !getoond.has(titelSleutel(t))), ...over.filter((t) => getoond.has(titelSleutel(t)))].slice(0, aantal - blijft.length);
  return { dag, keuzes: [...blijft, ...erbij], getoond: [...new Set([...erbij.map(titelSleutel), ...(stand.getoond ?? [])])].slice(0, 90) };
}

// Alles samen, met wat er bewaard wordt: de genres per titel (blijvend) en de keuze van vandaag.
// De genres die jij het vaakst hoog waardeert of wilt zien, per soort. De genres per titel
// worden één keer opgehaald en bewaard.
async function smaakGenres(titels, haalGenres) {
  const opLijst = new Set(titels.map(titelSleutel));
  const bekend = lees('genresPerTitel', {});
  const smaak = smaakTitels(titels);
  for (const { t } of smaak.filter((x) => !bekend[titelSleutel(x.t)])) {
    try {
      bekend[titelSleutel(t)] = await haalGenres(t.soort, t.tmdbId);
    } catch {
      break;
    }
  }
  bewaarGenres(bekend, opLijst);
  const genresVan = (t) => bekend[titelSleutel(t)];
  return { film: topGenres(smaak, genresVan, 'film'), serie: topGenres(smaak, genresVan, 'serie') };
}

// Bewaren, samen met wat intussen op een andere plek is opgehaald. Alleen de genres van titels
// die nog op je lijst staan blijven bewaard.
function bewaarGenres(nieuw, opLijst) {
  const alles = { ...lees('genresPerTitel', {}), ...nieuw };
  for (const k of Object.keys(alles)) if (!opLijst.has(k)) delete alles[k];
  zet('genresPerTitel', alles);
}

// De bekende genres per titel (voor de categorieën in Mijn lijst).
export function bekendeGenres() {
  return lees('genresPerTitel', {});
}

// Genres ophalen voor titels op je lijst die nog geen genres hebben, rustig één voor één.
// Staat apart in de opslag van de browser, niet bij je titels en niet in de backup.
// Geeft true als er iets nieuws bij kwam.
export async function vulGenresAan(titels, haalGenres, { wacht = 250 } = {}) {
  const opLijst = new Set(titels.map(titelSleutel));
  const bekend = bekendeGenres();
  const zonder = titels.filter((t) => !bekend[titelSleutel(t)]);
  const nieuw = {};
  for (const t of zonder) {
    try {
      nieuw[titelSleutel(t)] = await haalGenres(t.soort, t.tmdbId);
    } catch (fout) {
      // Kent TMDB de titel niet meer: leeg bewaren, zodat hij niet steeds opnieuw gevraagd wordt.
      if (fout?.name === 'NietGevonden') nieuw[titelSleutel(t)] = [];
      else break; // geen internet of sleutel: de volgende keer verder
    }
    if (Object.keys(nieuw).length % 20 === 0) bewaarGenres(nieuw, opLijst);
    if (wacht) await new Promise((klaar) => setTimeout(klaar, wacht));
  }
  if (Object.keys(nieuw).length) bewaarGenres(nieuw, opLijst);
  return Object.keys(nieuw).length > 0;
}

// Om en om een film en een serie.
function omEnOm(films, series) {
  const uit = [];
  for (let i = 0; i < Math.max(films.length, series.length); i++) uit.push(...[films[i], series[i]].filter(Boolean));
  return uit;
}

// Een paar goed gewaardeerde titels voor vandaag: niet op je lijst, en elke dag een ander rijtje.
export function kiesKijktips(kandidaten, opLijst, dag, aantal = 3) {
  const vrij = kandidaten.filter((t) => !opLijst.has(titelSleutel(t)));
  if (!vrij.length) return [];
  const begin = (Math.floor(Date.parse(`${dag}T12:00:00Z`) / 86400000) * aantal) % vrij.length;
  return [...vrij.slice(begin), ...vrij.slice(0, begin)].slice(0, aantal);
}

// Kijktips bij jouw diensten: goed gewaardeerd, in jouw genres. De hele dag dezelfde.
export async function kijktipsVanDag({ titels, diensten, dag, haalGenres, haalTop, aantal = 3 }) {
  const opLijst = new Set(titels.map(titelSleutel));
  const stand = lees('kijktips', { dag: '', tips: [] });
  const nog = stand.tips.filter((t) => !opLijst.has(titelSleutel(t)));
  if (stand.dag === dag && nog.length) return nog;
  const genres = await smaakGenres(titels, haalGenres);
  const [films, series] = await Promise.all(['film', 'serie'].map((soort) => haalTop(soort, diensten, genres[soort]).catch(() => [])));
  const tips = kiesKijktips(omEnOm(films, series), opLijst, dag, aantal);
  if (tips.length) zet('kijktips', { dag, tips });
  return tips;
}

// Drie tips per dag (om en om film en serie), de hele dag dezelfde.
export async function nieuwVoorJou({ titels, diensten, dag, haalGenres, haalNieuw }) {
  const stand = lees('nieuwVoorJou', { dag: '', keuzes: [], getoond: [] });
  const opLijst = new Set(titels.map(titelSleutel));
  // Al drie tips voor vandaag die niet op je lijst staan: die, zonder opnieuw te vragen.
  const bewaard = kiesMeerVanDag([], opLijst, dag, stand);
  if (stand.dag === dag && bewaard.keuzes.length >= 3) return bewaard.keuzes;

  const genres = await smaakGenres(titels, haalGenres);
  const vanaf = new Date(`${dag}T12:00:00Z`);
  vanaf.setUTCDate(vanaf.getUTCDate() - 120);
  const datum = vanaf.toISOString().slice(0, 10);
  const [films, series] = await Promise.all(
    ['film', 'serie'].map((soort) => haalNieuw(soort, diensten, genres[soort], datum).catch(() => []))
  );
  const kandidaten = omEnOm(films, series);
  // De dagen wisselen: op even dagen begint het met een serie.
  if (Math.floor(Date.parse(`${dag}T12:00:00Z`) / 86400000) % 2) kandidaten.reverse();
  let nieuw = kiesMeerVanDag(kandidaten, opLijst, dag, stand);
  // Te weinig in jouw genres: breder zoeken, zodat er altijd drie staan.
  if (nieuw.keuzes.length < 3) {
    const [f, se] = await Promise.all(['film', 'serie'].map((soort) => haalNieuw(soort, diensten, [], datum).catch(() => [])));
    nieuw = kiesMeerVanDag(omEnOm(f, se), opLijst, dag, nieuw);
  }
  zet('nieuwVoorJou', nieuw);
  return nieuw.keuzes;
}
