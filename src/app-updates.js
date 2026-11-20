// A newly activated worker controls the next navigation, not the current page's JS.
// Refresh only on the idle home screen; never replace an in-progress game.
export function watchAppUpdates(serviceWorkers, isIdle, reload) {
  let controlled = Boolean(serviceWorkers.controller);
  let pending = false;
  let reloading = false;
  function applyWhenIdle() {
    if (pending && !reloading && isIdle()) {
      reloading = true;
      reload();
    }
  }
  function controllerChanged() {
    if (!controlled) {
      controlled = true; // First offline installation already has the current UI.
      return;
    }
    pending = true;
    applyWhenIdle();
  }
  serviceWorkers.addEventListener("controllerchange", controllerChanged);
  return {
    applyWhenIdle,
    dispose: () =>
      serviceWorkers.removeEventListener("controllerchange", controllerChanged),
  };
}
