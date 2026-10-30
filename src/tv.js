// Kijktip op de gewone zenders: de avond op NPO 1, 2 en 3 (uit npo.json, door GitHub klaargezet).
import { kaal } from './titels.js';

const NL = 'Europe/Amsterdam';
export const nlDagVanIso = (iso) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: NL });
const nlMinuut = (iso) => {
  const [u, m] = new Date(iso).toLocaleTimeString('nl-NL', { timeZone: NL, hour: '2-digit', minute: '2-digit', hour12: false }).split(':').map(Number);
  return u * 60 + m;
};

// Staat dit programma op je Wil ik zien? Alleen bij een (vrijwel) gelijke titel, om valse treffers te voorkomen.
export function opMijnLijst(p, titels) {
  const naam = kaal(p.titel).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  if (naam.length < 3) return null;
  return (
    titels.find(
      (t) => t.status === 'Wil ik zien' && [t.titel, t.origineel].some((x) => x && kaal(x).replace(/[^\p{L}\p{N}]+/gu, ' ').trim() === naam)
    ) ?? null
  );
}

// --- Je tv-voorkeuren (op de telefoon, gaan mee in de backup) ---
// Genres in gewone woorden, met de genres uit de NPO-gids die erbij horen.
export const TV_GENRES = {
  film: { naam: 'Films', gids: ['Film'] },
  drama: { naam: 'Drama en series', gids: ['Drama', 'Serie', 'Detective', 'Spanning', 'Misdaad'] },
  documentaire: { naam: 'Documentaires', gids: ['Documentaire', 'Onderzoeksjournalistiek', 'Reportage'] },
  mensen: { naam: 'Mensen en verhalen', gids: ['Human Interest', 'Reality TV', 'Familie'] },
  quiz: { naam: 'Spel en quiz', gids: ['Spel/quiz', 'Amusement'] },
  humor: { naam: 'Humor en satire', gids: ['Komisch/Satire', 'Cabaret'] },
  cultuur: { naam: 'Kunst en muziek', gids: ['Kunst/cultuur', 'Muziek'] },
  natuur: { naam: 'Natuur en reizen', gids: ['Natuur', 'Reizen', 'Wetenschap', 'Geschiedenis'] },
  geloof: { naam: 'Geloof en zingeving', gids: ['Religieus', 'Levensbeschouwing'] },
};
const OPSLAG = 'tvVoorkeuren';

// Kortere, gangbare namen voor omroepen waarvan de gids de volledige verenigingsnaam geeft.
const OMROEP_NAMEN = { 'Omroepvereniging Ongehoord Nederland': 'Ongehoord NL', HUMAN: 'Human' };
export const omroepNaam = (o) => OMROEP_NAMEN[o] ?? o;

// Zet de omroepnamen in de gids om naar de korte namen.
export function metKorteNamen(programmas) {
  return programmas.map((p) => ({ ...p, omroepen: [...new Set((p.omroepen ?? []).map(omroepNaam))] }));
}

export function leesTvVoorkeuren() {
  try {
    const v = JSON.parse(localStorage.getItem(OPSLAG) || '{}');
    return {
      genres: Array.isArray(v.genres) ? v.genres.filter((g) => g in TV_GENRES) : [],
      omroepen: Array.isArray(v.omroepen) ? [...new Set(v.omroepen.filter((o) => typeof o === 'string').map(omroepNaam))] : [],
    };
  } catch {
    return { genres: [], omroepen: [] };
  }
}

export function zetTvVoorkeuren(v) {
  localStorage.setItem(OPSLAG, JSON.stringify({ genres: v.genres ?? [], omroepen: v.omroepen ?? [] }));
}

// Alle omroepen die in de gids voorkomen, op naam.
export function omroepenIn(programmas) {
  return [...new Set(programmas.flatMap((p) => p.omroepen ?? []))].sort((a, b) => a.localeCompare(b));
}

// Hoe aantrekkelijk als kijktip: films en drama eerst, dan documentaires; nieuws en jeugd niet.
export function tipScore(p, voorkeur = { genres: [], omroepen: [] }) {
  const g = new Set(p.genres);
  if (g.has('Nieuws/actualiteiten') || g.has('Jeugd') || g.has('Politiek')) return 0;
  // Wat je in Instellingen hebt aangezet, telt zwaar mee: ook als het anders geen tip zou zijn.
  const graagGenre = voorkeur.genres.some((k) => TV_GENRES[k]?.gids.some((x) => g.has(x)));
  const graagOmroep = (p.omroepen ?? []).some((o) => voorkeur.omroepen.includes(o));
  const bonus = (graagGenre ? 6 : 0) + (graagOmroep ? 3 : 0);
  let score = g.has('Film') ? 6 : g.has('Drama') || g.has('Serie') || g.has('Detective') || g.has('Spanning') ? 5 : g.has('Documentaire') ? 4 : g.has('Human Interest') || g.has('Kunst/cultuur') || g.has('Natuur') || g.has('Cabaret') ? 2 : 0;
  score += bonus;
  if (!score) return 0;
  if (!p.herhaling) score += 1;
  const m = nlMinuut(p.start);
  if (m >= 20 * 60 && m <= 22 * 60 + 30) score += 2; // de beste tijd van de avond
  return score;
}

// De avond van vandaag: wat nog niet voorbij is. Eerst wat op je lijst staat, dan de beste tips.
export function vanavond(programmas, titels, nu = new Date(), voorkeur = { genres: [], omroepen: [] }) {
  const dag = nlDagVanIso(nu.toISOString());
  const nog = programmas.filter((p) => nlDagVanIso(p.start) === dag && new Date(p.eind) > nu);
  // Van je lijst: een nieuwe uitzending gaat voor een herhaling, daarna de vroegste.
  const lijst = nog
    .map((p) => ({ ...p, titelOpLijst: opMijnLijst(p, titels) }))
    .filter((p) => p.titelOpLijst)
    .sort((a, b) => a.herhaling - b.herhaling || a.start.localeCompare(b.start));
  const tips = nog
    .filter((p) => !lijst.some((x) => x.start === p.start && x.zender === p.zender))
    .map((p) => ({ ...p, score: tipScore(p, voorkeur) }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score || a.start.localeCompare(b.start));
  // Elke titel maar één keer.
  const gezien = new Set();
  return [...lijst, ...tips].filter((p) => !gezien.has(p.titel) && gezien.add(p.titel));
}

// Wat van je Wil ik zien deze week op NPO komt (voor Deze week).
export function lijstOpNpo(programmas, titels, dagen) {
  const op = new Set(dagen);
  return programmas
    .filter((p) => op.has(nlDagVanIso(p.start)) && !p.herhaling)
    .map((p) => ({ ...p, titelOpLijst: opMijnLijst(p, titels) }))
    .filter((p) => p.titelOpLijst);
}

// Doorklikken: de serie- of programmapagina op NPO Start, anders de livestream.
export function npoLink(p) {
  return /^[\w-]+$/.test(p.serie ?? '') ? `https://npo.nl/start/serie/${p.serie}` : p.live;
}
