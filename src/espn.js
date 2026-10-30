// Op welk ESPN-kanaal (1 tot en met 4) een Eredivisie-wedstrijd komt. Ziggo zet dat per speelronde
// op een openbare pagina; GitHub leest die één keer per dag (scripts/espn.mjs) en zet de kanalen
// klaar in espn.json. Hier staat het lezen van die pagina en het koppelen aan de wedstrijden.
import { kaal } from './titels.js';

export const ESPN_BRON = 'https://www.ziggo.nl/entertainment/sport/voetbal/eredivisie/programma';

const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const DAGEN = 'maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag';

// Van de pagina (als html) naar [{ dag: 'jjjj-mm-dd', tijd: 'uu:mm', thuis, uit, kanaal: 'ESPN 2' }].
export function leesEspnPagina(html) {
  const tekst = String(html)
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
  const patroon = new RegExp(
    `(?<=(?:Zender|ESPN \\d) )((?:(?!Zender|ESPN \\d).){2,40}?) - ((?:(?!Zender|ESPN \\d).){2,40}?) (?:${DAGEN}) (\\d{1,2}) (${MAANDEN.join('|')}) (\\d{4}) (\\d{1,2})\\.(\\d{2}) (ESPN \\d)`,
    'g'
  );
  const uit = [];
  for (const m of tekst.matchAll(patroon)) {
    const [, thuis, tegen, dag, maand, jaar, uur, minuut, kanaal] = m;
    uit.push({
      dag: `${jaar}-${String(MAANDEN.indexOf(maand) + 1).padStart(2, '0')}-${dag.padStart(2, '0')}`,
      tijd: `${uur.padStart(2, '0')}:${minuut}`,
      thuis: thuis.trim(),
      uit: tegen.trim(),
      kanaal,
    });
  }
  return uit;
}

// Lijkt deze clubnaam op die andere? 'AZ' en 'AZ Alkmaar', 'Sittard' en 'Fortuna Sittard', 'Go Ahead' en 'Go Ahead Eagles Deventer'.
function zelfdeClub(a, b) {
  const woorden = (x) => kaal(x).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length >= 2 && !['fc', 'sc', 'sv', 'vv'].includes(w));
  const [wa, wb] = [woorden(a), woorden(b)];
  return wa.some((w) => wb.includes(w));
}

// Het kanaal van één wedstrijd: zelfde dag en aftrap, en de thuisclub komt overeen.
export function kanaalVoor(w, kanalen, dag, tijd) {
  return kanalen.find((k) => k.dag === dag && k.tijd === tijd && zelfdeClub(k.thuis, w.thuis.naam))?.kanaal ?? '';
}
