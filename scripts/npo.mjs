// Haalt de tv-gids van NPO 1, 2 en 3 op (vandaag en de komende dagen) en zet de avond klaar
// als public/npo.json, voor de kijktip "Vanavond op NPO". Draait in GitHub, net als het
// voetbalschema: de app mag de gids van npo.nl niet rechtstreeks ophalen.
// Let op: dit is de gids die npo.nl zelf gebruikt, geen officieel open aanbod. Werkt hij
// niet (meer), dan wordt er niets geschreven en verdwijnt het blok in de app vanzelf.
import { writeFile } from 'node:fs/promises';
import { houdVorige } from './vorige.mjs';

const ZENDERS = [
  { naam: 'NPO 1', guid: '83dc1f25-a065-496c-9418-bd5c60dfb36d', live: 'npo1' },
  { naam: 'NPO 2', guid: '316951f5-ce06-41d2-ae24-44eb25368a61', live: 'npo2' },
  { naam: 'NPO 3', guid: '2042e1ee-0e79-4766-aea2-5b300d6839b2', live: 'npo3' },
];
const DAGEN = 7;
const NL = 'Europe/Amsterdam';

// 'dd-mm-jjjj' zoals de gids het wil, en het uur in Nederlandse tijd.
const gidsDag = (d) => d.toLocaleDateString('nl-NL', { timeZone: NL, day: '2-digit', month: '2-digit', year: 'numeric' }).replaceAll('/', '-');
const nlUur = (d) => Number(d.toLocaleTimeString('nl-NL', { timeZone: NL, hour: '2-digit', hour12: false }).slice(0, 2));
const tekst = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const programmas = [];
let gelukt = 0;
for (let i = 0; i < DAGEN; i++) {
  const dag = new Date(Date.now() + i * 86400000);
  for (const z of ZENDERS) {
    try {
      const antwoord = await fetch(`https://npo.nl/start/api/domain/guide-channel?guid=${z.guid}&date=${gidsDag(dag)}`, {
        headers: { 'User-Agent': 'Kijkwijzer (persoonlijke kijkwijzer-app)' },
      });
      if (!antwoord.ok) throw new Error(`status ${antwoord.status}`);
      for (const p of await antwoord.json()) {
        const start = new Date((p.programStart ?? 0) * 1000);
        const uur = nlUur(start);
        // Alleen de avond (vanaf 17:00) en alleen programma's met een titel.
        if (!p.mainTitle || uur < 17) continue;
        programmas.push({
          zender: z.naam,
          live: `https://npo.nl/start/live?channel=${z.live}`,
          start: start.toISOString(),
          eind: new Date((p.programEnd ?? p.programStart + (p.durationInSeconds ?? 0)) * 1000).toISOString(),
          titel: tekst(p.mainTitle, 120),
          aflevering: tekst(p.episodeTitle, 120),
          omschrijving: tekst(p.synopsis),
          genres: (p.genres ?? []).flatMap((g) => [g.name, ...(g.secondaries ?? []).map((s) => s.name)]).filter((x) => typeof x === 'string'),
          herhaling: Boolean(p.isRepeat),
          beeld: (p.images ?? []).map((b) => b.url).find((u) => typeof u === 'string' && u.startsWith('https://')) ?? '',
          serie: tekst(p.series?.slug, 120),
        });
      }
      gelukt += 1;
    } catch (fout) {
      console.log(`${z.naam} ${gidsDag(dag)}: ${fout.message}`);
    }
    await new Promise((klaar) => setTimeout(klaar, 300)); // rustig aan
  }
}

// Per serie (één keer) de omroep en een algemene omschrijving, voor de voorkeuren en de detailweergave.
const series = new Map();
for (const slug of new Set(programmas.map((p) => p.serie).filter((x) => /^[\w-]+$/.test(x)))) {
  try {
    const antwoord = await fetch(`https://npo.nl/start/api/domain/series-detail?slug=${slug}`, {
      headers: { 'User-Agent': 'Kijkwijzer (persoonlijke kijkwijzer-app)' },
    });
    if (!antwoord.ok) throw new Error(`status ${antwoord.status}`);
    const d = await antwoord.json();
    series.set(slug, {
      omroepen: (d.broadcasters ?? []).map((b) => tekst(b.name, 40)).filter(Boolean),
      over: tekst(d.synopsis, 500),
      leeftijd: tekst(d.contentClassification?.ageRestriction, 4),
    });
  } catch {
    // Niet erg: dan zonder omroep.
  }
  await new Promise((klaar) => setTimeout(klaar, 200));
}
for (const p of programmas) Object.assign(p, series.get(p.serie) ?? { omroepen: [], over: '', leeftijd: '' });

if (!gelukt) {
  console.log('NPO-gids niet bereikbaar: npo.json niet opnieuw geschreven.');
  await houdVorige('npo');
  process.exit(0);
}
// Dubbele regels (een programma dat over middernacht loopt staat soms op twee dagen) eruit.
const uniek = [...new Map(programmas.map((p) => [`${p.zender}|${p.start}`, p])).values()].sort((a, b) => a.start.localeCompare(b.start));
await writeFile(new URL('../public/npo.json', import.meta.url), JSON.stringify({ op: new Date().toISOString(), programmas: uniek }));
console.log(`npo.json: ${uniek.length} programma's (${gelukt} van ${DAGEN * ZENDERS.length} dagen per zender gelukt).`);
