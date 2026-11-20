import { test } from "node:test";
import assert from "node:assert/strict";
import { watchAppUpdates } from "../src/app-updates.js";
function workers(controller) {
  const events = new EventTarget();
  events.controller = controller;
  return events;
}
test("first offline installation does not restart the current page", () => {
  const sw = workers(null);
  let reloads = 0;
  const watcher = watchAppUpdates(
    sw,
    () => true,
    () => reloads++,
  );
  sw.controller = {};
  sw.dispatchEvent(new Event("controllerchange"));
  watcher.applyWhenIdle();
  assert.equal(reloads, 0);
  watcher.dispose();
});
test("update refreshes the idle home once", () => {
  const sw = workers({});
  let reloads = 0;
  const watcher = watchAppUpdates(
    sw,
    () => true,
    () => reloads++,
  );
  sw.dispatchEvent(new Event("controllerchange"));
  sw.dispatchEvent(new Event("controllerchange"));
  watcher.applyWhenIdle();
  assert.equal(reloads, 1);
  watcher.dispose();
});
test("update is deferred throughout a game until home is idle", () => {
  const sw = workers({});
  let idle = false,
    reloads = 0;
  const watcher = watchAppUpdates(
    sw,
    () => idle,
    () => reloads++,
  );
  sw.dispatchEvent(new Event("controllerchange"));
  watcher.applyWhenIdle();
  assert.equal(reloads, 0);
  idle = true;
  watcher.applyWhenIdle();
  assert.equal(reloads, 1);
  watcher.dispose();
});
