// Nieuwe afleveringen van de series op je lijst. De gegevens komen van TMDB en worden
// hooguit één keer per dag per serie opgehaald. Ze staan apart in de opslag van de browser,
// niet bij je titels: het is alleen een geheugensteun, geen eigen gegevens.

const OPSLAG = 'afleveringen';

export function leesAfleveringen() {
  try {
    const x = JSON.parse(localStorage.getItem(OPSLAG) || '{}');
    return x && typeof x === 'object' ? x : {};
  } catch {
    return {};
  }
}

function bewaar(alles) {
  try {
    localStorage.setItem(OPSLAG, JSON.stringify(alles));
  } catch {
    // Geen opslag: dan morgen opnieuw ophalen.
  }
}

// Series die je volgt: op je lijst en nog niet helemaal gezien.
export function gevolgdeSeries(titels) {
  return titels.filter((t) => t.soort === 'serie' && t.status !== 'Gezien');
}

// Haalt bij wat vandaag nog niet is opgehaald; rustig, één voor één. Geeft de bijgewerkte stand.
export async function werkAfleveringenBij(titels, dag, haal, { wacht = 250, max = 40 } = {}) {
  const alles = leesAfleveringen();
  const series = gevolgdeSeries(titels);
  // Wat niet meer op je lijst staat, vergeten.
  const ids = new Set(series.map((t) => String(t.tmdbId)));
  for (const id of Object.keys(alles)) if (!ids.has(id)) delete alles[id];
  for (const t of series.filter((x) => alles[x.tmdbId]?.op !== dag).slice(0, max)) {
    try {
      alles[t.tmdbId] = { op: dag, ...(await haal(t.tmdbId)) };
    } catch (fout) {
      // Kent TMDB deze serie niet (meer), dan door met de volgende; anders (geen internet,
      // sleutel geweigerd) stoppen: wat er al is blijft staan.
      if (fout?.name !== 'NietGevonden') break;
      alles[t.tmdbId] = { op: dag, laatste: null, volgende: null, seizoenen: [] };
    }
    if (wacht) await new Promise((klaar) => setTimeout(klaar, wacht));
  }
  bewaar(alles);
  return alles;
}

// Afleveringen die op een van deze dagen verschijnen (of verschenen), per serie op je lijst.
export function afleveringenOp(titels, stand, dagen) {
  const op = new Set(dagen);
  const uit = [];
  for (const t of gevolgdeSeries(titels)) {
    const s = stand[t.tmdbId];
    if (!s) continue;
    for (const e of [s.laatste, s.volgende]) {
      if (e && op.has(e.dag) && !uit.some((x) => x.titel === t && x.dag === e.dag)) uit.push({ titel: t, ...e });
    }
  }
  return uit.sort((a, b) => a.dag.localeCompare(b.dag) || a.titel.titel.localeCompare(b.titel.titel));
}

// 'S5 · A3'
export function afleveringKort(e) {
  return `S${e.seizoen} · A${e.aflevering}`;
}
