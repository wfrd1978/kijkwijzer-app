// Voetbal: het schema dat GitHub dagelijks klaarzet (voetbal.json), je eigen keuzes, en de zenders.
// De zenders per competitie staan hier vast (geen gratis bron geeft ze mee); gecontroleerd bij
// VI (augustus 2026). Bijwerken als de rechten wisselen.

export const VOETBAL_GECONTROLEERD = 'oktober 2026';

export const COMPETITIES = {
  DED: { naam: 'Eredivisie', kort: 'Eredivisie', zenders: [{ naam: 'ESPN', zeker: true }] },
  CL: { naam: 'Champions League', kort: 'CL', zenders: [{ naam: 'Ziggo Sport', zeker: true }], noot: 'Duels van Nederlandse clubs gratis via Ziggo Sport Free' },
  PL: { naam: 'Premier League', kort: 'PL', zenders: [{ naam: 'Viaplay', zeker: false }], noot: 'Gaat mogelijk naar Videoland; één duel per speelronde bij Amazon Prime' },
  BL1: { naam: 'Bundesliga', kort: 'Bundesliga', zenders: [{ naam: 'Viaplay', zeker: false }], noot: 'Gaat mogelijk naar Videoland' },
  PD: { naam: 'LaLiga', kort: 'LaLiga', zenders: [{ naam: 'Ziggo Sport', zeker: true }] },
  SA: { naam: 'Serie A', kort: 'Serie A', zenders: [{ naam: 'Ziggo Sport', zeker: true }] },
};

// --- Je keuzes (op de telefoon, gaan mee in de backup) ---
// clubs: ids van football-data; alles: competities waarvan je álle wedstrijden wilt zien.

const OPSLAG = 'voetbal';

export function leesVoetbalKeuzes() {
  try {
    const k = JSON.parse(localStorage.getItem(OPSLAG) || '{}');
    return {
      clubs: Array.isArray(k.clubs) ? k.clubs.filter(Number.isInteger) : [],
      alles: Array.isArray(k.alles) ? k.alles.filter((c) => c in COMPETITIES) : [],
    };
  } catch {
    return { clubs: [], alles: [] };
  }
}

export function zetVoetbalKeuzes(k) {
  localStorage.setItem(OPSLAG, JSON.stringify({ clubs: k.clubs, alles: k.alles }));
}

// Wedstrijden van je clubs (in elke competitie) en alle wedstrijden van de competities die je helemaal volgt.
export function mijnWedstrijden(wedstrijden, keuzes) {
  return wedstrijden.filter(
    (w) => keuzes.alles.includes(w.competitie) || keuzes.clubs.includes(w.thuis.id) || keuzes.clubs.includes(w.uit.id)
  );
}

// Alle ploegen in het schema, per competitie, om je clubs uit te kiezen.
export function ploegenPerCompetitie(wedstrijden) {
  const per = {};
  for (const w of wedstrijden) {
    for (const p of [w.thuis, w.uit]) {
      if (!Number.isInteger(p.id)) continue;
      (per[w.competitie] ??= new Map()).set(p.id, p);
    }
  }
  return Object.fromEntries(
    Object.keys(COMPETITIES)
      .filter((c) => per[c])
      .map((c) => [c, [...per[c].values()].sort((a, b) => a.naam.localeCompare(b.naam, 'nl'))])
  );
}

// --- Per dag en per week, in Nederlandse tijd ---

const NL = 'Europe/Amsterdam';

export function nlDag(iso) {
  // 'jjjj-mm-dd' in Nederlandse tijd
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: NL });
}

// Maandag van de week waarin deze dag valt ('jjjj-mm-dd').
export function weekStart(dag) {
  const d = new Date(`${dag}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export function perDag(wedstrijden) {
  const dagen = new Map();
  for (const w of [...wedstrijden].sort((a, b) => a.start.localeCompare(b.start))) {
    const d = nlDag(w.start);
    if (!dagen.has(d)) dagen.set(d, []);
    dagen.get(d).push(w);
  }
  return [...dagen.entries()].map(([dag, lijst]) => ({ dag, wedstrijden: lijst }));
}

export function aftrap(iso) {
  return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', timeZone: NL });
}

// 'Vandaag', 'Morgen' of 'zaterdag 31 oktober'.
export function dagNaam(dag, vandaag) {
  if (dag === vandaag) return 'Vandaag';
  const morgen = new Date(`${vandaag}T12:00:00Z`);
  morgen.setUTCDate(morgen.getUTCDate() + 1);
  if (dag === morgen.toISOString().slice(0, 10)) return 'Morgen';
  return new Date(`${dag}T12:00:00Z`).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

// --- Oranje: de eerstvolgende interland via TheSportsDB (gratis, zonder sleutel) ---

export function oranjeZender(competitie) {
  return /nations league|qualif|kwalificatie/i.test(competitie ?? '')
    ? [{ naam: 'Ziggo Sport', zeker: true }]
    : [{ naam: 'NOS', zeker: true }];
}

// Landen in het Nederlands (TheSportsDB geeft Engelse namen).
const LANDEN = {
  Netherlands: 'Nederland', Germany: 'Duitsland', Belgium: 'België', France: 'Frankrijk', Spain: 'Spanje', Italy: 'Italië',
  England: 'Engeland', Scotland: 'Schotland', Wales: 'Wales', Ireland: 'Ierland', 'Northern Ireland': 'Noord-Ierland',
  Greece: 'Griekenland', Poland: 'Polen', Portugal: 'Portugal', Denmark: 'Denemarken', Norway: 'Noorwegen', Sweden: 'Zweden',
  Finland: 'Finland', Iceland: 'IJsland', Austria: 'Oostenrijk', Switzerland: 'Zwitserland', Croatia: 'Kroatië', Serbia: 'Servië',
  Hungary: 'Hongarije', 'Czech Republic': 'Tsjechië', Czechia: 'Tsjechië', Turkey: 'Turkije', Romania: 'Roemenië', Ukraine: 'Oekraïne',
  Bosnia: 'Bosnië', 'Bosnia and Herzegovina': 'Bosnië en Herzegovina', Malta: 'Malta', Lithuania: 'Litouwen', Gibraltar: 'Gibraltar',
  Brazil: 'Brazilië', Argentina: 'Argentinië', 'United States': 'Verenigde Staten', USA: 'Verenigde Staten', Mexico: 'Mexico', Japan: 'Japan',
};

export async function haalOranje({ fetcher = fetch } = {}) {
  const antwoord = await fetcher('https://www.thesportsdb.com/api/v1/json/123/eventsnext.php?id=133905');
  if (!antwoord.ok) throw new Error(`TheSportsDB gaf ${antwoord.status}`);
  const e = (await antwoord.json()).events?.[0];
  if (!e?.strTimestamp) return null;
  const nl = (naam) => LANDEN[naam] ?? naam;
  return {
    start: `${e.strTimestamp.replace(/Z?$/, '')}Z`,
    thuis: nl(e.strHomeTeam),
    uit: nl(e.strAwayTeam),
    competitie: e.strLeague ?? '',
    zenders: oranjeZender(e.strLeague),
  };
}
