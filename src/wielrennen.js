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
