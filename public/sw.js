// Service worker: zorgt dat de app snel opent, ook met slecht of geen internet.
// Op hetzelfde webadres staat nog een Kijkwijzer-app (/kijkwijzer/), met een eigen opslag.
// Deze service worker gebruikt eigen namen en ruimt alleen zijn eigen oude opslag op.
const CACHE = 'kijkwijzer-app-v1';
const EIGEN = /^kijkwijzer-app-v\d+$/;
// Posters van TMDB apart bewaren, zodat je lijst ook zonder internet plaatjes heeft.
const POSTERS = 'posters-app-v1';
const POSTER_ADRES = 'image.tmdb.org';
const MAX_POSTERS = 600;
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
  const teLaat = new Promise((klaar) => setTimeout(() => klaar(bewaard), WACHT_OP_NETWERK));
  return Promise.race([netwerk.then((a) => (a.ok ? a : bewaard)).catch(() => bewaard), teLaat]);
}

// Is er genoeg ruimte? Je lijst zelf gaat altijd voor: bij twijfel geen poster bewaren.
async function ruimteVoorPosters(cache) {
  try {
    const { usage, quota } = await navigator.storage.estimate();
    if (usage > quota * 0.5) return false;
  } catch {
    // Geen schatting mogelijk: dan alleen de grens op het aantal posters.
  }
  return (await cache.keys()).length < MAX_POSTERS;
}

async function posterEerst(request) {
  const cache = await caches.open(POSTERS);
  const bewaard = await cache.match(request);
  if (bewaard) return bewaard;
  const antwoord = await fetch(request);
  // Plaatjes van een andere site zijn 'gesloten' (type opaque): wel te bewaren en te tonen.
  if ((antwoord.ok || antwoord.type === 'opaque') && (await ruimteVoorPosters(cache))) {
    cache.put(request, antwoord.clone()).catch(() => {});
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
