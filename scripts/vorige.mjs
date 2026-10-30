// Lukt het ophalen van een schema niet, dan de versie die nu online staat opnieuw meenemen.
// Anders zou het bestand bij het online zetten van de site verdwijnen.
import { writeFile } from 'node:fs/promises';

const SITE = 'https://wfrd1978.github.io/kijkwijzer-app/';

export async function houdVorige(naam) {
  try {
    const antwoord = await fetch(`${SITE}${naam}.json`, { cache: 'no-store' });
    if (!antwoord.ok) throw new Error(`status ${antwoord.status}`);
    await writeFile(new URL(`../public/${naam}.json`, import.meta.url), await antwoord.text());
    console.log(`${naam}.json: vorige versie behouden.`);
  } catch (fout) {
    console.log(`${naam}.json: ook geen vorige versie (${fout.message}).`);
  }
}
