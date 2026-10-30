// Wedstrijden van je clubs die niet in het gratis schema van football-data staan, zoals de beker
// (KNVB Beker, DFB-Pokal, FA Cup) of de Europa League. TheSportsDB geeft per club gratis de
// eerstvolgende wedstrijd; die vult het schema aan.
import { kaal } from './titels.js';

const BASIS = 'https://www.thesportsdb.com/api/v1/json/123';

// Competities die football-data al levert: die niet dubbel tonen.
const AL_IN_SCHEMA = ['German Bundesliga', 'Dutch Eredivisie', 'UEFA Champions League', 'English Premier League', 'Spanish La Liga', 'Italian Serie A'];

// Nederlandse namen voor de bekendste andere competities.
const NAMEN = {
  'Dutch KNVB Cup': 'KNVB Beker',
  'Dutch KNVB Beker': 'KNVB Beker',
  'DFB-Pokal': 'DFB-Pokal',
  'German DFB Pokal': 'DFB-Pokal',
  'English FA Cup': 'FA Cup',
  'English League Cup': 'League Cup',
  'English EFL Cup': 'League Cup',
  'EFL Cup': 'League Cup',
  'Spanish Copa del Rey': 'Copa del Rey',
  'Italian Coppa Italia': 'Coppa Italia',
  'UEFA Europa League': 'Europa League',
  'UEFA Europa Conference League': 'Conference League',
  'UEFA Conference League': 'Conference League',
  'UEFA Super Cup': 'UEFA Super Cup',
};
export const competitieNaam = (liga) => NAMEN[liga] ?? liga ?? 'Overige wedstrijd';

// Waar te zien in Nederland, voor zover bekend (gecontroleerd oktober 2026). Onbekend: geen zender.
export const EXTRA_ZENDERS = { 'KNVB Beker': [{ naam: 'ESPN', zeker: false }] };

const woorden = (x) => kaal(x).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length >= 2 && !['fc', 'sc', 'sv', 'ac', 'cf', 'afc'].includes(w));

// Clubs waarvan de naam bij football-data te kort of te anders is om op te zoeken.
const ZOEKNAMEN = { AZ: 'AZ Alkmaar', Inter: 'Inter Milan', Atleti: 'Atletico Madrid', Bayern: 'Bayern Munich', Barça: 'Barcelona', 'Man City': 'Manchester City', 'Man United': 'Manchester United' };

// Welke namen we proberen, de meest waarschijnlijke eerst.
export function zoeknamen(club) {
  const zonderVoorvoegsel = (club.vol ?? '').replace(/^(A?FC|SC|SV|AC|SSC|VfL|VfB|RCD|CF)\s+/i, '');
  return [...new Set([ZOEKNAMEN[club.naam], club.naam, zonderVoorvoegsel, club.vol].filter((x) => x && x.length >= 3))];
}

// Welk team in de zoekresultaten is deze club? Voetbal, de naam komt overeen, en het team speelt
// in een van de grote competities (zo vallen amateur- en jeugdteams met dezelfde naam weg).
export function kiesTeam(teams, club) {
  const eigen = new Set([...woorden(club.naam), ...woorden(club.vol ?? ''), ...woorden(ZOEKNAMEN[club.naam] ?? '')]);
  return (
    (teams ?? []).find((t) => {
      if (t.strSport !== 'Soccer' || !AL_IN_SCHEMA.includes(t.strLeague)) return false;
      if (/amateur|youth|jong|u\d\d|women|vrouwen|reserves/i.test(t.strTeam)) return false;
      const namen = [t.strTeam, ...(t.strTeamAlternate ?? '').split(',')];
      return namen.some((n) => woorden(n).some((w) => eigen.has(w)));
    }) ?? null
  );
}

// Van een TheSportsDB-wedstrijd naar dezelfde vorm als het schema. Null als het een competitie is
// die het schema al heeft, of als er geen tijd bekend is.
export function naarWedstrijd(e, club, teamId) {
  if (!e?.strTimestamp || AL_IN_SCHEMA.includes(e.strLeague)) return null;
  const thuisIsClub = e.idHomeTeam === teamId;
  const ploeg = (eigen, naam, logo) => (eigen ? { id: club.id, naam: club.naam, logo: club.logo ?? '' } : { id: null, naam: naam ?? 'Nog onbekend', logo: logo ?? '' });
  return {
    id: `tsdb-${e.idEvent}`,
    competitie: 'EXTRA',
    competitieNaam: competitieNaam(e.strLeague),
    start: `${e.strTimestamp.replace(/Z?$/, '')}Z`,
    status: 'TIMED',
    thuis: ploeg(thuisIsClub, e.strHomeTeam, e.strHomeTeamBadge),
    uit: ploeg(!thuisIsClub, e.strAwayTeam, e.strAwayTeamBadge),
  };
}

// Staat deze wedstrijd al in het schema (zelfde dag en aftrap, een van je clubs speelt)?
export function alBekend(w, schema) {
  const dag = w.start.slice(0, 13);
  return schema.some((x) => x.start.slice(0, 13) === dag && [x.thuis.id, x.uit.id].some((id) => id && [w.thuis.id, w.uit.id].includes(id)));
}

// Haalt voor elke club de eerstvolgende wedstrijd op. 'koppelingen' onthoudt welke TheSportsDB-club
// bij welke football-data-club hoort (wordt aangevuld en teruggegeven).
// TheSportsDB staat gratis maar een beperkt aantal vragen per minuut toe: daarom rustig aan.
// Lukt het bij een club niet (te veel vragen, geen internet), dan stoppen met wat er al is.
export async function haalExtraWedstrijden(clubs, koppelingen = {}, fetcher = fetch, wacht = 2100) {
  let eerste = true;
  const vraag = async (pad) => {
    if (!eerste && wacht) await new Promise((klaar) => setTimeout(klaar, wacht));
    eerste = false;
    // Te veel vragen achter elkaar: even wachten en het één keer opnieuw proberen. In de browser komt
    // die melding zonder toestemmingskop binnen en lijkt hij op 'geen verbinding', dus ook dan.
    const probeer = () => fetcher(`${BASIS}/${pad}`).catch((fout) => ({ ok: false, status: 0, fout }));
    let antwoord = await probeer();
    if ((antwoord.status === 429 || antwoord.status === 0) && wacht) {
      await new Promise((klaar) => setTimeout(klaar, 30000));
      antwoord = await probeer();
    }
    if (antwoord.fout) throw antwoord.fout;
    if (!antwoord.ok) throw new Error(`TheSportsDB gaf ${antwoord.status}`);
    return antwoord.json();
  };
  const wedstrijden = [];
  let gelukt = 0;
  // Gaat het bij één club mis, dan door met de volgende (alleen bij geen internet heeft dat geen zin).
  for (const club of clubs) {
    try {
      await voorClub(club);
      gelukt += 1;
    } catch (fout) {
      if (fout instanceof TypeError) break; // geen verbinding
    }
  }
  return { wedstrijden, koppelingen, compleet: gelukt === clubs.length, gelukt };

  async function voorClub(club) {
    let teamId = koppelingen[club.id];
    if (teamId === undefined) {
      teamId = null;
      for (const naam of zoeknamen(club)) {
        const team = kiesTeam((await vraag(`searchteams.php?t=${encodeURIComponent(naam)}`)).teams, club);
        if (team) {
          teamId = team.idTeam;
          break;
        }
      }
      koppelingen[club.id] = teamId;
    }
    if (!teamId) return;
    for (const e of (await vraag(`eventsnext.php?id=${teamId}`)).events ?? []) {
      const w = naarWedstrijd(e, club, teamId);
      if (w) wedstrijden.push(w);
    }
  }
}
