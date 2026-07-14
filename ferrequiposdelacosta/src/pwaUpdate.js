import store from "./Store/Store";

let applyUpdateFn = null;
let updatePending = false;

const RELOAD_COOLDOWN_MS = 10000;
const LAST_RELOAD_KEY = "pwaLastReload";

function recienRecargada() {
  const ultima = Number(sessionStorage.getItem(LAST_RELOAD_KEY) || 0);
  return Date.now() - ultima < RELOAD_COOLDOWN_MS;
}

function recargarAhora() {
  sessionStorage.setItem(LAST_RELOAD_KEY, String(Date.now()));
  applyUpdateFn(true);
}

export function registerUpdateHandler(fn) {
  applyUpdateFn = fn;
}

export function markUpdatePending() {
  updatePending = true;
}

export function applyUpdateNow() {
  if (!applyUpdateFn || recienRecargada()) return;
  recargarAhora();
}

export function applyPendingUpdate() {
  if (!updatePending || !applyUpdateFn || recienRecargada()) return;
  updatePending = false;
  recargarAhora();
}

// se usa en puntos de corte naturales (ej. justo al iniciar sesión) para
// aplicar de una una actualización que ya estaba esperando, sin que el
// usuario tenga que hacer clic en el aviso ni en el ícono de la navbar
export function applyIfAvailable() {
  if (store.getState().pwaUpdate?.updateAvailable) {
    applyUpdateNow();
  }
}
