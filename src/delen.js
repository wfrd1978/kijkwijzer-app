// Iemand uitnodigen om samen een film of serie te kijken, via het deelmenu
// (WhatsApp, Berichten, mail).

// Korter maken tot hele zinnen, zodat een lange tekst niet midden in een zin stopt.
export function inkorten(tekst, max) {
  const schoon = (tekst || '').replace(/\s+/g, ' ').trim();
  if (schoon.length <= max) return schoon;
  const stuk = schoon.slice(0, max);
  const einde = Math.max(stuk.lastIndexOf('. '), stuk.lastIndexOf('! '), stuk.lastIndexOf('? '));
  return einde > max / 2 ? stuk.slice(0, einde + 1) : `${stuk.trimEnd()}…`;
}

// 'vrijdag 30 oktober om 20:30', of zonder tijd 'vrijdag 30 oktober'.
export function wanneerTekst(datum, tijd) {
  const [j, m, d] = String(datum || '').split('-').map(Number);
  if (!j || !m || !d) return '';
  const dag = new Date(j, m - 1, d).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  return /^\d{2}:\d{2}$/.test(tijd || '') ? `${dag} om ${tijd}` : dag;
}

const namen = (lijst) => {
  const n = lijst.map((d) => d.naam);
  return n.length > 1 ? `${n.slice(0, -1).join(', ')} en ${n.at(-1)}` : n[0];
};

// Waar het te zien is: eerst je eigen abonnementen, anders de andere diensten die je toont.
export function waarTekst(v) {
  if (!v) return '';
  if (v.bijJou.length) return `Te zien op ${namen(v.bijJou)}.`;
  const stream = [...v.abonnement, ...v.gratis];
  if (stream.length) return `Te zien op ${namen(stream.slice(0, 3))}.`;
  if (v.huren.length) return `Te huur bij ${namen(v.huren.slice(0, 3))}.`;
  return '';
}

export function tmdbLink(titel) {
  return `https://www.themoviedb.org/${titel.soort === 'film' ? 'movie' : 'tv'}/${titel.tmdbId}?language=nl-NL`;
}

export function uitnodigingTekst(titel, { datum = '', tijd = '', verdeeld = null } = {}) {
  const wanneer = wanneerTekst(datum, tijd);
  const soort = titel.soort === 'film' ? 'film' : 'serie';
  const blokken = [`Zin om samen ${titel.titel} te kijken?${wanneer ? ` Bijvoorbeeld ${wanneer}?` : ''}`];
  blokken.push([`${soort === 'film' ? 'Film' : 'Serie'}${titel.jaar ? ` uit ${titel.jaar}` : ''}.`, waarTekst(verdeeld)].filter(Boolean).join(' '));
  const over = inkorten(titel.beschrijving, 280);
  if (over) blokken.push(`Waar het over gaat:\n${over}`);
  blokken.push(`Meer over deze ${soort}: ${tmdbLink(titel)}`);
  return blokken.join('\n\n');
}

// Geeft 'gedeeld', 'gekopieerd' of 'geannuleerd'.
export async function deel(tekst) {
  if (navigator.share) {
    try {
      await navigator.share({ text: tekst });
      return 'gedeeld';
    } catch (e) {
      if (e.name === 'AbortError') return 'geannuleerd';
    }
  }
  await navigator.clipboard.writeText(tekst);
  return 'gekopieerd';
}
