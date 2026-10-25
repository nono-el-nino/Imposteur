// Independent, continuous waves: no repeating path or stop at keyframe boundaries.
export function createHaloProfile(random = Math.random) {
  return {
    phase: Array.from({ length: 6 }, () => random() * Math.PI * 2),
    speed: 0.92 + random() * 0.24,
  };
}
export function haloPosition(seconds, profile) {
  const t = seconds * profile.speed;
  const p = profile.phase;
  return {
    x:
      34 *
      (0.62 * Math.sin(t * 0.23 + p[0]) +
        0.26 * Math.sin(t * 0.39 + p[1]) +
        0.12 * Math.sin(t * 0.67 + p[2])),
    y:
      33 *
      (0.65 * Math.sin(t * 0.18 + p[3]) +
        0.23 * Math.sin(t * 0.34 + p[4]) +
        0.12 * Math.sin(t * 0.53 + p[5])),
    scale: 1 + 0.08 * Math.sin(t * 0.13 + p[0]),
  };
}
export function startHaloMotion(root) {
  const halos = [...root.querySelectorAll(".halo")];
  const profiles = halos.map(() => createHaloProfile());
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let frame = null;
  let last = -Infinity;
  function pause() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  }
  function tick(now) {
    if (now - last >= 32) {
      last = now;
      halos.forEach((halo, i) => {
        const { x, y, scale } = haloPosition(now / 1000, profiles[i]);
        halo.style.transform = `translate(${x.toFixed(3)}vw, ${y.toFixed(3)}vh) scale(${scale.toFixed(3)})`;
      });
    }
    frame = requestAnimationFrame(tick);
  }
  function resume() {
    pause();
    if (reduced.matches) {
      halos.forEach((halo, i) => {
        halo.style.transform = i
          ? "translate(24vw, 23vh)"
          : "translate(-23vw, -21vh)";
      });
    } else if (!document.hidden) {
      last = -Infinity;
      frame = requestAnimationFrame(tick);
    }
  }
  reduced.addEventListener("change", resume);
  document.addEventListener("visibilitychange", resume);
  window.addEventListener("pagehide", pause);
  window.addEventListener("pageshow", resume);
  resume();
  return () => {
    pause();
    reduced.removeEventListener("change", resume);
    document.removeEventListener("visibilitychange", resume);
    window.removeEventListener("pagehide", pause);
    window.removeEventListener("pageshow", resume);
  };
}
