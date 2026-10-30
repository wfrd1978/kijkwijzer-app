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

// Alles samen, met wat er bewaard wordt: de genres per titel (blijvend) en de keuze van vandaag.
export async function nieuwVoorJou({ titels, diensten, dag, haalGenres, haalNieuw }) {
  const stand = lees('nieuwVoorJou', { dag: '', keuze: null, getoond: [] });
  const opLijst = new Set(titels.map(titelSleutel));
  if (stand.dag === dag && stand.keuze && !opLijst.has(titelSleutel(stand.keuze))) return stand.keuze;

  const bekend = lees('genresPerTitel', {});
  const smaak = smaakTitels(titels);
  for (const { t } of smaak.filter((x) => !bekend[titelSleutel(x.t)])) {
    try {
      bekend[titelSleutel(t)] = await haalGenres(t.soort, t.tmdbId);
    } catch {
      break;
    }
  }
  // Alleen de genres van titels die nog op je lijst staan bewaren.
  for (const k of Object.keys(bekend)) if (!opLijst.has(k)) delete bekend[k];
  zet('genresPerTitel', bekend);

  const vanaf = new Date(`${dag}T12:00:00Z`);
  vanaf.setUTCDate(vanaf.getUTCDate() - 120);
  const datum = vanaf.toISOString().slice(0, 10);
  const [films, series] = await Promise.all(
    ['film', 'serie'].map((soort) => haalNieuw(soort, diensten, topGenres(smaak, (t) => bekend[titelSleutel(t)], soort), datum).catch(() => []))
  );
  // Om en om een film en een serie.
  const kandidaten = [];
  for (let i = 0; i < Math.max(films.length, series.length); i++) kandidaten.push(...[films[i], series[i]].filter(Boolean));
  // De dagen wisselen: op even dagen begint het met een serie.
  if (Math.floor(Date.parse(`${dag}T12:00:00Z`) / 86400000) % 2) kandidaten.reverse();
  const nieuw = kiesVanDag(kandidaten, opLijst, dag, stand);
  zet('nieuwVoorJou', nieuw);
  return nieuw.keuze;
}
