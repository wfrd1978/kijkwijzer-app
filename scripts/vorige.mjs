// Lukt het ophalen van een schema niet, dan de versie die nu online staat opnieuw meenemen.
// Anders zou het bestand bij het online zetten van de site verdwijnen.
import { writeFile } from 'node:fs/promises';

const SITE = 'https://wfrd1978.github.io/kijkwijzer-app/';

export async function houdVorige(naam) {
  try {
    const antwoord = await fetch(`${SITE}${naam}.json`, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
    if (!antwoord.ok) throw new Error(`status ${antwoord.status}`);
    await writeFile(new URL(`../public/${naam}.json`, import.meta.url), await antwoord.text());
    console.log(`${naam}.json: vorige versie behouden.`);
  } catch (fout) {
    console.log(`${naam}.json: ook geen vorige versie (${fout.message}).`);
  }
}

// De versie die nu online staat, als gegevens (of null), om ontbrekende delen mee aan te vullen.
export async function leesVorige(naam) {
  try {
    const antwoord = await fetch(`${SITE}${naam}.json`, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
    return antwoord.ok ? await antwoord.json() : null;
  } catch {
    return null;
  }
}
