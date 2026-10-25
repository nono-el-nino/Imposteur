import { test } from "node:test";
import assert from "node:assert/strict";
import { createHaloProfile, haloPosition } from "../src/halo-motion.js";
test("organic movement stays bounded and continuous with varying speed", () => {
  const profile = createHaloProfile(() => 0.37);
  let previous = haloPosition(0, profile);
  const speeds = [];
  for (let t = 0.1; t < 180; t += 0.1) {
    const next = haloPosition(t, profile);
    const speed = Math.hypot(next.x - previous.x, next.y - previous.y) / 0.1;
    assert.ok(Math.abs(next.x) <= 34 && Math.abs(next.y) <= 33);
    assert.ok(next.scale >= 0.92 && next.scale <= 1.08);
    assert.ok(speed < 22, "no abrupt jumps");
    speeds.push(speed);
    previous = next;
  }
  assert.ok(
    Math.max(...speeds) > Math.min(...speeds) * 3,
    "speed naturally accelerates and slows",
  );
});
test("different profiles follow independent paths", () => {
  assert.notDeepEqual(
    haloPosition(
      10,
      createHaloProfile(() => 0.1),
    ),
    haloPosition(
      10,
      createHaloProfile(() => 0.8),
    ),
  );
});
