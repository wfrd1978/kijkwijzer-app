// De TMDB-sleutel staat alleen op deze telefoon, nooit in de code.
// TMDB geeft twee soorten: een korte API Key (32 tekens) en een lange Read Access Token.
// Beide werken; de app herkent zelf welke je plakt.

const OPSLAG = 'tmdb-sleutel';

export function soortSleutel(tekst) {
  const s = String(tekst ?? '').trim();
  if (/^[0-9a-f]{32}$/i.test(s)) return 'key';
  if (/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(s)) return 'token';
  return null;
}

export function leesSleutel() {
  try {
    return localStorage.getItem(OPSLAG) || '';
  } catch {
    return '';
  }
}

export function bewaarSleutel(tekst) {
  localStorage.setItem(OPSLAG, String(tekst).trim());
}

export function wisSleutel() {
  localStorage.removeItem(OPSLAG);
}
