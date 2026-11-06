// Sportnieuws op Vandaag: koppen van NOS Sport (letterlijk overgenomen, zie scripts/nieuws.mjs),
// afgestemd op wat jij volgt: eerst nieuws over je clubs en je hele competities, dan Formule 1 en
// wielrennen, en is er niets voor jou, dan het belangrijkste algemene sportnieuws.

const COMPETITIE_WOORDEN = {
  DED: ['Eredivisie'],
  CL: ['Champions League'],
  PL: ['Premier League'],
  BL1: ['Bundesliga'],
  PD: ['LaLiga', 'La Liga'],
  SA: ['Serie A'],
  EL: ['Europa League'],
  ECL: ['Conference League'],
  UNL: ['Nations League'],
  EC: ['EK'],
  WC: ['WK'],
};

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Hele woorden, en korte namen (AZ, PSV) alleen in hoofdletters, zodat 'az' in een ander woord niet telt.
function noemt(titel, naam) {
  if (!naam || naam.length < 2) return false;
  const kort = naam.length <= 3;
  return new RegExp(`(^|[^\\p{L}\\d])${escape(naam)}($|[^\\p{L}\\d])`, kort ? 'u' : 'iu').test(titel);
}

// De namen waaronder een club in het nieuws staat: 'Ajax' en 'AFC Ajax' → Ajax; 'PSV' blijft PSV.
export function clubNamen(ploeg) {
  const namen = new Set([ploeg.naam]);
  const vol = (ploeg.vol ?? '').replace(/\b(A?FC|SC|SV|AC|SSC|VfL|VfB|RCD|CF|PSV)\b/g, (m) => (m === 'PSV' ? m : '')).replace(/\s+'?\d+$/, '').trim();
  if (vol && vol.length >= 3) namen.add(vol);
  return [...namen].filter(Boolean);
}

// items: uit nieuws.json; keuzes: { clubs: [ploeg], alles: [competitiecodes] }; aantal: hoeveel koppen.
// Gaat een kop over een van je clubs, dan staat die club erbij (voor het clublogo).
export function nieuwsVoorJou(items, { clubs = [], alles = [], f1 = true }, aantal = 2) {
  const clubWoorden = clubs.flatMap((c) => clubNamen(c).map((naam) => ({ naam, c })));
  const compWoorden = alles.flatMap((c) => COMPETITIE_WOORDEN[c] ?? []);
  const gescoord = items.map((x) => {
    let score = 0;
    let waarom = '';
    // Een land (Oranje, België) telt alleen in voetbalnieuws: 'Oranje' staat ook boven hockey of schaatsen.
    const club = clubWoorden.find((w) => (!w.c.land || x.soort === 'voetbal') && noemt(x.titel, w.naam));
    if (club) return { ...x, score: 3, waarom: club.c.naam, club: club.c };
    else if (compWoorden.some((n) => noemt(x.titel, n))) [score, waarom] = [2, compWoorden.find((n) => noemt(x.titel, n))];
    else if (x.soort === 'f1' && f1) [score, waarom] = [1, 'Formule 1'];
    else if (x.soort === 'wielrennen') [score, waarom] = [1, 'Wielrennen'];
    return { ...x, score, waarom };
  });
  const voorJou = gescoord.filter((x) => x.score > 0).sort((a, b) => b.score - a.score || b.tijd.localeCompare(a.tijd));
  if (voorJou.length) return voorJou.slice(0, aantal);
  // Niets dat bij jou past: dan het nieuwste algemene sportnieuws.
  return gescoord.slice(0, aantal).map((x) => ({ ...x, waarom: '' }));
}
