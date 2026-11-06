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
  // Deze twee komen van TheSportsDB (football-data heeft ze niet gratis).
  EL: { naam: 'Europa League', kort: 'EL', zenders: [{ naam: 'Ziggo Sport', zeker: false }] },
  ECL: { naam: 'Conference League', kort: 'Conference League', zenders: [{ naam: 'Ziggo Sport', zeker: false }] },
  // Landenteams, ook van TheSportsDB.
  UNL: { naam: 'Nations League', kort: 'Nations League', zenders: [{ naam: 'Ziggo Sport', zeker: false }], landen: true },
  EC: { naam: 'EK', kort: 'EK', zenders: [{ naam: 'NOS', zeker: false }], landen: true },
  WC: { naam: 'WK', kort: 'WK', zenders: [{ naam: 'NOS', zeker: false }], landen: true },
};

// Een losse clubwedstrijd van TheSportsDB in een competitie die we ook helemaal hebben.
export const COMPETITIE_PER_NAAM = { 'Europa League': 'EL', 'Conference League': 'ECL', 'UEFA Nations League': 'UNL', 'FIFA World Cup': 'WC', 'UEFA European Championships': 'EC' };

// Landen die je kunt volgen: de eerstvolgende interland (ook oefen- en kwalificatieduels).
// id: het nummer bij TheSportsDB.
export const VOLG_LANDEN = {
  NL: { naam: 'Nederland', id: 133905 },
  BE: { naam: 'België', id: 134515 },
  DE: { naam: 'Duitsland', id: 133907 },
  FR: { naam: 'Frankrijk', id: 133913 },
  EN: { naam: 'Engeland', id: 133914 },
  ES: { naam: 'Spanje', id: 133909 },
  IT: { naam: 'Italië', id: 133910 },
  PT: { naam: 'Portugal', id: 133908 },
  HR: { naam: 'Kroatië', id: 133912 },
  DK: { naam: 'Denemarken', id: 133906 },
  CH: { naam: 'Zwitserland', id: 134506 },
  AT: { naam: 'Oostenrijk', id: 135986 },
  TR: { naam: 'Turkije', id: 135985 },
  PL: { naam: 'Polen', id: 133901 },
  SC: { naam: 'Schotland', id: 136450 },
  NO: { naam: 'Noorwegen', id: 136516 },
  MA: { naam: 'Marokko', id: 136139 },
  CW: { naam: 'Curaçao', id: 140271 },
  SR: { naam: 'Suriname', id: 140285 },
  BR: { naam: 'Brazilië', id: 134496 },
  AR: { naam: 'Argentinië', id: 134509 },
};

// --- Je keuzes (op de telefoon, gaan mee in de backup) ---
// clubs: ids van football-data; alles: competities waarvan je álle wedstrijden wilt zien;
// landen: landenteams (VOLG_LANDEN). Wie nog nooit landen koos, volgt Oranje (zoals altijd al).

const OPSLAG = 'voetbal';

export function leesVoetbalKeuzes() {
  try {
    const k = JSON.parse(localStorage.getItem(OPSLAG) || '{}');
    return {
      clubs: Array.isArray(k.clubs) ? k.clubs.filter(Number.isInteger) : [],
      alles: Array.isArray(k.alles) ? k.alles.filter((c) => c in COMPETITIES) : [],
      landen: Array.isArray(k.landen) ? k.landen.filter((c) => c in VOLG_LANDEN) : ['NL'],
    };
  } catch {
    return { clubs: [], alles: [], landen: ['NL'] };
  }
}

export function zetVoetbalKeuzes(k) {
  localStorage.setItem(OPSLAG, JSON.stringify({ clubs: k.clubs, alles: k.alles, landen: k.landen ?? ['NL'] }));
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

// --- Landenteams: de eerstvolgende interland via TheSportsDB (gratis, zonder sleutel) ---

// Oranje: Nations League en kwalificatie bij Ziggo Sport, de rest (EK, WK, oefenduels) bij de NOS.
// Andere landen: alleen EK en WK zijn zeker op tv (NOS); de rest is onbekend.
export function oranjeZender(competitie, land = 'NL') {
  if (land !== 'NL') return /^(FIFA World Cup|UEFA European Championships?)$/i.test(competitie ?? '') ? [{ naam: 'NOS', zeker: false }] : [];
  return /nations league|qualif|kwalificatie/i.test(competitie ?? '')
    ? [{ naam: 'Ziggo Sport', zeker: true }]
    : [{ naam: 'NOS', zeker: true }];
}

// Korte Nederlandse naam van een competitie van TheSportsDB.
export function competitieNl(naam) {
  const n = naam ?? '';
  if (/nations league/i.test(n)) return 'Nations League';
  if (/world cup qualifying/i.test(n)) return 'WK-kwalificatie';
  if (/euro.*qualif/i.test(n)) return 'EK-kwalificatie';
  if (/^FIFA World Cup$/i.test(n)) return 'WK';
  if (/^UEFA European Championships?$/i.test(n)) return 'EK';
  if (/friendl/i.test(n)) return 'Oefeninterland';
  return n;
}

// Landen in het Nederlands (TheSportsDB geeft Engelse namen).
export const LANDEN = {
  Netherlands: 'Nederland', Germany: 'Duitsland', Belgium: 'België', France: 'Frankrijk', Spain: 'Spanje', Italy: 'Italië',
  England: 'Engeland', Scotland: 'Schotland', Wales: 'Wales', Ireland: 'Ierland', 'Northern Ireland': 'Noord-Ierland',
  Greece: 'Griekenland', Poland: 'Polen', Portugal: 'Portugal', Denmark: 'Denemarken', Norway: 'Noorwegen', Sweden: 'Zweden',
  Finland: 'Finland', Iceland: 'IJsland', Austria: 'Oostenrijk', Switzerland: 'Zwitserland', Croatia: 'Kroatië', Serbia: 'Servië',
  Hungary: 'Hongarije', 'Czech Republic': 'Tsjechië', Czechia: 'Tsjechië', Turkey: 'Turkije', Romania: 'Roemenië', Ukraine: 'Oekraïne',
  Bosnia: 'Bosnië', 'Bosnia and Herzegovina': 'Bosnië en Herzegovina', Malta: 'Malta', Lithuania: 'Litouwen', Gibraltar: 'Gibraltar',
  Brazil: 'Brazilië', Argentina: 'Argentinië', 'United States': 'Verenigde Staten', USA: 'Verenigde Staten', Mexico: 'Mexico', Japan: 'Japan',
  Morocco: 'Marokko', 'Curacao': 'Curaçao', Slovakia: 'Slowakije', Slovenia: 'Slovenië', Albania: 'Albanië', Armenia: 'Armenië', Cyprus: 'Cyprus',
  Georgia: 'Georgië', Bulgaria: 'Bulgarije', 'North Macedonia': 'Noord-Macedonië', Montenegro: 'Montenegro', Kosovo: 'Kosovo', Israel: 'Israël',
  Estonia: 'Estland', Latvia: 'Letland', Belarus: 'Wit-Rusland', Moldova: 'Moldavië', Kazakhstan: 'Kazachstan', Azerbaijan: 'Azerbeidzjan',
  Luxembourg: 'Luxemburg', Andorra: 'Andorra', 'San Marino': 'San Marino', Liechtenstein: 'Liechtenstein', 'Faroe Islands': 'Faeröer',
};

export async function haalInterland(land = 'NL', { fetcher = fetch } = {}) {
  const antwoord = await fetcher(`https://www.thesportsdb.com/api/v1/json/123/eventsnext.php?id=${VOLG_LANDEN[land].id}`);
  if (!antwoord.ok) throw new Error(`TheSportsDB gaf ${antwoord.status}`);
  const e = (await antwoord.json()).events?.[0];
  if (!e?.strTimestamp) return null;
  const nl = (naam) => LANDEN[naam] ?? naam;
  return {
    land,
    id: `tsdb-${e.idEvent}`,
    start: `${e.strTimestamp.replace(/Z?$/, '')}Z`,
    thuis: nl(e.strHomeTeam),
    uit: nl(e.strAwayTeam),
    competitie: competitieNl(e.strLeague),
    zenders: oranjeZender(e.strLeague, land),
  };
}
export const haalOranje = (opties) => haalInterland('NL', opties);
