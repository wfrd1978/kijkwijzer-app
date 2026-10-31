import { describe, expect, it } from 'vitest';
import {
  nieuweTitel, titelSleutel, STATUSSEN, statusWijziging, vandaag, datumTekst, filterTitels, sorteerTitels, dubbelTekst, gevondenActeur,
  volgendeAflevering, voortgangKort, normaliseerTitel,
} from '../src/titels.js';

describe('nieuweTitel', () => {
  it('neemt de gegevens over en zet de status op Wil ik zien', () => {
    const t = nieuweTitel(
      { tmdbId: 1, soort: 'film', titel: 'Dune', origineel: 'Dune', jaar: '2021', poster: '/a.jpg', beschrijving: 'Zand.' },
      new Date('2026-10-26T12:00:00Z')
    );
    expect(t).toEqual({
      tmdbId: 1, soort: 'film', titel: 'Dune', origineel: 'Dune', jaar: '2021', poster: '/a.jpg', beschrijving: 'Zand.',
      status: 'Wil ik zien', sterren: 0, kijkdatum: '', notitie: '', toegevoegdOp: '2026-10-26T12:00:00.000Z',
    });
    expect(STATUSSEN[0]).toBe('Wil ik zien');
  });
  it('vult ontbrekende velden leeg in', () => {
    expect(nieuweTitel({ tmdbId: 2, soort: 'serie', titel: 'Thuis' })).toMatchObject({ jaar: '', poster: '', beschrijving: '' });
  });
});

describe('titelSleutel', () => {
  it('maakt onderscheid tussen film en serie met hetzelfde nummer', () => {
    expect(titelSleutel({ soort: 'film', tmdbId: 5 })).not.toBe(titelSleutel({ soort: 'serie', tmdbId: 5 }));
  });
});

describe('statusWijziging', () => {
  const nu = new Date(2026, 9, 26);
  it('zet de kijkdatum op vandaag bij Gezien zonder datum', () => {
    expect(statusWijziging({ kijkdatum: '' }, 'Gezien', nu)).toEqual({ status: 'Gezien', kijkdatum: '2026-10-26' });
  });
  it('laat een bestaande kijkdatum staan', () => {
    expect(statusWijziging({ kijkdatum: '2025-01-02' }, 'Gezien', nu)).toEqual({ status: 'Gezien' });
  });
  it('verandert bij andere statussen alleen de status', () => {
    expect(statusWijziging({ kijkdatum: '' }, 'Wil ik zien', nu)).toEqual({ status: 'Wil ik zien' });
  });
});

describe('vandaag en datumTekst', () => {
  it('schrijft de datum met voorloopnullen', () => {
    expect(vandaag(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
  it('maakt een leesbare datum', () => {
    expect(datumTekst('2026-10-26')).toBe('26 oktober 2026');
    expect(datumTekst('')).toBe('');
  });
});

const lijst = [
  { titel: 'Amélie', origineel: "Le Fabuleux Destin d'Amélie Poulain", soort: 'film', status: 'Gezien', sterren: 5, kijkdatum: '2024-03-01', notitie: '', toegevoegdOp: '2026-01-01T00:00:00Z' },
  { titel: 'Thuis', origineel: '', soort: 'serie', status: 'Wil ik zien', sterren: 0, kijkdatum: '', notitie: 'Tip van de buren', toegevoegdOp: '2026-03-01T00:00:00Z' },
  { titel: 'Dune', origineel: 'Dune', soort: 'film', status: 'Wil ik zien', sterren: 0, kijkdatum: '', notitie: '', toegevoegdOp: '2026-02-01T00:00:00Z' },
  { titel: 'Borgen', origineel: 'Borgen', soort: 'serie', status: 'Gezien', sterren: 5, kijkdatum: '2025-06-01', notitie: '', toegevoegdOp: '2025-12-01T00:00:00Z' },
];
const namen = (l) => l.map((t) => t.titel);

describe('filterTitels', () => {
  it('filtert op status en soort', () => {
    expect(namen(filterTitels(lijst, { tab: 'Gezien' }))).toEqual(['Amélie', 'Borgen']);
    expect(namen(filterTitels(lijst, { tab: 'Gezien', soort: 'serie' }))).toEqual(['Borgen']);
    expect(filterTitels(lijst)).toHaveLength(4);
  });
  it('zoekt zonder accenten en hoofdletters, ook in de notitie', () => {
    expect(namen(filterTitels(lijst, { zoek: 'AMELIE' }))).toEqual(['Amélie']);
    expect(namen(filterTitels(lijst, { zoek: 'poulain' }))).toEqual(['Amélie']);
    expect(namen(filterTitels(lijst, { zoek: 'tip buren' }))).toEqual(['Thuis']);
    expect(filterTitels(lijst, { zoek: 'matrix' })).toHaveLength(0);
  });
});

describe('sorteerTitels', () => {
  it('sorteert op laatst toegevoegd', () => {
    expect(namen(sorteerTitels(lijst))).toEqual(['Thuis', 'Dune', 'Amélie', 'Borgen']);
  });
  it('sorteert op titel, met accenten op de goede plek', () => {
    expect(namen(sorteerTitels(lijst, 'titel'))).toEqual(['Amélie', 'Borgen', 'Dune', 'Thuis']);
  });
  it('sorteert op sterren en bij gelijkspel op titel', () => {
    expect(namen(sorteerTitels(lijst, 'sterren'))).toEqual(['Amélie', 'Borgen', 'Dune', 'Thuis']);
  });
  it('sorteert op laatst gezien, titels zonder datum achteraan', () => {
    expect(namen(sorteerTitels(lijst, 'gezien'))).toEqual(['Borgen', 'Amélie', 'Dune', 'Thuis']);
  });
  it('laat de originele lijst ongemoeid', () => {
    sorteerTitels(lijst, 'titel');
    expect(lijst[0].titel).toBe('Amélie');
    expect(lijst[1].titel).toBe('Thuis');
  });
});

describe('dubbelTekst', () => {
  it('noemt de kijkdatum als je hem gezien hebt', () => {
    expect(dubbelTekst({ status: 'Gezien', kijkdatum: '2024-03-01' })).toBe('Staat al op je lijst · Gezien op 1 maart 2024');
  });
  it('noemt anders de status', () => {
    expect(dubbelTekst({ status: 'Wil ik zien', kijkdatum: '' })).toBe('Staat al op je lijst · Wil ik zien');
    expect(dubbelTekst({ status: 'Gezien', kijkdatum: '' })).toBe('Staat al op je lijst · Gezien');
  });
});

describe('zoeken op acteur', () => {
  const dune = { titel: 'Dune', origineel: 'Dune', soort: 'film', status: 'Gezien', notitie: '', acteurs: [{ naam: 'Timothée Chalamet' }, { naam: 'Zendaya' }] };
  const wonka = { titel: 'Wonka', origineel: 'Wonka', soort: 'film', status: 'Wil ik zien', notitie: '', acteurs: [{ naam: 'Timothée Chalamet' }] };
  const oud = { titel: 'Oud', origineel: '', soort: 'film', status: 'Gezien', notitie: '' };
  it('vindt titels via de acteur, zonder accenten', () => {
    expect(filterTitels([dune, wonka, oud], { zoek: 'timothee' }).map((t) => t.titel)).toEqual(['Dune', 'Wonka']);
    expect(filterTitels([dune, wonka, oud], { zoek: 'zendaya' }).map((t) => t.titel)).toEqual(['Dune']);
  });
  it('noemt de gevonden acteur, maar niet als de titel zelf al past', () => {
    expect(gevondenActeur(dune, 'chalamet')).toBe('Timothée Chalamet');
    expect(gevondenActeur(dune, 'dune')).toBe('');
    expect(gevondenActeur(oud, 'chalamet')).toBe('');
    expect(gevondenActeur(dune, '')).toBe('');
  });
});

describe('voortgang bij series', () => {
  const seizoenen = [{ nr: 1, afleveringen: 3 }, { nr: 2, afleveringen: 2 }];
  it('gaat een aflevering verder, en over de grens van een seizoen', () => {
    expect(volgendeAflevering({ seizoen: 1, aflevering: 0 }, seizoenen)).toEqual({ seizoen: 1, aflevering: 1 });
    expect(volgendeAflevering({ seizoen: 1, aflevering: 3 }, seizoenen)).toEqual({ seizoen: 2, aflevering: 1 });
    expect(volgendeAflevering(undefined, seizoenen)).toEqual({ seizoen: 1, aflevering: 1 });
  });
  it('weet wanneer je alles hebt gezien', () => {
    expect(volgendeAflevering({ seizoen: 2, aflevering: 2 }, seizoenen)).toBe(null);
  });
  it('werkt ook zonder bekende seizoenen', () => {
    expect(volgendeAflevering({ seizoen: 4, aflevering: 7 })).toEqual({ seizoen: 4, aflevering: 8 });
  });
  it('kort genoteerd voor in de lijst', () => {
    expect(voortgangKort({ seizoen: 2, aflevering: 5 })).toBe('S2 · A5');
    expect(voortgangKort({ seizoen: 1, aflevering: 0 })).toBe('');
  });
  it('gaat mee in de backup, rare waarden niet', () => {
    const basis = { tmdbId: 1, soort: 'serie', titel: 'Borgen', extraOp: '2026-10-28', seizoenen: [{ nr: 1, afleveringen: 10 }, { nr: -1, afleveringen: 2 }] };
    expect(normaliseerTitel({ ...basis, voortgang: { seizoen: 2, aflevering: 5 } })).toMatchObject({ voortgang: { seizoen: 2, aflevering: 5 }, seizoenen: [{ nr: 1, afleveringen: 10 }] });
    expect(normaliseerTitel({ ...basis, voortgang: { seizoen: 'x' } }).voortgang).toBeUndefined();
  });
});

describe('status Bezig bestaat niet meer', () => {
  it('kent alleen Wil ik zien en Gezien', () => {
    expect(STATUSSEN).toEqual(['Wil ik zien', 'Gezien']);
  });
  it('een oude backup met Bezig wordt Wil ik zien, met behoud van de voortgang', () => {
    const basis = { tmdbId: 1, soort: 'serie', titel: 'Borgen', status: 'Bezig' };
    expect(normaliseerTitel({ ...basis, voortgang: { seizoen: 2, aflevering: 5 } })).toMatchObject({ status: 'Wil ik zien', voortgang: { seizoen: 2, aflevering: 5 } });
    expect(normaliseerTitel(basis)).toMatchObject({ status: 'Wil ik zien', voortgang: { seizoen: 1, aflevering: 0 } });
    expect(normaliseerTitel({ ...basis, soort: 'film' })).toMatchObject({ status: 'Wil ik zien' });
    expect(normaliseerTitel({ ...basis, soort: 'film' }).voortgang).toBeUndefined();
  });
});
