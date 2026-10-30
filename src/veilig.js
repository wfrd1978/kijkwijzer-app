// Hulpjes om gegevens van buiten (TMDB, backups) veilig in de pagina te zetten.

// Maakt tekst veilig om in de pagina te zetten, ook binnen aanhalingstekens van een attribuut.
export function veilig(tekst) {
  return String(tekst ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Alleen gewone webadressen, plaatjes op het toestel en ingebakken plaatjes als poster.
// Het adres wordt door de browser zelf ontleed en opnieuw opgebouwd, zodat er geen
// aanhalingstekens of haakjes in blijven staan die uit een attribuut kunnen breken.
export function veiligeUrl(url) {
  const u = String(url ?? '');
  if (!/^(https:\/\/|blob:|data:image\/)/i.test(u)) return '';
  try {
    return veilig(new URL(u).href);
  } catch {
    return '';
  }
}
