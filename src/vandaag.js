// Logica voor het scherm Vandaag: de dagen van deze week.

// De zeven dagen ('jjjj-mm-dd') van maandag tot en met zondag van de week waarin 'dag' valt.
export function weekDagen(dag) {
  const d = new Date(`${dag}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d);
    x.setUTCDate(d.getUTCDate() + i);
    return x.toISOString().slice(0, 10);
  });
}

// 'Maandag 26 okt – zondag 1 nov'
export function weekTekst(dagen) {
  const opmaak = (dag, weekdag) =>
    new Date(`${dag}T12:00:00Z`).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' }).replace(/^\w/, (c) => (weekdag ? c.toUpperCase() : c));
  return `${opmaak(dagen[0], true)} – ${opmaak(dagen[6], false)}`;
}
