import { describe, expect, it } from 'vitest';
import { bronVoor, inLiveVenster, uitOpenLigaDB, uitEspn, vindStand, standTekst } from '../src/live.js';

const w = (competitie, thuis, uit, start = '2026-11-01T13:30:00Z', extra = {}) => ({ competitie, start, thuis: { naam: thuis }, uit: { naam: uit }, ...extra });

describe('live standen', () => {
  it('kiest per competitie de bron', () => {
    expect(bronVoor(w('DED', 'Ajax', 'AZ'))).toEqual({ bron: 'espn', liga: 'ned.1', reserve: null });
    expect(bronVoor(w('BL1', 'Bayern', 'Dortmund'))).toEqual({ bron: 'espn', liga: 'ger.1', reserve: { bron: 'oldb', liga: 'bl1' } });
    expect(bronVoor(w('EXTRA', 'Ajax', 'NEC', undefined, { competitieNaam: 'KNVB Beker' }))).toEqual({ bron: 'espn', liga: 'ned.cup', reserve: null });
    expect(bronVoor(w('EXTRA', 'X', 'Y', undefined, { competitieNaam: 'FA Cup' }))).toBe(null);
  });
  it('vraagt alleen rond de wedstrijd', () => {
    const t = Date.parse('2026-11-01T13:30:00Z');
    expect(inLiveVenster(w('DED', 'a', 'b'), t - 10 * 60000)).toBe(false);
    expect(inLiveVenster(w('DED', 'a', 'b'), t + 60 * 60000)).toBe(true);
    expect(inLiveVenster(w('DED', 'a', 'b'), t + 3 * 3600000)).toBe(false);
  });
  it('leest ESPN en koppelt op tijd en namen', () => {
    const standen = uitEspn({
      events: [
        {
          date: '2026-11-01T13:30Z',
          status: { displayClock: "67'", type: { state: 'in', shortDetail: "67'" } },
          competitions: [{ competitors: [{ homeAway: 'home', score: '0', team: { displayName: 'Excelsior' } }, { homeAway: 'away', score: '3', team: { displayName: 'FC Twente' } }] }],
        },
      ],
    });
    const s = vindStand(w('DED', 'Excelsior', 'Twente'), standen);
    expect(standTekst(s)).toEqual({ live: true, tekst: "0-3 · 67'" });
    expect(vindStand(w('DED', 'Ajax', 'Twente'), standen)).toBe(null);
  });
  it('herkent korte en afwijkende clubnamen', () => {
    const s = [{ start: '2026-11-03T20:00Z', thuis: 'FC Bayern München', uit: 'FC Barcelona', doelThuis: 0, doelUit: 1, toestand: 'live', minuut: "31'" }, { start: '2026-11-03T20:00Z', thuis: 'Ajax', uit: 'AZ Alkmaar', doelThuis: 2, doelUit: 1, toestand: 'live', minuut: "38'" }];
    expect(vindStand(w('CL', 'Bayern', 'Barça', '2026-11-03T20:00:00Z'), s)?.uit).toBe('FC Barcelona');
    expect(vindStand(w('DED', 'Ajax', 'AZ', '2026-11-03T20:00:00Z'), s)?.uit).toBe('AZ Alkmaar');
    expect(vindStand(w('DED', 'Ajax', 'PSV', '2026-11-03T20:00:00Z'), s)).toBe(null);
  });
  it('verzint geen 0-0 als OpenLigaDB een wedstrijd niet bijhoudt', () => {
    const niet = uitOpenLigaDB([{ matchDateTimeUTC: '2020-11-03T20:00:00Z', matchDateTime: '2020-11-03T21:00:00', lastUpdateDateTime: '2020-08-29T18:29:34', team1: { teamName: 'Feyenoord Rotterdam' }, team2: { teamName: 'Inter Mailand' }, matchIsFinished: false, matchResults: [], goals: [] }]);
    expect(standTekst(niet[0])).toBe(null);
    const wel = uitOpenLigaDB([{ matchDateTimeUTC: '2020-11-03T20:00:00Z', matchDateTime: '2020-11-03T21:00:00', lastUpdateDateTime: '2020-11-03T21:20:00', team1: { teamName: 'A' }, team2: { teamName: 'B' }, matchIsFinished: false, matchResults: [], goals: [] }]);
    expect(standTekst(wel[0])?.tekst).toBe('0-0');
  });
  it('herkent een club aan zijn afkorting of volledige naam (PSG)', () => {
    const standen = uitEspn({ events: [{ date: '2026-11-03T20:00Z', status: { displayClock: "61'", type: { state: 'in' } }, competitions: [{ competitors: [{ homeAway: 'home', score: '0', team: { displayName: 'Villarreal', shortDisplayName: 'Villarreal', abbreviation: 'VIL' } }, { homeAway: 'away', score: '5', team: { displayName: 'Paris Saint-Germain', shortDisplayName: 'PSG', abbreviation: 'PSG' } }] }] }] });
    const psg = { competitie: 'CL', start: '2026-11-03T20:00:00Z', thuis: { naam: 'Villarreal', vol: 'Villarreal CF' }, uit: { naam: 'PSG', vol: 'Paris Saint-Germain FC' } };
    expect(standTekst(vindStand(psg, standen))).toEqual({ live: true, tekst: "0-5 · 61'" });
  });
  it('leest OpenLigaDB, ook een eindstand', () => {
    const standen = uitOpenLigaDB([
      { matchDateTimeUTC: '2026-10-31T14:30:00Z', team1: { teamName: 'Bayer 04 Leverkusen' }, team2: { teamName: 'VfB Stuttgart' }, matchIsFinished: true, matchResults: [{ resultOrderID: 1, pointsTeam1: 1, pointsTeam2: 2 }, { resultOrderID: 2, pointsTeam1: 2, pointsTeam2: 4 }], goals: [] },
    ]);
    expect(standTekst(vindStand(w('BL1', 'Leverkusen', 'Stuttgart', '2026-10-31T14:30:00Z'), standen))).toEqual({ live: false, tekst: '2-4' });
  });
});
