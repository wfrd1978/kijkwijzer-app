// Mijn diensten: per streamingdienst kies je Abonnement, Tonen of Verbergen.
// De keuzes staan op de telefoon (en gaan mee in de backup).

export const KEUZES = { abonnement: 'Abonnement', tonen: 'Tonen', verbergen: 'Verbergen' };
const OPSLAG = 'diensten';

export function leesKeuzes() {
  try {
    const k = JSON.parse(localStorage.getItem(OPSLAG) || '{}');
    return k && typeof k === 'object' ? k : {};
  } catch {
    return {};
  }
}

export function zetKeuze(id, keuze) {
  const keuzes = leesKeuzes();
  if (keuze === 'tonen') delete keuzes[id]; // Tonen is de standaard
  else keuzes[id] = keuze;
  localStorage.setItem(OPSLAG, JSON.stringify(keuzes));
}

// Alle diensten in één keer op Tonen of Verbergen zetten. Je abonnementen blijven staan.
export function alleKeuzes(keuzes, ids, keuze) {
  const nieuw = {};
  for (const id of ids) {
    if (keuzes[id] === 'abonnement') nieuw[id] = 'abonnement';
    else if (keuze === 'verbergen') nieuw[id] = 'verbergen';
  }
  // Abonnementen op diensten die nu niet in de lijst staan, niet kwijtraken.
  for (const [id, k] of Object.entries(keuzes)) if (k === 'abonnement') nieuw[id] = 'abonnement';
  return nieuw;
}

export function zetAlleKeuzes(ids, keuze) {
  localStorage.setItem(OPSLAG, JSON.stringify(alleKeuzes(leesKeuzes(), ids, keuze)));
}

// De streamingdiensten die je in Instellingen ziet (TMDB-nummers, in deze volgorde). TMDB kent er
// voor Nederland ruim zeventig; de meeste zijn klein of alleen een kanaal binnen Prime Video.
// Ziggo Sport staat er niet bij: dat is voor TMDB een zender, en staat bij Sportzenders.
export const NL_DIENSTEN = [
  8, // Netflix
  175, // Netflix Kids
  72, // Videoland
  360, // NPO Start
  1986, // NPO Plus
  337, // Disney Plus
  1899, // HBO Max
  119, // Amazon Prime Video
  350, // Apple TV
  1773, // SkyShowtime
  76, // Viaplay
  381, // Canal+
  472, // NLZIET
  563, // KPN
  297, // Ziggo TV
  // Aangevuld met vijf andere die in Nederland veel gebruikt worden:
  71, // Pathé Thuis
  396, // Film1
  11, // MUBI
  223, // Hayu
  639, // CineMember
];

// Alleen de diensten uit de lijst hierboven, plus wat je zelf al op Abonnement of Verbergen zette
// (zodat je die keuze altijd terug kunt draaien). Eerst de vaste lijst, in volgorde.
export function beperkDiensten(alle, keuzes) {
  const plek = (d) => (NL_DIENSTEN.includes(d.id) ? NL_DIENSTEN.indexOf(d.id) : NL_DIENSTEN.length);
  return alle.filter((d) => NL_DIENSTEN.includes(d.id) || keuzeVan(keuzes, d.id) !== 'tonen').sort((a, b) => plek(a) - plek(b));
}

export function keuzeVan(keuzes, id) {
  return keuzes[id] in KEUZES ? keuzes[id] : 'tonen';
}

// [betaalde versie, gratis versie die daarin zit]
const BETAALD_OMVAT = [[/^NPO Plus/i, /^NPO Start/i]];

// Verdeelt de diensten van een titel: eerst wat bij jou te zien is (abonnement of gratis bij
// een dienst die je hebt), daarna de rest zonder de verborgen diensten.
export function verdeelDiensten(d, keuzes) {
  const heb = (x) => keuzeVan(keuzes, x.id) === 'abonnement';
  const zichtbaar = (x) => keuzeVan(keuzes, x.id) === 'tonen';
  const alleBijJou = [...d.abonnement, ...d.gratis].filter(heb).filter((x, i, l) => l.findIndex((y) => y.id === x.id) === i);
  // Heb je de betaalde versie van een dienst, dan is de gratis versie dubbel (NPO Plus omvat NPO Start).
  const overbodig = (x) => BETAALD_OMVAT.some(([betaald, gratis]) => gratis.test(x.naam) && alleBijJou.some((y) => betaald.test(y.naam)));
  const bijJou = alleBijJou.filter((x) => !overbodig(x));
  return {
    bijJou,
    abonnement: d.abonnement.filter(zichtbaar).filter((x) => !overbodig(x)),
    gratis: d.gratis.filter(zichtbaar).filter((x) => !overbodig(x)),
    huren: d.huren.filter((x) => !heb(x) && zichtbaar(x)),
    kopen: d.kopen.filter((x) => !heb(x) && zichtbaar(x)),
    verborgen: [...d.abonnement, ...d.gratis, ...d.huren, ...d.kopen].some((x) => keuzeVan(keuzes, x.id) === 'verbergen'),
  };
}

// Doorklikken: TMDB geeft geen directe link naar een titel bij een dienst. Waar de dienst het
// toelaat, openen we de zoekpagina met de titel al ingevuld; anders de voorpagina.
const DOORKLIK = [
  [/netflix/, (q) => `https://www.netflix.com/search?q=${q}`],
  [/prime video|amazon video/, (q) => `https://www.primevideo.com/search/?phrase=${q}`],
  [/apple tv/, (q) => `https://tv.apple.com/nl/search?term=${q}`],
  [/disney/, () => 'https://www.disneyplus.com/nl-nl'],
  [/videoland/, () => 'https://www.videoland.com/'],
  [/npo/, (q) => `https://npo.nl/start/zoeken?zoekTerm=${q}`],
  [/hbo max|^max$/, () => 'https://www.hbomax.com/nl/nl'],
  [/skyshowtime/, () => 'https://www.skyshowtime.com/nl'],
  [/viaplay/, () => 'https://viaplay.nl/'],
  [/path[eé] thuis/, (q) => `https://www.pathe-thuis.nl/zoeken?q=${q}`],
];

export function doorklikLink(dienst, titel) {
  const naam = dienst.naam.toLowerCase();
  const regel = DOORKLIK.find(([patroon]) => patroon.test(naam));
  return regel ? regel[1](encodeURIComponent(titel)) : '';
}

// Welke van je eigen diensten zijn nieuw voor deze titel? Beide keren wordt met je huidige
// keuzes gerekend, zodat een nieuw abonnement afsluiten niet als 'nieuw' telt.
// Zonder eerdere controle (geen datum) is er niets om mee te vergelijken: dan niets nieuws.
export function nieuwBijJou(titel, nieuweDiensten, keuzes) {
  if (!titel.dienstenOp || !nieuweDiensten) return [];
  const leeg = { abonnement: [], gratis: [], huren: [], kopen: [] };
  const oud = new Set(verdeelDiensten(titel.diensten ?? leeg, keuzes).bijJou.map((d) => d.id));
  return verdeelDiensten(nieuweDiensten, keuzes)
    .bijJou.filter((d) => !oud.has(d.id))
    .map((d) => ({ id: d.id, naam: d.naam }));
}
