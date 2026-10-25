export const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const PillButton = (label, action, kind = "primary", extra = "") =>
  `<button class="pill ${kind}" data-action="${action}" ${extra.includes("type=") ? "" : 'type="button"'} ${extra}>${label}</button>`;
export const GlassSurface = (content, classes = "") =>
  `<section class="glass ${classes}">${content}</section>`;
export const Halo = () =>
  '<div class="halo-field" aria-hidden="true"><div class="halo"></div><div class="halo second"></div></div>';
export const PlayerChip = (p, i, selected) =>
  `<button class="player-chip glass ${selected === p.id ? "selected" : ""}" data-vote="${p.id}" aria-pressed="${selected === p.id}"><span class="mono">${String(i + 1).padStart(2, "0")}</span><strong>${escape(p.name)}</strong><span aria-hidden="true">${selected === p.id ? "✓" : ""}</span></button>`;
export function letters(text) {
  const chars = Array.from(text);
  return chars
    .map(
      (c, i) =>
        `<span style="--delay:${Math.abs(i - (chars.length - 1) / 2) * 35}ms;--i:${i}">${c === " " ? "&nbsp;" : escape(c)}</span>`,
    )
    .join("");
}
// Keep each word intact; wrapping is only allowed at actual spaces.
export function secretLetters(text) {
  let offset = 0;
  const total = Array.from(text).length;
  return text
    .split(/(\s+)/u)
    .map((part) => {
      if (/^\s+$/u.test(part)) {
        offset += part.length;
        return " ";
      }
      const glyphs = Array.from(part)
        .map((c) => {
          const i = offset++;
          return `<span class="glyph" style="--delay:${Math.abs(i - (total - 1) / 2) * 35}ms">${escape(c)}</span>`;
        })
        .join("");
      return `<span class="word-unit">${glyphs}</span>`;
    })
    .join("");
}
export function fitSecretWord(word) {
  if (word.classList.contains("white-word") || !word.clientWidth) return;
  word.style.fontSize = "";
  const size = parseFloat(getComputedStyle(word).fontSize);
  const widest = Math.max(
    ...Array.from(word.querySelectorAll(".word-unit"), (el) => el.offsetWidth),
  );
  if (widest > word.clientWidth - 4)
    word.style.fontSize = `${Math.floor((size * (word.clientWidth - 4)) / widest)}px`;
}
export class FocusTransition {
  constructor(root) {
    this.root = root;
    this.key = null;
  }
  show(html, key) {
    const changed = key !== this.key;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const previous = this.root.querySelector("main");
    // Never snapshot or retain a secret screen during a transition.
    const old =
      changed && previous && !previous.classList.contains("secret-screen")
        ? previous.cloneNode(true)
        : null;
    const rect = previous?.getBoundingClientRect();
    this.root.innerHTML = html;
    if (changed) {
      if (old) {
        old.inert = true;
        old.setAttribute("aria-hidden", "true");
        old.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
        old.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;min-height:0;margin:0;z-index:3;pointer-events:none`;
        this.root.append(old);
        const exit = old.animate(
          reduced
            ? [{ opacity: 1 }, { opacity: 0 }]
            : [
                { filter: "blur(0)", transform: "scale(1)", opacity: 1 },
                { filter: "blur(16px)", transform: "scale(.97)", opacity: 0 },
              ],
          {
            duration: 420,
            easing: "cubic-bezier(.2,.7,.2,1)",
            fill: "forwards",
          },
        );
        exit.finished.then(() => old.remove()).catch(() => old.remove());
      }
      this.root.querySelector("main").animate(
        reduced
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { filter: "blur(16px)", transform: "scale(1.03)", opacity: 0 },
              { filter: "blur(0)", transform: "scale(1)", opacity: 1 },
            ],
        {
          duration: 420,
          delay: old ? 300 : 0,
          easing: "cubic-bezier(.2,.7,.2,1)",
          fill: "backwards",
        },
      );
      window.scrollTo(0, 0);
      const h = this.root.querySelector("h1");
      if (h) {
        h.tabIndex = -1;
        h.focus({ preventScroll: true });
      }
    }
    this.key = key;
  }
}
export class HoldToReveal {
  constructor(root, { doubleTap, onRead }) {
    this.root = root;
    this.button = root.querySelector("[data-hold]");
    this.word = root.querySelector(".secret-word");
    this.onRead = onRead;
    this.resize = new ResizeObserver(() => fitSecretWord(this.word));
    this.resize.observe(this.word);
    fitSecretWord(this.word);
    document.fonts.ready.then(() => {
      if (this.word.isConnected) fitSecretWord(this.word);
    });
    this.doubleTap = doubleTap;
    this.lastTap = -1000;
    this.active = false;
    this.read = false;
    this.abort = new AbortController();
    const options = { signal: this.abort.signal };
    this.button.addEventListener(
      "pointerdown",
      (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        this.button.focus({ preventScroll: true });
        this.button.setPointerCapture(e.pointerId);
        if (!doubleTap) this.begin();
      },
      options,
    );
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      this.button.addEventListener(
        event,
        () => {
          if (doubleTap && event === "pointerup") {
            const now = performance.now();
            if (this.active) {
              this.close();
              this.lastTap = -1000;
            } else if (now - this.lastTap < 400) {
              this.begin();
              this.lastTap = -1000;
            } else this.lastTap = now;
          } else if (!doubleTap) this.close();
        },
        options,
      );
    this.button.addEventListener(
      "keydown",
      (e) => {
        if ([" ", "Enter"].includes(e.key) && !e.repeat) {
          e.preventDefault();
          if (doubleTap) {
            this.active ? this.close() : this.begin();
          } else this.begin();
        }
      },
      options,
    );
    this.button.addEventListener(
      "keyup",
      (e) => {
        if ([" ", "Enter"].includes(e.key) && !doubleTap) {
          e.preventDefault();
          this.close();
        }
      },
      options,
    );
    this.button.addEventListener(
      "contextmenu",
      (e) => e.preventDefault(),
      options,
    );
  }
  begin() {
    if (this.active) return;
    this.active = true;
    this.root.classList.add("holding");
    this.revealTimer = setTimeout(
      () => {
        if (!this.active) return;
        this.root.classList.add("revealed");
        this.word.setAttribute("aria-hidden", "false");
        this.root
          .querySelector(".secret-explanation")
          .setAttribute("aria-hidden", "false");
        this.button.setAttribute("aria-expanded", "true");
        try {
          navigator.vibrate?.(12);
        } catch {}
        this.readTimer = setTimeout(
          () => {
            if (this.active) {
              this.read = true;
              this.onRead();
            }
          },
          560 + this.word.textContent.length * 18,
        );
      },
      this.doubleTap ? 0 : 450,
    );
    if (this.doubleTap) this.autoClose = setTimeout(() => this.close(), 7000);
  }
  close() {
    this.active = false;
    clearTimeout(this.revealTimer);
    clearTimeout(this.readTimer);
    clearTimeout(this.autoClose);
    this.root.classList.remove("holding", "revealed");
    this.word.setAttribute("aria-hidden", "true");
    this.root
      .querySelector(".secret-explanation")
      .setAttribute("aria-hidden", "true");
    this.button.setAttribute("aria-expanded", "false");
  }
  destroy() {
    this.close();
    this.resize.disconnect();
    this.abort.abort();
  }
}
