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

// Europa League en Conference League staan niet in de gratis versie van football-data.
// TheSportsDB (gratis, zonder eigen sleutel) geeft per speelronde het hele programma:
// we halen de ronde van de eerstvolgende wedstrijd op, en de ronde daarna.
const TSDB = 'https://www.thesportsdb.com/api/v1/json/123';
const UEFA = { EL: 4481, ECL: 5071 };
const tsdbPloeg = (id, naam, logo) => ({ id: id ? `tsdb-${id}` : null, naam: naam || 'Nog onbekend', vol: naam || '', logo: logo || '' });
async function haalTsdb(pad) {
  await wacht(2100); // rustig aan: de gratis versie staat niet veel vragen per minuut toe
  const antwoord = await fetch(`${TSDB}/${pad}`, { signal: AbortSignal.timeout(30000) });
  if (!antwoord.ok) throw new Error(`status ${antwoord.status}`);
  return antwoord.json();
}
// Vangnet: OpenLigaDB (gratis, open) heeft beide competities compleet, maar met Duitse clubnamen
// en zonder bruikbare logo's. Alleen gebruikt als TheSportsDB een ronde niet helemaal geeft
// (de gratis versie geeft hooguit 50 wedstrijden per ronde, en voorrondes tellen mee).
const OPENLIGA = { EL: 'uel', ECL: 'uecl' };
const NAAMFIX = [
  [/^FC Twente Enschede$/, 'FC Twente'], [/^Ajax Amsterdam$/, 'Ajax'], [/^PSV Eindhoven$/, 'PSV'], [/^Feyenoord Rotterdam$/, 'Feyenoord'], [/^AZ Alkmaar$/, 'AZ'],
  [/^AC Mailand$/, 'AC Milan'], [/^Inter Mailand$/, 'Inter'], [/^AS Rom$/, 'AS Roma'], [/^Lazio Rom$/, 'Lazio'], [/^SSC Neapel$/, 'Napoli'], [/^AC Florenz$/, 'Fiorentina'],
  [/^Atalanta Bergamo$/, 'Atalanta'], [/^Roter Stern Belgrad$/, 'Red Star Belgrade'], [/^ZSKA /, 'CSKA '], [/^FC Kopenhagen$/, 'FC Copenhagen'],
  [/^Sporting Lissabon$/, 'Sporting CP'], [/^Benfica Lissabon$/, 'Benfica'], [/^Celtic Glasgow$/, 'Celtic'], [/^Glasgow Rangers$/, 'Rangers'],
  [/Belgrad$/, 'Belgrade'], [/Tiflis$/, 'Tbilisi'], [/Bukarest$/, 'Bucharest'], [/Prag$/, 'Prague'], [/Warschau$/, 'Warsaw'], [/Kiew$/, 'Kyiv'], [/ F\.C\.$/, ''],
];
const nlNaam = (naam) => NAAMFIX.reduce((n, [patroon, vervang]) => n.replace(patroon, vervang), (naam ?? '').trim()) || 'Nog onbekend';
async function haalOpenLiga(code, seizoen) {
  const antwoord = await fetch(`https://api.openligadb.de/getmatchdata/${OPENLIGA[code]}${seizoen}/${seizoen}`, { signal: AbortSignal.timeout(30000) });
  if (!antwoord.ok) throw new Error(`OpenLigaDB status ${antwoord.status}`);
  return (await antwoord.json())
    .filter((m) => m.matchDateTimeUTC && new Date(m.matchDateTimeUTC) >= van && new Date(m.matchDateTimeUTC) <= tot)
    .map((m) => ({
      id: `oldb-${m.matchID}`,
      competitie: code,
      start: new Date(m.matchDateTimeUTC).toISOString(),
      status: m.matchIsFinished ? 'FINISHED' : 'TIMED',
      ronde: m.group?.groupOrderID ?? null,
      fase: '',
      thuis: { id: null, naam: nlNaam(m.team1?.teamName), vol: nlNaam(m.team1?.teamName), logo: '' },
      uit: { id: null, naam: nlNaam(m.team2?.teamName), vol: nlNaam(m.team2?.teamName), logo: '' },
    }));
}

for (const [code, liga] of Object.entries(UEFA)) {
  try {
    const eerst = (await haalTsdb(`eventsnextleague.php?id=${liga}`)).events?.[0];
    if (!eerst) {
      console.log(`${code}: geen wedstrijden gepland`);
      gelukt += 1;
      continue;
    }
    const ronde = Number(eerst.intRound);
    const gezien = new Set();
    const hier = [];
    for (const r of [ronde, ronde + 1]) {
      for (const e of (await haalTsdb(`eventsround.php?id=${liga}&r=${r}&s=${encodeURIComponent(eerst.strSeason)}`)).events ?? []) {
        if (!e.strTimestamp || gezien.has(e.idEvent)) continue;
        const start = new Date(`${e.strTimestamp.replace(/Z?$/, '')}Z`);
        if (start < van || start > tot) continue;
        gezien.add(e.idEvent);
        hier.push({
          id: `tsdb-${e.idEvent}`,
          competitie: code,
          start: start.toISOString(),
          status: /finished|FT|AET|PEN/i.test(e.strStatus ?? '') ? 'FINISHED' : 'TIMED',
          ronde: r,
          fase: '',
          thuis: tsdbPloeg(e.idHomeTeam, e.strHomeTeam, e.strHomeTeamBadge),
          uit: tsdbPloeg(e.idAwayTeam, e.strAwayTeam, e.strAwayTeamBadge),
        });
      }
    }
    // Zit de eerstvolgende wedstrijd er niet bij terwijl hij binnen het venster valt, dan was de
    // ronde niet compleet: dan het programma van OpenLigaDB gebruiken.
    const eerstStart = new Date(`${eerst.strTimestamp?.replace(/Z?$/, '')}Z`);
    if (eerstStart >= van && eerstStart <= tot && !gezien.has(eerst.idEvent)) {
      const reserve = await haalOpenLiga(code, String(eerst.strSeason).slice(0, 4));
      wedstrijden.push(...reserve);
      console.log(`${code}: ronde niet compleet bij TheSportsDB; ${reserve.length} wedstrijden (OpenLigaDB)`);
    } else {
      wedstrijden.push(...hier);
      console.log(`${code}: ${hier.length} wedstrijden (TheSportsDB)`);
    }
    gelukt += 1;
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
