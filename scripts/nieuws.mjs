// Sportnieuws: de koppen uit de RSS-feeds van NOS Sport, klaargezet als public/nieuws.json.
// Draait in GitHub, elk uur. Volgens de algemene voorwaarden van de NOS (artikel 7, RSS-Feeds) mag
// een particulier voor niet-commercieel gebruik de artikelkop overnemen uit een door de NOS
// aangeboden feed, met duidelijke bronvermelding en zonder iets te bewerken. Daarom neemt dit script
// alleen de kop (letterlijk), de link naar het artikel bij de NOS en het tijdstip over; geen tekst en
// geen foto's van de NOS. Lukt het niet, dan blijft de vorige versie staan.
//
// Foto's: alleen van een vaste lijst bekende coureurs en renners, en alleen als hun foto op Wikimedia
// Commons een vrije licentie heeft (CC BY, CC BY-SA, CC0 of publiek domein). De maker en de licentie
// gaan mee, voor de naamsvermelding. Een persoon telt alleen in een kop uit zijn eigen sport.
import { writeFile } from 'node:fs/promises';
import { houdVorige } from './vorige.mjs';

const FEEDS = {
  voetbal: 'https://feeds.nos.nl/nosvoetbal',
  f1: 'https://feeds.nos.nl/nossportformule1',
  wielrennen: 'https://feeds.nos.nl/nossportwielrennen',
  sport: 'https://feeds.nos.nl/nossportalgemeen',
};
const MAX_UREN = 48;
const UA = { 'user-agent': 'Kijkwijzer-sportnieuws/1.0 (https://wfrd1978.github.io/kijkwijzer-app/)' };

// wiki: titel van het artikel op nl.wikipedia.org; woorden: hoe de NOS hem in een kop noemt.
const PERSONEN = [
  { wiki: 'Max Verstappen', woorden: ['Verstappen'], sport: 'f1', niet: ['Jos Verstappen'] },
  { wiki: 'Lewis Hamilton', woorden: ['Hamilton'], sport: 'f1' },
  { wiki: 'Charles Leclerc', woorden: ['Leclerc'], sport: 'f1' },
  { wiki: 'Lando Norris', woorden: ['Norris'], sport: 'f1' },
  { wiki: 'Oscar Piastri', woorden: ['Piastri'], sport: 'f1' },
  { wiki: 'George Russell (autocoureur)', woorden: ['Russell'], sport: 'f1' },
  { wiki: 'Andrea Kimi Antonelli', woorden: ['Antonelli'], sport: 'f1' },
  { wiki: 'Mathieu van der Poel', woorden: ['Van der Poel'], sport: 'wielrennen' },
  { wiki: 'Tadej Pogačar', woorden: ['Pogacar', 'Pogačar'], sport: 'wielrennen' },
  { wiki: 'Jonas Vingegaard', woorden: ['Vingegaard'], sport: 'wielrennen' },
  { wiki: 'Wout van Aert', woorden: ['Van Aert'], sport: 'wielrennen' },
  { wiki: 'Remco Evenepoel', woorden: ['Evenepoel'], sport: 'wielrennen' },
  { wiki: 'Demi Vollering', woorden: ['Vollering'], sport: 'wielrennen' },
  { wiki: 'Marianne Vos', woorden: ['Marianne Vos'], sport: 'wielrennen' },
];
const VRIJ = /^(CC BY(-SA)? ?\d|CC0|Public domain|PD)/i;
const zonderTags = (t) => (t ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const fotoCache = new Map();
async function fotoVan(persoon) {
  if (fotoCache.has(persoon.wiki)) return fotoCache.get(persoon.wiki);
  let foto = null;
  try {
    const wiki = await (await fetch(`https://nl.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=name&titles=${encodeURIComponent(persoon.wiki)}`, { headers: UA, signal: AbortSignal.timeout(20000) })).json();
    const bestand = Object.values(wiki.query?.pages ?? {})[0]?.pageimage;
    if (bestand) {
      const info = await (await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=240&titles=${encodeURIComponent(`File:${bestand}`)}`, { headers: UA, signal: AbortSignal.timeout(20000) })).json();
      const ii = Object.values(info.query?.pages ?? {})[0]?.imageinfo?.[0];
      const licentie = zonderTags(ii?.extmetadata?.LicenseShortName?.value);
      const url = (ii?.thumburl ?? '').replace(/\?utm_[^#]*$/, '');
      if (/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(url) && VRIJ.test(licentie)) {
        foto = { url, maker: zonderTags(ii.extmetadata?.Artist?.value).slice(0, 60) || 'onbekend', licentie, pagina: ii.descriptionurl, wie: persoon.wiki.replace(/ \(.*\)$/, '') };
      }
    }
  } catch {
    // Geen foto: dan gewoon zonder.
  }
  fotoCache.set(persoon.wiki, foto);
  return foto;
}
const noemt = (titel, w) => new RegExp(`(^|[^\\p{L}])${w}($|[^\\p{L}])`, 'u').test(titel);
function persoonIn(titel, soort) {
  return PERSONEN.find((p) => (soort === p.sport || soort === 'sport') && p.woorden.some((w) => noemt(titel, w)) && !(p.niet ?? []).some((w) => titel.includes(w)));
}

// De paar tekens die in een RSS-kop als code staan, terug naar gewone tekst (de kop zelf blijft gelijk).
const ontcijfer = (t) =>
  t
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
const veld = (item, naam) => ontcijfer(item.match(new RegExp(`<${naam}[^>]*>([\\s\\S]*?)</${naam}>`))?.[1] ?? '');

const grens = Date.now() - MAX_UREN * 3600000;
const berichten = new Map(); // link → bericht (een bericht kan in meer feeds staan)
let gelukt = 0;
for (const [soort, adres] of Object.entries(FEEDS)) {
  try {
    const antwoord = await fetch(adres, { signal: AbortSignal.timeout(30000) });
    if (!antwoord.ok) throw new Error(`status ${antwoord.status}`);
    const xml = await antwoord.text();
    let n = 0;
    for (const item of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
      const titel = veld(item, 'title');
      const link = veld(item, 'link');
      const tijd = new Date(veld(item, 'pubDate'));
      // Alleen echte NOS-links en berichten van de laatste twee dagen.
      if (!titel || !/^https:\/\/nos\.nl\//.test(link) || Number.isNaN(tijd.getTime()) || tijd.getTime() < grens) continue;
      if (!berichten.has(link)) berichten.set(link, { titel, link, tijd: tijd.toISOString(), soort });
      n += 1;
    }
    gelukt += 1;
    console.log(`${soort}: ${n} koppen`);
  } catch (fout) {
    console.log(`${soort}: niet gelukt (${fout.message})`);
  }
}

if (!gelukt) {
  console.log('Geen enkele feed opgehaald: nieuws.json niet opnieuw geschreven.');
  await houdVorige('nieuws');
  process.exit(0);
}
const items = [...berichten.values()].sort((a, b) => b.tijd.localeCompare(a.tijd));
for (const x of items) {
  const persoon = persoonIn(x.titel, x.soort);
  if (persoon) {
    const foto = await fotoVan(persoon);
    if (foto) x.foto = foto;
  }
}
console.log(`Foto's: ${items.filter((x) => x.foto).length} (${[...new Set(items.filter((x) => x.foto).map((x) => x.foto.wie))].join(', ') || 'geen'})`);
await writeFile(new URL('../public/nieuws.json', import.meta.url), JSON.stringify({ op: new Date().toISOString(), bron: 'NOS Sport', items }));
console.log(`nieuws.json geschreven: ${items.length} koppen.`);
