// Motorsport naast de Formule 1: welke raceklassen er zijn, waar je ze ziet, en welke jij volgt.
// De kalenders zet GitHub elke nacht klaar (scripts/motorsport.mjs → motorsport.json).

// ids: nummers bij TheSportsDB. Zenders in Nederland, onder voorbehoud (gecontroleerd oktober 2026).
export const SERIES = {
  motogp: { naam: 'MotoGP', ids: [4407], zenders: [{ naam: 'Ziggo Sport', zeker: false }] },
  dtm: { naam: 'DTM', uitleg: 'GT3-auto’s', ids: [4438], zenders: [{ naam: 'YouTube', zeker: false }] },
  gtwc: {
    naam: 'GT World Challenge',
    uitleg: 'GT3-auto’s, met de 24 uur van Spa',
    ids: [4439, 4440],
    reeksNamen: { 4439: 'Endurance', 4440: 'Sprint' },
    zenders: [{ naam: 'YouTube', zeker: false }],
  },
  wec: { naam: 'WEC', uitleg: 'Langeafstandsraces, met Le Mans', ids: [4413], zenders: [{ naam: 'HBO Max', zeker: false }] },
};

const OPSLAG = 'motorsport';

export function leesMotorKeuzes() {
  try {
    const k = JSON.parse(localStorage.getItem(OPSLAG) || '[]');
    return Array.isArray(k) ? k.filter((x) => x in SERIES) : [];
  } catch {
    return [];
  }
}

export function zetMotorKeuzes(keuzes) {
  localStorage.setItem(OPSLAG, JSON.stringify(keuzes.filter((x) => x in SERIES)));
}

// Races die nog komen (de laatste sessie is nog niet voorbij), per gekozen klasse.
export function komendeMotorraces(schema, keuzes, nu = new Date()) {
  return keuzes
    .flatMap((k) => (schema?.series?.[k]?.races ?? []).map((r) => ({ ...r, serie: k })))
    .filter((r) => r.sessies.length && new Date(r.sessies.at(-1).start) > new Date(nu.getTime() - 3 * 3600000))
    .sort((a, b) => a.sessies[0].start.localeCompare(b.sessies[0].start));
}

// Trainingen tellen niet mee in het weekoverzicht; kwalificatie en races wel.
export const isTraining = (sessie) => /training/i.test(sessie);
