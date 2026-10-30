// De TMDB-sleutel. Standaard gebruikt de app de gedeelde sleutel die de eigenaar als GitHub-geheim
// (TMDB_SLEUTEL) heeft opgeslagen; GitHub zet die er bij het online zetten in (VITE_TMDB_STANDAARD).
// Hij staat dus niet in de code, maar wel in de gebouwde app. Wie wil, kan een eigen sleutel plakken;
// die staat alleen op de eigen telefoon en gaat voor.
// TMDB geeft twee soorten: een korte API Key (32 tekens) en een lange Read Access Token.
// Beide werken; de app herkent zelf welke je plakt.

const OPSLAG = 'tmdb-sleutel';
const STANDAARD = String(import.meta.env.VITE_TMDB_STANDAARD ?? '').trim();

export function soortSleutel(tekst) {
  const s = String(tekst ?? '').trim();
  if (/^[0-9a-f]{32}$/i.test(s)) return 'key';
  if (/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(s)) return 'token';
  return null;
}

// Is er een gedeelde sleutel meegegeven bij het bouwen?
export const heeftGedeeldeSleutel = () => Boolean(soortSleutel(STANDAARD));

// Alleen de sleutel die iemand zelf op deze telefoon heeft geplakt.
export function eigenSleutel() {
  try {
    return localStorage.getItem(OPSLAG) || '';
  } catch {
    return '';
  }
}

// De sleutel die de app gebruikt: je eigen sleutel, anders de gedeelde.
export function leesSleutel() {
  return eigenSleutel() || (heeftGedeeldeSleutel() ? STANDAARD : '');
}

export function bewaarSleutel(tekst) {
  localStorage.setItem(OPSLAG, String(tekst).trim());
}

export function wisSleutel() {
  localStorage.removeItem(OPSLAG);
}
