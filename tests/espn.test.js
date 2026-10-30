import { describe, expect, it } from 'vitest';
import { leesEspnPagina, kanaalVoor } from '../src/espn.js';

// Zelfgemaakt stukje in de vorm van de Ziggo-pagina (geen kopie van de echte pagina).
const PAGINA = `<h2>Speelronde 11</h2><table><tr><th>Wedstrijd</th><th>Datum</th><th>Tijd</th><th>Zender</th></tr>
<tr><td>Feyenoord - Fortuna Sittard</td><td>zaterdag 31 oktober 2026</td><td>16.30</td><td>ESPN 3</td></tr>
<tr><td>Ajax - AZ Alkmaar</td><td>zaterdag 31 oktober 2026</td><td>21.00</td><td>ESPN 2</td></tr>
<tr><td>Cambuur-Leeuwarden - Go Ahead Eagles Deventer</td><td>zaterdag 31 oktober 2026</td><td>21.00</td><td>ESPN 1</td></tr></table>
<p>zondag 1 november 2026</p><table><tr><th>Zender</th></tr><tr><td>PEC Zwolle - ADO Den Haag</td><td>zondag 1 november 2026</td><td>12.15</td><td>ESPN 2</td></tr></table>`;

describe('leesEspnPagina', () => {
  it('leest wedstrijd, dag, tijd en kanaal', () => {
    const k = leesEspnPagina(PAGINA);
    expect(k).toHaveLength(4);
    expect(k[1]).toEqual({ dag: '2026-10-31', tijd: '21:00', thuis: 'Ajax', uit: 'AZ Alkmaar', kanaal: 'ESPN 2' });
    expect(k[2].thuis).toBe('Cambuur-Leeuwarden');
    expect(k[3]).toMatchObject({ dag: '2026-11-01', tijd: '12:15', thuis: 'PEC Zwolle', kanaal: 'ESPN 2' });
  });
});

describe('kanaalVoor', () => {
  const k = leesEspnPagina(PAGINA);
  it('koppelt op dag, aftrap en thuisclub (ook bij andere schrijfwijze)', () => {
    expect(kanaalVoor({ thuis: { naam: 'Ajax' } }, k, '2026-10-31', '21:00')).toBe('ESPN 2');
    expect(kanaalVoor({ thuis: { naam: 'Cambuur' } }, k, '2026-10-31', '21:00')).toBe('ESPN 1');
    expect(kanaalVoor({ thuis: { naam: 'Zwolle' } }, k, '2026-11-01', '12:15')).toBe('ESPN 2');
    expect(kanaalVoor({ thuis: { naam: 'Ajax' } }, k, '2026-10-31', '18:45')).toBe('');
  });
});
