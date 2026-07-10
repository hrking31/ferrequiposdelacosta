let applyUpdateFn = null;
let updatePending = false;

export function registerUpdateHandler(fn) {
  applyUpdateFn = fn;
}

export function markUpdatePending() {
  updatePending = true;
}

export function applyPendingUpdate() {
  if (updatePending && applyUpdateFn) {
    updatePending = false;
    applyUpdateFn(true);
  }
}
