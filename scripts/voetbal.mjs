// Haalt het voetbalschema op bij football-data.org en zet het klaar als public/voetbal.json.
// Draait in GitHub (bij elke push en één keer per dag), met de sleutel als GitHub-geheim
// FOOTBALL_DATA_KEY. De app zelf mag football-data niet rechtstreeks aanroepen.
// Zonder sleutel of bij een storing wordt er niets geschreven en gaat het online zetten gewoon door.
import { writeFile } from 'node:fs/promises';
import { houdVorige, leesVorige } from './vorige.mjs';

const SLEUTEL = process.env.FOOTBALL_DATA_KEY;
// Eredivisie, Champions League, Premier League, Bundesliga, LaLiga, Serie A (gratis bij football-data).
const COMPETITIES = ['DED', 'CL', 'PL', 'BL1', 'PD', 'SA'];
const DAGEN_VOORUIT = 15;
const WACHT = 7000; // de gratis versie staat 10 vragen per minuut toe

if (!SLEUTEL) {
  console.log('Geen FOOTBALL_DATA_KEY: voetbalschema overgeslagen.');
  await houdVorige('voetbal');
  process.exit(0);
}

const dag = (d) => d.toISOString().slice(0, 10);
const van = new Date(Date.now() - 86400000);
const tot = new Date(Date.now() + DAGEN_VOORUIT * 86400000);
const ploeg = (t) => ({ id: t?.id ?? null, naam: t?.shortName || t?.name || 'Nog onbekend', vol: t?.name ?? '', logo: t?.crest ?? '' });

const wacht = (ms) => new Promise((klaar) => setTimeout(klaar, ms));
// Eén competitie ophalen. Te veel vragen (429, bijvoorbeeld omdat de andere app net dezelfde
// sleutel gebruikte): één minuut wachten en het nog één keer proberen.
async function haalCompetitie(code) {
  const adres = `https://api.football-data.org/v4/competitions/${code}/matches?dateFrom=${dag(van)}&dateTo=${dag(tot)}`;
  for (let poging = 1; ; poging++) {
    const antwoord = await fetch(adres, { headers: { 'X-Auth-Token': SLEUTEL }, signal: AbortSignal.timeout(30000) });
    if (antwoord.status === 429 && poging === 1) {
      console.log(`${code}: te veel vragen, over een minuut opnieuw.`);
      await wacht(61000);
      continue;
    }
    return antwoord;
  }
}

const wedstrijden = [];
const mislukt = [];
let gelukt = 0;
for (const [i, code] of COMPETITIES.entries()) {
  if (i) await wacht(WACHT);
  try {
    const antwoord = await haalCompetitie(code);
    if (!antwoord.ok) throw new Error(`status ${antwoord.status}`);
    const data = await antwoord.json();
    for (const m of data.matches ?? []) {
      wedstrijden.push({
        id: m.id,
        competitie: code,
        start: m.utcDate,
        status: m.status,
        ronde: m.matchday ?? null,
        fase: m.stage ?? '',
        thuis: ploeg(m.homeTeam),
        uit: ploeg(m.awayTeam),
      });
    }
    gelukt += 1;
    console.log(`${code}: ${data.matches?.length ?? 0} wedstrijden`);
  } catch (fout) {
    console.log(`${code}: niet gelukt (${fout.message})`);
    mislukt.push(code);
  }
}

if (!gelukt) {
  console.log('Geen enkele competitie opgehaald: voetbal.json niet opnieuw geschreven.');
  await houdVorige('voetbal');
  process.exit(0);
}
// Competities die nu niet lukten: aanvullen uit de versie die online staat, zodat er geen gat valt.
if (mislukt.length) {
  const vorige = await leesVorige('voetbal');
  const aangevuld = (vorige?.wedstrijden ?? []).filter((w) => mislukt.includes(w.competitie));
  wedstrijden.push(...aangevuld);
  console.log(`Aangevuld uit de vorige versie: ${aangevuld.length} wedstrijden (${mislukt.join(', ')}).`);
}
wedstrijden.sort((a, b) => a.start.localeCompare(b.start));
await writeFile(new URL('../public/voetbal.json', import.meta.url), JSON.stringify({ op: new Date().toISOString(), van: dag(van), tot: dag(tot), wedstrijden }));
console.log(`voetbal.json geschreven: ${wedstrijden.length} wedstrijden.`);
