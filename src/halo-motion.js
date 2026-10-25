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
// Four smooth cubic arcs retain a connecting waist, even at maximum stretch.
export function haloForm(seconds, profile) {
  const t = seconds * profile.speed;
  const morph = ((1 + Math.sin(t * 0.095 + profile.phase[2])) / 2) ** 1.3;
  const width = 128 + 48 * morph;
  const height = 128 * (1 - 0.05 * morph);
  const neck = height * (1 - 0.72 * morph);
  const shoulder = height * (0.552 + 1.12 * morph);
  const control = width * 0.552;
  const f = (value) => value.toFixed(3);
  const [w, n, s, c] = [width, neck, shoulder, control].map(f);
  return {
    path: `M-${w} 0C-${w} -${s} -${c} -${n} 0 -${n}C${c} -${n} ${w} -${s} ${w} 0C${w} ${s} ${c} ${n} 0 ${n}C-${c} ${n} -${w} ${s} -${w} 0Z`,
    rotation: 48 * Math.sin(t * 0.063 + profile.phase[4]),
    morph,
    neck,
  };
}
export function startHaloMotion(root) {
  const halos = [...root.querySelectorAll(".halo")];
  const profiles = halos.map(() => createHaloProfile());
  const forms = halos.map((halo) => halo.querySelector(".halo-form"));
  const paths = forms.map((form) => form.querySelector("path"));
  let lastShape = -Infinity;
  function shape(now) {
    halos.forEach((_, i) => {
      const form = haloForm(now / 1000, profiles[i]);
      paths[i].setAttribute("d", form.path);
      forms[i].style.transform = `rotate(${form.rotation.toFixed(3)}deg)`;
    });
  }
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
    // Geometry changes much more slowly than travel; repaint it at most 10 fps.
    if (now - lastShape >= 100) {
      lastShape = now;
      shape(now);
    }
    frame = requestAnimationFrame(tick);
  }
  function resume() {
    pause();
    if (reduced.matches) {
      shape(0);
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
