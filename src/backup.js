// Backup: je hele lijst in één JSON-bestand, en weer terugzetten.
// De TMDB-sleutel gaat bewust niet mee: die hoort alleen op deze telefoon.
import { db } from './db.js';
import { normaliseerTitel } from './titels.js';

const APP = 'kijkwijzer';
const VERSIE = 1;
const LAATSTE = 'laatsteBackup';
const LATER = 'backupLater';
export const HERINNER_NA_DAGEN = 14;

// Keuzes in de lijst en de weergave: klein, maar fijn om mee te verhuizen.
const VOORKEUREN = ['filmsTab', 'sportTab', 'soort', 'sortering', 'weergave', 'diensten', 'sportzenders', 'voetbal', 'tvVoorkeuren'];

function lees(sleutel) {
  try {
    return localStorage.getItem(sleutel);
  } catch {
    return null;
  }
}
function zet(sleutel, waarde) {
  try {
    localStorage.setItem(sleutel, waarde);
  } catch {
    // Geen opslag: dan herinnert de app er later nog eens aan.
  }
}

export async function maakBackupBestand(nu = new Date()) {
  const titels = await db.titels.toArray();
  const inhoud = {
    app: APP,
    versie: VERSIE,
    gemaakt: nu.toISOString(),
    aantal: titels.length,
    titels,
    voorkeuren: Object.fromEntries(VOORKEUREN.map((k) => [k, lees(k)]).filter(([, v]) => typeof v === 'string')),
  };
  return new File([JSON.stringify(inhoud)], `kijkwijzer-backup-${nu.toISOString().slice(0, 10)}.json`, { type: 'application/json' });
}

// Via het deelmenu (iPhone: 'Bewaar in Bestanden' of de Google Drive-app), anders als download.
// Geeft true als de backup bewaard is, false bij annuleren.
export async function bewaarBackup(bestand) {
  if (navigator.canShare?.({ files: [bestand] })) {
    try {
      await navigator.share({ files: [bestand] });
    } catch (e) {
      if (e.name === 'AbortError') return false;
      throw e;
    }
  } else {
    const url = URL.createObjectURL(bestand);
    const a = Object.assign(document.createElement('a'), { href: url, download: bestand.name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  zet(LAATSTE, new Date().toISOString());
  return true;
}

export function laatsteBackup() {
  const waarde = lees(LAATSTE);
  return waarde ? new Date(waarde) : null;
}

export function dagenSinds(datum, nu = new Date()) {
  return datum ? Math.floor((nu - datum) / 86400000) : null;
}

// Herinneren als er titels zijn en er nog nooit een backup was, of de laatste 14 dagen of
// ouder is. 'Later' stelt de herinnering een dag uit.
export function herinneringNodig({ aantal, laatste, later, nu = new Date() }) {
  if (!aantal) return false;
  if (later && nu - later < 86400000) return false;
  const dagen = dagenSinds(laatste, nu);
  return dagen === null || dagen >= HERINNER_NA_DAGEN;
}

export function moetHerinneren(aantal) {
  const later = lees(LATER);
  return herinneringNodig({ aantal, laatste: laatsteBackup(), later: later ? new Date(later) : null });
}

export function herinnerLater() {
  zet(LATER, new Date().toISOString());
}

// Leest een backupbestand en controleert of het echt een backup van deze app is.
// Elke titel wordt nu al gecontroleerd, zodat een kapotte backup vóór het vervangen wordt geweigerd.
export async function leesBackup(bestand) {
  let inhoud;
  try {
    inhoud = JSON.parse(await bestand.text());
  } catch {
    throw new Error('Dit bestand is geen backup van Kijkwijzer.');
  }
  if (inhoud?.app !== APP || !Array.isArray(inhoud.titels)) throw new Error('Dit bestand is geen backup van Kijkwijzer.');
  if (inhoud.versie > VERSIE) throw new Error('Deze backup is gemaakt met een nieuwere versie van de app. Werk de app eerst bij.');
  inhoud.titels = inhoud.titels.map(normaliseerTitel);
  return inhoud;
}

// Vervangt de hele lijst door de backup, in één keer: lukt iets niet, dan blijft alles zoals het was.
export async function zetBackupTerug(inhoud) {
  await db.transaction('rw', db.titels, async () => {
    await db.titels.clear();
    await db.titels.bulkAdd(inhoud.titels);
  });
  const v = inhoud.voorkeuren;
  if (v && typeof v === 'object') for (const k of VOORKEUREN) if (typeof v[k] === 'string') zet(k, v[k]);
  return inhoud.titels.length;
}
