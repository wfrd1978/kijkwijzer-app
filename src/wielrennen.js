// Wielerkalender: de grote koersen met waar ze in Nederland te zien zijn.
// Geen enkele gratis bron geeft dit, dus deze lijst wordt per seizoen met de hand bijgewerkt.
// Data: UCI WorldTour-kalender 2027 (bevestigd oktober 2026). Zenders: gecontroleerd oktober 2026;
// 'zeker: false' = nog niet bevestigd, in de app als 'onder voorbehoud'.

export const WIELRENNEN = {
  seizoen: 2027,
  gecontroleerd: 'oktober 2026',
  koersen: [
    { naam: 'Omloop Nieuwsblad', van: '2027-02-27', soort: 'Klassieker', zenders: [{ naam: 'HBO Max', zeker: true }] },
    { naam: 'Strade Bianche', van: '2027-03-06', soort: 'Klassieker', zenders: [{ naam: 'HBO Max', zeker: true }] },
    { naam: 'Parijs-Nice', van: '2027-03-07', tot: '2027-03-14', soort: 'Etappekoers', zenders: [{ naam: 'HBO Max', zeker: true }] },
    { naam: 'Tirreno-Adriatico', van: '2027-03-08', tot: '2027-03-14', soort: 'Etappekoers', zenders: [{ naam: 'HBO Max', zeker: true }] },
    { naam: 'Milaan-Sanremo', van: '2027-03-20', soort: 'Monument', zenders: [{ naam: 'HBO Max', zeker: true }] },
    { naam: 'E3 Saxo Classic', van: '2027-03-26', soort: 'Klassieker', zenders: [{ naam: 'HBO Max', zeker: true }] },
    { naam: 'Gent-Wevelgem (In Flanders Fields)', van: '2027-03-28', soort: 'Klassieker', zenders: [{ naam: 'HBO Max', zeker: true }] },
    { naam: 'Dwars door Vlaanderen', van: '2027-03-31', soort: 'Klassieker', zenders: [{ naam: 'HBO Max', zeker: true }] },
    { naam: 'Ronde van Vlaanderen', van: '2027-04-04', soort: 'Monument', zenders: [{ naam: 'HBO Max', zeker: true }, { naam: 'NOS', zeker: false }] },
    { naam: 'Parijs-Roubaix', van: '2027-04-11', soort: 'Monument', zenders: [{ naam: 'HBO Max', zeker: true }, { naam: 'NOS', zeker: false }] },
    { naam: 'Amstel Gold Race', van: '2027-04-18', soort: 'Klassieker', zenders: [{ naam: 'HBO Max', zeker: true }, { naam: 'NOS', zeker: false }] },
    { naam: 'Waalse Pijl', van: '2027-04-21', soort: 'Klassieker', zenders: [{ naam: 'HBO Max', zeker: true }] },
    { naam: 'Luik-Bastenaken-Luik', van: '2027-04-25', soort: 'Monument', zenders: [{ naam: 'HBO Max', zeker: true }, { naam: 'NOS', zeker: false }] },
    { naam: "Giro d'Italia", van: '2027-05-08', tot: '2027-05-30', soort: 'Grote ronde', zenders: [{ naam: 'HBO Max', zeker: true }] },
    { naam: 'Tour de France', van: '2027-07-02', tot: '2027-07-25', soort: 'Grote ronde', zenders: [{ naam: 'NOS', zeker: true }, { naam: 'HBO Max', zeker: true }] },
    { naam: 'WK wielrennen (Haute-Savoie)', van: '2027-08-24', tot: '2027-09-05', soort: 'WK', zenders: [{ naam: 'NOS', zeker: false }, { naam: 'HBO Max', zeker: false }], noot: 'Datum van de wegrit volgt nog.' },
    { naam: 'Vuelta a España', van: '2027-09-04', tot: '2027-09-26', soort: 'Grote ronde', zenders: [{ naam: 'HBO Max', zeker: true }] },
    { naam: 'Ronde van Lombardije', van: '2027-10-09', soort: 'Monument', zenders: [{ naam: 'HBO Max', zeker: true }] },
  ],
};

// Koersen die nog komen of nu bezig zijn.
export function komendeKoersen(koersen, vandaag) {
  return koersen.filter((k) => (k.tot ?? k.van) >= vandaag);
}

// Kun je hem live volgen met je eigen zenders? 'ja' (zeker), 'misschien' (onder voorbehoud) of 'nee'.
export function kanIkKijken(koers, mijnZenders) {
  const mijn = koers.zenders.filter((z) => mijnZenders.includes(z.naam));
  if (mijn.some((z) => z.zeker)) return 'ja';
  return mijn.length ? 'misschien' : 'nee';
}

// '27 feb' of '8 – 30 mei'.
export function koersDatum(k) {
  const opmaak = (d, metMaand) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString('nl-NL', metMaand ? { day: 'numeric', month: 'short' } : { day: 'numeric' });
  if (!k.tot) return opmaak(k.van, true);
  const zelfdeMaand = k.van.slice(0, 7) === k.tot.slice(0, 7);
  return `${opmaak(k.van, !zelfdeMaand)} – ${opmaak(k.tot, true)}`;
}

// --- Veldrijden en mountainbiken (november 2026) ---
// Ook met de hand bijgewerkt. Veldrijden: alleen de wereldbeker (keuze van de eigenaar).
// Bronnen: UCI-kalender via Domestique en Cyclingnews (veldrijden), ucimtbworldseries.com (MTB).
// Zenders: veldrijden vooral HBO Max (Eurosport), de NOS zendt een deel uit (onder voorbehoud);
// MTB: HBO Max nog niet bevestigd. Gecontroleerd november 2026.
const VELD_ZENDERS = [{ naam: 'HBO Max', zeker: true }, { naam: 'NOS', zeker: false }];
export const VELDRIJDEN = {
  seizoen: '2026-2027',
  gecontroleerd: 'november 2026',
  bron: 'UCI-kalender wereldbeker veldrijden 2026-2027',
  koersen: [
    ['Ostrava', '2026-11-27'], ['Tábor', '2026-11-29'], ['Glasgow', '2026-12-13'], ['Antwerpen', '2026-12-19'],
    ['Koksijde', '2026-12-20'], ['Gavere', '2026-12-26'], ['Namen', '2026-12-27'], ['Besançon', '2026-12-29'],
    ['Zonhoven', '2027-01-03'], ['Benidorm', '2027-01-17'], ['Hamme', '2027-01-23'], ['Hoogerheide', '2027-01-24'],
  ].map(([plaats, van], i) => ({ naam: `Wereldbeker ${plaats}`, van, soort: `Wereldbeker veldrijden · ronde ${i + 1}`, zenders: VELD_ZENDERS })),
};

const MTB_ZENDERS = [{ naam: 'HBO Max', zeker: false }];
export const MOUNTAINBIKE = {
  seizoen: 2027,
  gecontroleerd: 'november 2026',
  bron: 'WHOOP UCI Mountain Bike World Series 2027',
  koersen: [
    ['Nové Město na Moravě', '2027-05-21', '2027-05-23', 'Cross-country'],
    ['Loudenvielle', '2027-05-29', '2027-05-30', 'Downhill'],
    ['Leogang', '2027-06-11', '2027-06-13', 'Cross-country en downhill'],
    ['Les Gets', '2027-06-18', '2027-06-20', 'Cross-country en downhill'],
    ['La Thuile', '2027-07-02', '2027-07-04', 'Cross-country en downhill'],
    ['Pal Arinsal', '2027-07-09', '2027-07-11', 'Cross-country en downhill'],
    ['Lenzerheide', '2027-08-20', '2027-08-22', 'Cross-country en downhill'],
    ['Val di Sole', '2027-09-10', '2027-09-12', 'Cross-country en downhill'],
    ['Soldier Hollow (VS)', '2027-09-25', '2027-09-26', 'Cross-country'],
    ['Whistler (Canada)', '2027-10-02', '2027-10-03', 'Downhill'],
  ].map(([plaats, van, tot, soort], i) => ({ naam: `Wereldbeker ${plaats}`, van, tot, soort: `MTB · ronde ${i + 1} · ${soort}`, zenders: MTB_ZENDERS })),
};

// Fietsen: welke onderdelen volg je? Standaard alle drie (de weg stond er altijd al).
export const FIETS_DELEN = { weg: 'Weg', veld: 'Veld', mtb: 'MTB' };
export function leesFietsKeuzes() {
  try {
    const k = JSON.parse(localStorage.getItem('fietsen') || 'null');
    return Array.isArray(k) ? k.filter((x) => x in FIETS_DELEN) : Object.keys(FIETS_DELEN);
  } catch {
    return Object.keys(FIETS_DELEN);
  }
}
export function zetFietsKeuzes(keuzes) {
  localStorage.setItem('fietsen', JSON.stringify(keuzes.filter((x) => x in FIETS_DELEN)));
}
