// Leest op de openbare Eredivisie-pagina van Ziggo op welk ESPN-kanaal (1 tot en met 4) elke
// wedstrijd komt, en zet dat klaar als public/espn.json. Draait in GitHub, één keer per dag.
// De robots.txt van ziggo.nl staat het lezen van deze pagina toe. Alleen dag, aftrap, clubs en
// kanaal worden overgenomen. Lukt het niet, dan toont de app gewoon "ESPN".
import { writeFile } from 'node:fs/promises';
import { leesEspnPagina, ESPN_BRON } from '../src/espn.js';
import { houdVorige } from './vorige.mjs';

try {
  const antwoord = await fetch(ESPN_BRON, { headers: { 'User-Agent': 'Kijkwijzer (persoonlijke kijkwijzer-app)' } });
  if (!antwoord.ok) throw new Error(`status ${antwoord.status}`);
  const kanalen = leesEspnPagina(await antwoord.text());
  if (!kanalen.length) throw new Error('geen wedstrijden gevonden (pagina veranderd?)');
  await writeFile(new URL('../public/espn.json', import.meta.url), JSON.stringify({ op: new Date().toISOString(), kanalen }));
  console.log(`espn.json: ${kanalen.length} wedstrijden met kanaal.`);
} catch (fout) {
  console.log(`ESPN-kanalen overgeslagen: ${fout.message}`);
  await houdVorige('espn');
}
