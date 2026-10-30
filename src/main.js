// Eerst de eigen opslag instellen, vóór er iets wordt bewaard.
import './opslag.js';
import './style.css';
import { veilig, veiligeUrl } from './veilig.js';
import { soortSleutel, leesSleutel, eigenSleutel, heeftGedeeldeSleutel, bewaarSleutel, wisSleutel } from './sleutel.js';
import { zoekTitels, testSleutel, posterUrl, SleutelFout, haalDiensten, haalAlleDiensten, haalTrending, haalOpDiensten, haalAanbevelingen, haalTrailerEnActeurs, haalActeur, haalAfleveringen, haalGenres, haalNieuwOpDiensten, haalTopOpDiensten } from './tmdb.js';
import { kiesFavorieten, combineerTips } from './tips.js';
import { haalF1, komendeRaces, nlTijd, F1_ZENDERS, ZENDER_GIDS, SPORTZENDERS, leesSportzenders, zetSportzenders } from './sport.js';
import { WIELRENNEN, komendeKoersen, kanIkKijken, koersDatum } from './wielrennen.js';
import {
  COMPETITIES, VOETBAL_GECONTROLEERD, leesVoetbalKeuzes, zetVoetbalKeuzes, mijnWedstrijden, ploegenPerCompetitie,
  perDag, weekStart, aftrap, dagNaam, haalOranje,
} from './voetbal.js';
import { uitnodigingTekst, deel } from './delen.js';
import { weekDagen, weekTekst } from './vandaag.js';
import { kanaalVoor } from './espn.js';
import { haalExtraWedstrijden, alBekend, EXTRA_ZENDERS } from './beker.js';
import { vanVandaag, ruimOudeDagenOp, dagSleutel } from './dagcache.js';
import { nieuwVoorJou, kijktipsVanDag, GENRE_NAMEN } from './nieuw.js';
import { vanavond, lijstOpNpo, npoLink, TV_GENRES, leesTvVoorkeuren, zetTvVoorkeuren, omroepenIn, metKorteNamen } from './tv.js';
import { leesAfleveringen, werkAfleveringenBij, afleveringenOp, afleveringenNa, afleveringKort } from './afleveringen.js';
import { KEUZES, leesKeuzes, zetKeuze, zetAlleKeuzes, keuzeVan, nieuwBijJou, verdeelDiensten, doorklikLink, beperkDiensten } from './diensten.js';
import { alleTitels, titelToevoegen, vraagBlijvendeOpslag, haalTitel, titelBijwerken, titelVerwijderen, titelTerugzetten } from './db.js';
import { maakBackupBestand, bewaarBackup, laatsteBackup, dagenSinds, moetHerinneren, herinnerLater, leesBackup, zetBackupTerug } from './backup.js';
import {
  titelSleutel, STATUSSEN, statusWijziging, vandaag, datumTekst,
  SOORTEN, SORTERINGEN, filterTitels, sorteerTitels, dubbelTekst, gevondenActeur,
  beginVoortgang, volgendeAflevering, voortgangKort,
} from './titels.js';

const app = document.getElementById('app');

// Elk verzoek van de app krijgt hooguit 12 seconden. Een trage bron geeft dan een gewone fout
// (en het blok blijft weg of toont een melding) in plaats van eeuwig 'Ophalen…'.
if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
  const gewoneFetch = window.fetch.bind(window);
  window.fetch = (adres, opties = {}) => gewoneFetch(adres, { signal: AbortSignal.timeout(12000), ...opties });
}

// Service worker: zorgt dat de app ook zonder internet opent.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}

// Nieuwe versie online? Dan een knop om te vernieuwen, zodat de app niet helemaal dicht hoeft.
// De app vergelijkt het hoofdbestand van de site met het bestand dat nu draait.
const HUIDIG_SCRIPT = document.querySelector('script[type="module"][src*="/assets/"]')?.getAttribute('src');

async function kijkNaarNieuweVersie() {
  if (!HUIDIG_SCRIPT || document.getElementById('nieuwe-versie')) return;
  try {
    const html = await (await fetch(import.meta.env.BASE_URL, { cache: 'no-store' })).text();
    const online = html.match(/<script[^>]+type="module"[^>]+src="([^"]+\/assets\/[^"]+)"/)?.[1];
    if (!online || online === HUIDIG_SCRIPT) return;
  } catch {
    return; // Geen internet: dan later nog eens.
  }
  // Net geopend (of net terug in beeld) en nog niets aangetikt? Dan meteen de nieuwe versie laden.
  // Hooguit één keer per vijf minuten, zodat een oude bewaarde versie nooit blijft herladen.
  if (!aangeraakt && Date.now() - inBeeldSinds < 15000 && !document.activeElement?.matches('input, textarea')) {
    let vorige = 0;
    try {
      vorige = Number(sessionStorage.getItem('zelfVernieuwd')) || 0;
      sessionStorage.setItem('zelfVernieuwd', String(Date.now()));
    } catch {
      vorige = Date.now(); // zonder opslag: niet zelf herladen, dan de knop
    }
    if (Date.now() - vorige > 5 * 60000) {
      location.reload();
      return;
    }
  }
  const knop = Object.assign(document.createElement('button'), {
    id: 'nieuwe-versie',
    textContent: 'Nieuwe versie klaar · tik om te vernieuwen',
  });
  knop.addEventListener('click', async () => {
    await toonTitel.bewaarOpenstaand?.();
    location.reload();
  });
  document.body.append(knop);
}
// Of je sinds het openen (of terugkomen) al iets hebt aangetikt of getypt.
let aangeraakt = false;
let inBeeldSinds = Date.now();
['pointerdown', 'keydown'].forEach((soort) => document.addEventListener(soort, () => (aangeraakt = true), { capture: true }));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    aangeraakt = false;
    inBeeldSinds = Date.now();
  }
});
if (HUIDIG_SCRIPT) {
  // Controleren: kort na het opstarten (de bewaarde, oude versie kan als eerste openen),
  // als de app terug in beeld komt, en verder elk half uur.
  setTimeout(kijkNaarNieuweVersie, 4000);
  window.addEventListener('pageshow', (e) => e.persisted && kijkNaarNieuweVersie());
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && kijkNaarNieuweVersie());
  setInterval(kijkNaarNieuweVersie, 30 * 60000);
}

// Korte melding onderin, eventueel met een knop (zoals 'Ongedaan maken').
function melding(tekst, knop) {
  const el = document.getElementById('melding');
  el.textContent = tekst;
  if (knop) {
    const b = Object.assign(document.createElement('button'), { textContent: knop.tekst });
    b.addEventListener('click', () => {
      el.classList.remove('zichtbaar');
      knop.actie();
    });
    el.append(b);
  }
  el.classList.toggle('met-knop', Boolean(knop));
  el.classList.add('zichtbaar');
  clearTimeout(melding.timer);
  melding.timer = setTimeout(() => el.classList.remove('zichtbaar'), knop ? 5000 : 2500);
}

function sterrenTekst(aantal) {
  return aantal ? '★'.repeat(aantal) + '☆'.repeat(5 - aantal) : '';
}

const JUSTWATCH = '<p class="bron">Streaminginformatie van JustWatch.</p>';
const BRON = '<p class="bron">Gegevens en posters van TMDB. Deze app gebruikt de TMDB API, maar is niet door TMDB goedgekeurd of gecertificeerd.</p>';

const TANDWIEL =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>';

// Kop van de drie hoofdschermen: grote titel, eventueel een regel erboven, en het tandwiel naar Instellingen.
function schermKop(titel, boven = '', onder = '') {
  return `
    <header class="schermkop">
      <div>${boven ? `<p class="schermkop-boven">${veilig(boven)}</p>` : ''}<h1>${veilig(titel)}</h1>${onder ? `<p class="groet">${veilig(onder)}</p>` : ''}</div>
      <a class="tandwiel" href="#/instellingen" aria-label="Instellingen">${TANDWIEL}</a>
    </header>`;
}

// Terugknop: terug naar waar je vandaan kwam, of (net geopend) naar een vaste plek.
let binnenApp = false;
const terugKnop = (standaard, naam = 'Terug') => `<button class="terug" data-terug="${standaard}">‹ ${naam}</button>`;
app.addEventListener('click', (e) => {
  const knop = e.target.closest('[data-terug]');
  if (!knop) return;
  if (binnenApp) history.back();
  else location.hash = knop.dataset.terug;
});

function posterHtml(t, klasse = 'poster-klein') {
  const url = veiligeUrl(posterUrl(t.poster, klasse === 'poster-groot' ? 'w342' : 'w185'));
  return url
    ? `<img class="${klasse}" src="${url}" alt="" loading="lazy" />`
    : `<div class="${klasse} geen-poster" aria-hidden="true">${veilig(t.titel.slice(0, 1))}</div>`;
}

function soortJaar(t) {
  return `${t.soort === 'film' ? 'Film' : 'Serie'}${t.jaar ? ` · ${veilig(t.jaar)}` : ''}`;
}

// Als een scherm laadt terwijl je al verder tikt, mag het oude scherm niets meer tekenen.
let schermNr = 0;

// --- Keuzes onthouden ---

// Je keuzes in de lijst blijven bewaard, ook als je de app sluit.
function onthoud(sleutel, standaard, toegestaan) {
  try {
    const waarde = localStorage.getItem(sleutel);
    return toegestaan.includes(waarde) ? waarde : standaard;
  } catch {
    return standaard;
  }
}
function bewaarKeuze(sleutel, waarde) {
  try {
    localStorage.setItem(sleutel, waarde);
  } catch {
    // Niet erg: dan geldt de keuze alleen nu.
  }
}

// Je voornaam (uit de welkomststappen of Instellingen). Alleen op deze telefoon en in je backup.
function leesNaam() {
  try {
    return (localStorage.getItem('naam') || '').trim().slice(0, 40);
  } catch {
    return '';
  }
}

// Zoals in de boekenapp: 'Goedemorgen, Sanne' onder de kop van Vandaag (zonder naam niets).
function groet() {
  const naam = leesNaam();
  if (!naam) return '';
  const uur = new Date().getHours();
  const tijd = uur < 6 ? 'Goedenacht' : uur < 12 ? 'Goedemorgen' : uur < 18 ? 'Goedemiddag' : 'Goedenavond';
  return `${tijd}, ${naam}`;
}
let soort = onthoud('soort', 'alle', Object.keys(SOORTEN));
let sortering = onthoud('sortering', 'toegevoegd', Object.keys(SORTERINGEN));

// --- Vegen om te verwijderen (zoals in de boekenapp) ---
// Een regel naar links vegen toont een rode knop Verwijder; snel vegen telt ook.

const VEEG_BREEDTE = 96;

function maakVeegbaar(lijst, onVerwijder) {
  let open = null;
  let start = null;
  let frame = 0;

  const zet = (li, x, animeer) => {
    const a = li.querySelector('.titel');
    li.classList.add('veegt');
    a.style.transition = animeer ? 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
    a.style.transform = x ? `translate3d(${x}px, 0, 0)` : '';
    // Dicht geschoven: knop en extra laag weer weg zodra de beweging klaar is.
    if (!x) {
      clearTimeout(li.veegTimer);
      li.veegTimer = setTimeout(() => {
        if (!a.style.transform) li.classList.remove('veegt');
      }, animeer ? 350 : 0);
    }
  };
  const sluit = () => {
    if (open) zet(open, 0, true);
    open = null;
  };
  // Voorbij de knop gaat het zwaarder, zoals een elastiek.
  const elastiek = (x) => (x >= -VEEG_BREEDTE ? x : -VEEG_BREEDTE + (x + VEEG_BREEDTE) * 0.3);

  lijst.addEventListener('touchstart', (e) => {
    const li = e.target.closest('.veeg');
    if (!li || e.target.closest('.veeg-actie')) return;
    if (open && open !== li) sluit();
    const t = e.touches[0];
    start = { li, x: t.clientX, y: t.clientY, basis: open === li ? -VEEG_BREEDTE : 0, richting: null, laatste: [] };
  }, { passive: true });

  lijst.addEventListener('touchmove', (e) => {
    if (!start) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Pas beslissen na een paar pixels: vegen opzij of gewoon scrollen.
    if (!start.richting) {
      if (Math.abs(dx) + Math.abs(dy) < 10) return;
      start.richting = Math.abs(dx) > Math.abs(dy) ? 'opzij' : 'scroll';
      // Vanaf hier meten, zodat de regel niet verspringt.
      start.x = t.clientX;
    }
    if (start.richting !== 'opzij') return;
    e.preventDefault();
    start.laatste.push({ x: t.clientX, t: e.timeStamp });
    if (start.laatste.length > 5) start.laatste.shift();
    const x = elastiek(Math.min(0, start.basis + t.clientX - start.x));
    const li = start.li;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => zet(li, x, false));
  }, { passive: false });

  // Onderbroken (bijvoorbeeld door een melding): regel netjes dichtschuiven.
  lijst.addEventListener('touchcancel', () => {
    if (start?.li) zet(start.li, start.basis, true);
    start = null;
  });

  lijst.addEventListener('touchend', (e) => {
    if (!start) return;
    if (start.richting === 'opzij') {
      cancelAnimationFrame(frame);
      const x = start.basis + (e.changedTouches[0].clientX - start.x);
      // Snelheid van de laatste beweging: een snelle veeg telt ook als hij kort is.
      const p = start.laatste;
      const snelheid = p.length > 1 ? (p[p.length - 1].x - p[0].x) / Math.max(1, p[p.length - 1].t - p[0].t) : 0;
      const openen = snelheid < -0.4 || (snelheid <= 0.4 && x < -VEEG_BREEDTE / 2);
      zet(start.li, openen ? -VEEG_BREEDTE : 0, true);
      open = openen ? start.li : open === start.li ? null : open;
      // Na vegen geen titel openen.
      const li = start.li;
      li.dataset.geveegd = 'ja';
      setTimeout(() => delete li.dataset.geveegd, 400);
    }
    start = null;
  });

  lijst.addEventListener('click', (e) => {
    const li = e.target.closest('.veeg');
    if (!li) return;
    if (e.target.closest('.veeg-actie')) {
      open = null;
      onVerwijder(li);
      return;
    }
    // Tik op een open regel (of net geveegd): dichtschuiven in plaats van openen.
    if (li.dataset.geveegd || open === li) {
      e.preventDefault();
      sluit();
    }
  });
}

function titelRegel(t, zoek = '', { status = true, acties = false } = {}) {
  const acteur = gevondenActeur(t, zoek);
  // In de eigen lijst: bij Wil ik zien een knop 'Gezien', bij Gezien de sterren om aan te tikken.
  const actie = !acties
    ? ''
    : t.status === 'Gezien'
      ? `<span class="lijst-sterren" role="group" aria-label="Sterren">${[1, 2, 3, 4, 5]
          .map((n) => `<span class="lijst-ster${t.sterren >= n ? ' aan' : ''}" data-actie="ster" data-n="${n}" role="button" aria-label="${n} ${n === 1 ? 'ster' : 'sterren'}">★</span>`)
          .join('')}</span>`
      : '<span class="regel-knop" data-actie="gezien" role="button">✓ Gezien</span>';
  return `
      <li class="veeg" data-id="${t.id}">
        <button class="veeg-actie" tabindex="-1">Verwijder</button>
        <a class="titel" href="#/titel/${t.id}">
        ${posterHtml(t)}
        <div class="titel-tekst">
          <span class="regel">
            ${status ? `<span class="status${t.status === 'Wil ik zien' ? '' : ' status-actief'}">${veilig(t.status)}</span>` : ''}
            ${t.sterren && !acties ? `<span class="sterren-klein" aria-label="${t.sterren} sterren">${sterrenTekst(t.sterren)}</span>` : ''}
            ${t.soort === 'serie' && t.status !== 'Gezien' && voortgangKort(t.voortgang) ? `<span class="voortgang-kort">${voortgangKort(t.voortgang)}</span>` : ''}
            ${t.nieuwBij?.length ? `<span class="nieuw-label">Nieuw bij ${veilig(t.nieuwBij.map((d) => d.naam).join(' en '))}</span>` : ''}
          </span>
          <strong>${veilig(t.titel)}</strong>
          <span>${soortJaar(t)}</span>
          ${acteur ? `<span class="met-acteur">Met ${veilig(acteur)}</span>` : ''}
          ${actie}
        </div>
      </a></li>`;
}

// --- Sterren geven, meteen na 'Gezien' ---

// Een venster onderin: 'Hoeveel sterren?'. Bewaart de keuze en geeft het aantal (0 = later).
function vraagSterren(titel) {
  return new Promise((klaar) => {
    document.getElementById('sterren-venster')?.remove();
    const venster = Object.assign(document.createElement('div'), { id: 'sterren-venster', className: 'venster' });
    venster.innerHTML = `
      <div class="venster-vlak" role="dialog" aria-modal="true" aria-labelledby="venster-kop">
        <p class="venster-label">Gezien</p>
        <h2 id="venster-kop">${veilig(titel.titel)}</h2>
        <p class="zacht">Wat vond je ervan?</p>
        <div class="sterren venster-sterren">${[1, 2, 3, 4, 5]
          .map((n) => `<button class="ster" data-n="${n}" aria-label="${n} ${n === 1 ? 'ster' : 'sterren'}">★</button>`)
          .join('')}</div>
        <button class="link-knop" data-n="0">Later</button>
      </div>`;
    document.body.append(venster);
    const sterren = venster.querySelectorAll('.venster-sterren .ster');
    // Bij aanwijzen of aantikken lichten de sterren tot daar op.
    const licht = (n) => sterren.forEach((b) => b.classList.toggle('aan', Number(b.dataset.n) <= n));
    venster.addEventListener('pointerover', (e) => e.target.closest('.ster') && licht(Number(e.target.closest('.ster').dataset.n)));
    venster.addEventListener('click', async (e) => {
      const knop = e.target.closest('[data-n]');
      if (!knop && e.target !== venster) return;
      const n = knop ? Number(knop.dataset.n) : 0;
      if (n) {
        licht(n);
        await titelBijwerken(titel.id, { sterren: n });
        titel.sterren = n;
        await new Promise((x) => setTimeout(x, 250)); // even laten zien wat je koos
      }
      venster.remove();
      klaar(n);
    });
  });
}

// Een titel op Gezien zetten (met de datum van vandaag) en meteen om sterren vragen.
async function zetOpGezien(titel) {
  const wijziging = statusWijziging(titel, 'Gezien');
  await titelBijwerken(titel.id, wijziging);
  Object.assign(titel, wijziging);
  const n = await vraagSterren(titel);
  melding(n ? `${titel.titel}: ${n} ${n === 1 ? 'ster' : 'sterren'}` : 'Op Gezien gezet');
  return n;
}

// --- Nieuw bij jouw diensten ---

function nieuwHtml(titels) {
  const nieuw = titels.filter((t) => t.nieuwBij?.length);
  if (!nieuw.length) return '';
  return `
    <div class="nieuw-melding">
      <p class="nieuw-kop">Nieuw bij jouw diensten</p>
      <ul>${nieuw
        .slice(0, 5)
        .map((t) => `<li><a href="#/titel/${t.id}"><strong>${veilig(t.titel)}</strong> · ${veilig(t.nieuwBij.map((d) => d.naam).join(' en '))}</a></li>`)
        .join('')}</ul>
      ${nieuw.length > 5 ? `<p class="zacht">En nog ${nieuw.length - 5} andere titels.</p>` : ''}
      <button class="link-knop" id="nieuw-gezien">Gezien, melding weg</button>
    </div>`;
}

const NIEUW_GECONTROLEERD = 'nieuwGecontroleerd';

// Kijkt of titels op 'Wil ik zien' nieuw te zien zijn bij een van je abonnementen.
// Eén keer per dag vanzelf (of nu, via Instellingen). Geeft het aantal nieuwe titels,
// of null als er niets te controleren viel.
// Nieuwe diensten van één titel verwerken: bewaren, en wat nieuw is bij jouw abonnementen
// onthouden voor de melding. Gebruikt door de dagelijkse controle én bij het openen van een titel.
// Geeft true als er iets nieuw is bij jou.
async function werkDienstenBij(t, diensten, keuzes = leesKeuzes()) {
  const wijziging = { diensten, dienstenOp: vandaag() };
  const nieuw = t.status === 'Wil ik zien' ? nieuwBijJou(t, diensten, keuzes) : [];
  if (nieuw.length) {
    const al = t.nieuwBij ?? [];
    wijziging.nieuwBij = [...al, ...nieuw.filter((d) => !al.some((a) => a.id === d.id))];
  }
  Object.assign(t, wijziging);
  await titelBijwerken(t.id, wijziging);
  return nieuw.length > 0;
}

// Uitkomst: het aantal titels dat nieuw is bij je diensten; null als er niets te controleren
// viel (geen sleutel of abonnementen, of vandaag al gedaan); -1 als het onderweg mislukte.
async function controleerNieuw({ nu = false } = {}) {
  if (!leesSleutel()) return null;
  const keuzes = leesKeuzes();
  if (!Object.values(keuzes).includes('abonnement')) return null;
  if (!nu && onthoud(NIEUW_GECONTROLEERD, '', [vandaag()]) === vandaag()) return null;
  let gevonden = 0;
  // Titels die vandaag al zijn bijgewerkt (bijvoorbeeld bij het openen) zijn al gecontroleerd.
  for (const t of (await alleTitels()).filter((x) => x.status === 'Wil ik zien' && (nu || x.dienstenOp !== vandaag()))) {
    let diensten;
    try {
      diensten = await haalDiensten(t.soort, t.tmdbId);
    } catch (fout) {
      if (fout?.name === 'NietGevonden') continue; // TMDB kent deze titel niet meer: door met de volgende
      return -1; // Geen internet of sleutel geweigerd: de volgende keer opnieuw.
    }
    if (await werkDienstenBij(t, diensten, keuzes)) gevonden += 1;
    await new Promise((klaar) => setTimeout(klaar, 300)); // rustig aan richting TMDB
  }
  bewaarKeuze(NIEUW_GECONTROLEERD, vandaag());
  // Staat Vandaag open, dan meteen de melding laten zien (niet als je net iets anders bekijkt).
  if (gevonden && document.getElementById('sport-vandaag')) route();
  return gevonden;
}

function herinneringHtml() {
  const dagen = dagenSinds(laatsteBackup());
  return `
    <div class="herinnering">
      <p>${dagen === null ? 'Je hebt nog geen backup van je lijst.' : `Je laatste backup is ${dagen} dagen oud.`}</p>
      <div class="herinnering-knoppen">
        <a href="#/instellingen/backup">Backup maken</a>
        <button class="link-knop" id="later">Later</button>
      </div>
    </div>`;
}

// --- Zoeken ---

let laatsteZoekterm = '';
let laatsteResultaten = [];
let laatstePersonen = [];
let zoekNr = 0;

async function zoek(term) {
  const vak = document.getElementById('resultaten');
  if (!vak) return;
  laatsteZoekterm = term.trim();
  if (!laatsteZoekterm) {
    vak.innerHTML = '';
    return;
  }
  const nr = ++zoekNr;
  vak.innerHTML = '<p class="bezig">Zoeken…</p>';
  try {
    const { titels, personen } = await zoekTitels(laatsteZoekterm);
    if (nr !== zoekNr) return; // er is intussen verder getypt
    laatsteResultaten = titels;
    laatstePersonen = personen;
    await toonResultaten();
  } catch (fout) {
    if (nr !== zoekNr) return;
    vak.innerHTML =
      fout instanceof SleutelFout
        ? '<p class="leeg">TMDB accepteert je sleutel niet. <a href="#/instellingen">Plak hem opnieuw</a>.</p>'
        : '<p class="leeg">Zoeken lukt nu niet. Heb je internet?</p>';
  }
}

async function toonResultaten() {
  const vak = document.getElementById('resultaten');
  if (!vak) return;
  const opLijst = new Map((await alleTitels()).map((t) => [titelSleutel(t), t]));
  // Acteurs bovenaan; tik je erop, dan zie je al hun films en series.
  const personen = laatstePersonen.length
    ? `<p class="label zoek-kop">Acteurs</p>
       <ul class="lijst">${laatstePersonen
         .map((a) => {
           const foto = veiligeUrl(posterUrl(a.foto, 'w185'));
           return `<li><a class="titel persoon" href="#/acteur/${a.id}">
             ${foto ? `<img class="persoon-foto" src="${foto}" alt="" loading="lazy" />` : `<span class="persoon-foto acteur-leeg" aria-hidden="true">${veilig(a.naam.slice(0, 1))}</span>`}
             <div class="titel-tekst">
               <strong>${veilig(a.naam)}</strong>
               <span>Acteur${a.bekendVan.length ? ` · ${a.bekendVan.map(veilig).join(', ')}` : ''}</span>
             </div>
           </a></li>`;
         })
         .join('')}</ul>
`
    : '';
  vak.innerHTML = laatsteResultaten.length || laatstePersonen.length
    ? `${personen}${laatsteResultaten.length ? '<p class="label zoek-kop">Nieuw zoeken bij TMDB</p>' : ''}<ul class="lijst">${laatsteResultaten
        .map(
          (t, i) => `
        <li><button class="titel resultaat" data-i="${i}">
          ${posterHtml(t)}
          <div class="titel-tekst">
            <strong>${veilig(t.titel)}</strong>
            <span>${soortJaar(t)}</span>
            ${t.origineel && t.origineel !== t.titel ? `<span class="zacht">${veilig(t.origineel)}</span>` : ''}
            ${opLijst.has(titelSleutel(t)) ? `<span class="op-lijst">${veilig(dubbelTekst(opLijst.get(titelSleutel(t))))}</span>` : ''}
          </div>
        </button></li>`
        )
        .join('')}</ul>${BRON}`
    : '<p class="leeg">Niets gevonden. Probeer andere woorden.</p>';
  vak.querySelectorAll('.resultaat').forEach((knop) =>
    knop.addEventListener('click', () => {
      const t = laatsteResultaten[Number(knop.dataset.i)];
      toonBevestigen(t, opLijst.get(titelSleutel(t)));
    })
  );
}

// Eén zoekresultaat groot, met de knop om hem op je lijst te zetten.
// Staat hij er al op, dan zie je dat (met wanneer je hem zag) en kun je hem openen.
toonBevestigen.nr = 0;
function toonBevestigen(t, alOpLijst, terug = { naam: 'Mijn lijst', toon: () => toonFilms() }) {
  schermNr += 1; // wat het vorige scherm nog aan het ophalen was, mag hier niet meer tekenen
  window.scrollTo(0, 0);
  app.innerHTML = `
    <header class="kop"><button class="terug" id="terug">‹ ${veilig(terug.naam)}</button></header>
    <section class="bevestig">
      ${posterHtml(t, 'poster-groot')}
      <h2>${veilig(t.titel)}</h2>
      <p>${soortJaar(t)}${t.origineel && t.origineel !== t.titel ? ` · ${veilig(t.origineel)}` : ''}</p>
      ${t.reden ? `<p class="reden">${veilig(t.reden)}</p>` : ''}
      ${t.beschrijving ? `<p class="beschrijving">${veilig(t.beschrijving)}</p>` : ''}
      ${
        alOpLijst
          ? `<div class="dubbel"><p>${veilig(dubbelTekst(alOpLijst))}</p><a class="tweede-knop" href="#/titel/${alOpLijst.id}">Open op mijn lijst</a></div>`
          : `<div class="toevoeg-knoppen">
               <button class="hoofdknop" data-toevoegen="Wil ik zien">+ Wil ik zien</button>
               <button class="tweede-knop" data-toevoegen="Gezien">✓ Al gezien</button>
             </div>`
      }
    </section>
  `;
  const gaTerug = () => {
    schermNr += 1;
    terug.toon();
  };
  document.getElementById('terug').addEventListener('click', gaTerug);
  // Waar kijken, trailer en acteurs, ook al voordat je hem op je lijst zet.
  if (leesSleutel()) {
    const extraVak = Object.assign(document.createElement('div'), { id: 'extra', className: 'bevestig-extra' });
    document.querySelector('.bevestig').append(extraVak);
    let extra = null;
    extraVak.addEventListener('click', (e) => {
      if (e.target.closest('#trailer-start') && extra?.trailer) speelTrailer(extra.trailer);
    });
    const extraNr = toonBevestigen.nr + 1;
    haalTrailerEnActeurs(t.soort, t.tmdbId)
      .then((x) => {
        extra = x;
        if (extraNr === toonBevestigen.nr && document.body.contains(extraVak)) extraVak.innerHTML = extraHtml({ ...t, ...x });
      })
      .catch(() => {});
    const sectie = Object.assign(document.createElement('section'), { className: 'waar bevestig-waar' });
    sectie.innerHTML = '<p class="label">Waar kijken in Nederland</p><div id="bevestig-diensten" class="diensten"><p class="zacht">Ophalen…</p></div>';
    document.querySelector('.bevestig').append(sectie);
    const nr = ++toonBevestigen.nr;
    haalDiensten(t.soort, t.tmdbId)
      .then((diensten) => {
        const vak = document.getElementById('bevestig-diensten');
        if (vak && nr === toonBevestigen.nr) vak.innerHTML = dienstenHtml({ ...t, diensten, dienstenOp: vandaag() });
      })
      .catch(() => {
        const vak = document.getElementById('bevestig-diensten');
        if (vak) vak.innerHTML = '<p class="zacht">Ophalen lukt nu niet.</p>';
      });
  }
  // Meteen kiezen: nog kijken, of al gezien (dan met de datum van vandaag, en sterren geven kan meteen).
  document.querySelector('.toevoeg-knoppen')?.addEventListener('click', async (e) => {
    const knop = e.target.closest('[data-toevoegen]');
    if (!knop) return;
    document.querySelectorAll('[data-toevoegen]').forEach((b) => (b.disabled = true));
    const { titel, nieuw } = await titelToevoegen(t);
    if (!nieuw) {
      melding('Stond al op je lijst');
      gaTerug();
      return;
    }
    if (knop.dataset.toevoegen === 'Gezien') {
      await zetOpGezien(titel);
    } else {
      melding('Op Wil ik zien gezet');
    }
    gaTerug();
  });
}

// Een raster met posters (Ontdekken, acteurs). 'onder' is een extra regel per titel, zoals een rol.
function rasterHtml(titels, opLijst, onder = (t) => (t.jaar ? veilig(t.jaar) : '&nbsp;')) {
  return `<ul class="raster">${titels
    .map(
      (t, i) => `
      <li><button class="raster-titel" data-i="${i}">
        ${posterHtml(t, 'poster-raster')}
        ${opLijst.has(titelSleutel(t)) ? `<span class="raster-label">${veilig(opLijst.get(titelSleutel(t)).status ?? 'Op je lijst')}</span>` : ''}
        <strong>${veilig(t.titel)}</strong>
        <span>${onder(t)}</span>
      </button></li>`
    )
    .join('')}</ul>`;
}

// --- Vandaag ---

function verderKaart(t) {
  const v = t.voortgang ?? beginVoortgang();
  const seizoenen = t.seizoenen ?? [];
  const dit = seizoenen.find((x) => x.nr === v.seizoen);
  const volgende = volgendeAflevering(v, seizoenen);
  return `
    <div class="verder-kaart" data-id="${t.id}">
      <a href="#/titel/${t.id}" tabindex="-1">${posterHtml(t)}</a>
      <div class="verder-tekst">
        <a href="#/titel/${t.id}"><strong>${veilig(t.titel)}</strong></a>
        <span class="zacht">${
          v.aflevering ? `Seizoen ${v.seizoen} · aflevering ${v.aflevering}${dit ? ` van ${dit.afleveringen}` : ''}` : `Seizoen ${v.seizoen} · nog niet begonnen`
        }</span>
        ${
          volgende
            ? `<button class="hoofdknop" data-volgende>✓ ${volgende.seizoen !== v.seizoen ? `Seizoen ${volgende.seizoen}, aflevering 1` : `Aflevering ${volgende.aflevering}`} gezien</button>`
            : '<span class="zacht">Alle afleveringen gezien. Zet hem op Gezien via de titel.</span>'
        }
      </div>
    </div>`;
}

// Alles aan voetbal, Formule 1 en wielrennen dat jij volgt, op de gevraagde dagen ('jjjj-mm-dd').
async function sportItems(dagen) {
  const op = new Set(dagen);
  const [schema, f1, oranje, kanalen] = await Promise.all([haalVoetbal(), haalF1().catch(() => null), haalOranjeVanDaag(), haalEspn()]);
  const items = [];
  if (schema) {
    for (const w of mijnWedstrijden(schema.wedstrijden, leesVoetbalKeuzes()).filter((x) => op.has(nlDagVan(x)))) {
      const c = competitieVan(w);
      items.push({ dag: nlDagVan(w), start: w.start, tijd: aftrap(w.start), naam: `${w.thuis.naam} – ${w.uit.naam}`, sub: c.naam, zenders: zendersVan(w, kanalen), soort: 'voetbal', thuis: w.thuis, uit: w.uit, mijnClub: [w.thuis.id, w.uit.id].some((id) => leesVoetbalKeuzes().clubs.includes(id)) });
    }
  }
  if (oranje && op.has(nlDagVan(oranje))) {
    items.push({ dag: nlDagVan(oranje), start: oranje.start, tijd: aftrap(oranje.start), naam: `${oranje.thuis} – ${oranje.uit}`, sub: oranje.competitie, zenders: oranje.zenders, soort: 'oranje' });
  }
  for (const r of f1?.races ?? []) {
    for (const s of r.sessies.filter((x) => op.has(nlDagVan(x)))) {
      items.push({ dag: nlDagVan(s), start: s.start, tijd: s.metTijd ? aftrap(s.start) : '', naam: `${s.naam} · ${r.naam}`, sub: 'Formule 1', zenders: [{ naam: F1_ZENDERS.live, zeker: true }], soort: 'f1', sessie: s.naam });
    }
  }
  for (const dag of dagen) {
    for (const k of WIELRENNEN.koersen.filter((x) => x.van <= dag && (x.tot ?? x.van) >= dag)) {
      items.push({ dag, start: `${dag}T00:00`, tijd: '', naam: k.naam, sub: `Wielrennen · ${k.soort}`, zenders: k.zenders, soort: 'wiel' });
    }
  }
  return items.sort((a, b) => a.start.localeCompare(b.start));
}

// Eén zender per regel: liefst een van jouw zenders.
function eenZender(zenders, mijn) {
  return zenders.find((z) => mijn.includes(z.naam)) ?? zenders[0] ?? null;
}

async function sportVandaagHtml() {
  const mijn = leesSportzenders();
  const [items, schema, kanalen] = await Promise.all([sportItems([vandaag()]), haalVoetbal(), haalEspn()]);
  if (!items.length) return '<p class="leeg-klein">Geen sport vandaag bij jouw keuzes. <a href="#/sport">Bekijk het schema</a></p>';
  // Speelt een van je clubs vandaag, dan die wedstrijd groot bovenaan.
  const club = schema ? volgendeVanMijnClub(schema.wedstrijden, leesVoetbalKeuzes()) : null;
  const kaart = club && nlDagVan(club) === vandaag() ? wedstrijdKaart(club, zendersVan(club, kanalen), mijn, `Jouw club · ${competitieVan(club).naam}`) : '';
  // De uitgelichte wedstrijd niet nog een keer in de lijst.
  const rest = kaart ? items.filter((x) => !(x.start === club.start && x.naam === `${club.thuis.naam} – ${club.uit.naam}`)) : items;
  return `${kaart}${rest.length ? `<ul class="sport-vandaag">${rest
    .map((x) => {
      const z = eenZender(x.zenders, mijn);
      return `
      <li>
        <span class="sport-tijd${x.tijd ? '' : ' dag'}">${x.tijd ? veilig(x.tijd) : 'Hele dag'}</span>
        <div class="sport-wat"><strong>${veilig(x.naam)}</strong><span class="zacht">${veilig(x.sub)}</span></div>
        ${z ? zenderChip(z, mijn, true) : ''}
      </li>`;
    })
    .join('')}</ul>` : ''}`;
}

// Deze week: maandag tot en met zondag, per dag wat jij volgt. Afgelopen dagen staan grijs.
// Bij welke van jouw diensten een serie te zien is (of niets).
function dienstVan(t) {
  return t.diensten ? verdeelDiensten(t.diensten, leesKeuzes()).bijJou[0] ?? null : null;
}

// Alles wat jij volgt op deze dagen: sport, wat van je lijst op NPO komt, en nieuwe afleveringen.
async function agendaItems(titels, stand, dagen, { sport = true } = {}) {
  return [
    ...(sport ? await sportItems(dagen) : []),
    // Nieuwe afleveringen staan bovenaan hun dag.
    // Wat van je Wil ik zien deze week op NPO komt.
    ...lijstOpNpo((await haalNpo())?.programmas ?? [], titels, dagen).map((p) => ({
      dag: nlDagVan(p), start: p.start, tijd: aftrap(p.start), naam: p.titel, sub: p.aflevering || 'Van je lijst', zenders: [], dienst: { naam: p.zender }, nieuw: true, soort: 'npo', beeld: p.beeld,
    })),
    ...afleveringenOp(titels, stand, dagen).map((e) => ({
      dag: e.dag, start: `${e.dag}T00:00`, tijd: '', naam: e.titel.titel, sub: `Nieuwe aflevering · ${afleveringKort(e)}${e.naam ? ` · ${e.naam}` : ''}`, zenders: [], dienst: dienstVan(e.titel), nieuw: true, soort: 'serie', titel: e.titel,
    })),
  ].sort((a, b) => a.start.localeCompare(b.start));
}

// Het beeldje vooraan een regel in de week: emblemen, een poster, of een getekend icoon.
function agendaBeeld(x) {
  if (x.soort === 'voetbal') return `<span class="agenda-beeld duo">${embleem(x.thuis)}${embleem(x.uit)}</span>`;
  if (x.soort === 'serie') {
    const poster = veiligeUrl(posterUrl(x.titel.poster, 'w92'));
    return poster ? `<img class="agenda-beeld poster" src="${poster}" alt="" loading="lazy" />` : '<span class="agenda-beeld icoon serie">▶</span>';
  }
  if (x.soort === 'npo') {
    const beeld = veiligeUrl(x.beeld);
    return beeld ? `<img class="agenda-beeld npo" src="${beeld}" alt="" loading="lazy" />` : '<span class="agenda-beeld icoon npo">NPO</span>';
  }
  if (x.soort === 'f1') return '<span class="agenda-beeld icoon f1" aria-hidden="true"></span>';
  if (x.soort === 'wiel') return '<span class="agenda-beeld icoon wiel">🚴</span>';
  if (x.soort === 'oranje') return '<span class="agenda-beeld icoon oranje">NL</span>';
  return '<span class="agenda-beeld icoon"></span>';
}

// Eén regel in de week: beeldje, tijd, wat, en rechts de zender of dienst.
function agendaRegel(x, mijn) {
  const z = eenZender(x.zenders, mijn);
  const rechts = x.nieuw ? (x.dienst ? `<span class="zender-chip mijn">${veilig(x.dienst.naam)}</span>` : '') : z ? zenderChip(z, mijn, true) : '';
  return `
    <li class="agenda-regel${x.mijnClub ? ' mijn-club-regel' : ''}">
      ${agendaBeeld(x)}
      <div class="agenda-wat">
        <span class="agenda-tijd">${x.tijd ? veilig(x.tijd) : x.nieuw ? '<span class="nieuw-woord">Nieuw</span>' : 'Hele dag'}</span>
        <strong>${veilig(x.naam)}</strong>
        <span class="zacht">${veilig(x.sub)}</span>
      </div>
      ${rechts}
    </li>`;
}

async function weekHtml(titels, stand) {
  const mijn = leesSportzenders();
  const dagen = weekDagen(vandaag());
  // In het weekoverzicht bij de Formule 1 alleen wat telt: kwalificatie, sprint en race.
  const metSport = sportOpVandaag();
  const programmas = (await haalNpo())?.programmas ?? [];
  const items = [
    ...(await agendaItems(titels, stand, dagen, { sport: metSport })).filter((x) => x.soort !== 'f1' || !/^Vrije training/.test(x.sessie)),
    // Zonder sport: elke avond twee tv-tips (op je genres en omroepen), zoals bij Vanavond op de NPO.
    ...(metSport ? [] : tvTipsVoorWeek(programmas, titels, dagen)),
  ].sort((a, b) => a.start.localeCompare(b.start));
  const later = afleveringenNa(titels, stand, dagen.at(-1));
  const voorbij = dagen.filter((d) => d < vandaag());
  const telling = [
    [items.filter((x) => x.soort === 'voetbal' || x.soort === 'oranje').length, 'wedstrijd', 'wedstrijden'],
    [items.filter((x) => x.soort === 'serie').length, 'nieuwe aflevering', 'nieuwe afleveringen'],
    [items.filter((x) => x.soort === 'npo' && !x.tip).length, 'keer op NPO', 'keer op NPO'],
    [items.filter((x) => x.tip).length, 'tv-tip', 'tv-tips'],
    [items.filter((x) => x.soort === 'f1' || x.soort === 'wiel').length, 'race of koers', 'races en koersen'],
  ].filter(([n]) => n);
  const dagKop = (dag) => {
    const d = new Date(`${dag}T12:00:00Z`);
    const naam = d.toLocaleDateString('nl-NL', { weekday: 'long', timeZone: 'UTC' });
    const datum = d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', timeZone: 'UTC' });
    const morgen = dagNaam(dag, vandaag()) === 'Morgen';
    return `<div class="weekdag-kop"><h2>${veilig(naam)}</h2><span class="zacht">${veilig(datum)}</span>${dag === vandaag() ? '<span class="weekdag-label">Vandaag</span>' : morgen ? '<span class="weekdag-label stil">Morgen</span>' : ''}</div>`;
  };
  const kaarten = dagen
    .filter((d) => d >= vandaag())
    .map((dag) => {
      const wat = items.filter((x) => x.dag === dag);
      return `
        <section class="weekdag${dag === vandaag() ? ' is-vandaag' : ''}${wat.length ? '' : ' rustig'}">
          ${dagKop(dag)}
          ${wat.length ? `<ul class="agenda">${wat.map((x) => agendaRegel(x, mijn)).join('')}</ul>` : '<p class="zacht weekdag-leeg">Rustige dag: niets bij jouw keuzes.</p>'}
        </section>`;
    });
  return `
    ${telling.length ? `<div class="week-telling">${telling.map(([n, een, meer]) => `<span><strong>${n}</strong> ${n === 1 ? een : meer}</span>`).join('')}</div>` : ''}
    ${voorbij.length ? `<p class="week-voorbij zacht">${voorbij.length === 1 ? 'Maandag is' : `Maandag tot en met ${new Date(`${voorbij.at(-1)}T12:00:00Z`).toLocaleDateString('nl-NL', { weekday: 'long', timeZone: 'UTC' })} zijn`} voorbij.</p>` : ''}
    ${kaarten.join('')}
    ${later.length ? laterHtml(later) : ''}
    <p class="bron">${
      metSport
        ? 'Alleen wat jij volgt: nieuwe afleveringen en NPO-uitzendingen van titels op je lijst, en in Sport je clubs en competities, Oranje, Formule 1 (kwalificatie en race) en wielrennen.'
        : 'Nieuwe afleveringen en NPO-uitzendingen van titels op je lijst, en elke avond tv-tips op de genres en omroepen die je in Instellingen koos. Sport staat uit; die vind je onderin bij Sport.'
    } Tijden in Nederlandse tijd; afleveringen volgens TMDB.</p>`;
}

// Tv-tips voor de rest van de week: per avond de twee beste (niet van je lijst; die staan er al).
function tvTipsVoorWeek(programmas, titels, dagen) {
  const voorkeur = leesTvVoorkeuren();
  return dagen
    .filter((d) => d >= vandaag())
    .flatMap((dag) =>
      vanavond(programmas, titels, dag === vandaag() ? new Date() : new Date(`${dag}T05:00:00Z`), voorkeur)
        .filter((p) => !p.titelOpLijst && !p.herhaling)
        .slice(0, 2)
        .map((p) => ({
          dag, start: p.start, tijd: aftrap(p.start), naam: p.titel, sub: p.aflevering || p.genres.slice(0, 2).join(' · ') || 'Tv-tip', zenders: [], dienst: { naam: p.zender }, nieuw: true, soort: 'npo', tip: true, beeld: p.beeld,
        }))
    );
}

// Na deze week: nieuwe afleveringen en seizoenen van series op je lijst, zo ver als TMDB het weet.
function laterHtml(later) {
  return `
    <section class="weekdag week-later">
      <div class="weekdag-kop"><h2>Daarna</h2><span class="zacht">series op je lijst</span></div>
      <ul class="agenda">${later
        .map((e) => {
          const poster = veiligeUrl(posterUrl(e.titel.poster, 'w92'));
          const datum = new Date(`${e.dag}T12:00:00Z`).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
          const wat = e.aflevering === 1 ? `Nieuw seizoen ${e.seizoen}` : `Nieuwe aflevering · ${afleveringKort(e)}`;
          const dienst = dienstVan(e.titel);
          return `
          <li class="agenda-regel">
            ${poster ? `<img class="agenda-beeld poster" src="${poster}" alt="" loading="lazy" />` : '<span class="agenda-beeld icoon serie">▶</span>'}
            <div class="agenda-wat">
              <span class="agenda-tijd">${veilig(datum)}</span>
              <strong>${veilig(e.titel.titel)}</strong>
              <span class="zacht">${veilig(wat)}</span>
            </div>
            ${dienst ? `<span class="zender-chip mijn">${veilig(dienst.naam)}</span>` : ''}
          </li>`;
        })
        .join('')}</ul>
    </section>`;
}

// --- Deze week: eigen scherm, maandag tot en met zondag ---

async function toonWeek() {
  const nr = schermNr;
  const titels = await alleTitels();
  if (nr !== schermNr) return;
  app.innerHTML = `${schermKop('Deze week', weekTekst(weekDagen(vandaag())))}<div id="week"><p class="bezig">Ophalen…</p></div>`;
  const html = await weekHtml(titels, leesAfleveringen());
  if (nr !== schermNr) return;
  document.getElementById('week').innerHTML = html;
  // Daarna (hooguit één keer per dag) de afleveringen bijwerken en de week opnieuw tekenen.
  if (!leesSleutel()) return;
  const stand = await werkAfleveringenBij(titels, vandaag(), haalAfleveringen);
  await werkSeizoenenBij(titels, stand);
  if (nr === schermNr) document.getElementById('week').innerHTML = await weekHtml(titels, stand);
}

// --- Vandaag ---

// Nieuw voor jou: één recent verschenen film of serie bij jouw diensten, in jouw smaak.
function nieuwVoorJouHtml(t) {
  const beeld = veiligeUrl(posterUrl(t.achtergrond || t.poster, t.achtergrond ? 'w780' : 'w342'));
  const genres = (t.genreIds ?? []).map((g) => GENRE_NAMEN[g]).filter(Boolean).slice(0, 2);
  return `
    <button class="kijktip" id="nieuw-voor-jou-tip">
      ${beeld ? `<img src="${beeld}" alt="" loading="lazy" />` : ''}
      <div class="kijktip-tekst">
        <span class="kijktip-label">Nieuw bij jouw diensten${genres.length ? ` · ${veilig(genres.join(', '))}` : ''}</span>
        <strong>${veilig(t.titel)}</strong>
        <span>${soortJaar(t)}</span>
      </div>
    </button>
    <p class="bron">Elke dag een andere tip, gekozen op de genres van wat je hoog waardeert en wilt zien.</p>`;
}

// Sport op Vandaag aan of uit (in Instellingen, bij Weergave). Uit: dan kijktips op die plek.
const sportOpVandaag = () => onthoud('vandaagSport', 'aan', ['aan', 'uit']) === 'aan';

// De waardering van kijkers (0 tot 10) als vijf sterren, met het cijfer erbij.
function scoreHtml(score) {
  if (score == null) return '';
  const n = Math.round(score / 2);
  return `<span class="score" aria-label="Waardering ${String(score).replace('.', ',')} van 10"><span class="score-sterren">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span> ${veilig(score.toFixed(1).replace('.', ','))}</span>`;
}

// Kijktips bij jouw diensten: een kort rijtje, elke tip met poster, genres en waardering.
function kijktipsHtml(tips) {
  return `<ul class="kijktips">${tips
    .map((t, i) => {
      const poster = veiligeUrl(posterUrl(t.poster, 'w185'));
      const genres = (t.genreIds ?? []).map((g) => GENRE_NAMEN[g]).filter(Boolean).slice(0, 2);
      return `
      <li><button class="kijktip-regel" data-tip="${i}">
        ${poster ? `<img src="${poster}" alt="" loading="lazy" />` : `<span class="kijktip-leeg" aria-hidden="true">${veilig(t.titel.slice(0, 1))}</span>`}
        <span class="kijktip-wat">
          <strong>${veilig(t.titel)}</strong>
          <span class="zacht">${soortJaar(t)}${genres.length ? ` · ${veilig(genres.join(', '))}` : ''}</span>
          ${scoreHtml(t.score)}
        </span>
      </button></li>`;
    })
    .join('')}</ul>
    <p class="bron">Goed gewaardeerd door kijkers (TMDB), te zien bij jouw diensten en in de genres die jij graag ziet. Elke dag een ander rijtje.</p>`;
}

async function toonVandaag() {
  const nr = schermNr;
  const titels = await alleTitels();
  if (nr !== schermNr) return;
  const kop = schermKop('Vandaag', new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }), groet());
  // De allereerste keer: eerst de welkomststappen.
  if (!titels.length && !welkomGedaan()) {
    location.replace('#/welkom');
    return;
  }
  if (!leesSleutel() && !titels.length) {
    app.innerHTML = `
      ${kop}
      <section class="welkom">
        <p>Je films, series en sport, rustig op één plek.</p>
        <p class="zacht">Plak eerst één keer je TMDB-sleutel, dan kun je zoeken.</p><a class="hoofdknop" href="#/instellingen">Sleutel instellen</a>
      </section>`;
    return;
  }

  const verder = titels.filter((t) => t.soort === 'serie' && t.status !== 'Gezien' && t.voortgang);
  const eigen = eigenDiensten();
  const afleveringenNu = afleveringenHtml(titels, leesAfleveringen());
  app.innerHTML = `
    ${kop}
    ${titels.length && moetHerinneren(titels.length) ? herinneringHtml() : ''}
    ${
      titels.length
        ? ''
        : '<section class="welkom"><p class="zacht">Je lijst is nog leeg. Zoek een film of serie om te beginnen.</p><a class="hoofdknop" href="#/films">Zoek een titel</a></section>'
    }
    <section class="vandaag-blok" id="npo-blok" hidden>
      <h2 class="vak-kop">Vanavond op de NPO</h2>
      <div id="npo"></div>
    </section>
    ${verder.length ? `<section class="vandaag-blok"><h2 class="vak-kop">Verder kijken</h2><div id="verder">${verder.map(verderKaart).join('')}</div></section>` : ''}
    <section class="vandaag-blok" id="afleveringen-blok"${afleveringenNu ? '' : ' hidden'}>
      <h2 class="vak-kop">Nieuwe afleveringen</h2>
      <div id="afleveringen">${afleveringenNu}</div>
    </section>
    ${
      sportOpVandaag()
        ? `<section class="vandaag-blok">
             <h2 class="vak-kop">Sport vandaag</h2>
             <div id="sport-vandaag"><p class="bezig">Ophalen…</p></div>
           </section>`
        : leesSleutel() && eigen.length
          ? `<section class="vandaag-blok" id="kijktips-blok" hidden>
               <h2 class="vak-kop">Kijktips bij jouw diensten</h2>
               <div id="kijktips"></div>
             </section>`
          : ''
    }
    ${
      leesSleutel()
        ? `<section class="vandaag-blok" id="nieuw-voor-jou-blok"${eigen.length ? ' hidden' : ''}>
             <h2 class="vak-kop">Nieuw voor jou</h2>
             <div id="nieuw-voor-jou">${eigen.length ? '' : '<p class="leeg-klein">Kies in <a href="#/instellingen">Instellingen</a> welke streamingdiensten je hebt, dan krijg je hier elke dag een nieuwe film of serie in jouw smaak.</p>'}</div>
           </section>`
        : ''
    }
    ${nieuwHtml(titels)}
  `;

  document.getElementById('verder')?.addEventListener('click', async (e) => {
    const knop = e.target.closest('[data-volgende]');
    if (!knop) return;
    const kaart = knop.closest('.verder-kaart');
    const t = verder.find((x) => x.id === Number(kaart.dataset.id));
    const volgende = volgendeAflevering(t.voortgang ?? beginVoortgang(), t.seizoenen ?? []);
    if (!volgende) return;
    knop.disabled = true;
    await titelBijwerken(t.id, { voortgang: volgende });
    t.voortgang = volgende;
    kaart.outerHTML = verderKaart(t);
    melding(`${t.titel}: seizoen ${volgende.seizoen}, aflevering ${volgende.aflevering} gezien`);
  });
  document.getElementById('nieuw-gezien')?.addEventListener('click', async () => {
    for (const t of titels.filter((x) => x.nieuwBij?.length)) await titelBijwerken(t.id, { nieuwBij: [] });
    document.querySelector('.nieuw-melding').remove();
  });
  document.getElementById('later')?.addEventListener('click', () => {
    herinnerLater();
    document.querySelector('.herinnering').remove();
  });

  // De blokken laden los van elkaar: een trage of haperende bron houdt de rest niet op.
  const sportBlok = async () => {
    const sport = await sportVandaagHtml();
    if (nr === schermNr) document.getElementById('sport-vandaag').innerHTML = sport;
  };
  // Kijktips en Nieuw voor jou na elkaar: ze delen de genres van je smaak.
  const tipsBlokken = async () => {
    if (!leesSleutel() || !eigen.length) return;
    if (!sportOpVandaag()) {
      const tips = await kijktipsVanDag({ titels, diensten: eigen, dag: vandaag(), haalGenres, haalTop: haalTopOpDiensten }).catch(() => []);
      if (nr === schermNr && tips.length) {
        document.getElementById('kijktips').innerHTML = kijktipsHtml(tips);
        document.getElementById('kijktips-blok').hidden = false;
        document.getElementById('kijktips').addEventListener('click', (e) => {
          const knop = e.target.closest('[data-tip]');
          if (knop) toonBevestigen(tips[Number(knop.dataset.tip)], null, { naam: 'Vandaag', toon: () => toonVandaag() });
        });
      }
    }
    const tip = await nieuwVoorJou({ titels, diensten: eigen, dag: vandaag(), haalGenres, haalNieuw: haalNieuwOpDiensten }).catch(() => null);
    if (nr === schermNr && tip) {
      document.getElementById('nieuw-voor-jou').innerHTML = nieuwVoorJouHtml(tip);
      document.getElementById('nieuw-voor-jou-blok').hidden = false;
      document.getElementById('nieuw-voor-jou-tip').addEventListener('click', () =>
        toonBevestigen(tip, null, { naam: 'Vandaag', toon: () => toonVandaag() })
      );
    }
  };
  const npoBlok = async () => {
    const npo = await haalNpo();
    const avond = npo ? vanavond(npo.programmas, titels, new Date(), leesTvVoorkeuren()) : [];
    if (nr === schermNr && avond.length) {
      document.getElementById('npo').innerHTML = npoHtml(avond);
      document.getElementById('npo-blok').hidden = false;
      document.getElementById('npo').addEventListener('click', (e) => {
        const knop = e.target.closest('[data-npo]');
        if (knop) toonNpo(avond[Number(knop.dataset.npo)]);
      });
    }
  };
  const afleveringenBlok = async () => {
    if (!leesSleutel()) return;
    const stand = await werkAfleveringenBij(titels, vandaag(), haalAfleveringen);
    const seizoenenNieuw = await werkSeizoenenBij(titels, stand);
    if (nr !== schermNr) return;
    if (seizoenenNieuw && document.getElementById('verder')) document.getElementById('verder').innerHTML = verder.map(verderKaart).join('');
    const html = afleveringenHtml(titels, stand);
    document.getElementById('afleveringen').innerHTML = html;
    document.getElementById('afleveringen-blok').hidden = !html;
  };
  await Promise.allSettled([sportOpVandaag() ? sportBlok() : null, tipsBlokken(), npoBlok(), afleveringenBlok()]);
}

// Vanavond op de NPO: één grote tip (iets van je lijst gaat voor), en nog twee kleinere.
function npoHtml(avond) {
  const [tip, ...rest] = avond;
  const beeld = veiligeUrl(tip.beeld);
  const label = `${tip.titelOpLijst ? 'Van je lijst' : 'Tip'} · ${veilig(tip.zender)} · ${veilig(aftrap(tip.start))}`;
  return `
    <button class="kijktip" data-npo="0">
      ${beeld ? `<img src="${beeld}" alt="" loading="lazy" />` : ''}
      <div class="kijktip-tekst">
        <span class="kijktip-label">${label}</span>
        <strong>${veilig(tip.titel)}</strong>
        <span>${veilig(tip.aflevering || tip.omschrijving.slice(0, 90))}${tip.herhaling ? ' · herhaling' : ''}</span>
      </div>
    </button>
    ${
      rest.length
        ? `<ul class="sport-vandaag npo-ook">${rest
            .slice(0, 2)
            .map((p, i) => ({ p, nr: i + 1 })) // het nummer verwijst naar het programma, ook na sorteren
            .sort((a, b) => a.p.start.localeCompare(b.p.start))
            .map(
              ({ p, nr }) => `
          <li>
            <span class="sport-tijd">${veilig(aftrap(p.start))}</span>
            <button class="sport-wat afl-link" data-npo="${nr}"><strong>${veilig(p.titel)}</strong><span class="zacht">${veilig(p.aflevering || p.genres.slice(0, 2).join(' · '))}</span></button>
            <span class="zender-chip">${veilig(p.zender)}</span>
          </li>`
            )
            .join('')}</ul>`
        : ''
    }
    <p class="bron">Uit de tv-gids van NPO. Tik voor meer informatie. Afstemmen op wat jij graag ziet kan in <a href="#/instellingen">Instellingen</a> bij Tv-tips.</p>`;
}

// Meer over een programma uit de NPO-gids, met knoppen om te kijken.
function toonNpo(p) {
  schermNr += 1; // wat Vandaag nog aan het ophalen was, mag hier niet meer tekenen
  window.scrollTo(0, 0);
  const start = new Date(p.start);
  const nu = new Date();
  const bezig = start <= nu && new Date(p.eind) > nu;
  const wanneer = `${veilig(p.zender)} · ${start.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Amsterdam' })} · ${veilig(aftrap(p.start))}–${veilig(aftrap(p.eind))}`;
  const chips = [...new Set(p.genres)].filter((g) => g !== 'Overig').slice(0, 4);
  const beeld = veiligeUrl(p.beeld);
  app.innerHTML = `
    <header class="kop"><button class="terug" id="terug">‹ Vandaag</button></header>
    <section class="npo-detail">
      ${beeld ? `<img class="npo-beeld" src="${beeld}" alt="" />` : ''}
      <p class="npo-wanneer">${wanneer}${bezig ? ' · <strong>nu bezig</strong>' : ''}</p>
      <h2>${veilig(p.titel)}</h2>
      ${p.aflevering ? `<p class="npo-aflevering">${veilig(p.aflevering)}</p>` : ''}
      ${p.omschrijving ? `<p>${veilig(p.omschrijving)}</p>` : ''}
      ${p.over && p.over !== p.omschrijving ? `<p class="zacht">${veilig(p.over)}</p>` : ''}
      <div class="koers-zenders">
        ${(p.omroepen ?? []).map((o) => `<span class="zender-chip mijn">${veilig(o)}</span>`).join('')}
        ${chips.map((g) => `<span class="zender-chip">${veilig(g)}</span>`).join('')}
        ${p.herhaling ? '<span class="zender-chip">Herhaling</span>' : ''}
        ${p.leeftijd && p.leeftijd !== 'ALL' ? `<span class="zender-chip">${veilig(p.leeftijd)}+</span>` : ''}
      </div>
      ${p.titelOpLijst ? `<p class="reden">Staat op je lijst bij Wil ik zien.</p>` : ''}
      <a class="hoofdknop" href="${veiligeUrl(bezig ? p.live : npoLink(p))}" target="_blank" rel="noopener noreferrer">${bezig ? `Kijk nu live op ${veilig(p.zender)}` : 'Bekijk op NPO Start'}</a>
      ${p.titelOpLijst ? `<a class="tweede-knop" href="#/titel/${p.titelOpLijst.id}">Open op mijn lijst</a>` : '<button class="tweede-knop" id="npo-zoek">Zoek en zet op mijn lijst</button>'}
    </section>`;
  document.getElementById('terug').addEventListener('click', () => {
    schermNr += 1;
    toonVandaag();
  });
  document.getElementById('npo-zoek')?.addEventListener('click', () => {
    filmsZoek = p.titel;
    filmsTab = 'wil';
    location.hash = '#/films';
  });
}

// De seizoenen van je series bijwerken met wat de dagelijkse afleveringencontrole weet,
// zodat een nieuw seizoen meteen meetelt bij Verder kijken. Geeft true als er iets veranderde.
async function werkSeizoenenBij(titels, stand) {
  let veranderd = false;
  for (const t of titels.filter((x) => x.soort === 'serie')) {
    const nieuw = stand[t.tmdbId]?.seizoenen;
    if (!nieuw?.length || JSON.stringify(nieuw) === JSON.stringify(t.seizoenen ?? [])) continue;
    t.seizoenen = nieuw;
    await titelBijwerken(t.id, { seizoenen: nieuw });
    veranderd = true;
  }
  return veranderd;
}

// Afleveringen van gisteren en vandaag, van series op je lijst.
function afleveringenHtml(titels, stand) {
  const gisteren = new Date(`${vandaag()}T12:00:00Z`);
  gisteren.setUTCDate(gisteren.getUTCDate() - 1);
  const g = gisteren.toISOString().slice(0, 10);
  const lijst = afleveringenOp(titels, stand, [g, vandaag()]).reverse();
  if (!lijst.length) return '';
  return `<ul class="sport-vandaag">${lijst
    .map((e) => {
      const d = dienstVan(e.titel);
      return `
      <li>
        <span class="sport-tijd dag">${e.dag === vandaag() ? 'Vandaag' : 'Gisteren'}</span>
        <a class="sport-wat afl-link" href="#/titel/${e.titel.id}"><strong>${veilig(e.titel.titel)}</strong><span class="zacht">${afleveringKort(e)}${e.naam ? ` · ${veilig(e.naam)}` : ''}</span></a>
        ${d ? `<span class="zender-chip mijn">${veilig(d.naam)}</span>` : ''}
      </li>`;
    })
    .join('')}</ul>`;
}

// --- Mijn lijst: Wil ik zien, Gezien en Ontdekken, met één zoekveld ---

const FILMS_TABS = { wil: 'Wil ik zien', gezien: 'Gezien' };
const LIJST_STATUSSEN = { wil: ['Wil ik zien'], gezien: ['Gezien'] };
let filmsTab = onthoud('filmsTab', 'wil', Object.keys(FILMS_TABS));
let filmsZoek = '';

function toonLijstTab(vak, welke, titels, naWijziging) {
  vak.innerHTML = `
    <p class="lijst-uitleg">${
      welke === 'wil'
        ? 'Wat je nog wilt zien. Gezien? Tik op <b>✓ Gezien</b> en geef meteen sterren.'
        : 'Wat je hebt gezien. Tik op de sterren om je oordeel te geven of te veranderen.'
    }</p>
    <div class="lijst-regel">
      <label class="sorteer">Toon
        <select id="soort">${Object.entries(SOORTEN).map(([k, v]) => `<option value="${k}"${k === soort ? ' selected' : ''}>${v}</option>`).join('')}</select>
      </label>
      <label class="sorteer">Sorteer
        <select id="sorteer">${Object.entries(SORTERINGEN).map(([k, v]) => `<option value="${k}"${k === sortering ? ' selected' : ''}>${v}</option>`).join('')}</select>
      </label>
      <span class="aantal" id="aantal"></span>
    </div>
    <ul class="lijst" id="lijst"></ul>
  `;
  const teken = () => {
    const zichtbaar = sorteerTitels(filterTitels(titels, { soort }).filter((t) => LIJST_STATUSSEN[welke].includes(t.status)), sortering);
    document.getElementById('lijst').innerHTML = zichtbaar.length
      ? zichtbaar.map((t) => titelRegel(t, '', { status: false, acties: true })).join('')
      : `<li class="leeg">${
          soort !== 'alle'
            ? `Geen ${SOORTEN[soort].toLowerCase()} bij ${FILMS_TABS[welke]}.`
            : welke === 'wil'
              ? 'Nog niets op Wil ik zien. Zoek hierboven een film of serie, of kijk bij Ontdek iets nieuws.'
              : 'Nog niets gezien. Tik bij Wil ik zien op ✓ Gezien, of kies Al gezien als je iets toevoegt.'
        }</li>`;
    document.getElementById('aantal').textContent = aantalTekst(zichtbaar.length);
  };
  teken();

  // De knoppen in een regel: niet de titel openen, maar meteen doen.
  document.getElementById('lijst').addEventListener('click', async (e) => {
    const knop = e.target.closest('[data-actie]');
    if (!knop) return;
    e.preventDefault();
    const t = titels.find((x) => x.id === Number(knop.closest('.veeg').dataset.id));
    if (!t) return;
    if (knop.dataset.actie === 'ster') {
      const n = Number(knop.dataset.n);
      const sterren = t.sterren === n ? 0 : n; // nog een keer op dezelfde ster haalt het oordeel weg
      await titelBijwerken(t.id, { sterren });
      t.sterren = sterren;
      knop.parentElement.querySelectorAll('.lijst-ster').forEach((x) => x.classList.toggle('aan', Number(x.dataset.n) <= sterren));
      return;
    }
    if (knop.dataset.actie === 'gezien') {
      await zetOpGezien(t);
      naWijziging?.();
    }
  });

  maakVeegbaar(document.getElementById('lijst'), async (li) => {
    const id = Number(li.dataset.id);
    const kopie = (await haalTitel(id)) ?? titels.find((t) => t.id === id);
    if (!kopie) return;
    await titelVerwijderen(id);
    titels.splice(titels.findIndex((t) => t.id === id), 1);
    li.classList.add('weg');
    setTimeout(teken, 250);
    melding(`"${kopie.titel}" verwijderd`, {
      tekst: 'Ongedaan maken',
      actie: async () => {
        await titelTerugzetten(kopie);
        // Staat de lijst nog open, dan bijwerken; anders komt hij straks vanzelf.
        if (!document.getElementById('lijst')) return;
        titels.push(kopie);
        teken();
      },
    });
  });
  document.getElementById('soort').addEventListener('change', (e) => {
    soort = e.target.value;
    bewaarKeuze('soort', soort);
    teken();
  });
  document.getElementById('sorteer').addEventListener('change', (e) => {
    sortering = e.target.value;
    bewaarKeuze('sortering', sortering);
    teken();
  });
}

async function toonFilms() {
  const nr = schermNr;
  const titels = await alleTitels();
  if (nr !== schermNr) return;
  app.innerHTML = `
    ${schermKop('Mijn lijst', aantalTekst(titels.length) + ' · films en series')}
    <form class="films-zoek" id="films-zoek-form" role="search">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input id="films-zoek" type="search" placeholder="Zoek of voeg een film of serie toe" autocomplete="off" enterkeyhint="search" value="${veilig(filmsZoek)}" aria-label="Zoek een film, serie of acteur" />
    </form>
    <a class="ontdek-link" id="ontdek-link" href="#/ontdekken"><span>Ontdek iets nieuws</span><span class="zacht">Trending en tips ›</span></a>
    <div class="segment" id="films-tabs" role="tablist">${Object.entries(FILMS_TABS)
      .map(([k, naam]) => `<button role="tab" aria-selected="${k === filmsTab}" data-tab="${k}">${naam} <span class="tab-aantal" data-aantal="${k}">${titels.filter((t) => LIJST_STATUSSEN[k].includes(t.status)).length}</span></button>`)
      .join('')}</div>
    <div id="films-vak"></div>
  `;
  const veld = document.getElementById('films-zoek');
  const segment = document.getElementById('films-tabs');
  const vak = document.getElementById('films-vak');

  // Zoeken: eerst wat al op je lijst staat (meteen), daarna nieuwe titels en acteurs bij TMDB.
  const tekenZoek = () => {
    if (!document.getElementById('eigen-vondsten')) vak.innerHTML = '<div id="eigen-vondsten"></div><div id="resultaten"></div>';
    const eigen = sorteerTitels(filterTitels(titels, { zoek: filmsZoek }), 'titel');
    document.getElementById('eigen-vondsten').innerHTML = eigen.length
      ? `<p class="label zoek-kop">In je lijst</p><ul class="lijst">${eigen.slice(0, 20).map((t) => titelRegel(t, filmsZoek)).join('')}</ul>`
      : leesSleutel()
        ? ''
        : `<p class="leeg">Niets gevonden in je lijst. Om ook nieuwe titels te zoeken, plak eerst je TMDB-sleutel in <a href="#/instellingen">Instellingen</a>.</p>`;
  };
  // Na 'Gezien' in de lijst: aantallen op de tabbladen bijwerken en de lijst opnieuw tekenen.
  const naWijziging = () => {
    for (const k of Object.keys(FILMS_TABS)) {
      document.querySelector(`[data-aantal="${k}"]`).textContent = titels.filter((t) => LIJST_STATUSSEN[k].includes(t.status)).length;
    }
    toonLijstTab(vak, filmsTab, titels, naWijziging);
  };
  const tekenVak = () => {
    const zoekt = Boolean(filmsZoek.trim());
    segment.hidden = zoekt;
    document.getElementById('ontdek-link').hidden = zoekt;
    if (zoekt) tekenZoek();
    else toonLijstTab(vak, filmsTab, titels, naWijziging);
  };
  tekenVak();
  if (filmsZoek.trim() && leesSleutel()) {
    if (laatsteZoekterm === filmsZoek.trim()) toonResultaten();
    else zoek(filmsZoek);
  }

  let wacht;
  // Zoeken terwijl je typt, met een korte pauze zodat niet elke letter een vraag aan TMDB wordt.
  veld.addEventListener('input', () => {
    const was = Boolean(filmsZoek.trim());
    filmsZoek = veld.value;
    clearTimeout(wacht);
    if (!filmsZoek.trim()) {
      laatsteZoekterm = '';
      zoekNr += 1;
      if (was) {
        schermNr += 1;
        tekenVak();
      }
      return;
    }
    tekenZoek();
    segment.hidden = true;
    document.getElementById('ontdek-link').hidden = true;
    if (leesSleutel()) wacht = setTimeout(() => zoek(filmsZoek), 400);
  });
  document.getElementById('films-zoek-form').addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(wacht);
    veld.blur(); // toetsenbord weg, zodat je de resultaten ziet
    if (filmsZoek.trim() && leesSleutel()) zoek(filmsZoek);
  });
  segment.addEventListener('click', (e) => {
    const knop = e.target.closest('[data-tab]');
    if (!knop || knop.dataset.tab === filmsTab) return;
    filmsTab = knop.dataset.tab;
    bewaarKeuze('filmsTab', filmsTab);
    segment.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === filmsTab)));
    tekenVak();
  });
}

// --- Ontdekken: eigen scherm, bereikbaar vanuit Mijn lijst ---

function toonOntdekScherm({ terugNaarPlek = false } = {}) {
  app.innerHTML = `
    <header class="kop">${terugKnop('#/films', 'Mijn lijst')}</header>
    ${schermKop('Ontdekken', 'Iets nieuws om te kijken')}
    <div id="films-vak"></div>`;
  toonOntdekken({ terugNaarPlek });
}

const ONTDEK_SOORTEN = { film: 'Films', serie: 'Series' };
const ONTDEK_BRONNEN = { trending: 'Trending', diensten: 'Bij mijn diensten', tips: 'Tips voor mij' };
let ontdekSoort = onthoud('ontdekSoort', 'film', Object.keys(ONTDEK_SOORTEN));
let ontdekBron = onthoud('ontdekBron', 'trending', Object.keys(ONTDEK_BRONNEN));
// Wat al geladen is blijft bewaard, zodat 'terug' meteen werkt en je op dezelfde plek uitkomt.
const ontdekGeladen = new Map();
let ontdekScroll = 0;

function eigenDiensten() {
  const keuzes = leesKeuzes();
  return Object.keys(keuzes).filter((id) => keuzes[id] === 'abonnement').map(Number);
}

async function toonOntdekken({ terugNaarPlek = false } = {}) {
  const filmsVak = document.getElementById('films-vak');
  if (!filmsVak) return;
  if (!leesSleutel()) {
    filmsVak.innerHTML = '<p class="leeg">Om te ontdekken heeft de app je TMDB-sleutel nodig. <a href="#/instellingen">Sleutel instellen</a></p>';
    return;
  }
  const nr = schermNr;
  const eigen = eigenDiensten();
  const keuzeKnoppen = (id, opties, gekozen) =>
    `<div class="keuzes" id="${id}">${Object.entries(opties)
      .map(([k, naam]) => `<button class="keuze${k === gekozen ? ' actief' : ''}" data-k="${k}">${naam}</button>`)
      .join('')}</div>`;
  filmsVak.innerHTML = `
    <div class="ontdek-keuzes">
      ${keuzeKnoppen('ontdek-soort', ONTDEK_SOORTEN, ontdekSoort)}
      ${keuzeKnoppen('ontdek-bron', ONTDEK_BRONNEN, ontdekBron)}
    </div>
    <p class="zacht ontdek-uitleg">${
      ontdekBron === 'trending'
        ? `${ONTDEK_SOORTEN[ontdekSoort]} waar deze week veel over gepraat wordt.`
        : ontdekBron === 'diensten'
          ? `Populaire ${ONTDEK_SOORTEN[ontdekSoort].toLowerCase()} die je met je eigen abonnementen kunt kijken.`
          : `${ONTDEK_SOORTEN[ontdekSoort]} die lijken op wat je 4 of 5 sterren gaf. Wat al op je lijst staat, zie je hier niet.`
    }</p>
    <div id="ontdek-vak"></div>
  `;
  const kies = (id, zet) =>
    document.getElementById(id).addEventListener('click', (e) => {
      const knop = e.target.closest('[data-k]');
      if (!knop) return;
      zet(knop.dataset.k);
      schermNr += 1;
      toonOntdekken();
    });
  kies('ontdek-soort', (k) => bewaarKeuze('ontdekSoort', (ontdekSoort = k)));
  kies('ontdek-bron', (k) => bewaarKeuze('ontdekBron', (ontdekBron = k)));

  const vak = document.getElementById('ontdek-vak');
  if (ontdekBron === 'diensten' && !eigen.length) {
    vak.innerHTML = '<p class="leeg">Kies eerst in <a href="#/instellingen">Instellingen</a> bij Mijn diensten welke abonnementen je hebt.</p>';
    return;
  }

  const mijnTitels = await alleTitels();
  if (nr !== schermNr) return;
  const favorieten = ontdekBron === 'tips' ? kiesFavorieten(mijnTitels, ontdekSoort) : [];
  if (ontdekBron === 'tips' && !favorieten.length) {
    vak.innerHTML = `<p class="leeg">Geef eerst een ${ontdekSoort === 'film' ? 'film' : 'serie'} die je gezien hebt 4 of 5 sterren. Daarop baseert de app je tips.</p>`;
    return;
  }

  // Tips worden opnieuw berekend als je favorieten of je lijst veranderen.
  const sleutel = `${ontdekSoort}|${ontdekBron}|${eigen.join(',')}|${
    ontdekBron === 'tips' ? `${favorieten.map((f) => `${f.tmdbId}:${f.sterren}`).join(',')}|${mijnTitels.length}` : ''
  }`;
  const laad = async (pagina) => {
    if (ontdekBron === 'trending') return haalTrending(ontdekSoort, pagina);
    if (ontdekBron === 'diensten') return haalOpDiensten(ontdekSoort, eigen, pagina);
    // Lukt het bij één favoriet niet, dan tellen de andere gewoon mee.
    const per = await Promise.all(
      favorieten.map((favoriet) =>
        haalAanbevelingen(favoriet.soort, favoriet.tmdbId)
          .then((aanbevolen) => ({ favoriet, aanbevolen }))
          .catch((fout) => {
            if (fout instanceof SleutelFout) throw fout;
            return { favoriet, aanbevolen: [] };
          })
      )
    );
    return combineerTips(per, new Set(mijnTitels.map(titelSleutel)));
  };

  let stand = ontdekGeladen.get(sleutel);
  // De eerste bladzijde blijft de hele dag bewaard, ook als je de app sluit.
  if (!stand) {
    const bewaard = await vanVandaag(`ontdek:${sleutel}`, () => laad(1));
    if (nr !== schermNr) return;
    if (bewaard?.length) {
      stand = { titels: bewaard, pagina: 1 };
      ontdekGeladen.set(sleutel, stand);
    }
  }
  if (!stand) {
    vak.innerHTML = '<p class="bezig">Ophalen…</p>';
    try {
      stand = { titels: await laad(1), pagina: 1 };
      ontdekGeladen.set(sleutel, stand);
    } catch (fout) {
      if (nr !== schermNr) return;
      vak.innerHTML =
        fout instanceof SleutelFout
          ? '<p class="leeg">TMDB accepteert je sleutel niet. <a href="#/instellingen">Plak hem opnieuw</a>.</p>'
          : '<p class="leeg">Ophalen lukt nu niet. Heb je internet?</p>';
      return;
    }
  }
  if (nr !== schermNr) return;

  const opLijst = new Map((await alleTitels()).map((t) => [titelSleutel(t), t]));
  if (nr !== schermNr) return;

  const metMeer = ontdekBron !== 'tips' && stand.pagina < 5;
  const teken = () => {
    vak.innerHTML = stand.titels.length
      ? `${rasterHtml(stand.titels, opLijst)}
         ${metMeer ? '<button class="tweede-knop" id="meer">Meer laden</button>' : ''}
         ${ontdekBron === 'diensten' ? JUSTWATCH : ''}${BRON}`
      : `<p class="leeg">${ontdekBron === 'tips' ? 'Nog geen tips gevonden. Geef meer titels 4 of 5 sterren.' : 'Niets gevonden.'}</p>`;
    vak.querySelectorAll('.raster-titel').forEach((knop) =>
      knop.addEventListener('click', () => {
        ontdekScroll = window.scrollY;
        const t = stand.titels[Number(knop.dataset.i)];
        toonBevestigen(t, opLijst.get(titelSleutel(t)), { naam: 'Ontdekken', toon: () => toonOntdekScherm({ terugNaarPlek: true }) });
      })
    );
    document.getElementById('meer')?.addEventListener('click', async (e) => {
      const knop = e.currentTarget;
      knop.disabled = true;
      knop.textContent = 'Ophalen…';
      try {
        const extra = await laad(stand.pagina + 1);
        const al = new Set(stand.titels.map(titelSleutel));
        stand.titels.push(...extra.filter((t) => !al.has(titelSleutel(t))));
        stand.pagina += 1;
        const plek = window.scrollY;
        teken();
        window.scrollTo(0, plek);
      } catch {
        knop.disabled = false;
        knop.textContent = 'Meer laden';
        melding('Ophalen lukt nu niet');
      }
    });
  };
  teken();
  if (terugNaarPlek) window.scrollTo(0, ontdekScroll);
}

// --- Waar kijken ---

function logoHtml(d) {
  const logo = veiligeUrl(posterUrl(d.logo, 'w92'));
  return logo ? `<img src="${logo}" alt="" loading="lazy" />` : '';
}

function dienstRij(naam, lijst) {
  if (!lijst?.length) return '';
  return `
    <div class="dienst-rij">
      <span class="dienst-soort">${naam}</span>
      <ul class="dienst-lijst">${lijst.map((d) => `<li class="dienst">${logoHtml(d)}${veilig(d.naam)}</li>`).join('')}</ul>
    </div>`;
}

// Je eigen abonnementen: groot, met een knop om meteen door te klikken.
function bijJouHtml(lijst, titel) {
  if (!lijst.length) return '';
  return `
    <div class="bij-jou">
      <span class="dienst-soort">Bij jou te zien</span>
      <ul class="dienst-lijst">${lijst
        .map((d) => {
          const link = veiligeUrl(doorklikLink(d, titel.titel));
          return link
            ? `<li><a class="dienst eigen" href="${link}" target="_blank" rel="noopener noreferrer">${logoHtml(d)}Kijk op ${veilig(d.naam)} ↗</a></li>`
            : `<li class="dienst eigen">${logoHtml(d)}${veilig(d.naam)}</li>`;
        })
        .join('')}</ul>
    </div>`;
}

// Diensten die je in Instellingen hebt verborgen, met naam: zo is duidelijk waarom ze hier ontbreken.
function verborgenHtml(d, alleenDaar) {
  const keuzes = leesKeuzes();
  const metPlus = verdeelDiensten(d, keuzes).bijJou.some((x) => /^NPO Plus/i.test(x.naam));
  const namen = [...new Map([...d.abonnement, ...d.gratis, ...d.huren, ...d.kopen].filter((x) => keuzeVan(keuzes, x.id) === 'verbergen' && !(metPlus && /^NPO Start/i.test(x.naam))).map((x) => [x.id, x.naam])).values()];
  if (!namen.length) return '';
  return `<p class="zacht klein verborgen-diensten">${alleenDaar ? 'Alleen te zien bij' : 'Ook bij'} ${veilig(namen.join(', '))}: ${namen.length === 1 ? 'die dienst heb' : 'die diensten heb'} je verborgen in <a href="#/instellingen">Instellingen</a>.</p>`;
}

// De bewaarde diensten van een titel; 'bezig' als er net nieuwe worden opgehaald.
function dienstenHtml(titel, bezig = false) {
  if (!titel.dienstenOp) return `<p class="zacht">${bezig ? 'Ophalen…' : 'Nog niet bekend. Open deze titel met internet om het op te halen.'}</p>`;
  const d = titel.diensten;
  const datum = `<p class="zacht bijgewerkt">Bijgewerkt op ${veilig(datumTekst(titel.dienstenOp))}${bezig ? ' · verversen…' : ''}</p>`;
  if (!d) return `<p>Op dit moment niet te zien in Nederland.</p>${datum}${JUSTWATCH}`;
  const link = veiligeUrl(d.link);
  const v = verdeelDiensten(d, leesKeuzes());
  const rest = v.abonnement.length || v.gratis.length || v.huren.length || v.kopen.length;
  return `
    ${bijJouHtml(v.bijJou, titel)}
    ${v.bijJou.length ? '' : `<p class="niet-bij-jou">${Object.values(leesKeuzes()).includes('abonnement') ? 'Niet bij jouw abonnementen.' : 'Kies in Instellingen welke abonnementen je hebt, dan zie je hier wat bij jou te zien is.'}</p>`}
    ${dienstRij('Abonnement', v.abonnement)}
    ${dienstRij('Gratis', v.gratis)}
    ${dienstRij('Huren', v.huren)}
    ${dienstRij('Kopen', v.kopen)}
    ${verborgenHtml(d, !rest && !v.bijJou.length)}
    ${datum}
    ${link ? `<a class="alle-opties" href="${link}" target="_blank" rel="noopener noreferrer">Alle opties en links ↗</a>` : ''}
    ${JUSTWATCH}`;
}

// Bij het openen van een titel worden de diensten één keer per dag ververst (die veranderen geregeld).
// Lukt dat niet, bijvoorbeeld zonder internet, dan blijft de laatst bekende informatie staan.
async function verversDiensten(titel, bewaar, nr) {
  const vak = () => (nr === schermNr ? document.getElementById('diensten') : null);
  if (!leesSleutel()) {
    if (vak()) vak().innerHTML = dienstenHtml(titel);
    return;
  }
  try {
    // Vandaag al opgehaald? Dan is dat vers genoeg.
    if (titel.dienstenOp !== vandaag()) await werkDienstenBij(titel, await haalDiensten(titel.soort, titel.tmdbId));
  } catch {
    // Geen verbinding of TMDB doet even niet mee: dan de bewaarde versie.
  }
  if (vak()) vak().innerHTML = dienstenHtml(titel);
}

// --- Trailer en acteurs ---

function extraHtml(titel) {
  const trailer = titel.trailer ? veiligeUrl(`https://www.youtube.com/watch?v=${encodeURIComponent(titel.trailer)}`) : '';
  const acteurs = titel.acteurs ?? [];
  return `
    ${
      trailer
        ? `<div class="trailer" id="trailer">
             <button class="trailer-voorplaat" id="trailer-start" aria-label="Speel de trailer af">
               ${titel.achtergrond ? `<img src="${veiligeUrl(posterUrl(titel.achtergrond, 'w780'))}" alt="" loading="lazy" />` : ''}
               <span class="trailer-speel" aria-hidden="true"></span>
               <span class="trailer-tekst">Trailer</span>
             </button>
           </div>
           <a class="trailer-link" href="${trailer}" target="_blank" rel="noopener noreferrer">Open in YouTube ↗</a>`
        : ''
    }
    ${
      acteurs.length
        ? `<p class="label">Acteurs</p>
           <ul class="acteurs">${acteurs
             .map((a) => {
               const foto = veiligeUrl(posterUrl(a.foto, 'w185'));
               return `<li><a class="acteur" href="#/acteur/${a.id}">
                 ${foto ? `<img src="${foto}" alt="" loading="lazy" />` : `<span class="acteur-leeg" aria-hidden="true">${veilig(a.naam.slice(0, 1))}</span>`}
                 <strong>${veilig(a.naam)}</strong>
                 ${a.rol ? `<span>${veilig(a.rol)}</span>` : ''}
               </a></li>`;
             })
             .join('')}</ul>`
        : ''
    }`;
}

// De trailer speelt in de pagina, via de privacyvriendelijke variant van YouTube (zonder
// volgcookies). Pas na je tik maakt de app contact met YouTube. Blokkeert de maker afspelen
// buiten YouTube, dan staat er een foutmelding in beeld en is er de link 'Open in YouTube'.
function speelTrailer(key) {
  const vak = document.getElementById('trailer');
  if (!vak || !/^[\w-]{6,20}$/.test(key)) return;
  const src = `https://www.youtube-nocookie.com/embed/${key}?autoplay=1&playsinline=1&rel=0&hl=nl&cc_lang_pref=nl`;
  vak.classList.add('speelt');
  vak.innerHTML = `<iframe src="${src}" title="Trailer" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}

// Trailer en acteurs veranderen zelden: ophalen als ze er nog niet zijn, en verder eens per maand.
const EXTRA_VERVERS_DAGEN = 30;

async function verversExtra(titel, bewaar, nr) {
  if (!leesSleutel()) return;
  // Titels van vóór de voorplaat (zonder 'achtergrond') worden één keer extra bijgewerkt.
  // Series van vóór stap 15 (zonder seizoenen) ook.
  // Zonder acteurs (bijvoorbeeld omdat TMDB ze eerder even niet gaf) opnieuw proberen, hooguit één keer per dag.
  const compleet = 'achtergrond' in titel && (titel.soort !== 'serie' || 'seizoenen' in titel) && (titel.acteurs?.length || titel.extraOp === vandaag());
  if (titel.extraOp && compleet && dagenSinds(new Date(titel.extraOp)) < EXTRA_VERVERS_DAGEN) return;
  try {
    await bewaar({ ...(await haalTrailerEnActeurs(titel.soort, titel.tmdbId)), extraOp: vandaag() });
  } catch {
    return; // Geen verbinding: dan de volgende keer.
  }
  if (nr !== schermNr) return;
  document.getElementById('extra').innerHTML = extraHtml(titel);
  toonTitel.tekenVoortgang?.();
}

// --- Sport ---

// --- Beeld bij sport ---

// Het clubembleem uit het voetbalschema (football-data), of de eerste letter als dat er niet is.
function embleem(p, klasse = 'embleem') {
  const url = veiligeUrl(p.logo);
  return url ? `<img class="${klasse}" src="${url}" alt="" loading="lazy" />` : `<span class="${klasse} embleem-leeg" aria-hidden="true">${veilig(p.naam.slice(0, 1))}</span>`;
}

// Grote kaart voor één wedstrijd, in de stijl van Vanavond op de NPO: beide emblemen groot in beeld.
function wedstrijdKaart(w, zenders, mijn, label) {
  const z = eenZender(zenders, mijn);
  const wanneer = [dagNaam(nlDagVan(w), vandaag()), aftrap(w.start), z ? z.kanaal || z.naam : ''].filter(Boolean).join(' · ');
  return `
    <div class="sportkaart voetbalkaart">
      <div class="sportkaart-beeld">${embleem(w.thuis, 'embleem-groot')}<span class="sportkaart-tegen">–</span>${embleem(w.uit, 'embleem-groot')}</div>
      <div class="kijktip-tekst">
        <span class="kijktip-label">${veilig(label)}</span>
        <strong>${veilig(w.thuis.naam)} – ${veilig(w.uit.naam)}</strong>
        <span>${veilig(wanneer)}</span>
      </div>
    </div>`;
}

// De eerstvolgende wedstrijd van een van je clubs (nog niet afgelopen).
function volgendeVanMijnClub(wedstrijden, keuzes, nu = new Date()) {
  return (
    wedstrijden
      .filter((w) => w.status !== 'FINISHED' && new Date(w.start).getTime() + 2 * 3600000 > nu.getTime())
      .filter((w) => keuzes.clubs.includes(w.thuis.id) || keuzes.clubs.includes(w.uit.id))
      .sort((a, b) => a.start.localeCompare(b.start))[0] ?? null
  );
}

// Label met de zender. Tik erop en je ziet in de gids van die zender op welk kanaal het komt.
function zenderChip(z, mijn, kort = false) {
  const tekst = `${veilig(z.kanaal || z.naam)}${z.zeker ? '' : kort ? '?' : ' (onder voorbehoud)'}`;
  const klasse = `zender-chip${mijn.includes(z.naam) ? ' mijn' : ''}`;
  const gids = ZENDER_GIDS[z.naam];
  return gids
    ? `<a class="${klasse} met-gids" href="${veiligeUrl(gids)}" target="_blank" rel="noopener noreferrer" aria-label="${veilig(z.naam)}: bekijk in de gids op welk kanaal">${tekst} ›</a>`
    : `<span class="${klasse}">${tekst}</span>`;
}

// Getekende bergen (eigen tekening, geen foto) als achtergrond voor de koerskaart.
const BERGEN = `<svg class="sportkaart-tekening" viewBox="0 0 400 190" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <path d="M0 150 L70 70 L110 110 L170 30 L230 105 L270 75 L330 130 L400 60 L400 190 L0 190 Z" fill="#2a2d34" />
  <path d="M0 175 L60 120 L120 160 L190 95 L250 150 L320 110 L400 160 L400 190 L0 190 Z" fill="#1d1f24" />
  <path d="M150 52 L170 30 L190 54 L180 50 L170 60 L160 50 Z" fill="#f3f1ec" opacity="0.8" />
  <path d="M0 186 C80 170 140 182 210 172 S330 160 400 176" stroke="#ff4d3d" stroke-width="3" fill="none" stroke-dasharray="10 8" />
</svg>`;

function wielrennenHtml(mijn) {
  const komend = komendeKoersen(WIELRENNEN.koersen, vandaag());
  if (!komend.length) return '<p class="leeg">De kalender voor het volgende seizoen volgt.</p>';
  const tussenseizoen = komend[0].van.slice(0, 4) > vandaag().slice(0, 4);
  const regel = (k) => {
    const kijk = mijn.length ? kanIkKijken(k, mijn) : '';
    return `
      <li class="koers koers-${kijk || 'onbekend'}">
        <div class="koers-kop">
          <span class="koers-datum">${veilig(koersDatum(k))}</span>
          <span class="koers-soort">${veilig(k.soort)}</span>
        </div>
        <strong>${veilig(k.naam)}</strong>
        <div class="koers-zenders">${k.zenders
          .map((z) => zenderChip(z, mijn))
          .join('')}</div>
        ${kijk === 'misschien' ? '<span class="koers-kijk misschien">Misschien bij jouw zenders</span>' : ''}
        ${k.noot ? `<span class="zacht koers-noot">${veilig(k.noot)}</span>` : ''}
      </li>`;
  };
  const [eerst] = komend;
  return `
    ${tussenseizoen ? `<p class="zacht sport-uitleg">Het wegseizoen zit erop. Dit is de kalender voor ${WIELRENNEN.seizoen}.</p>` : ''}
    <div class="sportkaart koerskaart">
      ${BERGEN}
      <div class="kijktip-tekst">
        <span class="kijktip-label">Eerstvolgende koers · ${veilig(eerst.soort)}</span>
        <strong>${veilig(eerst.naam)}</strong>
        <span>${veilig(koersDatum(eerst))} · ${veilig(eerst.zenders.map((z) => z.naam).join(', '))}</span>
      </div>
    </div>
    <ul class="koersen">${komend.slice(1).map(regel).join('')}</ul>
    <p class="bron">Data: UCI WorldTour-kalender ${WIELRENNEN.seizoen}. Zenders gecontroleerd in ${veilig(WIELRENNEN.gecontroleerd)}; uitzendrechten kunnen nog veranderen.</p>`;
}

// Een bestand dat GitHub elke ochtend klaarzet; één keer per dag opgehaald en daarna bewaard.
function haalKlaargezet(naam) {
  return vanVandaag(naam, async () => {
    const antwoord = await fetch(`${import.meta.env.BASE_URL}${naam}.json`, { cache: 'no-cache' });
    return antwoord.ok ? antwoord.json() : null;
  });
}

// Het schema van football-data, aangevuld met andere wedstrijden van je clubs (beker, Europa League).
async function haalVoetbal() {
  const schema = await haalKlaargezet('voetbal');
  if (!schema) return null;
  const extra = (leesExtra()?.wedstrijden ?? []).filter((w) => !alBekend(w, schema.wedstrijden));
  return extra.length ? { ...schema, wedstrijden: [...schema.wedstrijden, ...extra].sort((a, b) => a.start.localeCompare(b.start)) } : schema;
}

// Alleen het schema van football-data (voor het kiezen van clubs per competitie).
function haalVoetbalSchema() {
  return haalKlaargezet('voetbal');
}

const EXTRA = 'extraWedstrijden';
function leesExtra() {
  try {
    return JSON.parse(localStorage.getItem(EXTRA) || 'null');
  } catch {
    return null;
  }
}

// Eén keer per dag (op de achtergrond) de eerstvolgende wedstrijd van elk van je clubs bij
// TheSportsDB opvragen, voor wat football-data gratis niet heeft, zoals de beker.
let extraBezig = false;
async function werkExtraWedstrijdenBij() {
  const keuzes = leesVoetbalKeuzes();
  const sleutel = `${dagSleutel()}|${keuzes.clubs.join(',')}`;
  if (extraBezig || !keuzes.clubs.length || leesExtra()?.sleutel === sleutel) return;
  extraBezig = true;
  try {
    await extraOphalen(keuzes, sleutel);
  } finally {
    extraBezig = false;
  }
}

async function extraOphalen(keuzes, sleutel) {
  const schema = await haalVoetbalSchema();
  if (!schema) return;
  const ploegen = new Map(schema.wedstrijden.flatMap((w) => [w.thuis, w.uit]).filter((p) => p.id).map((p) => [p.id, p]));
  const clubs = keuzes.clubs.map((id) => ploegen.get(id)).filter(Boolean);
  let koppelingen = {};
  try {
    koppelingen = JSON.parse(localStorage.getItem('clubKoppelingen') || '{}');
  } catch {
    koppelingen = {};
  }
  const uit = await haalExtraWedstrijden(clubs, koppelingen);
  try {
    localStorage.setItem('clubKoppelingen', JSON.stringify(uit.koppelingen));
    // Niet helemaal gelukt (bijvoorbeeld te veel vragen tegelijk): de volgende keer opnieuw proberen.
    localStorage.setItem(EXTRA, JSON.stringify({ sleutel: uit.compleet ? sleutel : '', wedstrijden: uit.wedstrijden, op: new Date().toISOString(), gelukt: uit.gelukt, clubs: clubs.length }));
  } catch {
    return;
  }
  // Staat er net een sportscherm open, dan bijwerken.
  if ((document.getElementById('sport-vandaag') || document.getElementById('voetbal') || document.getElementById('week'))) route();
}

// Hoe het aanvullen met beker en Europa League ervoor staat, zodat je ziet of het is gelukt.
function extraTekst() {
  const x = leesExtra();
  if (extraBezig) return 'Beker en Europa League van je clubs: wordt nu opgehaald…';
  if (!x?.op) return 'Beker en Europa League van je clubs: nog niet opgehaald.';
  const tijd = new Date(x.op).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' });
  const deels = x.clubs && x.gelukt < x.clubs ? ` (${x.gelukt} van ${x.clubs} clubs; de rest volgt bij de volgende keer openen)` : '';
  return `Beker en Europa League van je clubs via TheSportsDB, bijgewerkt ${tijd}${deels}.`;
}

// Naam en zenders van de competitie van een wedstrijd (ook voor de aanvullende wedstrijden).
function competitieVan(w) {
  return COMPETITIES[w.competitie] ?? { naam: w.competitieNaam ?? 'Overige wedstrijd', kort: w.competitieNaam ?? '', zenders: EXTRA_ZENDERS[w.competitieNaam] ?? [] };
}

// De volgende interland van Oranje, één keer per dag.
async function haalOranjeVanDaag() {
  // Ook 'geen interland gepland' onthouden, zodat het niet steeds opnieuw wordt gevraagd.
  const x = await vanVandaag('oranje-nl', async () => ({ wedstrijd: await haalOranje() }));
  return x?.wedstrijd ?? null;
}

// De avonden op NPO 1, 2 en 3 die GitHub dagelijks klaarzet. Null als het (nog) niet bestaat.
async function haalNpo() {
  const npo = await haalKlaargezet('npo');
  return npo ? { ...npo, programmas: metKorteNamen(npo.programmas ?? []) } : null;
}

// Op welk ESPN-kanaal een Eredivisie-wedstrijd komt (door GitHub dagelijks klaargezet).
async function haalEspn() {
  const d = await haalKlaargezet('espn');
  return Array.isArray(d?.kanalen) ? d.kanalen : [];
}

// De zenders van een wedstrijd; bij de Eredivisie met het precieze ESPN-kanaal als dat bekend is.
function zendersVan(w, kanalen) {
  const c = competitieVan(w);
  const kanaal = w.competitie === 'DED' ? kanaalVoor(w, kanalen, nlDagVan(w), aftrap(w.start)) : '';
  return kanaal ? c.zenders.map((z) => (z.naam === 'ESPN' ? { ...z, kanaal } : z)) : c.zenders;
}

let voetbalWeek = 'deze';

function zenderChips(zenders, mijn) {
  return zenders
    .map((z) => zenderChip(z, mijn))
    .join('');
}

function kijkTekst(zenders, mijn) {
  if (!mijn.length) return '';
  const mijnZ = zenders.filter((z) => mijn.includes(z.naam));
  // Wat je zeker kunt zien, is al gemarkeerd in het zenderlabel; alleen twijfel apart noemen.
  if (mijnZ.some((z) => z.zeker)) return '';
  if (mijnZ.length) return `<span class="koers-kijk misschien">Misschien via ${veilig(mijnZ[0].naam)}</span>`;
  return '';
}

async function toonVoetbal(nr, mijn) {
  const vak = () => (nr === schermNr ? document.getElementById('voetbal') : null);
  const [schema, oranje] = await Promise.all([haalVoetbal(), haalOranjeVanDaag()]);
  if (!vak()) return;
  const keuzes = leesVoetbalKeuzes();
  const oranjeHtml = oranje
    ? `<div class="oranje oranjekaart">
         <span class="koers-soort">Oranje · volgende interland</span>
         <strong>${veilig(oranje.thuis)} – ${veilig(oranje.uit)}</strong>
         <span class="zacht">${veilig(dagNaam(nlDagVan(oranje), vandaag()))} · ${veilig(aftrap(oranje.start))} · ${veilig(oranje.competitie)}</span>
         <div class="koers-zenders">${zenderChips(oranje.zenders, mijn)}</div>
         ${kijkTekst(oranje.zenders, mijn)}
       </div>`
    : '';
  if (!schema) {
    vak().innerHTML = `${oranjeHtml}<p class="leeg">Het voetbalschema is nu even niet beschikbaar. Probeer het later nog eens.</p>`;
    return;
  }
  if (!keuzes.clubs.length && !keuzes.alles.length) {
    vak().innerHTML = `${oranjeHtml}<p class="leeg">Kies in <a href="#/instellingen">Instellingen</a> bij Voetbal je clubs en competities.</p>`;
    return;
  }
  const dagen = perDag(mijnWedstrijden(schema.wedstrijden, keuzes).filter((w) => w.status !== 'FINISHED' || nlDagVan(w) === vandaag()));
  const maandag = weekStart(vandaag());
  const volgendeMaandag = new Date(`${maandag}T12:00:00Z`);
  volgendeMaandag.setUTCDate(volgendeMaandag.getUTCDate() + 7);
  const grens = volgendeMaandag.toISOString().slice(0, 10);
  volgendeMaandag.setUTCDate(volgendeMaandag.getUTCDate() + 7);
  const naGrens = volgendeMaandag.toISOString().slice(0, 10);
  const inWeek = (d) => (voetbalWeek === 'deze' ? d.dag >= vandaag() && d.dag < grens : d.dag >= grens && d.dag < naGrens);
  const kanalen = await haalEspn();
  if (!vak()) return;
  const rij = (w) => {
    const c = competitieVan(w);
    const zenders = zendersVan(w, kanalen);
    const mijnClub = (p) => keuzes.clubs.includes(p.id);
    return `
      <li class="wedstrijd">
        <span class="aftrap">${veilig(aftrap(w.start))}</span>
        <div class="wedstrijd-tekst">
          <strong class="met-emblemen">${embleem(w.thuis)}<span class="${mijnClub(w.thuis) ? 'mijn-club' : ''}">${veilig(w.thuis.naam)}</span> – ${embleem(w.uit)}<span class="${mijnClub(w.uit) ? 'mijn-club' : ''}">${veilig(w.uit.naam)}</span></strong>
          <span class="zacht">${veilig(c.naam)}</span>
          <div class="koers-zenders">${zenderChips(zenders, mijn)}</div>
          ${kijkTekst(zenders, mijn)}
        </div>
      </li>`;
  };
  const zichtbaar = dagen.filter(inWeek);
  const uitgelicht = volgendeVanMijnClub(schema.wedstrijden, keuzes);
  vak().innerHTML = `
    ${uitgelicht ? wedstrijdKaart(uitgelicht, zendersVan(uitgelicht, kanalen), mijn, `Jouw club · ${competitieVan(uitgelicht).naam}`) : ''}
    <div class="keuzes week-keuze" id="voetbal-week">
      <button class="keuze${voetbalWeek === 'deze' ? ' actief' : ''}" data-week="deze">Deze week</button>
      <button class="keuze${voetbalWeek === 'volgende' ? ' actief' : ''}" data-week="volgende">Volgende week</button>
    </div>
    ${
      zichtbaar.length
        ? zichtbaar
            .map((d, i) => {
              // Per dag inklapbaar: deze week staat de eerste dag open, volgende week begint alles dicht.
              const clubs = [...new Set(d.wedstrijden.flatMap((w) => [w.thuis, w.uit]).filter((p) => keuzes.clubs.includes(p.id)).map((p) => p.naam))];
              const aantal = d.wedstrijden.length === 1 ? '1 wedstrijd' : `${d.wedstrijden.length} wedstrijden`;
              return `
              <details class="dag-blok"${i === 0 && voetbalWeek === 'deze' ? ' open' : ''}>
                <summary>
                  <span class="label sport-label">${veilig(dagNaam(d.dag, vandaag()))}</span>
                  <span class="dag-samenvatting">${aantal}${clubs.length ? ` · met <strong>${clubs.map(veilig).join(', ')}</strong>` : ''}</span>
                </summary>
                <ul class="wedstrijden">${d.wedstrijden.map(rij).join('')}</ul>
              </details>`;
            })
            .join('')
        : `<p class="leeg">Geen wedstrijden ${voetbalWeek === 'deze' ? 'meer deze week' : 'volgende week'} bij jouw keuzes.</p>`
    }
    <div class="oranje-onder">${oranjeHtml}</div>
    <p class="bron">${extraTekst()}</p>
    <p class="bron">Tijden in Nederlandse tijd. Schema van football-data.org, bijgewerkt ${veilig(new Date(schema.op).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' }))}. Oranje via TheSportsDB. Zenders gecontroleerd in ${veilig(VOETBAL_GECONTROLEERD)}; Premier League en Bundesliga gaan mogelijk naar Videoland.</p>`;
  document.getElementById('voetbal-week').addEventListener('click', (e) => {
    const knop = e.target.closest('[data-week]');
    if (!knop || knop.dataset.week === voetbalWeek) return;
    voetbalWeek = knop.dataset.week;
    toonVoetbal(nr, mijn);
  });
}

function nlDagVan(w) {
  return new Date(w.start).toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' });
}

const SPORT_TABS = { voetbal: 'Voetbal', f1: 'Formule 1', wielrennen: 'Wielrennen' };
let sportTab = onthoud('sportTab', 'voetbal', Object.keys(SPORT_TABS));

async function toonSport() {
  const nr = schermNr;
  const mijn = leesSportzenders();
  // Alle drie worden geladen; de schakelaar laat er één zien, zodat wisselen meteen gaat.
  const blok = (k, inhoud) => `<section class="sport-blok" data-sport="${k}"${k === sportTab ? '' : ' hidden'}>${inhoud}</section>`;
  app.innerHTML = `
    ${schermKop('Sport')}
    <div class="segment" id="sport-tabs" role="tablist">${Object.entries(SPORT_TABS)
      .map(([k, naam]) => `<button role="tab" aria-selected="${k === sportTab}" data-tab="${k}">${naam}</button>`)
      .join('')}</div>
    ${mijn.length ? '' : '<p class="zacht sport-tip">Tip: kies in <a href="#/instellingen">Instellingen</a> je sportzenders, dan zie je wat jij live kunt volgen.</p>'}
    ${blok('voetbal', '<div id="voetbal"><p class="bezig">Schema ophalen…</p></div>')}
    ${blok(
      'f1',
      `<p class="zender${mijn.includes(F1_ZENDERS.live) ? ' bij-jou-zender' : ''}"><strong>${
        mijn.includes(F1_ZENDERS.live) ? `Jij kijkt live via ${veilig(F1_ZENDERS.live)}` : `Live bij ${veilig(F1_ZENDERS.live)}`
      }</strong><br />${veilig(F1_ZENDERS.extra)}</p>
      <div id="f1"><p class="bezig">Schema ophalen…</p></div>`
    )}
    ${blok('wielrennen', wielrennenHtml(mijn))}
  `;
  document.getElementById('sport-tabs').addEventListener('click', (e) => {
    const knop = e.target.closest('[data-tab]');
    if (!knop || knop.dataset.tab === sportTab) return;
    sportTab = knop.dataset.tab;
    bewaarKeuze('sportTab', sportTab);
    document.querySelectorAll('#sport-tabs [data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === sportTab)));
    document.querySelectorAll('[data-sport]').forEach((b) => (b.hidden = b.dataset.sport !== sportTab));
    window.scrollTo(0, 0);
  });
  toonVoetbal(nr, mijn);
  let schema;
  try {
    schema = await haalF1();
  } catch {
    if (nr === schermNr) document.getElementById('f1').innerHTML = '<p class="leeg">Het schema ophalen lukt nu niet. Heb je internet?</p>';
    return;
  }
  if (nr !== schermNr) return;
  const komend = komendeRaces(schema.races);
  const [volgende, ...rest] = komend;
  document.getElementById('f1').innerHTML = volgende
    ? `
      <div class="race-volgend">
        <p class="race-ronde">Ronde ${volgende.ronde} · eerstvolgende</p>
        <h3>${veilig(volgende.naam)}</h3>
        <p class="zacht">${veilig([volgende.plaats, volgende.land].filter(Boolean).join(', '))}</p>
        <ul class="sessies">${volgende.sessies
          .map((x) => `<li class="${x.naam === 'Race' ? 'is-race' : ''}"><span>${veilig(x.naam)}</span><span>${veilig(nlTijd(x))}</span></li>`)
          .join('')}</ul>
      </div>
      ${
        rest.length
          ? `<p class="label sport-label">Rest van het seizoen</p>
             <ul class="races">${rest
               .map((r) => `<li><span class="race-nr">${r.ronde}</span><span class="race-naam">${veilig(r.naam)}</span><span class="race-dag">${veilig(nlTijd(r.sessies.at(-1)))}</span></li>`)
               .join('')}</ul>`
          : ''
      }
      <p class="bron">Alle tijden in Nederlandse tijd. Schema van Jolpica F1; zenders gecontroleerd in ${veilig(F1_ZENDERS.gecontroleerd)}.</p>`
    : '<p class="leeg">Het seizoen zit erop. Het schema voor volgend jaar verschijnt hier zodra het bekend is.</p>';
}

// --- Eén acteur ---

// Wat al opgehaald is blijft bewaard zolang de app open is, zodat 'terug' meteen werkt.
const acteurGeladen = new Map();
let acteurScroll = 0;

async function toonActeur(id, { terugNaarPlek = false } = {}) {
  const nr = schermNr;
  if (!leesSleutel()) {
    location.hash = '#/instellingen';
    return;
  }
  const terug = '<header class="kop"><button class="terug" id="terug">‹ Terug</button></header>';
  const koppelTerug = () => document.getElementById('terug').addEventListener('click', () => (binnenApp ? history.back() : (location.hash = '#/films')));
  let acteur = acteurGeladen.get(id);
  if (!acteur) {
    app.innerHTML = `${terug}<p class="bezig">Ophalen…</p>`;
    koppelTerug();
    try {
      acteur = await haalActeur(id);
      acteurGeladen.set(id, acteur);
    } catch (fout) {
      if (nr !== schermNr) return;
      document.querySelector('.bezig').outerHTML =
        fout instanceof SleutelFout
          ? '<p class="leeg">TMDB accepteert je sleutel niet. <a href="#/instellingen">Plak hem opnieuw</a>.</p>'
          : '<p class="leeg">Ophalen lukt nu niet. Heb je internet?</p>';
      return;
    }
  }
  const opLijst = new Map((await alleTitels()).map((t) => [titelSleutel(t), t]));
  if (nr !== schermNr) return;

  const foto = veiligeUrl(posterUrl(acteur.foto, 'w185'));
  const jaar = acteur.geboren.slice(0, 4);
  app.innerHTML = `
    ${terug}
    <section class="acteur-kop">
      ${foto ? `<img src="${foto}" alt="" />` : `<span class="acteur-leeg groot" aria-hidden="true">${veilig(acteur.naam.slice(0, 1))}</span>`}
      <h2>${veilig(acteur.naam)}</h2>
      ${jaar || acteur.plaats ? `<p class="zacht">${[jaar && `Geboren in ${veilig(jaar)}`, acteur.plaats && veilig(acteur.plaats)].filter(Boolean).join(' · ')}</p>` : ''}
    </section>
    <p class="label acteur-label">Speelde in</p>
    ${
      acteur.rollen.length
        ? `${rasterHtml(acteur.rollen, opLijst, (t) => [t.jaar, t.rol].filter(Boolean).map(veilig).join(' · ') || '&nbsp;')}${BRON}`
        : '<p class="leeg">Geen films of series gevonden.</p>'
    }
  `;
  koppelTerug();
  app.querySelectorAll('.raster-titel').forEach((knop) =>
    knop.addEventListener('click', () => {
      acteurScroll = window.scrollY;
      const t = acteur.rollen[Number(knop.dataset.i)];
      toonBevestigen(t, opLijst.get(titelSleutel(t)), { naam: acteur.naam, toon: () => toonActeur(id, { terugNaarPlek: true }) });
    })
  );
  if (terugNaarPlek) window.scrollTo(0, acteurScroll);
}

// --- Eén titel van je lijst ---

async function toonTitel(id, { naarSterren = false } = {}) {
  const nr = schermNr;
  const titel = await haalTitel(id);
  if (nr !== schermNr) return;
  if (!titel) {
    location.hash = '#/';
    return;
  }
  const bewaar = async (wijzigingen) => {
    Object.assign(titel, wijzigingen);
    await titelBijwerken(id, wijzigingen);
  };

  app.innerHTML = `
    <header class="kop">
      ${terugKnop('#/films')}
      <button class="link-knop deel-knop" id="samen" aria-expanded="false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l4 4-1.4 1.4L13 6.8V15h-2V6.8L9.4 8.4 8 7zM5 11h3v2H7v6h10v-6h-1v-2h3v10H5z" /></svg>
        Samen kijken
      </button>
    </header>
    <section class="samen" id="samen-vak" hidden>
      <p class="samen-kop">Nodig iemand uit</p>
      <p class="zacht">Stel eventueel een dag en tijd voor. Je verstuurt het bericht zelf, via WhatsApp, Berichten of mail.</p>
      <div class="samen-wanneer">
        <label>Dag<input type="date" id="samen-datum" min="${vandaag()}" /></label>
        <label>Tijd<input type="time" id="samen-tijd" step="300" /></label>
      </div>
      <p class="samen-voorbeeld" id="samen-voorbeeld"></p>
      <button class="hoofdknop" id="samen-deel">Deel uitnodiging</button>
    </section>
    <section class="bevestig">
      ${posterHtml(titel, 'poster-groot')}
      <h2>${veilig(titel.titel)}</h2>
      <p>${soortJaar(titel)}${titel.origineel && titel.origineel !== titel.titel ? ` · ${veilig(titel.origineel)}` : ''}</p>
      ${titel.beschrijving ? `<p class="beschrijving">${veilig(titel.beschrijving)}</p>` : ''}

      <div class="mijn-blok">
        <p class="label">Op mijn lijst</p>
        <div class="keuzes" id="statussen">
          ${STATUSSEN.map((s) => `<button class="keuze" data-s="${s}">${s === 'Gezien' ? '✓ Gezien' : s}</button>`).join('')}
        </div>
        <div id="voortgang"></div>

        <div id="gezien-deel">
          <p class="label">Mijn oordeel</p>
          <div class="sterren" id="sterren" role="radiogroup" aria-label="Sterren"></div>

          <p class="label">Gezien op</p>
          <div class="datum-regel">
            <input type="date" id="kijkdatum" value="${veilig(titel.kijkdatum)}" max="${vandaag()}" aria-label="Kijkdatum" />
            <button class="link-knop" id="datum-weg"${titel.kijkdatum ? '' : ' hidden'}>Wissen</button>
          </div>
          <p class="zacht datum-tekst" id="datum-tekst">${titel.kijkdatum ? veilig(datumTekst(titel.kijkdatum)) : 'Nog niet ingevuld'}</p>
        </div>

        <p class="label">Notitie</p>
        <textarea id="notitie" rows="3" placeholder="Bijvoorbeeld: tip van …, of wat je ervan vond">${veilig(titel.notitie)}</textarea>
        <p class="opgeslagen" id="opgeslagen">&nbsp;</p>
      </div>

      <p class="label">Waar kijken</p>
      <div id="diensten" class="diensten">${dienstenHtml(titel, true)}</div>

      <div id="extra">${extraHtml(titel)}</div>

      <button class="verwijder" id="verwijder">Verwijder van mijn lijst</button>
    </section>
  `;

  // Sterren en kijkdatum horen bij Gezien; bij Wil ik zien blijven ze uit beeld.
  const tekenStatus = () => {
    document.querySelectorAll('#statussen .keuze').forEach((k) => k.classList.toggle('actief', k.dataset.s === titel.status));
    document.getElementById('gezien-deel').hidden = titel.status !== 'Gezien';
  };
  const tekenSterren = () => {
    document.getElementById('sterren').innerHTML = [1, 2, 3, 4, 5]
      .map(
        (n) =>
          `<button class="ster${titel.sterren >= n ? ' aan' : ''}" data-n="${n}" role="radio" aria-checked="${titel.sterren === n}" aria-label="${n} ${n === 1 ? 'ster' : 'sterren'}">★</button>`
      )
      .join('');
  };
  const tekenDatum = () => {
    document.getElementById('kijkdatum').value = titel.kijkdatum;
    document.getElementById('datum-weg').hidden = !titel.kijkdatum;
    document.getElementById('datum-tekst').textContent = titel.kijkdatum ? datumTekst(titel.kijkdatum) : 'Nog niet ingevuld';
  };
  tekenStatus();
  tekenSterren();
  // Via 'Geef sterren' gekomen: meteen naar de sterren.
  if (naarSterren) document.getElementById('sterren').scrollIntoView({ block: 'center' });
  // Je hebt de titel bekeken: dan is het 'nieuw'-label niet meer nodig.
  if (titel.nieuwBij?.length) bewaar({ nieuwBij: [] });
  verversDiensten(titel, bewaar, nr);
  verversExtra(titel, bewaar, nr);
  document.getElementById('extra').addEventListener('click', (e) => {
    if (e.target.closest('#trailer-start')) speelTrailer(titel.trailer);
  });

  document.getElementById('statussen').addEventListener('click', async (e) => {
    const knop = e.target.closest('.keuze');
    if (!knop || knop.dataset.s === titel.status) return;
    const wijziging = statusWijziging(titel, knop.dataset.s);
    await bewaar(wijziging);
    tekenStatus();
    tekenDatum();
    tekenVoortgang();
    // Net op Gezien gezet: de sterren staan er nu, meteen in beeld.
    if (titel.status === 'Gezien' && !titel.sterren) document.getElementById('sterren').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // Waar ben je? Bij series die je nog niet helemaal gezien hebt. Vink je een aflevering af,
  // dan staat de serie op Vandaag bij Verder kijken.
  const tekenVoortgang = () => {
    const vak = document.getElementById('voortgang');
    if (titel.soort !== 'serie' || titel.status === 'Gezien') {
      vak.innerHTML = '';
      return;
    }
    const v = titel.voortgang ?? beginVoortgang();
    const seizoenen = titel.seizoenen ?? [];
    const dit = seizoenen.find((x) => x.nr === v.seizoen);
    const volgende = volgendeAflevering(v, seizoenen);
    const opties = (van, tot, gekozen) =>
      Array.from({ length: tot - van + 1 }, (_, i) => van + i)
        .map((n) => `<option value="${n}"${n === gekozen ? ' selected' : ''}>${n}</option>`)
        .join('');
    vak.innerHTML = `
      <p class="label">Waar ben je?</p>
      <p class="voortgang-nu">${
        v.aflevering
          ? `Seizoen ${v.seizoen} · aflevering ${v.aflevering}${dit ? ` van ${dit.afleveringen}` : ''}`
          : `Seizoen ${v.seizoen} · nog niet begonnen`
      }</p>
      ${
        volgende
          ? `<button class="hoofdknop" id="volgende">✓ ${volgende.seizoen !== v.seizoen ? `Seizoen ${volgende.seizoen}, aflevering 1` : `Aflevering ${volgende.aflevering}`} gezien</button>`
          : `<div class="klaar"><p>Je hebt alle afleveringen gezien.</p><button class="hoofdknop" id="naar-gezien">Zet op Gezien</button></div>`
      }
      <div class="voortgang-kies">
        <label>Seizoen ${
          seizoenen.length
            ? `<select id="v-seizoen">${seizoenen.map((x) => `<option value="${x.nr}"${x.nr === v.seizoen ? ' selected' : ''}>${x.nr}</option>`).join('')}</select>`
            : `<input id="v-seizoen" type="number" inputmode="numeric" min="1" value="${v.seizoen}" />`
        }</label>
        <label>Aflevering ${
          dit
            ? `<select id="v-aflevering">${opties(0, dit.afleveringen, v.aflevering)}</select>`
            : `<input id="v-aflevering" type="number" inputmode="numeric" min="0" value="${v.aflevering}" />`
        }</label>
      </div>
      ${titel.voortgang ? '<button class="link-knop" id="niet-verder">Niet meer bij Verder kijken</button>' : ''}`;
    document.getElementById('volgende')?.addEventListener('click', async () => {
      await bewaar({ voortgang: volgende });
      tekenVoortgang();
    });
    document.getElementById('niet-verder')?.addEventListener('click', async () => {
      await bewaar({ voortgang: undefined }); // Dexie haalt een veld met undefined weg
      tekenVoortgang();
      melding('Staat niet meer bij Verder kijken');
    });
    document.getElementById('naar-gezien')?.addEventListener('click', async () => {
      await bewaar(statusWijziging(titel, 'Gezien'));
      tekenStatus();
      tekenDatum();
      tekenVoortgang();
      melding('Op Gezien gezet. Geef hem nog sterren?');
    });
    const kies = async () => {
      const seizoen = Math.max(1, parseInt(document.getElementById('v-seizoen').value, 10) || 1);
      const max = seizoenen.find((x) => x.nr === seizoen)?.afleveringen ?? Infinity;
      // Ander seizoen gekozen: dan begin je daar bij aflevering 0.
      const aflevering = seizoen !== v.seizoen ? 0 : Math.min(max, Math.max(0, parseInt(document.getElementById('v-aflevering').value, 10) || 0));
      await bewaar({ voortgang: { seizoen, aflevering } });
      tekenVoortgang();
    };
    document.getElementById('v-seizoen').addEventListener('change', kies);
    document.getElementById('v-aflevering').addEventListener('change', kies);
  };
  tekenVoortgang();
  toonTitel.tekenVoortgang = tekenVoortgang;

  document.getElementById('sterren').addEventListener('click', async (e) => {
    const knop = e.target.closest('.ster');
    if (!knop) return;
    const n = Number(knop.dataset.n);
    // Nog een keer op dezelfde ster tikken haalt het oordeel weg.
    await bewaar({ sterren: titel.sterren === n ? 0 : n });
    tekenSterren();
  });

  document.getElementById('kijkdatum').addEventListener('change', async (e) => {
    await bewaar({ kijkdatum: e.target.value });
    tekenDatum();
  });
  document.getElementById('datum-weg').addEventListener('click', async () => {
    await bewaar({ kijkdatum: '' });
    tekenDatum();
  });

  // De notitie bewaart vanzelf, kort nadat je stopt met typen.
  const notitie = document.getElementById('notitie');
  const opgeslagen = document.getElementById('opgeslagen');
  let timer;
  const bewaarNotitie = async () => {
    clearTimeout(timer);
    if (notitie.value === titel.notitie) return;
    await bewaar({ notitie: notitie.value });
    opgeslagen.textContent = 'Opgeslagen';
  };
  notitie.addEventListener('input', () => {
    opgeslagen.innerHTML = '&nbsp;';
    clearTimeout(timer);
    timer = setTimeout(bewaarNotitie, 800);
  });
  notitie.addEventListener('blur', bewaarNotitie);
  toonTitel.bewaarOpenstaand = bewaarNotitie;

  // Samen kijken: de uitnodiging met de diensten zoals je ze nu ziet (eigen abonnementen eerst).
  const samenVak = document.getElementById('samen-vak');
  const samenKnop = document.getElementById('samen');
  const uitnodiging = () =>
    uitnodigingTekst(titel, {
      datum: document.getElementById('samen-datum').value,
      tijd: document.getElementById('samen-tijd').value,
      verdeeld: titel.diensten ? verdeelDiensten(titel.diensten, leesKeuzes()) : null,
    });
  const toonVoorbeeld = () => (document.getElementById('samen-voorbeeld').textContent = uitnodiging());
  samenKnop.addEventListener('click', () => {
    samenVak.hidden = !samenVak.hidden;
    samenKnop.setAttribute('aria-expanded', String(!samenVak.hidden));
    if (!samenVak.hidden) toonVoorbeeld();
  });
  samenVak.addEventListener('input', toonVoorbeeld);
  document.getElementById('samen-deel').addEventListener('click', async () => {
    try {
      const uitkomst = await deel(uitnodiging());
      if (uitkomst === 'gekopieerd') melding('Tekst gekopieerd. Plak hem waar je wilt.');
      if (uitkomst === 'gedeeld') {
        samenVak.hidden = true;
        samenKnop.setAttribute('aria-expanded', 'false');
      }
    } catch {
      melding('Delen lukt hier niet');
    }
  });

  document.getElementById('verwijder').addEventListener('click', async () => {
    await bewaarNotitie();
    const kopie = { ...titel };
    await titelVerwijderen(id);
    toonTitel.bewaarOpenstaand = null;
    if (binnenApp) history.back();
    else location.hash = '#/films';
    melding(`"${kopie.titel}" verwijderd`, {
      tekst: 'Ongedaan maken',
      actie: async () => {
        await titelTerugzetten(kopie);
        // Staat je lijst of Vandaag open, dan meteen bijwerken.
        if (['', '#/', '#/films'].includes(location.hash)) route();
      },
    });
  });
}

// --- Instellingen ---

async function toonClubsKeuze(nr) {
  const schema = await haalVoetbalSchema();
  const vak = nr === schermNr ? document.getElementById('clubs-keuze') : null;
  if (!vak) return;
  if (!schema) {
    vak.innerHTML = '<p class="zacht">Zodra het voetbalschema klaarstaat, kies je hier je clubs.</p>';
    return;
  }
  const per = ploegenPerCompetitie(schema.wedstrijden);
  const gekozen = new Set(leesVoetbalKeuzes().clubs);
  vak.innerHTML = Object.entries(per)
    .map(
      ([c, ploegen]) => `
      <p class="label clubs-kop">${veilig(COMPETITIES[c].naam)}</p>
      <div class="keuzes klein">${ploegen
        .map((p) => `<button class="keuze${gekozen.has(p.id) ? ' actief' : ''}" data-club="${p.id}">${veilig(p.naam)}</button>`)
        .join('')}</div>`
    )
    .join('') + '<p class="zacht klein">Je ziet ploegen die de komende twee weken spelen. Een club in meerdere competities kies je één keer.</p>';
  vak.addEventListener('click', (e) => {
    const knop = e.target.closest('[data-club]');
    if (!knop) return;
    const id = Number(knop.dataset.club);
    gekozen.has(id) ? gekozen.delete(id) : gekozen.add(id);
    vak.querySelectorAll(`[data-club="${id}"]`).forEach((k) => k.classList.toggle('actief', gekozen.has(id)));
    zetVoetbalKeuzes({ ...leesVoetbalKeuzes(), clubs: [...gekozen] });
    document.getElementById('clubs-stand').textContent = gekozen.size ? `${gekozen.size} gekozen` : 'Nog geen clubs gekozen';
  });
}


// Licht of donker. Het wisselen zelf gebeurt in thema.js, dat al laadt vóór de app.
const WEERGAVEN = { donker: 'Altijd donker', avond: "Donker 's avonds", iphone: 'Zoals mijn iPhone', licht: 'Altijd licht' };

function weergave() {
  return onthoud('weergave', 'donker', Object.keys(WEERGAVEN));
}

// Korte stand onder het ingeklapte blok, zodat je zonder openklappen ziet wat je hebt gekozen.
function dienstenStand() {
  const k = Object.values(leesKeuzes());
  const abo = k.filter((x) => x === 'abonnement').length;
  const weg = k.filter((x) => x === 'verbergen').length;
  if (!abo && !weg) return 'Nog niets gekozen';
  return [abo && `${abo} ${abo === 1 ? 'abonnement' : 'abonnementen'}`, weg && `${weg} verborgen`].filter(Boolean).join(' · ');
}

async function toonDienstenKeuze(nr) {
  const vak = () => (nr === schermNr ? document.getElementById('diensten-keuze') : null);
  let alle;
  try {
    alle = await haalAlleDiensten();
  } catch {
    if (vak()) vak().innerHTML = '<p class="zacht">Diensten ophalen lukt nu niet. Heb je internet?</p>';
    return;
  }
  if (!vak()) return;
  const keuzes = leesKeuzes();
  const lijst = beperkDiensten(alle, keuzes);
  const regel = (d) => `
    <li class="dienst-keuze" data-id="${d.id}">
      <span class="dienst-naam">${logoHtml(d)}${veilig(d.naam)}</span>
      <span class="keuzes klein">${Object.entries(KEUZES)
        .map(([k, naam]) => `<button class="keuze${keuzeVan(keuzes, d.id) === k ? ' actief' : ''}" data-keuze="${k}">${naam}</button>`)
        .join('')}</span>
    </li>`;
  vak().innerHTML = `
    <div class="alles-knoppen">
      <button class="keuze" data-alles="verbergen">Verberg alles behalve mijn abonnementen</button>
      <button class="keuze" data-alles="tonen">Toon alles</button>
    </div>
    <ul class="diensten-lijst">${lijst.map(regel).join('')}</ul>`;
  vak().addEventListener('click', (e) => {
    const alles = e.target.closest('[data-alles]');
    if (alles) {
      zetAlleKeuzes(alle.map((d) => d.id), alles.dataset.alles);
      const nu = leesKeuzes();
      vak().querySelectorAll('.dienst-keuze').forEach((li) =>
        li.querySelectorAll('.keuze').forEach((k) => k.classList.toggle('actief', k.dataset.keuze === keuzeVan(nu, Number(li.dataset.id))))
      );
      document.getElementById('diensten-stand').textContent = dienstenStand();
      melding(alles.dataset.alles === 'verbergen' ? 'Alles verborgen behalve je abonnementen' : 'Alle diensten worden weer getoond');
      return;
    }
    const knop = e.target.closest('[data-keuze]');
    if (!knop) return;
    const li = knop.closest('.dienst-keuze');
    zetKeuze(Number(li.dataset.id), knop.dataset.keuze);
    li.querySelectorAll('.keuze').forEach((k) => k.classList.toggle('actief', k === knop));
    document.getElementById('diensten-stand').textContent = dienstenStand();
  });
}

function backupTekst() {
  const laatste = laatsteBackup();
  if (!laatste) return 'Nog geen backup gemaakt.';
  const dagen = dagenSinds(laatste);
  const wanneer = dagen === 0 ? 'vandaag' : dagen === 1 ? 'gisteren' : `${dagen} dagen geleden`;
  return `Laatste backup: ${laatste.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })} (${wanneer}).`;
}

const aantalTekst = (n) => (n === 1 ? '1 titel' : `${n} titels`);

function tvStand(soort) {
  const v = leesTvVoorkeuren()[soort];
  if (!v.length) return 'Geen voorkeur';
  return soort === 'genres' ? v.map((k) => TV_GENRES[k].naam).join(', ') : v.join(', ');
}

function competitiesStand() {
  const alles = leesVoetbalKeuzes().alles.map((c) => COMPETITIES[c]?.kort).filter(Boolean);
  return alles.length ? alles.join(', ') : 'Alleen je clubs';
}

// Uitleg en invulveld voor een eigen TMDB-sleutel.
function eigenSleutelFormulier() {
  return `<p>Kijkwijzer haalt titels, posters en waar je iets kunt kijken op bij TMDB, een gratis filmdatabase. Daarvoor heb je een eigen, gratis sleutel nodig. Dat is eenmalig ongeveer vijf minuten werk.</p>
             <details class="uitklap stappen" open>
               <summary><span class="uitklap-kop">Zo vraag je de sleutel aan</span></summary>
               <ol>
                 <li>Maak een gratis account op <a href="https://www.themoviedb.org/signup" target="_blank" rel="noopener noreferrer">themoviedb.org</a> en bevestig je e-mailadres.</li>
                 <li>Ga naar <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">Instellingen → API</a> en kies <b>Een API-sleutel aanvragen</b> (Create / Request an API key) en dan <b>Developer</b>.</li>
                 <li>Vul het formulier in. Gebruik: <b>persoonlijk</b>. Naam van de app: <b>Kijkwijzer</b>. Adres: <b>${veilig(location.origin + import.meta.env.BASE_URL)}</b>. Omschrijving: <b>Mijn eigen kijklijst</b>.</li>
                 <li>Kopieer daarna op dezelfde pagina het <b>API Read Access Token</b> (een lange tekst die begint met eyJ) en plak het hieronder.</li>
               </ol>
             </details>
             <p class="zacht">De sleutel blijft op deze telefoon en gaat nergens anders heen dan naar TMDB.</p>
             <form id="sleutel-form">
               <textarea id="sleutel-veld" rows="3" placeholder="Plak hier je sleutel" autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>
               <p class="fout" id="sleutel-fout" hidden></p>
               <button class="hoofdknop" type="submit">Bewaar sleutel</button>
             </form>`;
}

async function toonInstellingen({ welkom = null } = {}) {
  const nr = schermNr;
  const sleutel = leesSleutel();
  const aantal = (await alleTitels()).length;
  if (nr !== schermNr) return;
  app.innerHTML = `
    <header class="kop">${terugKnop('#/')}</header>
    <header class="kop"><h1>Instellingen</h1></header>
    <div class="instellingen${sleutel ? '' : ' zonder-sleutel'}">

    <section class="blok profiel-blok">
      <div data-groep="naam" class="kaart profiel-kaart">
        <span class="profiel-letter" id="profiel-letter" aria-hidden="true">${veilig((leesNaam()[0] || '?').toUpperCase())}</span>
        <label class="profiel-naam">
          <span class="zacht klein-label">Je naam</span>
          <input id="naam-veld" value="${veilig(leesNaam())}" maxlength="40" placeholder="Je voornaam" autocomplete="given-name" />
        </label>
      </div>
      <p class="zacht onder-kaart">Alleen op deze telefoon en in je backup. De app gebruikt hem om je te begroeten.</p>
    </section>

    <section class="blok">
      <h2>Kijken</h2>
      <div class="kaart">
      <div data-groep="diensten">
      ${
        sleutel
          ? `<details class="uitklap" id="diensten-uitklap">
               <summary><span class="uitklap-kop">Streamingdiensten</span><span class="zacht uitklap-stand" id="diensten-stand">${veilig(dienstenStand())}</span></summary>
               <p class="zacht uitklap-uitleg"><b>Abonnement</b> als je hem hebt, <b>Tonen</b> om hem bij een titel te zien, <b>Verbergen</b> als hij je niet interesseert.</p>
               <div id="diensten-keuze"><p class="zacht">Diensten ophalen…</p></div>
               <p class="zacht klein nieuw-uitleg">Eén keer per dag kijkt de app of titels op Wil ik zien nieuw bij je abonnementen te zien zijn. Je ziet dat op Vandaag.</p>
               <button class="tweede-knop" id="nieuw-nu">Nu controleren</button>
               <p class="zacht klein" id="nieuw-uitkomst" hidden></p>
             </details>`
          : '<p class="rij zacht">Streamingdiensten kies je zodra je TMDB-sleutel is ingesteld.</p>'
      }
      </div>
      <div data-groep="tv">
      <details class="uitklap" id="tv-genres-uitklap">
        <summary><span class="uitklap-kop">Tv-tips: genres</span><span class="zacht uitklap-stand" id="tv-genres-stand">${veilig(tvStand('genres'))}</span></summary>
        <p class="zacht uitklap-uitleg">Daar stemt Vanavond op de NPO de tips op af. Nieuws en jeugd worden nooit een tip.</p>
        <div class="keuzes" id="tv-genres">${Object.entries(TV_GENRES)
          .map(([k, g]) => `<button class="keuze${leesTvVoorkeuren().genres.includes(k) ? ' actief' : ''}" data-genre="${k}">${veilig(g.naam)}</button>`)
          .join('')}</div>
      </details>
      <details class="uitklap" id="tv-omroepen-uitklap">
        <summary><span class="uitklap-kop">Tv-tips: omroepen</span><span class="zacht uitklap-stand" id="tv-omroepen-stand">${veilig(tvStand('omroepen'))}</span></summary>
        <div class="keuzes" id="tv-omroepen"><p class="zacht">Omroepen ophalen…</p></div>
      </details>
      </div>
      </div>
    </section>

    <section class="blok">
      <h2>Sport</h2>
      <div class="kaart">
      <div data-groep="sportvandaag" class="rij">
        <span><span class="rij-kop">Sport op Vandaag</span><span class="zacht rij-stand">Uit: kijktips op die plek</span></span>
        <div class="keuzes schakelaar" id="vandaag-sport">
          <button class="keuze${sportOpVandaag() ? ' actief' : ''}" data-sport="aan">Aan</button>
          <button class="keuze${sportOpVandaag() ? '' : ' actief'}" data-sport="uit">Uit</button>
        </div>
      </div>
      <div data-groep="sportzenders">
      <details class="uitklap" id="sportzenders-uitklap">
        <summary><span class="uitklap-kop">Sportzenders</span><span class="zacht uitklap-stand" id="sportzenders-stand">${veilig(leesSportzenders().join(', ') || 'Nog niets gekozen')}</span></summary>
        <p class="zacht uitklap-uitleg">Dan laat Sport zien wat jij live kunt volgen. NOS valt onder de gewone NPO-zenders.</p>
        <div class="keuzes" id="sportzenders">${SPORTZENDERS.map(
          (z) => `<button class="keuze${leesSportzenders().includes(z) ? ' actief' : ''}" data-zender="${z}" aria-pressed="${leesSportzenders().includes(z)}">${z}</button>`
        ).join('')}</div>
      </details>
      </div>
      <div data-groep="voetbal">
      <details class="uitklap" id="clubs-uitklap">
        <summary><span class="uitklap-kop">Voetbalclubs</span><span class="zacht uitklap-stand" id="clubs-stand">${leesVoetbalKeuzes().clubs.length ? `${leesVoetbalKeuzes().clubs.length} gekozen` : 'Nog geen clubs gekozen'}</span></summary>
        <p class="zacht uitklap-uitleg">Van je clubs zie je in Sport alle wedstrijden, in elke competitie.</p>
        <div id="clubs-keuze"><p class="zacht">Clubs ophalen…</p></div>
      </details>
      <details class="uitklap" id="competities-uitklap">
        <summary><span class="uitklap-kop">Hele competities</span><span class="zacht uitklap-stand" id="competities-stand">${veilig(competitiesStand())}</span></summary>
        <p class="zacht uitklap-uitleg">Zet een competitie aan om er álle wedstrijden van te zien.</p>
        <div class="keuzes" id="voetbal-alles">${Object.entries(COMPETITIES)
          .map(([c, x]) => `<button class="keuze${leesVoetbalKeuzes().alles.includes(c) ? ' actief' : ''}" data-competitie="${c}">Alles ${veilig(x.naam)}</button>`)
          .join('')}</div>
      </details>
      </div>
      </div>
    </section>

    <section class="blok" id="backup-blok">
      <h2>Backup</h2>
      <div class="kaart kaart-ruim">
        <p class="backup-status" id="backup-status">${backupTekst()}</p>
        <button class="hoofdknop" id="backup-maken"${aantal ? '' : ' disabled'}>Backup maken</button>
        <label class="tweede-knop bestand-knop">Backup terugzetten
          <input type="file" id="backup-bestand" accept="application/json,.json" hidden />
        </label>
        <div id="terugzet-vak"></div>
        <details class="uitklap uitklap-klein">
          <summary><span class="uitklap-kop">Hoe werkt het?</span></summary>
          <p class="zacht">Je lijst staat alleen op deze telefoon. Tik op Backup maken en kies in het deelmenu <b>Bewaar in Bestanden</b> en dan iCloud Drive of Google Drive, of kies de <b>Drive</b>-app. De telefoon onthoudt de map. Je TMDB-sleutel zit niet in de backup; op een nieuwe telefoon plak je hem opnieuw.</p>
        </details>
      </div>
    </section>

    <section class="blok">
      <h2>Weergave</h2>
      <div class="kaart kaart-ruim" data-groep="weergave">
        <div class="keuzes" id="weergave">
          ${Object.entries(WEERGAVEN)
            .map(([k, naam]) => `<button class="keuze${k === weergave() ? ' actief' : ''}" data-weergave="${k}">${naam}</button>`)
            .join('')}
        </div>
        <p class="zacht klein">Donker 's avonds: van 20:00 tot 7:00 donker, en altijd als je iPhone op donker staat.</p>
      </div>
    </section>

    <section class="blok">
      <h2>Sleutel &amp; over</h2>
      <div class="kaart kaart-ruim">
      <div data-groep="sleutel">
      ${
        eigenSleutel()
          ? `<p><span class="rij-kop">Je eigen TMDB-sleutel</span><span class="zacht rij-stand">${soortSleutel(sleutel) === 'token' ? 'Read Access Token' : 'API Key'} · eindigt op ${veilig(sleutel.slice(-4))} · alleen op deze telefoon</span></p>
             <div class="knoppen-rij">
               <button class="tweede-knop" id="sleutel-test">Test de sleutel</button>
               <button class="link-knop" id="sleutel-weg">${heeftGedeeldeSleutel() ? 'Weer de gedeelde gebruiken' : 'Verwijderen'}</button>
             </div>`
          : heeftGedeeldeSleutel()
            ? `<p><span class="rij-kop">TMDB-sleutel</span><span class="zacht rij-stand">De app gebruikt de gedeelde sleutel. Je hoeft niets te doen.</span></p>
               <div class="knoppen-rij"><button class="tweede-knop" id="sleutel-test">Test de sleutel</button></div>
               <details class="uitklap stappen">
                 <summary><span class="uitklap-kop">Liever je eigen sleutel?</span></summary>
                 ${eigenSleutelFormulier()}
               </details>`
            : eigenSleutelFormulier()
      }
      </div>
      </div>
      <button class="link-knop" id="welkom-opnieuw">Welkomststappen opnieuw doorlopen</button>
      ${BRON}
      <p class="versie">Versie van ${__VERSIE__}</p>
    </section>
    </div>
  `;

  // De lijst met diensten pas ophalen als je het blok openklapt.
  document.getElementById('diensten-uitklap')?.addEventListener(
    'toggle',
    (e) => {
      if (e.target.open) toonDienstenKeuze(nr);
    },
    { once: true }
  );

  document.getElementById('nieuw-nu')?.addEventListener('click', async (e) => {
    const knop = e.currentTarget;
    const uitkomst = document.getElementById('nieuw-uitkomst');
    knop.disabled = true;
    knop.textContent = 'Controleren…';
    const n = await controleerNieuw({ nu: true });
    knop.disabled = false;
    knop.textContent = 'Nu controleren';
    uitkomst.hidden = false;
    uitkomst.textContent =
      n === null
        ? 'Kies eerst hierboven bij Diensten aanpassen welke abonnementen je hebt.'
        : n === -1
          ? 'Controleren lukt nu niet. Heb je internet? Probeer het later nog eens.'
          : n
          ? `${n === 1 ? '1 titel is' : `${n} titels zijn`} nieuw bij je diensten. Kijk op Vandaag.`
          : 'Niets nieuws: je titels op Wil ik zien staan nog bij dezelfde diensten.';
  });

  document.getElementById('voetbal-alles').addEventListener('click', (e) => {
    const knop = e.target.closest('[data-competitie]');
    if (!knop) return;
    knop.classList.toggle('actief');
    const k = leesVoetbalKeuzes();
    zetVoetbalKeuzes({ ...k, alles: [...document.querySelectorAll('#voetbal-alles .actief')].map((x) => x.dataset.competitie) });
    document.getElementById('competities-stand').textContent = competitiesStand();
  });
  document.getElementById('clubs-uitklap').addEventListener('toggle', (e) => e.target.open && toonClubsKeuze(nr), { once: true });

  document.getElementById('tv-genres').addEventListener('click', (e) => {
    const knop = e.target.closest('[data-genre]');
    if (!knop) return;
    knop.classList.toggle('actief');
    zetTvVoorkeuren({ ...leesTvVoorkeuren(), genres: [...document.querySelectorAll('#tv-genres .actief')].map((x) => x.dataset.genre) });
    document.getElementById('tv-genres-stand').textContent = tvStand('genres');
  });
  // De omroepen komen uit de gids zelf, zodat de lijst altijd klopt.
  document.getElementById('tv-omroepen-uitklap').addEventListener(
    'toggle',
    async (e) => {
      if (!e.target.open) return;
      const vak = document.getElementById('tv-omroepen');
      const npo = await haalNpo();
      const gekozen = leesTvVoorkeuren().omroepen;
      const alle = [...new Set([...omroepenIn(npo?.programmas ?? []), ...gekozen])].filter((o) => !['NOS', 'NPO', 'NPO Zapp'].includes(o)).sort((a, b) => a.localeCompare(b));
      if (!alle.length) {
        vak.innerHTML = '<p class="zacht">De tv-gids is nu niet beschikbaar. Probeer het later nog eens.</p>';
        return;
      }
      vak.innerHTML = alle.map((o) => `<button class="keuze${gekozen.includes(o) ? ' actief' : ''}" data-omroep="${veilig(o)}">${veilig(o)}</button>`).join('');
      vak.addEventListener('click', (k) => {
        const knop = k.target.closest('[data-omroep]');
        if (!knop) return;
        knop.classList.toggle('actief');
        zetTvVoorkeuren({ ...leesTvVoorkeuren(), omroepen: [...vak.querySelectorAll('.actief')].map((x) => x.dataset.omroep) });
        document.getElementById('tv-omroepen-stand').textContent = tvStand('omroepen');
      });
    },
    { once: true }
  );

  document.getElementById('sportzenders').addEventListener('click', (e) => {
    const knop = e.target.closest('[data-zender]');
    if (!knop) return;
    const aan = !knop.classList.contains('actief');
    knop.classList.toggle('actief', aan);
    knop.setAttribute('aria-pressed', String(aan));
    zetSportzenders([...document.querySelectorAll('#sportzenders .actief')].map((k) => k.dataset.zender));
    document.getElementById('sportzenders-stand').textContent = leesSportzenders().join(', ') || 'Nog niets gekozen';
  });

  document.getElementById('vandaag-sport').addEventListener('click', (e) => {
    const knop = e.target.closest('[data-sport]');
    if (!knop) return;
    bewaarKeuze('vandaagSport', knop.dataset.sport);
    document.querySelectorAll('#vandaag-sport .keuze').forEach((k) => k.classList.toggle('actief', k === knop));
  });

  document.getElementById('weergave').addEventListener('click', (e) => {
    const knop = e.target.closest('[data-weergave]');
    if (!knop) return;
    bewaarKeuze('weergave', knop.dataset.weergave);
    window.kijkThema?.toepassen();
    document.querySelectorAll('#weergave .keuze').forEach((k) => k.classList.toggle('actief', k === knop));
  });

  // Het deelmenu van de iPhone opent alleen direct na een tik. Daarom maakt de app de backup
  // al klaar zodra dit scherm opent; dan is één tik genoeg. Is hij nog niet klaar, dan eerst
  // klaarmaken en daarna nog een tik.
  const maakKnop = document.getElementById('backup-maken');
  let bestand = null;
  const klaarmaken = () =>
    maakBackupBestand().then(
      (b) => (bestand = b),
      () => (bestand = null)
    );
  if (aantal) klaarmaken();
  // Verandert er iets in Instellingen (diensten, voetbal, weergave…), dan een verse backup
  // klaarmaken, zodat die keuzes er ook in zitten.
  let opnieuw;
  const instellingen = app.querySelector('.instellingen');
  const verversBackup = (e) => {
    if (!aantal || e.target.closest?.('#backup-blok')) return;
    clearTimeout(opnieuw);
    opnieuw = setTimeout(() => {
      if (maakKnop.disabled) return;
      bestand = null;
      maakKnop.textContent = 'Backup maken';
      klaarmaken();
    }, 300);
  };
  instellingen?.addEventListener('click', verversBackup);
  instellingen?.addEventListener('change', verversBackup);
  maakKnop.addEventListener('click', async () => {
    if (!bestand) {
      maakKnop.disabled = true;
      maakKnop.textContent = 'Backup klaarmaken…';
      await klaarmaken();
      maakKnop.disabled = false;
      if (!bestand) {
        maakKnop.textContent = 'Backup maken';
        melding('Backup klaarmaken lukte niet. Probeer het nog eens.');
        return;
      }
      maakKnop.textContent = `Bewaar backup (${aantalTekst(aantal)})`;
      return;
    }
    try {
      if (await bewaarBackup(bestand)) {
        maakKnop.textContent = 'Backup maken';
        document.getElementById('backup-status').textContent = backupTekst();
        melding('Backup bewaard');
        bestand = null;
        klaarmaken(); // een verse voor de volgende keer
      }
    } catch {
      melding('Bewaren lukte niet. Probeer het nog eens.');
    }
  });

  document.getElementById('backup-bestand').addEventListener('change', async (e) => {
    const gekozen = e.target.files?.[0];
    e.target.value = '';
    if (!gekozen) return;
    const vak = document.getElementById('terugzet-vak');
    let inhoud;
    try {
      inhoud = await leesBackup(gekozen);
    } catch (fout) {
      vak.innerHTML = `<div class="waarschuwing"><p>${veilig(fout.message)}</p></div>`;
      return;
    }
    const gemaakt = new Date(inhoud.gemaakt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
    const kop = `<strong>Backup van ${veilig(gemaakt)} met ${aantalTekst(inhoud.titels.length)}</strong><br />`;
    // Terugzetten vervangt alles. Staat er al een lijst, dan eerst nu een backup daarvan
    // (in het afgelopen kwartier), zodat een verkeerd gekozen bestand nooit werk kost.
    const laatste = laatsteBackup();
    if (aantal > 0 && (!laatste || Date.now() - laatste > 15 * 60000)) {
      vak.innerHTML = `
        <div class="waarschuwing">
          <p>${kop}Terugzetten vervangt je huidige lijst van ${aantalTekst(aantal)}. Maak daarom eerst hierboven een backup van je huidige lijst (Backup maken, dan Bewaar backup) en kies daarna dit bestand opnieuw.</p>
          <button class="link-knop" id="annuleer">Sluiten</button>
        </div>`;
      document.getElementById('annuleer').addEventListener('click', () => (vak.innerHTML = ''));
      return;
    }
    vak.innerHTML = `
      <div class="waarschuwing">
        <p>${kop}${aantal ? `Je huidige lijst van ${aantalTekst(aantal)} wordt hierdoor <b>vervangen</b>.` : 'Je lijst is nu leeg.'}</p>
        <button class="gevaar-knop" id="terugzetten">${aantal ? 'Ja, vervang mijn lijst' : 'Terugzetten'}</button>
        <button class="link-knop" id="annuleer">Annuleren</button>
      </div>`;
    document.getElementById('annuleer').addEventListener('click', () => (vak.innerHTML = ''));
    document.getElementById('terugzetten').addEventListener('click', async (k) => {
      k.currentTarget.disabled = true;
      k.currentTarget.textContent = 'Bezig met terugzetten…';
      try {
        const n = await zetBackupTerug(inhoud);
        // Keuzes uit de backup (tabblad, sortering) meteen gebruiken.
        filmsTab = onthoud('filmsTab', 'wil', Object.keys(FILMS_TABS));
        sportTab = onthoud('sportTab', 'voetbal', Object.keys(SPORT_TABS));
        soort = onthoud('soort', 'alle', Object.keys(SOORTEN));
        sortering = onthoud('sortering', 'toegevoegd', Object.keys(SORTERINGEN));
        window.kijkThema?.toepassen();
        location.hash = '#/';
        melding(`${aantalTekst(n)} teruggezet`);
      } catch {
        vak.innerHTML = '<div class="waarschuwing"><p>Terugzetten is mislukt. Je lijst is niet veranderd.</p></div>';
      }
    });
  });

  document.getElementById('sleutel-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const knop = e.submitter;
    const fout = document.getElementById('sleutel-fout');
    const tekst = document.getElementById('sleutel-veld').value.trim();
    const toonFout = (t) => {
      fout.textContent = t;
      fout.hidden = false;
    };
    if (!soortSleutel(tekst)) {
      toonFout('Dit lijkt geen TMDB-sleutel. Kopieer de API Key (32 tekens) of de Read Access Token (begint met eyJ).');
      return;
    }
    knop.disabled = true;
    knop.textContent = 'Controleren…';
    try {
      await testSleutel(tekst);
      bewaarSleutel(tekst);
      melding('Sleutel bewaard');
      location.hash = location.hash.startsWith('#/welkom') ? welkomVolgende('sleutel') : '#/films';
    } catch (f) {
      toonFout(f instanceof SleutelFout ? 'TMDB accepteert deze sleutel niet. Controleer of je hem helemaal hebt gekopieerd.' : 'Controleren lukt nu niet. Heb je internet?');
      knop.disabled = false;
      knop.textContent = 'Bewaar sleutel';
    }
  });

  document.getElementById('sleutel-test')?.addEventListener('click', async () => {
    try {
      await testSleutel(leesSleutel());
      melding('De sleutel werkt');
    } catch (f) {
      melding(f instanceof SleutelFout ? 'TMDB accepteert de sleutel niet' : 'Geen verbinding met TMDB');
    }
  });

  document.getElementById('sleutel-weg')?.addEventListener('click', () => {
    if (!confirm('Sleutel van deze telefoon verwijderen? Je kunt hem daarna opnieuw plakken.')) return;
    wisSleutel();
    route();
  });

  document.getElementById('naam-veld').addEventListener('input', (e) => {
    bewaarKeuze('naam', e.target.value.trim());
    document.getElementById('profiel-letter').textContent = (leesNaam()[0] || '?').toUpperCase();
  });
  document.getElementById('welkom-opnieuw').addEventListener('click', () => (location.hash = '#/welkom'));

  if (welkom) richtInAlsWelkomststap(welkom);
}

// --- Welkom: de eerste keer de app in een paar stappen op jou instellen ---
// De stappen tonen dezelfde onderdelen als Instellingen (met dezelfde knoppen), één thema per keer.
const WELKOM_STAPPEN = [
  { id: 'naam' },
  {
    id: 'sleutel',
    titel: 'Je sleutel voor films en series',
    uitleg: 'Titels, posters en waar je iets kunt kijken komen van TMDB, een gratis filmdatabase.',
    groepen: ['sleutel'],
    nodig: () => welkomZonderSleutel,
  },
  {
    id: 'diensten',
    titel: 'Welke streamingdiensten heb je?',
    uitleg: 'Tik aan wat je hebt. Dan zie je bij elke film en serie meteen of je hem kunt kijken, en krijg je tips die bij jou te zien zijn.',
    eigen: welkomDiensten,
  },
  {
    id: 'sport',
    titel: 'Volg je sport?',
    uitleg: 'Dan zie je op Vandaag welke wedstrijden, races en koersen er zijn, en waar je ze kunt kijken. Zo niet, dan staan daar kijktips.',
    eigen: welkomSportVraag,
  },
  {
    id: 'sportzenders',
    titel: 'Waar kijk je sport?',
    uitleg: 'Kies wat je hebt. Dan zie je bij elke wedstrijd of je hem live kunt volgen. Volg je een voetbalclub, kies die dan ook; dat mag ook later.',
    groepen: ['sportzenders', 'voetbal'],
    open: ['sportzenders-uitklap'],
    nodig: () => sportOpVandaag(),
  },
  {
    id: 'tv',
    titel: 'Wat zie je graag op tv?',
    uitleg: 'Daaruit kiest de app elke avond een paar tips voor Vanavond op de NPO. Kies er een paar, of ga gewoon verder.',
    groepen: ['tv'],
    open: ['tv-genres-uitklap'],
  },
  { id: 'klaar' },
];

// Of de sleutelstap meedoet: vastgelegd bij het begin, zodat de teller niet verspringt.
let welkomZonderSleutel = !leesSleutel();

function welkomGedaan() {
  return onthoud('welkomKlaar', '', ['ja']) === 'ja';
}
function welkomAfronden() {
  bewaarKeuze('welkomKlaar', 'ja');
  location.hash = '#/';
}
const welkomStappen = () => WELKOM_STAPPEN.filter((st) => !st.nodig || st.nodig());
// De eerstvolgende stap die nog nodig is (de sleutelstap valt weg zodra er een sleutel is).
function welkomVolgende(id) {
  const i = WELKOM_STAPPEN.findIndex((st) => st.id === id);
  const volgende = WELKOM_STAPPEN.slice(i + 1).find((st) => !st.nodig || st.nodig());
  return `#/welkom/${(volgende ?? WELKOM_STAPPEN.at(-1)).id}`;
}
function welkomTeller(id) {
  const stappen = welkomStappen().filter((st) => st.id !== 'klaar');
  const i = stappen.findIndex((st) => st.id === id);
  return `<p class="welkom-teller">Stap ${i + 1} van ${stappen.length}</p>
    <div class="welkom-voortgang"><span style="width:${Math.round(((i + 1) / stappen.length) * 100)}%"></span></div>`;
}

function toonWelkom(id) {
  const stap = WELKOM_STAPPEN.find((st) => st.id === id) ?? WELKOM_STAPPEN[0];
  if (stap.groepen) {
    toonInstellingen({ welkom: stap });
    return;
  }
  if (stap.eigen) {
    const kader = welkomKader(stap);
    app.replaceChildren(kader);
    stap.eigen(kader, schermNr);
    return;
  }
  if (stap.id === 'klaar') {
    const naam = leesNaam();
    app.innerHTML = `
      <section class="welkom-stap welkom-klaar">
        <h1>${naam ? `Klaar, ${veilig(naam)}!` : 'Klaar!'}</h1>
        <p>Kijkwijzer staat op jou ingesteld. Zoek je eerste film of serie, of kijk wat er vandaag is.</p>
        <p class="zacht">Alles wat je net koos, pas je later aan via het tandwiel rechtsboven.</p>
        <a class="hoofdknop" href="#/films" id="welkom-zoek">Zoek een film of serie</a>
        <button class="tweede-knop" id="welkom-vandaag">Naar Vandaag</button>
      </section>`;
    bewaarKeuze('welkomKlaar', 'ja');
    document.getElementById('welkom-vandaag').addEventListener('click', welkomAfronden);
    return;
  }
  welkomZonderSleutel = !leesSleutel();
  app.innerHTML = `
    <section class="welkom-stap">
      ${welkomTeller('naam')}
      <h1>Welkom bij Kijkwijzer</h1>
      <p>Je films, series en sport, rustig op één plek. In een paar korte stappen stel je de app op jou in.</p>
      <label class="veld">Hoe heet je?<input id="welkom-naam" value="${veilig(leesNaam())}" maxlength="40" placeholder="Je voornaam" autocomplete="given-name" enterkeyhint="next" /></label>
      <p class="zacht klein">Je naam blijft op deze telefoon. De app gebruikt hem alleen om je te begroeten.</p>
      <button class="hoofdknop" id="welkom-verder">Verder</button>
      <p class="welkom-onder"><a href="#/instellingen/backup">Ik heb een backup</a> · <button class="link-knop" id="welkom-later">Later instellen</button></p>
    </section>`;
  const veld = document.getElementById('welkom-naam');
  const verder = () => {
    bewaarKeuze('naam', veld.value.trim());
    location.hash = welkomVolgende('naam');
  };
  document.getElementById('welkom-verder').addEventListener('click', verder);
  veld.addEventListener('keydown', (e) => e.key === 'Enter' && verder());
  document.getElementById('welkom-later').addEventListener('click', welkomAfronden);
}

// Laat van Instellingen alleen de onderdelen van deze stap zien, met een kop en Verder.
function richtInAlsWelkomststap(stap) {
  const groepen = stap.groepen.map((g) => app.querySelector(`[data-groep="${g}"]`)).filter(Boolean);
  for (const details of app.querySelectorAll('[data-groep] details.uitklap')) {
    const hoort = groepen.some((g) => g.contains(details));
    if (hoort && (!stap.open || stap.open.includes(details.id))) details.open = true; // keuzes meteen zichtbaar
  }
  const kader = welkomKader(stap);
  kader.querySelector('.welkom-groepen').append(...groepen);
  app.replaceChildren(kader);
}

// Het kader van een stap: teller, vraag, uitleg, plek voor de keuzes, en Verder.
function welkomKader(stap) {
  const vorige = WELKOM_STAPPEN.slice(0, WELKOM_STAPPEN.findIndex((st) => st.id === stap.id)).filter((st) => !st.nodig || st.nodig()).at(-1);
  const kader = document.createElement('section');
  kader.className = `welkom-stap welkom-${stap.id}`;
  kader.innerHTML = `${welkomTeller(stap.id)}<h1>${veilig(stap.titel)}</h1><p>${stap.uitleg}</p><div class="kaart welkom-groepen"></div>
    <button class="hoofdknop" id="welkom-verder">Verder</button>
    <p class="welkom-onder">${vorige ? `<a href="#/welkom/${vorige.id}">‹ Vorige</a> · ` : ''}<button class="link-knop" id="welkom-later">Rest later instellen</button></p>
    <p class="zacht klein welkom-later-uitleg">Alles kun je later aanpassen via het tandwiel rechtsboven.</p>`;
  kader.querySelector('#welkom-verder').addEventListener('click', () => (location.hash = welkomVolgende(stap.id)));
  kader.querySelector('#welkom-later').addEventListener('click', welkomAfronden);
  return kader;
}

// Streamingdiensten als eenvoudige knoppen: aantikken is Abonnement.
async function welkomDiensten(kader, nr) {
  const vak = kader.querySelector('.welkom-groepen');
  vak.innerHTML = '<p class="zacht welkom-diensten">Diensten ophalen…</p>';
  let lijst;
  try {
    lijst = beperkDiensten(await haalAlleDiensten(), leesKeuzes());
  } catch {
    if (nr === schermNr) vak.innerHTML = '<p class="zacht welkom-diensten">Ophalen lukt nu niet. Ga gerust verder; je kiest ze later in Instellingen.</p>';
    return;
  }
  if (nr !== schermNr) return;
  const keuzes = leesKeuzes();
  vak.innerHTML = `<div class="keuzes welkom-diensten">${lijst
    .map((d) => {
      const aan = keuzeVan(keuzes, d.id) === 'abonnement';
      return `<button class="keuze${aan ? ' actief' : ''}" data-dienst="${d.id}" aria-pressed="${aan}">${veilig(d.naam)}</button>`;
    })
    .join('')}</div>`;
  vak.addEventListener('click', (e) => {
    const knop = e.target.closest('[data-dienst]');
    if (!knop) return;
    const aan = !knop.classList.contains('actief');
    knop.classList.toggle('actief', aan);
    knop.setAttribute('aria-pressed', String(aan));
    zetKeuze(Number(knop.dataset.dienst), aan ? 'abonnement' : 'tonen');
  });
}

// Eén vraag: ja of nee. Bij nee slaat de app de sportvragen over.
function welkomSportVraag(kader) {
  kader.querySelector('.welkom-groepen').outerHTML = `
    <div class="welkom-antwoord">
      <button class="hoofdknop" data-antwoord="aan">Ja, graag</button>
      <button class="tweede-knop" data-antwoord="uit">Nee, niet zo</button>
    </div>`;
  kader.querySelector('#welkom-verder').remove();
  kader.querySelector('.welkom-antwoord').addEventListener('click', (e) => {
    const knop = e.target.closest('[data-antwoord]');
    if (!knop) return;
    bewaarKeuze('vandaagSport', knop.dataset.antwoord);
    location.hash = welkomVolgende('sport');
  });
}

// --- Schermen ---

async function route() {
  schermNr += 1;
  // Een notitie die nog niet bewaard is, eerst opslaan.
  if (toonTitel.bewaarOpenstaand) {
    await toonTitel.bewaarOpenstaand();
    toonTitel.bewaarOpenstaand = null;
  }
  window.scrollTo(0, 0);
  const titelId = location.hash.match(/^#\/titel\/(\d+)(\/sterren)?$/);
  const acteurId = location.hash.match(/^#\/acteur\/(\d+)$/);
  const welkomStap = location.hash.match(/^#\/welkom(?:\/(\w+))?$/);
  document.body.classList.toggle('welkom-modus', Boolean(welkomStap));
  // Oude adressen (van voor de nieuwe indeling) komen uit bij Mijn lijst.
  if (location.hash === '#/zoek') history.replaceState(null, '', '#/films');
  const plek =
    { '#/films': 'films', '#/ontdekken': 'ontdekken', '#/week': 'week', '#/sport': 'sport', '#/instellingen': 'instellingen', '#/instellingen/backup': 'instellingen' }[location.hash] || (titelId || acteurId ? 'films' : 'vandaag');
  document.querySelectorAll('.balk a').forEach((a) => a.classList.toggle('actief', a.dataset.plek === (plek === 'ontdekken' ? 'films' : plek)));
  if (welkomStap) toonWelkom(welkomStap[1] ?? 'naam');
  else if (plek === 'instellingen') toonInstellingen().then(() => location.hash === '#/instellingen/backup' && document.getElementById('backup-blok')?.scrollIntoView());
  else if (plek === 'sport') toonSport();
  else if (plek === 'week') toonWeek();
  else if (titelId) toonTitel(Number(titelId[1]), { naarSterren: Boolean(titelId[2]) });
  else if (acteurId) toonActeur(Number(acteurId[1]));
  else if (plek === 'films') toonFilms();
  else if (plek === 'ontdekken') toonOntdekScherm();
  else toonVandaag();
}

// Gaat de app naar de achtergrond, dan een half getypte notitie meteen bewaren.
const bewaarNu = () => toonTitel.bewaarOpenstaand?.();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') bewaarNu();
});
window.addEventListener('pagehide', bewaarNu);

vraagBlijvendeOpslag();
ruimOudeDagenOp();

// Titels van vóór stap 11 hebben nog geen acteurs (en trailer). Die vult de app op de
// achtergrond aan, één voor één, zodat zoeken op acteur voor je hele lijst werkt.
// Alleen deze gegevens worden toegevoegd; je eigen status, sterren en notities blijven zoals ze zijn.
async function vulActeursAan() {
  if (!leesSleutel()) return;
  // Ook titels waarbij de acteurs eerder leeg bleven (hooguit één keer per dag opnieuw).
  const zonder = (await alleTitels()).filter((t) => !t.extraOp || (!t.acteurs?.length && t.extraOp !== vandaag()));
  for (const t of zonder.slice(0, 100)) {
    try {
      await titelBijwerken(t.id, { ...(await haalTrailerEnActeurs(t.soort, t.tmdbId)), extraOp: vandaag() });
    } catch (fout) {
      // Kent TMDB de titel niet meer: niet steeds opnieuw proberen, door met de volgende.
      if (fout?.name === 'NietGevonden') await titelBijwerken(t.id, { extraOp: vandaag() });
      else return; // Geen internet of sleutel geweigerd: de volgende keer verder.
    }
    await new Promise((klaar) => setTimeout(klaar, 300)); // rustig aan richting TMDB
  }
}
setTimeout(async () => {
  await vulActeursAan();
  await controleerNieuw();
}, 3000);
// Bekerwedstrijden en dergelijke van je clubs: los daarvan, want TheSportsDB wil rustig gevraagd worden.
// Ook als de app terug in beeld komt (op de iPhone start hij dan niet opnieuw op).
setTimeout(werkExtraWedstrijdenBij, 1500);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && werkExtraWedstrijdenBij());

// Op de iPhone blijft de app vaak dagen open in de achtergrond. Komt hij terug op een nieuwe dag,
// dan Vandaag, Deze week en Sport opnieuw opbouwen en de dagelijkse controles opnieuw doen.
let dagBijOpenen = vandaag();
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || vandaag() === dagBijOpenen) return;
  dagBijOpenen = vandaag();
  ruimOudeDagenOp();
  if (['', '#/', '#/week', '#/sport'].includes(location.hash)) route();
  await vulActeursAan();
  await controleerNieuw();
});

window.addEventListener('hashchange', () => {
  binnenApp = true;
  route();
});
route();
