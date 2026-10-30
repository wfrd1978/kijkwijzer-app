import { describe, expect, it } from 'vitest';
import { vanavond, opMijnLijst, tipScore, lijstOpNpo, npoLink, omroepenIn, metKorteNamen } from '../src/tv.js';

const p = (uur, titel, genres, extra = {}) => {
  const start = new Date(`2026-10-28T${String(uur - 1).padStart(2, '0')}:00:00Z`); // UTC+1 in oktober na de wintertijd
  return { zender: 'NPO 1', live: 'https://npo.nl/start/live?channel=npo1', start: start.toISOString(), eind: new Date(start.getTime() + 3600000).toISOString(), titel, aflevering: '', genres, herhaling: false, serie: '', ...extra };
};
const lijst = [{ titel: 'Zussen', origineel: '', status: 'Wil ik zien' }, { titel: 'Borgen', origineel: '', status: 'Gezien' }];

describe('opMijnLijst', () => {
  it('alleen gelijke titels op Wil ik zien', () => {
    expect(opMijnLijst(p(20, 'Zussen', ['Serie']), lijst)?.titel).toBe('Zussen');
    expect(opMijnLijst(p(20, 'Zussen van de zee', ['Serie']), lijst)).toBeNull();
    expect(opMijnLijst(p(20, 'Borgen', ['Serie']), lijst)).toBeNull();
  });
});

describe('tipScore', () => {
  it('films en drama hoog, nieuws en jeugd nooit', () => {
    expect(tipScore(p(21, 'Film', ['Film']))).toBeGreaterThan(tipScore(p(21, 'Doc', ['Documentaire'])));
    expect(tipScore(p(20, 'Journaal', ['Informatief', 'Nieuws/actualiteiten']))).toBe(0);
    expect(tipScore(p(19, 'Klokhuis', ['Jeugd', 'Informatief']))).toBe(0);
    expect(tipScore(p(21, 'Doc', ['Documentaire']))).toBeGreaterThan(tipScore(p(18, 'Doc', ['Documentaire'])));
  });
});

describe('vanavond', () => {
  const gids = [p(18, 'Doc vroeg', ['Documentaire']), p(20, 'Journaal', ['Nieuws/actualiteiten']), p(21, 'Drama', ['Serie', 'Drama']), p(22, 'Zussen', ['Serie'])];
  it('eerst je lijst, dan de beste tip; niets wat al voorbij is', () => {
    const nu = new Date('2026-10-28T18:30:00Z'); // 19:30 in Nederland
    expect(vanavond(gids, lijst, nu).map((x) => x.titel)).toEqual(['Zussen', 'Drama']);
  });
  it('een nieuwe uitzending gaat voor een herhaling, en elke titel één keer', () => {
    const nu = new Date('2026-10-28T15:00:00Z');
    const x = vanavond([p(17, 'Zussen', ['Serie'], { herhaling: true }), p(21, 'Zussen', ['Serie'])], lijst, nu);
    expect(x).toHaveLength(1);
    expect(x[0].herhaling).toBe(false);
  });
});

describe('lijstOpNpo en npoLink', () => {
  it('vindt je lijst in de week en linkt naar de serie', () => {
    const x = lijstOpNpo([p(22, 'Zussen', ['Serie'], { serie: 'zussen' })], lijst, ['2026-10-28']);
    expect(x).toHaveLength(1);
    expect(npoLink(x[0])).toBe('https://npo.nl/start/serie/zussen');
    expect(npoLink(p(20, 'X', [], { serie: '../x' }))).toBe('https://npo.nl/start/live?channel=npo1');
  });
});

describe('voorkeuren', () => {
  it('genre en omroep die je graag ziet, wegen zwaarder', () => {
    const doc = p(21, 'Doc', ['Documentaire'], { omroepen: ['VPRO'] });
    const drama = p(21, 'Drama', ['Serie', 'Drama'], { omroepen: ['MAX'] });
    expect(tipScore(drama)).toBeGreaterThan(tipScore(doc));
    expect(tipScore(doc, { genres: ['documentaire'], omroepen: [] })).toBeGreaterThan(tipScore(drama, { genres: ['documentaire'], omroepen: [] }));
    expect(tipScore(doc, { genres: [], omroepen: ['VPRO'] })).toBeGreaterThan(tipScore(drama, { genres: [], omroepen: ['VPRO'] }));
  });
  it('een quiz wordt alleen een tip als je hem graag ziet; nieuws nooit', () => {
    expect(tipScore(p(21, 'Quiz', ['Informatief', 'Spel/quiz']))).toBe(0);
    expect(tipScore(p(21, 'Quiz', ['Informatief', 'Spel/quiz']), { genres: ['quiz'], omroepen: [] })).toBeGreaterThan(0);
    expect(tipScore(p(20, 'Journaal', ['Nieuws/actualiteiten'], { omroepen: ['NOS'] }), { genres: [], omroepen: ['NOS'] })).toBe(0);
  });
  it('omroepen uit de gids', () => {
    expect(omroepenIn([{ omroepen: ['VPRO', 'NTR'] }, { omroepen: ['VPRO'] }, {}])).toEqual(['NTR', 'VPRO']);
  });
});

describe('omroepnamen', () => {
  it('Ongehoord NL in plaats van de volledige verenigingsnaam', () => {
    expect(metKorteNamen([{ omroepen: ['Omroepvereniging Ongehoord Nederland', 'VPRO'] }])[0].omroepen).toEqual(['Ongehoord NL', 'VPRO']);
  });
});
