import { eigenSleutels } from './opslag.js';

// Eén keer per dag ophalen, en daarna bewaren op de telefoon. Zo hoeft de app niet bij elke
// keer openen alles opnieuw te vragen. Lukt ophalen niet, dan blijft de laatst bewaarde versie.

// De 'dag' waarop iets vers is. GitHub zet de schema's 's nachts klaar (rond 03:30-04:30); wat vóór 06:00 is
// opgehaald, wordt na 06:00 nog één keer ververst.
export function dagSleutel(nu = new Date()) {
  const twee = (n) => String(n).padStart(2, '0');
  return `${nu.getFullYear()}-${twee(nu.getMonth() + 1)}-${twee(nu.getDate())}${nu.getHours() < 6 ? '-vroeg' : ''}`;
}

function lees(sleutel) {
  try {
    return JSON.parse(localStorage.getItem(`dag:${sleutel}`) || 'null');
  } catch {
    return null;
  }
}

function bewaar(sleutel, waarde) {
  try {
    localStorage.setItem(`dag:${sleutel}`, JSON.stringify(waarde));
  } catch {
    // Opslag vol of niet beschikbaar: dan gewoon de volgende keer opnieuw ophalen.
  }
}

// Wat van een eerdere dag is bewaard, weggooien, zodat de opslag niet steeds groter wordt.
export function ruimOudeDagenOp(nu = new Date()) {
  const dag = dagSleutel(nu);
  try {
    for (const k of eigenSleutels().filter((x) => x.startsWith('dag:'))) {
      if (lees(k.slice(4))?.dag !== dag) localStorage.removeItem(k);
    }
  } catch {
    // Geen toegang tot de opslag: niets op te ruimen.
  }
}

// 'haal' geeft de gegevens (of null als er niets is). Null wordt niet bewaard.
// Met 'versie' (de versie van de app) telt iets ook als oud zodra er een nieuwe versie is: die
// komt vaak met nieuwe gegevens, zoals een extra competitie in het voetbalschema.
export async function vanVandaag(sleutel, haal, nu = new Date(), { versie = '' } = {}) {
  const dag = dagSleutel(nu);
  const bewaard = lees(sleutel);
  if (bewaard?.dag === dag && (bewaard.versie ?? '') === versie) return bewaard.data;
  try {
    const data = await haal();
    if (data != null) bewaar(sleutel, versie ? { dag, versie, data } : { dag, data });
    return data ?? bewaard?.data ?? null;
  } catch {
    return bewaard?.data ?? null;
  }
}
