// Tennis, darten en vechtsport: alleen de belangrijkste wedstrijden (keuze van de eigenaar, november 2026).
// Tennis en darten met de hand bijgewerkt per seizoen; UFC haalt de app zelf (de eerstvolgende avond).
// Bronnen (gecontroleerd november 2026): ATP-kalender 2027 en ATP Finals 2026; Eurosport/HBO Max heeft de
// grandslams tot en met 2027, Ziggo Sport de ATP tot en met 2026. PDC: Viaplay (contract tot 2032).
// GLORY: KIJK (Talpa) in 2026. UFC: HBO Max (met sportpakket).

const HBO = [{ naam: 'HBO Max', zeker: true }];
export const TENNIS = {
  seizoen: '2026-2027',
  bron: 'ATP-kalender',
  koersen: [
    { naam: 'ATP Finals Turijn', van: '2026-11-15', tot: '2026-11-22', soort: 'Eindtoernooi', zenders: [{ naam: 'Ziggo Sport', zeker: true }] },
    { naam: 'Australian Open', van: '2027-01-17', tot: '2027-01-31', soort: 'Grandslam', zenders: HBO },
    { naam: 'Roland Garros', van: '2027-05-23', tot: '2027-06-06', soort: 'Grandslam', zenders: HBO },
    { naam: 'Wimbledon', van: '2027-06-28', tot: '2027-07-11', soort: 'Grandslam', zenders: HBO },
    { naam: 'US Open', van: '2027-08-29', tot: '2027-09-12', soort: 'Grandslam', zenders: HBO },
  ],
};

const VIAPLAY = [{ naam: 'Viaplay', zeker: true }];
export const DARTEN = {
  seizoen: '2026-2027',
  bron: 'PDC-kalender',
  koersen: [
    { naam: 'Grand Slam of Darts', van: '2026-11-14', tot: '2026-11-22', soort: 'Major · Wolverhampton', zenders: [{ naam: 'Viaplay', zeker: false }] },
    { naam: 'Players Championship Finals', van: '2026-11-27', tot: '2026-11-29', soort: 'Major · Minehead', zenders: [{ naam: 'Viaplay', zeker: false }] },
    { naam: 'WK darts', van: '2026-12-11', tot: '2027-01-03', soort: 'WK · Londen', zenders: VIAPLAY, noot: 'Met een kerstpauze; finale op 3 januari.' },
    { naam: 'Premier League: eerste avond', van: '2027-02-04', soort: 'Premier League', zenders: VIAPLAY, noot: 'Daarna bijna elke donderdagavond.' },
    { naam: 'Premier League in Antwerpen', van: '2027-03-25', soort: 'Premier League', zenders: VIAPLAY },
    { naam: 'Premier League in Rotterdam', van: '2027-04-15', soort: 'Premier League · Ahoy', zenders: VIAPLAY },
    { naam: 'Premier League: finale', van: '2027-05-27', soort: 'Premier League · Londen', zenders: VIAPLAY },
  ],
};

export const GLORY = {
  seizoen: '2026',
  bron: 'GLORY en KIJK',
  koersen: [{ naam: 'GLORY Rivals', van: '2026-11-28', soort: 'GLORY kickboksen', zenders: [{ naam: 'KIJK', zeker: true }], noot: 'Pay-per-view bij KIJK.' }],
};
export const UFC_ZENDERS = [{ naam: 'HBO Max', zeker: true }];

// De eerstvolgende UFC-avond (van TheSportsDB) in de vorm van de kalenders. Avonden in Amerika
// vallen in Nederland 's nachts: dan 'nacht van zaterdag op zondag'.
export function naarUfc(e) {
  if (!e?.strEvent || !/^\d{4}-\d{2}-\d{2}$/.test(e.dateEvent ?? '')) return null;
  const amerika = /United States|USA|Canada|Mexico|Brazil/i.test(e.strCountry ?? '');
  const dag = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('nl-NL', { weekday: 'long', timeZone: 'UTC' });
  const volgende = new Date(Date.parse(`${e.dateEvent}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
  return {
    naam: e.strEvent.replace(/\s+vs\.?\s+/i, ' – '),
    van: e.dateEvent,
    soort: /^UFC \d+/.test(e.strEvent) ? 'UFC · grote avond' : 'UFC · Fight Night',
    zenders: UFC_ZENDERS,
    noot: amerika ? `In de nacht van ${dag(e.dateEvent)} op ${dag(volgende)}.` : '',
  };
}

// Volgen: aan of uit, standaard aan.
export const ANDERE_SPORTEN = { tennis: 'Tennis', darten: 'Darten', vechtsport: 'Vechtsport' };
export function volgSport(k) {
  try {
    return localStorage.getItem(k) !== 'uit';
  } catch {
    return true;
  }
}
