// Vangnet aan het eind: ontbreekt een schema (omdat een ophaalstap vastliep of crashte),
// dan de versie die nu online staat meenemen, zodat het bestand niet van de site verdwijnt.
import { access } from 'node:fs/promises';
import { houdVorige } from './vorige.mjs';

for (const naam of ['voetbal', 'espn', 'npo']) {
  try {
    await access(new URL(`../public/${naam}.json`, import.meta.url));
  } catch {
    await houdVorige(naam);
  }
}
