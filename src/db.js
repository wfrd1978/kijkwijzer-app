import Dexie from 'dexie';
import { DATABASE } from './opslag.js';
import { nieuweTitel, zonderBezig } from './titels.js';

// Je lijst staat in IndexedDB op het toestel zelf.
export const db = new Dexie(DATABASE);

db.version(1).stores({
  // Elke film of serie maar één keer: de combinatie soort + TMDB-nummer is uniek.
  titels: '++id, &[soort+tmdbId], toegevoegdOp, status',
});

// Versie 2 (oktober 2026): de status 'Bezig' bestaat niet meer. Eenmalig, bij het openen van de app;
// alleen de status verandert (en een serie krijgt een voortgang), verder blijft alles zoals het was.
db.version(2)
  .stores({ titels: '++id, &[soort+tmdbId], toegevoegdOp, status' })
  .upgrade((tx) =>
    tx.table('titels').toCollection().modify((t) => {
      Object.assign(t, zonderBezig(t));
    })
  );

// Vraag de browser om de opslag niet zomaar op te ruimen.
export async function vraagBlijvendeOpslag() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // Niet elke browser ondersteunt dit; de app werkt ook zonder.
  }
}

export function alleTitels() {
  return db.titels.orderBy('toegevoegdOp').reverse().toArray();
}

// Zet een zoekresultaat op je lijst. Staat hij er al, dan blijft alles zoals het was.
export async function titelToevoegen(t) {
  const bestaand = await db.titels.where({ soort: t.soort, tmdbId: t.tmdbId }).first();
  if (bestaand) return { titel: bestaand, nieuw: false };
  const titel = nieuweTitel(t);
  titel.id = await db.titels.add(titel);
  return { titel, nieuw: true };
}

export function haalTitel(id) {
  return db.titels.get(id);
}

export function titelBijwerken(id, wijzigingen) {
  return db.titels.update(id, wijzigingen);
}

export function titelVerwijderen(id) {
  return db.titels.delete(id);
}

// Voor 'Ongedaan maken': de titel komt terug met hetzelfde nummer en alles wat je had ingevuld.
export function titelTerugzetten(titel) {
  return db.titels.put(titel);
}
