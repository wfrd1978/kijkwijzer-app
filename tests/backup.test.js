import { describe, expect, it } from 'vitest';
import { herinneringNodig, leesBackup, dagenSinds } from '../src/backup.js';
import { normaliseerTitel } from '../src/titels.js';

const dag = 86400000;
const nu = new Date('2026-10-26T12:00:00Z');

describe('herinneringNodig', () => {
  it('niet bij een lege lijst', () => {
    expect(herinneringNodig({ aantal: 0, laatste: null, nu })).toBe(false);
  });
  it('wel als er nog nooit een backup was', () => {
    expect(herinneringNodig({ aantal: 3, laatste: null, nu })).toBe(true);
  });
  it('pas na 14 dagen', () => {
    expect(herinneringNodig({ aantal: 3, laatste: new Date(nu - 13 * dag), nu })).toBe(false);
    expect(herinneringNodig({ aantal: 3, laatste: new Date(nu - 14 * dag), nu })).toBe(true);
  });
  it('Later stelt een dag uit', () => {
    expect(herinneringNodig({ aantal: 3, laatste: null, later: new Date(nu - 2 * 3600000), nu })).toBe(false);
    expect(herinneringNodig({ aantal: 3, laatste: null, later: new Date(nu - 25 * 3600000), nu })).toBe(true);
  });
  it('telt hele dagen', () => {
    expect(dagenSinds(new Date(nu - 1.5 * dag), nu)).toBe(1);
    expect(dagenSinds(null, nu)).toBe(null);
  });
});

const goed = { id: 4, tmdbId: 1, soort: 'film', titel: 'Dune', status: 'Gezien', sterren: 4, kijkdatum: '2026-10-01', notitie: 'Mooi', toegevoegdOp: '2026-10-01T10:00:00.000Z', poster: '/a.jpg', jaar: '2021' };
const bestand = (inhoud) => new File([typeof inhoud === 'string' ? inhoud : JSON.stringify(inhoud)], 'b.json');

describe('normaliseerTitel', () => {
  it('houdt goede gegevens en laat onbekende velden weg', () => {
    const t = normaliseerTitel({ ...goed, hack: '<script>' });
    expect(t).toMatchObject(goed);
    expect(t.hack).toBeUndefined();
  });
  it('maakt verkeerde gegevens leeg', () => {
    const t = normaliseerTitel({ ...goed, status: 'Iets', sterren: 9, kijkdatum: 'gisteren', poster: 'javascript:x' });
    expect(t).toMatchObject({ status: 'Wil ik zien', sterren: 0, kijkdatum: '', poster: '' });
  });
  it('weigert een titel zonder TMDB-nummer of soort', () => {
    expect(() => normaliseerTitel({ titel: 'X', soort: 'film' })).toThrow();
    expect(() => normaliseerTitel({ titel: 'X', tmdbId: 1, soort: 'boek' })).toThrow();
  });
  it('neemt trailer en acteurs mee, en maakt rare waarden leeg', () => {
    const t = normaliseerTitel({ ...goed, extraOp: '2026-10-27', trailer: 'abc123XYZ', acteurs: [{ id: 1, naam: 'A', rol: 'R', foto: 'javascript:x' }, { naam: 'zonder id' }] });
    expect(t).toMatchObject({ trailer: 'abc123XYZ', acteurs: [{ id: 1, naam: 'A', rol: 'R', foto: '' }] });
    expect(normaliseerTitel({ ...goed, extraOp: '2026-10-27', trailer: '"><script>' }).trailer).toBe('');
    expect(normaliseerTitel({ ...goed, extraOp: '2026-10-27', achtergrond: '/b.jpg' }).achtergrond).toBe('/b.jpg');
    expect(normaliseerTitel({ ...goed, extraOp: '2026-10-27', achtergrond: 'https://x' }).achtergrond).toBe('');
  });
  it('neemt diensten alleen mee met een geldige datum', () => {
    expect(normaliseerTitel({ ...goed, dienstenOp: '2026-10-20', diensten: { abonnement: [{ id: 8, naam: 'Netflix', logo: '/n.jpg' }] } }).diensten.abonnement).toHaveLength(1);
    expect(normaliseerTitel({ ...goed, diensten: {} }).diensten).toBeUndefined();
  });
});

describe('leesBackup', () => {
  it('leest een goede backup', async () => {
    const inhoud = await leesBackup(bestand({ app: 'kijkwijzer', versie: 1, gemaakt: nu.toISOString(), titels: [goed] }));
    expect(inhoud.titels[0].titel).toBe('Dune');
  });
  it('weigert ander bestand, nieuwere versie of kapotte titel', async () => {
    await expect(leesBackup(bestand('geen json'))).rejects.toThrow('geen backup');
    await expect(leesBackup(bestand({ app: 'boeken-app', boeken: [] }))).rejects.toThrow('geen backup');
    await expect(leesBackup(bestand({ app: 'kijkwijzer', versie: 2, titels: [] }))).rejects.toThrow('nieuwere versie');
    await expect(leesBackup(bestand({ app: 'kijkwijzer', versie: 1, titels: [{ titel: '' }] }))).rejects.toThrow();
  });
});

describe('kwaadaardige backup', () => {
  it('laat geen eigen adressen of opmaak door via logo en link van diensten', () => {
    const t = normaliseerTitel({
      tmdbId: 1, soort: 'film', titel: 'X', dienstenOp: '2026-10-28',
      diensten: { abonnement: [{ id: 8, naam: 'Netflix', logo: 'https://x"><meta http-equiv=refresh content=0>' }], gratis: [], huren: [], kopen: [], link: 'https://kwaadaardig.example/"><b>' },
    });
    expect(t.diensten.abonnement[0].logo).toBe('');
    expect(t.diensten.link).toBe('');
  });
});
