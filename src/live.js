// Live standen: tijdens een wedstrijd haalt de app zelf de stand op (de schema's komen 's nachts,
// dat is hiervoor te traag). Bron: OpenLigaDB (gratis en open, bedoeld voor dit gebruik), voor de
// Bundesliga, Champions League, Premier League, LaLiga, Europa League, Conference League en DFB-Pokal.
// De Eredivisie, Serie A en KNVB-beker heeft OpenLigaDB niet; daar is (nog) geen live stand.

const OLDB = (liga) => ({ bron: 'oldb', liga });
export const LIVE_BRON = {
  CL: OLDB('ucl'),
  PL: OLDB('pl'),
  BL1: OLDB('bl1'),
  PD: OLDB('la1'),
  EL: OLDB('uel2026'),
  ECL: OLDB('uecl2026'),
};
// Losse clubwedstrijden van TheSportsDB (bekers en dergelijke), op naam van de competitie.
const PER_NAAM = { 'DFB-Pokal': OLDB('dfb'), 'Europa League': LIVE_BRON.EL, 'Conference League': LIVE_BRON.ECL };

export function bronVoor(w) {
  return LIVE_BRON[w.competitie] ?? PER_NAAM[w.competitieNaam] ?? null;
}

// Alleen vragen rond de wedstrijd: vanaf 5 minuten voor de aftrap tot 2,5 uur erna.
export function inLiveVenster(w, nu = Date.now()) {
  const t = new Date(w.start).getTime();
  return nu >= t - 5 * 60000 && nu <= t + 150 * 60000;
}
// Een eindstand mag blijven staan tot 12 uur na de aftrap.
export function vanVandaagNog(w, nu = Date.now()) {
  const t = new Date(w.start).getTime();
  return nu >= t - 5 * 60000 && nu <= t + 12 * 3600000;
}

// --- De antwoorden van de bronnen in één vorm: { start, thuis, uit, doelThuis, doelUit, toestand, minuut } ---
// toestand: 'nog' (niet begonnen), 'live' of 'klaar'.

export function uitOpenLigaDB(wedstrijden) {
  return (wedstrijden ?? []).map((m) => {
    const laatste = (m.goals ?? []).at(-1);
    const uitslag = [...(m.matchResults ?? [])].sort((a, b) => (a.resultOrderID ?? 0) - (b.resultOrderID ?? 0)).at(-1);
    const begonnen = Date.now() >= new Date(m.matchDateTimeUTC).getTime();
    const doelThuis = laatste?.scoreTeam1 ?? uitslag?.pointsTeam1 ?? (begonnen ? 0 : null);
    const doelUit = laatste?.scoreTeam2 ?? uitslag?.pointsTeam2 ?? (begonnen ? 0 : null);
    return {
      start: m.matchDateTimeUTC,
      thuis: m.team1?.teamName ?? '',
      uit: m.team2?.teamName ?? '',
      doelThuis,
      doelUit,
      toestand: m.matchIsFinished ? 'klaar' : begonnen ? 'live' : 'nog',
      minuut: m.matchIsFinished ? null : laatste?.matchMinute ? `${laatste.matchMinute}'` : null,
    };
  });
}

export function uitEspn(antwoord) {
  return (antwoord?.events ?? []).map((e) => {
    const c = e.competitions?.[0] ?? {};
    const kant = (k) => c.competitors?.find((x) => x.homeAway === k) ?? {};
    const status = e.status ?? c.status ?? {};
    const staat = status.type?.state;
    const score = (x) => (x.score == null || x.score === '' ? null : Number(x.score));
    return {
      start: e.date,
      thuis: kant('home').team?.displayName ?? '',
      uit: kant('away').team?.displayName ?? '',
      doelThuis: score(kant('home')),
      doelUit: score(kant('away')),
      toestand: staat === 'post' ? 'klaar' : staat === 'in' ? 'live' : 'nog',
      minuut: staat === 'in' ? (status.type?.shortDetail === 'HT' ? 'rust' : status.displayClock || null) : null,
    };
  });
}

// --- De stand bij een wedstrijd uit ons schema zoeken: zelfde aftrap (binnen 10 minuten) en beide clubs lijken op elkaar ---

const STOP = new Set(['fc', 'fk', 'sc', 'ac', 'afc', 'cf', 'club', 'the', 'of', 'de', 'sk', 'if', 'bk', 'sv', 'ss', 'calcio', 'football', 'us', 'vfl', 'vfb', 'tsg', 'rb', 'ssc', 'as', 'rcd', 'ud', 'cd', 'sd']);
const woorden = (n) => (n ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ç/g, 'c').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !STOP.has(w));
// Twee woorden horen bij elkaar als ze gelijk zijn, of met dezelfde vier letters beginnen ('barca' en 'barcelona').
const zelfdeWoord = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && a.slice(0, 4) === b.slice(0, 4));
function lijkt(a, b) {
  const [x, y] = [woorden(a), woorden(b)];
  return x.length > 0 && y.length > 0 && x.some((w) => y.some((v) => zelfdeWoord(w, v)));
}
export function vindStand(w, standen) {
  const t = new Date(w.start).getTime();
  return standen.find((s) => Math.abs(new Date(s.start).getTime() - t) <= 10 * 60000 && lijkt(w.thuis.naam, s.thuis) && lijkt(w.uit.naam, s.uit)) ?? null;
}

// De tekst bij een wedstrijd: 'LIVE 2-1 · 67'' of '2-1' (eindstand). Null als er (nog) niets te tonen is.
export function standTekst(s) {
  if (!s || s.toestand === 'nog' || s.doelThuis == null || s.doelUit == null) return null;
  const stand = `${s.doelThuis}-${s.doelUit}`;
  return s.toestand === 'live' ? { live: true, tekst: `${stand}${s.minuut ? ` · ${s.minuut}` : ''}` } : { live: false, tekst: stand };
}
