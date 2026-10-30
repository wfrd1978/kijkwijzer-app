import { describe, expect, it } from 'vitest';
import { kiesFavorieten, combineerTips } from '../src/tips.js';

const t = (tmdbId, titel, extra = {}) => ({ tmdbId, soort: 'film', titel, sterren: 0, kijkdatum: '', toegevoegdOp: '2026-01-01T00:00:00Z', ...extra });

describe('kiesFavorieten', () => {
  it('neemt alleen 4 en 5 sterren van de gekozen soort, beste en nieuwste eerst', () => {
    const lijst = [
      t(1, 'Matig', { sterren: 3 }),
      t(2, 'Goed', { sterren: 4, kijkdatum: '2026-05-01' }),
      t(3, 'Top oud', { sterren: 5, kijkdatum: '2024-01-01' }),
      t(4, 'Top nieuw', { sterren: 5, kijkdatum: '2026-01-01' }),
      { ...t(5, 'Serie', { sterren: 5 }), soort: 'serie' },
    ];
    expect(kiesFavorieten(lijst, 'film').map((x) => x.titel)).toEqual(['Top nieuw', 'Top oud', 'Goed']);
    expect(kiesFavorieten(lijst, 'serie').map((x) => x.titel)).toEqual(['Serie']);
  });
});

describe('combineerTips', () => {
  const dune = t(10, 'Dune', { sterren: 5 });
  const arrival = t(11, 'Arrival', { sterren: 4 });
  it('zet titels die bij meer favorieten terugkomen bovenaan, met de reden erbij', () => {
    const tips = combineerTips(
      [
        { favoriet: dune, aanbevolen: [t(20, 'Blade Runner'), t(21, 'Interstellar')] },
        { favoriet: arrival, aanbevolen: [t(21, 'Interstellar'), t(22, 'Contact')] },
      ],
      new Set()
    );
    expect(tips.map((x) => x.titel)).toEqual(['Interstellar', 'Blade Runner', 'Contact']);
    expect(tips[0].reden).toBe('Omdat je Dune en Arrival hoog waardeerde.');
    expect(tips[1].reden).toBe('Omdat je Dune hoog waardeerde.');
  });
  it('laat weg wat al op je lijst staat', () => {
    const tips = combineerTips([{ favoriet: dune, aanbevolen: [t(20, 'Blade Runner'), t(10, 'Dune')] }], new Set(['film:20']));
    expect(tips.map((x) => x.titel)).toEqual(['Dune']);
  });
});
