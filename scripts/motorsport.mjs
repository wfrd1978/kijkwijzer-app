// Haalt de kalenders van een paar raceklassen op bij TheSportsDB (gratis, zonder eigen sleutel)
// en zet ze klaar als public/motorsport.json. Draait in GitHub, bij elke push en elke nacht.
// Lukt het niet, dan blijft de vorige versie staan (zie vorige.mjs en aanvullen.mjs).
import { writeFile } from 'node:fs/promises';
import { houdVorige, leesVorige } from './vorige.mjs';
import { SERIES } from '../src/motorsport.js';

const TSDB = 'https://www.thesportsdb.com/api/v1/json/123';
const MAX_RONDES = 6; // de eerstvolgende ronde en de vijf daarna

const wacht = (ms) => new Promise((klaar) => setTimeout(klaar, ms));
async function haal(pad, poging = 1) {
  await wacht(2100); // rustig aan: de gratis versie staat niet veel vragen per minuut toe
  const antwoord = await fetch(`${TSDB}/${pad}`, { signal: AbortSignal.timeout(30000) });
  // Te veel vragen: één minuut wachten en het nog één keer proberen.
  if (antwoord.status === 429 && poging === 1) {
    console.log('Te veel vragen, over een minuut opnieuw.');
    await wacht(61000);
    return haal(pad, 2);
  }
  if (!antwoord.ok) throw new Error(`status ${antwoord.status}`);
  return antwoord.json();
}

// 'Malaysia Free Practice 1' → 'Vrije training 1'; 'Red Bull Ring Race 1' → 'Race 1'.
const VERTALING = [
  [/^Free Practice/i, 'Vrije training'],
  [/^Practice/i, 'Training'],
  [/^Qualifying/i, 'Kwalificatie'],
  [/^Sprint Race/i, 'Sprintrace'],
  [/^GP$|^Grand Prix$/i, 'Race'],
];
// Het gezamenlijke begin van een paar namen, in hele woorden ('Malaysia ' bij 'Malaysia Qualifying 1'
// en 'Malaysia GP'). Blijft er dan alleen een nummer over ('1'), dan een woord minder ('Race 1').
function gemeenschappelijkBegin(namen) {
  if (namen.length < 2) return '';
  let begin = namen[0];
  for (const n of namen) while (!n.startsWith(begin)) begin = begin.slice(0, -1);
  begin = begin.slice(0, begin.lastIndexOf(' ') + 1);
  if (namen.some((n) => /^\d+$/.test(n.slice(begin.length).trim()))) begin = begin.slice(0, begin.trimEnd().lastIndexOf(' ') + 1);
  return begin;
}
const vertaal = (naam) => VERTALING.reduce((n, [patroon, nl]) => n.replace(patroon, nl), naam.trim());
const isSessie = (naam) => /practice|qualifying|warm.?up|shootout|hyperpole/i.test(naam);

function naarRonde(events) {
  const sessies = events.filter((e) => isSessie(e.strEvent));
  const races = events.filter((e) => !isSessie(e.strEvent));
  const beginSessies = gemeenschappelijkBegin(sessies.map((e) => e.strEvent));
  const beginRaces = gemeenschappelijkBegin(races.map((e) => e.strEvent));
  // De naam van het weekend: de GP of de enige race, anders het gezamenlijke begin ('Red Bull Ring').
  const gp = races.find((e) => /\bGP$|Grand Prix$/i.test(e.strEvent));
  const naam =
    (gp?.strEvent ?? (races.length === 1 ? races[0].strEvent : beginRaces.replace(/\s*Race\s*$/i, '').trim())) ||
    beginSessies.trim() ||
    events[0].strVenue ||
    events[0].strEvent;
  const sessieNaam = (e) => {
    if (!isSessie(e.strEvent)) {
      if (e === gp || races.length === 1) return 'Race';
      return vertaal(e.strEvent.slice(beginRaces.length) || e.strEvent);
    }
    return vertaal(e.strEvent.slice(beginSessies.length) || e.strEvent);
  };
  return {
    ronde: Number(events[0].intRound) || null,
    naam,
    plaats: events[0].strVenue ?? '',
    land: events[0].strCountry ?? '',
    sessies: events
      .filter((e) => e.strTimestamp)
      .map((e) => {
        const metTijd = Boolean(e.strTime) && e.strTime !== '00:00:00';
        return { naam: sessieNaam(e), start: new Date(`${e.strTimestamp.replace(/Z?$/, '')}Z`).toISOString(), metTijd };
      })
      .sort((a, b) => a.start.localeCompare(b.start)),
  };
}

const uit = {};
let gelukt = 0;
const vorige = await leesVorige('motorsport');
for (const [sleutel, serie] of Object.entries(SERIES)) {
  const races = [];
  try {
    for (const id of serie.ids) {
      const eerst = (await haal(`eventsnextleague.php?id=${id}`)).events?.[0];
      if (!eerst) continue;
      const ronde = Number(eerst.intRound) || 1;
      for (let r = ronde; r < ronde + MAX_RONDES; r++) {
        const events = (await haal(`eventsround.php?id=${id}&r=${r}&s=${encodeURIComponent(eerst.strSeason)}`)).events ?? [];
        if (!events.length) break; // einde van het seizoen
        races.push({ ...naarRonde(events), reeks: serie.ids.length > 1 ? serie.reeksNamen?.[id] ?? '' : '' });
      }
    }
    races.sort((a, b) => (a.sessies[0]?.start ?? '').localeCompare(b.sessies[0]?.start ?? ''));
    uit[sleutel] = { races };
    gelukt += 1;
    console.log(`${serie.naam}: ${races.length} rondes`);
  } catch (fout) {
    // Niet gelukt: de vorige versie van deze klasse houden, zodat er geen gat valt.
    if (vorige?.series?.[sleutel]) uit[sleutel] = vorige.series[sleutel];
    console.log(`${serie.naam}: niet gelukt (${fout.message})${uit[sleutel] ? '; vorige versie behouden' : ''}`);
  }
}

if (!gelukt) {
  console.log('Geen enkele raceklasse opgehaald: motorsport.json niet opnieuw geschreven.');
  await houdVorige('motorsport');
  process.exit(0);
}
await writeFile(new URL('../public/motorsport.json', import.meta.url), JSON.stringify({ op: new Date().toISOString(), series: uit }));
console.log('motorsport.json geschreven.');
