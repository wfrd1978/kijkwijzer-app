import { describe, expect, it } from 'vitest';
import { weekDagen, weekTekst } from '../src/vandaag.js';

describe('weekDagen', () => {
  it('maandag tot en met zondag', () => {
    expect(weekDagen('2026-10-28')).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
    expect(weekDagen('2026-11-01')[0]).toBe('2026-10-26');
    expect(weekDagen('2026-10-26')[6]).toBe('2026-11-01');
  });
  it('als tekst', () => {
    expect(weekTekst(weekDagen('2026-10-28'))).toBe('Maandag 26 okt – zondag 1 nov');
  });
});
