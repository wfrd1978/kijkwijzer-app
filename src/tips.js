// Tips voor mij: aanbevelingen van TMDB bij titels die je 4 of 5 sterren gaf.
// Op regels, niet met AI: een titel die bij meer van je favorieten terugkomt, of hoger
// in die aanbevelingen staat, komt hoger. Wat al op je lijst staat valt weg.
import { titelSleutel } from './titels.js';

export const MAX_FAVORIETEN = 8;
export const MAX_TIPS = 30;

// De favorieten van één soort waarop de tips gebaseerd worden: hoogst gewaardeerd en
// meest recent gezien eerst.
export function kiesFavorieten(titels, soort) {
  return titels
    .filter((t) => t.soort === soort && t.sterren >= 4)
    .sort((a, b) => b.sterren - a.sterren || (b.kijkdatum || b.toegevoegdOp).localeCompare(a.kijkdatum || a.toegevoegdOp))
    .slice(0, MAX_FAVORIETEN);
}

const namen = (l) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} en ${l.at(-1)}` : l[0]);

// per: [{ favoriet, aanbevolen: [titel, ...] }]; opLijst: set van titelSleutels.
export function combineerTips(per, opLijst) {
  const scores = new Map();
  for (const { favoriet, aanbevolen } of per) {
    aanbevolen.forEach((t, plek) => {
      const s = titelSleutel(t);
      if (opLijst.has(s)) return;
      const tip = scores.get(s) ?? { titel: t, score: 0, door: [] };
      // Elke favoriet telt even zwaar mee; bovenaan in een lijst telt iets extra, 5 sterren ook.
      tip.score += 1 + 1 / (plek + 1) + (favoriet.sterren === 5 ? 0.25 : 0);
      if (!tip.door.includes(favoriet.titel)) tip.door.push(favoriet.titel);
      scores.set(s, tip);
    });
  }
  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_TIPS)
    .map(({ titel, door }) => ({ ...titel, reden: `Omdat je ${namen(door.slice(0, 3))} hoog waardeerde.` }));
}
