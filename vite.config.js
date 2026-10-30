import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// De versie is het moment van de laatste wijziging in de code, niet van het bouwen: zo levert
// het dagelijks bijwerken van het voetbalschema geen melding 'Nieuwe versie' op.
function laatsteWijziging() {
  try {
    return new Date(execSync('git log -1 --format=%cI', { encoding: 'utf8' }).trim());
  } catch {
    return new Date();
  }
}

// De app draait op https://wfrd1978.github.io/kijkwijzer-app/
export default defineConfig({
  base: '/kijkwijzer-app/',
  // Zodat je in de app ziet welke versie je hebt.
  define: {
    __VERSIE__: JSON.stringify(
      laatsteWijziging().toLocaleString('nl-NL', {
        timeZone: 'Europe/Amsterdam',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    ),
  },
});
