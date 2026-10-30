// Deze app staat op hetzelfde webadres (wfrd1978.github.io) als een andere Kijkwijzer-app.
// Een browser deelt de opslag per webadres. Daarom heeft deze app een eigen database en een
// voorvoegsel voor alles wat hij op de telefoon bewaart: zo raken de lijsten en instellingen
// van de twee apps nooit door elkaar, ook niet op dezelfde telefoon.
// Dit bestand moet als eerste worden geladen (zie het begin van src/main.js).
export const DATABASE = 'kijkwijzer-app';
const VOORVOEGSEL = 'app:';

if (typeof Storage !== 'undefined') {
  const { getItem, setItem, removeItem } = Storage.prototype;
  Storage.prototype.getItem = function (k) {
    return getItem.call(this, VOORVOEGSEL + k);
  };
  Storage.prototype.setItem = function (k, v) {
    return setItem.call(this, VOORVOEGSEL + k, v);
  };
  Storage.prototype.removeItem = function (k) {
    return removeItem.call(this, VOORVOEGSEL + k);
  };
}

// De sleutels die deze app bewaart (zonder voorvoegsel), om op te ruimen.
export function eigenSleutels() {
  try {
    return Object.keys(localStorage).filter((k) => k.startsWith(VOORVOEGSEL)).map((k) => k.slice(VOORVOEGSEL.length));
  } catch {
    return [];
  }
}
