// Langebaanschaatsen: wereldbekers en kampioenschappen, met de hand bijgewerkt per seizoen.
// Bron: ISU Speed Skating Event Calendar 2026/27 (isu-skating.com). Zender: de NOS heeft de rechten
// tot en met seizoen 2026/2027 (NPO 1 en NOS Live). Gecontroleerd november 2026.
const NOS = [{ naam: 'NOS', zeker: true }];

export const SCHAATSEN = {
  seizoen: '2026-2027',
  gecontroleerd: 'november 2026',
  bron: 'ISU-kalender langebaan 2026-2027',
  koersen: [
    { naam: 'Wereldbeker Beijing', van: '2026-11-13', tot: '2026-11-15', soort: 'Wereldbeker 1' },
    { naam: 'Wereldbeker Obihiro', van: '2026-11-20', tot: '2026-11-22', soort: 'Wereldbeker 2' },
    { naam: 'Wereldbeker Heerenveen', van: '2026-12-04', tot: '2026-12-06', soort: 'Wereldbeker 3' },
    { naam: 'Wereldbeker Stavanger', van: '2026-12-11', tot: '2026-12-13', soort: 'Wereldbeker 4' },
    { naam: 'EK schaatsen Heerenveen', van: '2027-01-08', tot: '2027-01-10', soort: 'EK' },
    { naam: 'Wereldbeker Salt Lake City', van: '2027-01-29', tot: '2027-01-31', soort: 'Wereldbeker 5' },
    { naam: 'Wereldbeker Calgary', van: '2027-02-05', tot: '2027-02-07', soort: 'Wereldbeker 6' },
    { naam: 'WK schaatsen Beijing', van: '2027-02-25', tot: '2027-02-28', soort: 'WK' },
  ].map((k) => ({ ...k, zenders: NOS })),
};

// Schaatsen volgen: aan of uit (standaard aan).
export function schaatsenVolgen() {
  try {
    return localStorage.getItem('schaatsen') !== 'uit';
  } catch {
    return true;
  }
}
