// Service worker: zorgt dat de app snel opent, ook met slecht of geen internet.
// Op hetzelfde webadres staat nog een Kijkwijzer-app (/kijkwijzer/), met een eigen opslag.
// Deze service worker gebruikt eigen namen en ruimt alleen zijn eigen oude opslag op.
const CACHE = 'kijkwijzer-app-v1';
const EIGEN = /^kijkwijzer-app-v\d+$/;
// Posters van TMDB apart bewaren, zodat je lijst ook zonder internet plaatjes heeft.
// v2 (november 2026): posters 'open' ophalen (TMDB staat dat toe). Een 'gesloten' plaatje telt in de
// browser voor vele megabytes, waardoor de opslag na enkele tientallen posters vol leek en de app
// ze steeds opnieuw ophaalde. De oude opslag (v1) wordt bij het bijwerken opgeruimd.
const POSTERS = 'posters-app-v2';
const POSTER_ADRES = 'image.tmdb.org';
const MAX_POSTERS = 1500; // zo'n 15 kB per poster: samen hooguit een paar tientallen MB
const WACHT_OP_NETWERK = 3000;
// Bestanden in assets/ hebben een unieke naam per versie; de oudste ruimen we op.
const MAX_BESTANDEN = 40;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      // Alleen oudere opslag van deze versie opruimen (en oude posteropslag).
      .then((keys) => Promise.all(keys.filter((k) => (EIGEN.test(k) && k !== CACHE) || (/^posters-app-v\d+$/.test(k) && k !== POSTERS)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function ruimOudeBestandenOp(cache) {
  const bestanden = (await cache.keys()).filter((r) => new URL(r.url).pathname.includes('/assets/'));
  for (const oud of bestanden.slice(0, Math.max(0, bestanden.length - MAX_BESTANDEN))) await cache.delete(oud);
}

// Bestanden in assets/ veranderen nooit: eerst uit de opslag.
async function opslagEerst(request) {
  const bewaard = await caches.match(request);
  if (bewaard) return bewaard;
  const antwoord = await fetch(request);
  if (antwoord.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, antwoord.clone());
    ruimOudeBestandenOp(cache).catch(() => {});
  }
  return antwoord;
}

// De rest (de pagina zelf): eerst internet, zodat je de nieuwste versie krijgt.
// Duurt dat langer dan 3 seconden of is er geen internet, dan de bewaarde versie.
async function netwerkEerst(request) {
  const cache = await caches.open(CACHE);
  const netwerk = fetch(request, { cache: 'no-cache' }).then((antwoord) => {
    if (antwoord.ok) cache.put(request, antwoord.clone());
    return antwoord;
  });
  const bewaard = (await cache.match(request)) || (request.mode === 'navigate' ? await cache.match('./') : undefined);
  if (!bewaard) return netwerk;
  // Alleen het openen van de app valt na 3 seconden terug op de bewaarde pagina. De controle op een
  // nieuwe versie wacht op internet; anders ziet die op een trage verbinding de nieuwe versie nooit.
  if (request.mode !== 'navigate') return netwerk.catch(() => bewaard);
  const teLaat = new Promise((klaar) => setTimeout(() => klaar(bewaard), WACHT_OP_NETWERK));
  return Promise.race([netwerk.then((a) => (a.ok ? a : bewaard)).catch(() => bewaard), teLaat]);
}

// Is er genoeg ruimte? Je lijst zelf gaat altijd voor: bij twijfel geen poster bewaren.
async function ruimteVoorPosters() {
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return usage < quota * 0.5;
  } catch {
    return true; // geen schatting mogelijk: dan alleen de grens op het aantal posters
  }
}

// Vol? Dan de oudste posters weg (de opslag onthoudt de volgorde van bewaren).
async function maakPlek(cache) {
  const alle = await cache.keys();
  for (const oud of alle.slice(0, Math.max(0, alle.length - MAX_POSTERS + 50))) await cache.delete(oud);
}

async function posterEerst(request) {
  const cache = await caches.open(POSTERS);
  const bewaard = await cache.match(request.url);
  if (bewaard) return bewaard;
  let antwoord;
  try {
    // Open ophalen, zodat de poster met zijn echte grootte bewaard kan worden.
    antwoord = await fetch(request.url, { mode: 'cors', credentials: 'omit' });
  } catch {
    return fetch(request); // lukt open niet: gewoon tonen, niet bewaren
  }
  if (antwoord.ok && (await ruimteVoorPosters())) {
    cache
      .put(request.url, antwoord.clone())
      .then(() => maakPlek(cache))
      .catch(() => {});
  }
  return antwoord;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (request.destination === 'image' && url.hostname === POSTER_ADRES) {
    event.respondWith(posterEerst(request));
    return;
  }
  if (url.origin !== self.location.origin) return;
  // De dagelijkse schema's (voetbal, NPO, ESPN) bewaart de app zelf; niet ook nog hier.
  if (url.pathname.endsWith('.json') && !url.pathname.endsWith('manifest.webmanifest')) return;
  event.respondWith(url.pathname.includes('/assets/') ? opslagEerst(request) : netwerkEerst(request));
});
