import "./theme.css";
import "./style.css";
import { startHaloMotion } from "./halo-motion.js";
import {
  themes,
  validate,
  createGame,
  shuffle,
  winner,
  guessCorrect,
} from "./game.js";
import {
  escape as esc,
  PillButton as btn,
  GlassSurface as glass,
  Halo,
  PlayerChip,
  letters,
  secretLetters,
  FocusTransition,
  HoldToReveal,
} from "./components.js";
const app = document.querySelector("#app");
let settings = {
  names: [
    "Joueur 1",
    "Joueur 2",
    "Joueur 3",
    "Joueur 4",
    "Joueur 5",
    "Joueur 6",
  ],
  impostors: 1,
  whites: 1,
  themeIds: ["internet"],
  timer: 60,
  doubleTap: false,
};
try {
  const s = JSON.parse(localStorage.getItem("imposteur-settings"));
  if (
    s &&
    Array.isArray(s.names) &&
    s.names.length >= 3 &&
    s.names.length <= 20 &&
    s.names.every((n) => typeof n === "string") &&
    Number.isInteger(s.impostors) &&
    s.impostors >= 0 &&
    Number.isInteger(s.whites) &&
    s.whites >= 0 &&
    Array.isArray(s.themeIds)
  ) {
    settings = {
      ...settings,
      ...s,
      themeIds: s.themeIds.filter((id) => themes.some((t) => t.id === id)),
      doubleTap: s.doubleTap === true,
    };
    if (![0, 60, 90, 120, 180].includes(settings.timer)) settings.timer = 60;
  }
} catch {}
const roles = { civil: "Civil", impostor: "Imposteur", white: "Mr White" };
let screen = "home",
  game,
  index = 0,
  used = [],
  selected = null,
  pending = null,
  error = "",
  overlay = null,
  remaining = 0,
  interval = null,
  speaker = 0,
  reviewId = null,
  reviewReturn = "discussion",
  reviewTimerWasRunning = false,
  secretControl = null,
  installPrompt = null;
document.body.insertAdjacentHTML("afterbegin", Halo());
startHaloMotion(document.querySelector(".halo-field"));
const transition = new FocusTransition(app);
function save() {
  try {
    localStorage.setItem("imposteur-settings", JSON.stringify(settings));
  } catch {}
}
function stopTimer() {
  clearInterval(interval);
  interval = null;
}
function safeClose() {
  secretControl?.close();
  stopTimer();
  const t = app.querySelector('[data-action="timer"]');
  if (t) t.textContent = "Reprendre";
}
function header() {
  return `<header><button class="wordmark" data-action="home" aria-label="Accueil flou.">flou<span>.</span></button><button class="rule-link" data-action="rules">Règles</button></header>`;
}
const meta = (step, label) =>
  `<div class="screen-meta"><span>${label}</span><span class="mono">${step}</span></div>`;
const notice = () =>
  error ? `<p class="notice" role="alert">${esc(error)}</p>` : "";
const bottom = (content) => `<div class="bottom-actions">${content}</div>`;
function counter(title, description, key, value, min, max) {
  return `<div class="counter"><div><h2>${title}</h2><p class="note">${description}</p></div><div class="stepper">${btn("−", `${key}-minus`, "step", `aria-label="Réduire ${title}" ${value <= min ? "disabled" : ""}`)}<output class="mono">${value}</output>${btn("+", `${key}-plus`, "step", `aria-label="Augmenter ${title}" ${value >= max ? "disabled" : ""}`)}</div></div>`;
}
function home() {
  return `<main class="home"><div class="home-copy"><p class="eyebrow">Le jeu des mots à demi dits</p><h1>flou<span>.</span></h1><div class="home-specimen" aria-hidden="true"><span>la vérité</span><span>presque</span></div><p class="home-description">Un téléphone passe.<br>Le doute reste.</p></div><div class="home-bottom"><p class="note">3 à 20 joueurs · Ensemble, autour d’une table.</p>${btn("Nouvelle partie", "setup")}<button class="text-button" data-action="rules">Comment jouer ?</button>${installPrompt ? btn("Installer sur mon téléphone", "install", "secondary") : ""}<p class="tiny">Sans compte. Sans bruit. Entre vous.</p></div></main>`;
}
function setup() {
  const max = Math.ceil(settings.names.length / 2) - 1;
  return `<main>${meta("01 / 03", "La partie")}<h1>Qui se cache<br>parmi vous ?</h1><p class="summary">${settings.names.length} joueurs, ${settings.impostors} imposteur${settings.impostors > 1 ? "s" : ""}, ${settings.whites} Mr White.</p>${glass(counter("Joueurs", "Tout le monde participe.", "players", settings.names.length, 3, 20) + counter("Imposteurs", "Un mot proche. Un autre camp.", "impostors", settings.impostors, 0, max - settings.whites) + counter("Mr White", "Pas de mot. Juste du bluff.", "whites", settings.whites, 0, max - settings.impostors), "counters")}<div class="section-heading"><h2>Vos références</h2><p class="note">Un thème, ou plusieurs.</p></div><div class="theme-list">${themes.map((t, i) => `<button class="glass theme ${settings.themeIds.includes(t.id) ? "chosen" : ""}" data-theme="${t.id}" aria-pressed="${settings.themeIds.includes(t.id)}"><span class="mono">0${i + 1}</span><span><strong>${t.name}</strong><small>${t.description}</small></span><span class="selection" aria-hidden="true">${settings.themeIds.includes(t.id) ? "✓" : "+"}</span></button>`).join("")}</div>${glass(`<label class="setting" for="timer-select"><span>Temps du débat</span><select id="timer-select">${[0, 60, 90, 120, 180].map((v) => `<option value="${v}" ${settings.timer === v ? "selected" : ""}>${v ? v / 60 + " min" : "Libre"}</option>`).join("")}</select></label><label class="setting" for="double-tap"><span>Lecture par double appui<small>Une alternative à l’appui long.</small></span><input id="double-tap" type="checkbox" role="switch" ${settings.doubleTap ? "checked" : ""}></label>`, "options")}${notice()}${bottom(btn("Choisir les prénoms", "names") + '<p class="tiny">Les civils restent majoritaires au départ.</p>')}</main>`;
}
function names() {
  return `<main>${meta("02 / 03", "Les prénoms")}<h1>Tout le monde<br>a sa place.</h1><p class="intro">Les prénoms restent sur ce téléphone pour la prochaine partie.</p><form id="names-form"><div class="name-list">${settings.names.map((n, i) => `<label class="glass name-field"><span class="mono">${String(i + 1).padStart(2, "0")}</span><input data-player="${i}" value="${esc(n)}" aria-label="Prénom du joueur ${i + 1}" maxlength="24" enterkeyhint="${i === settings.names.length - 1 ? "done" : "next"}" autocomplete="off" required></label>`).join("")}</div>${notice()}${bottom(btn("Distribuer les mots", "start", "primary", 'type="submit"') + btn("Modifier la partie", "setup", "text-button"))}</form></main>`;
}
function pass(p = game.players[index], reviewing = false) {
  return `<main class="center-screen">${meta(reviewing ? "Ta carte" : `${index + 1} / ${game.players.length}`, "Le téléphone passe")}<div class="center-copy"><p class="eyebrow">Passe le téléphone à</p><h1 class="display-name">${esc(p.name)}<span>.</span></h1><p class="intro">Les autres regardent ailleurs.<br>Ce qui suit est pour toi.</p></div>${bottom(btn(`Je suis ${esc(p.name)}`, reviewing ? "review-secret" : "secret") + (reviewing ? btn("Choisir un autre prénom", "review-list", "text-button") : ""))}</main>`;
}
function secret(p = game.players[index], reviewing = false) {
  return `<main class="center-screen secret-screen">${meta(reviewing ? "Ta carte" : `${index + 1} / ${game.players.length}`, esc(p.name))}<div class="center-copy"><p class="eyebrow">Ton mot, entre nous</p><div class="secret-surface glass"><div class="secret-word ${p.role === "white" ? "white-word" : ""}" aria-hidden="true">${p.role === "white" ? '<span class="white-bar"></span>' : secretLetters(p.word)}</div><p class="secret-explanation" aria-hidden="true">${p.role === "white" ? "Tu es Mr White.<br>Tu n’as pas de mot. Écoute bien." : "Garde ce mot pour toi.<br>Ton rôle reste à découvrir."}</p><div class="hold-area" aria-hidden="true"><span class="hold-bubble"></span><span class="hold-marker"></span></div><button class="hold-button" data-hold aria-label="${settings.doubleTap ? "Deux appuis pour lire" : "Maintenir la carte pour lire"}" aria-expanded="false"></button><p class="hold-hint note">${settings.doubleTap ? "Deux appuis sur la carte pour lire.<br>Un appui pour refermer." : "Maintiens n’importe où sur la carte.<br>Relâche pour voiler."}</p></div></div>${bottom(`<div class="pass-slot"><div id="pass-action" hidden>${btn(reviewing ? "Cacher et revenir à la partie" : "C’est bon, j’ai lu", reviewing ? "review-back" : "hide")}</div></div>${reviewing ? btn("Revenir sans lire", "review-back", "text-button") : ""}<p class="tiny">Le secret se voile aussi en quittant l’application.</p>`)}</main>`;
}
function table() {
  return `<main class="center-screen">${meta("03 / 03", "Tout le monde sait. Ou presque.")}<div class="center-copy"><p class="eyebrow">Les mots sont distribués</p><h1>Posez le téléphone<br>au milieu.</h1><p class="intro">Un indice chacun.<br>Le débat se passe entre vous.</p></div>${bottom(btn("Commencer le tour", "begin"))}</main>`;
}
function reviewList() {
  return `<main>${meta("Lecture privée", "La partie est en pause")}<h1>Tu as oublié<br>ton mot ?</h1><p class="intro">Choisis ton prénom, puis prends le téléphone à l’écart des regards.</p><div class="review-list">${game.players
    .filter((p) => p.alive)
    .map((p) =>
      btn(esc(p.name), "review-pick", "secondary", `data-review="${p.id}"`),
    )
    .join(
      "",
    )}</div>${bottom(btn("Revenir à la partie", "review-back") + (reviewTimerWasRunning ? '<p class="note">Le chrono reprendra à ton retour.</p>' : ""))}</main>`;
}
function discussion() {
  const order = game.order.map((id) => game.players[id]).filter((p) => p.alive);
  return `<main>${meta(`Tour ${game.round}`, `${order.length} joueurs en jeu`)}<h1>${speaker < order.length ? "À toi de parler." : "Place au doute."}</h1><p class="intro">${speaker < order.length ? "Un indice. Sans dire, traduire ou épeler ton mot." : "Échangez vos soupçons. Le vote se fait à voix haute."}</p><div class="speaking-order">${order.map((p, i) => `<div class="speaker ${i === speaker ? "active" : ""} ${i < speaker ? "done" : ""}"><span class="mono">${String(i + 1).padStart(2, "0")}</span><strong>${esc(p.name)}</strong><span class="note">${i < speaker ? "Parlé" : i === speaker ? "À toi" : ""}</span></div>`).join("")}</div>${speaker < order.length ? btn(speaker === order.length - 1 ? "Ouvrir le débat" : "Suivant", "next-speaker", "secondary") : ""}${settings.timer ? glass(`<div class="timer-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-track" cx="50" cy="50" r="44"/><circle class="ring-value" cx="50" cy="50" r="44" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${100 - (remaining / settings.timer) * 100}"/></svg><strong class="mono" id="clock">${formatTime(remaining)}</strong></div><div><p class="note">Le temps du débat</p>${btn(interval ? "Pause" : remaining === 0 ? "Recommencer" : "Démarrer", "timer", "text-button")}</div>`, "timer-panel") : ""}${bottom(btn("Reporter le vote", "vote") + btn("Revoir ma carte", "review", "secondary") + '<p class="tiny">Désignez ensemble la personne à éliminer.</p>')}</main>`;
}
function vote() {
  return `<main>${meta("Le vote", "À voix haute, entre vous")}<h1>Qui avez-vous<br>désigné ?</h1><p class="intro">En cas d’égalité, prenez le temps de revoter.</p><div class="vote-grid ${selected !== null ? "has-selection" : ""}">${game.players
    .filter((p) => p.alive)
    .map((p, i) => PlayerChip(p, i, selected))
    .join(
      "",
    )}</div>${bottom((selected !== null ? btn(`Éliminer ${esc(game.players[selected].name)}`, "eliminate") : '<p class="note">Touche le prénom choisi par le groupe.</p>') + btn("Revoir ma carte", "review", "secondary") + btn("Revenir au débat", "discussion", "text-button"))}</main>`;
}
function eliminated() {
  const p = game.players[pending];
  return `<main class="center-screen elimination">${meta("La mise au point", "Un rôle se dévoile")}<div class="center-copy"><p class="eyebrow">${esc(p.name)} était</p><h1 class="role-reveal">${letters(roles[p.role])}<span>.</span></h1><p class="intro">${p.role === "civil" ? "Un civil de moins. Le doute reste." : p.role === "impostor" ? "Le voile est levé." : "Une dernière chance de trouver le mot."}</p></div>${bottom(btn(p.role === "white" ? "Lui passer le téléphone" : "Continuer", p.role === "white" ? "white-pass" : "continue"))}</main>`;
}
function whitePass() {
  return `<main class="center-screen">${meta("Dernière chance", "Le téléphone passe")}<div class="center-copy"><p class="eyebrow">Passe le téléphone à</p><h1 class="display-name">${esc(game.players[pending].name)}.</h1><p class="intro">Une tentative pour trouver<br>le mot des civils.</p></div>${bottom(btn(`Je suis ${esc(game.players[pending].name)}`, "white-guess"))}</main>`;
}
function whiteGuess() {
  return `<main class="center-screen">${meta("Mr White", "Une seule tentative")}<div class="center-copy"><h1>Quel était<br>leur mot ?</h1><p class="intro">Écoute ton intuition.</p><form id="guess-form"><label class="sr-only" for="guess">Le mot des civils</label><input class="glass guess-input" id="guess" name="guess" placeholder="Ton intuition…" required maxlength="100" autocomplete="off">${btn("Proposer ce mot", "guess", "primary", 'type="submit"')}</form></div></main>`;
}
function whiteResult() {
  return `<main class="center-screen elimination">${meta("La mise au point", "La réponse")}<div class="center-copy"><h1 class="role-reveal">${letters("Pas ce mot.")}</h1><p class="intro">Ta tentative n’est pas la bonne.<br>La partie continue.</p></div>${bottom(btn("Continuer", "continue"))}</main>`;
}
function end() {
  const w = game.winner;
  return `<main class="end-screen">${meta("Fin de partie", "Tout devient clair")}<div class="ending-title"><p class="eyebrow">Le voile est levé</p><h1>${w === "civil" ? "Les civils<br>ont vu juste." : w === "white" ? "Mr White<br>a trouvé le mot." : "Le bluff<br>a tenu bon."}</h1><p class="intro">${w === "civil" ? "Tous les infiltrés ont été démasqués." : w === "white" ? "Une intuition. Une victoire en solitaire." : "Les infiltrés ont atteint la parité."}</p></div>${glass(`<div><span class="note">Civils</span><strong>${esc(game.words[0])}</strong></div><div><span class="note">Imposteurs</span><strong>${esc(game.words[1])}</strong></div>`, "word-recap")}<div class="recap">${game.players.map((p, i) => `<div class="recap-player" style="--i:${i}"><div><strong>${esc(p.name)}</strong><span class="note">${roles[p.role]}${p.alive ? "" : " · éliminé"}</span></div><span class="recap-word">${p.word ? esc(p.word) : "Sans mot"}</span></div>`).join("")}</div>${bottom(btn("Rejouer avec les mêmes joueurs", "rematch") + btn("Modifier la partie", "settings", "secondary"))}</main>`;
}
function modal() {
  return `<div class="modal-backdrop"><section class="glass modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">${overlay === "quit" ? `<h2 id="modal-title">Quitter cette partie ?</h2><p>Les mots et la progression seront effacés.</p>${btn("Continuer la partie", "close")}${btn("Quitter", "quit", "secondary")}` : `<p class="eyebrow">Autour d’un téléphone</p><h2 id="modal-title">Un mot. Un doute.</h2><ol><li><strong>Découvre ton mot en secret.</strong> Les civils partagent un mot. Les imposteurs en ont un autre, proche. Mr White n’en a aucun.</li><li><strong>Donne un indice à ton tour.</strong> Sans dire, traduire ou épeler ton mot. Le premier joueur n’est jamais Mr White.</li><li><strong>Débattez et votez à voix haute.</strong> Reportez uniquement la personne éliminée dans l’application. En cas d’égalité, revotez.</li><li><strong>Mr White a une chance.</strong> S’il est éliminé, il peut deviner le mot exact des civils en une tentative, sans tenir compte des accents et de la casse. Il gagne seul s’il réussit.</li><li><strong>Les civils gagnent</strong> en éliminant tous les infiltrés. Les infiltrés gagnent quand ils sont aussi nombreux que les civils.</li></ol><p class="note">Seuls les prénoms et réglages sont mémorisés sur ce téléphone. Les mots ne sont ni enregistrés ni envoyés. Recharger la page abandonne la partie. Le flou protège des regards, pas de l’inspection technique du navigateur.</p>${btn("C’est compris", "close")}`}</section></div>`;
}
const views = {
  home,
  setup,
  names,
  pass,
  secret,
  table,
  discussion,
  vote,
  "review-list": reviewList,
  "review-pass": () => pass(game.players[reviewId], true),
  "review-secret": () => secret(game.players[reviewId], true),
  eliminated,
  "white-pass": whitePass,
  "white-guess": whiteGuess,
  "white-result": whiteResult,
  end,
};
function render() {
  secretControl?.destroy();
  secretControl = null;
  document.body.dataset.phase =
    screen === "end"
      ? game.winner === "civil"
        ? "victory"
        : "white"
      : ["eliminated", "white-result"].includes(screen)
        ? "elimination"
        : screen === "home"
          ? "home"
          : "game";
  transition.show(
    header() +
      views[screen]() +
      `<footer>Un téléphone. Quelques secrets.</footer>` +
      (overlay ? modal() : ""),
    screen +
      (screen.startsWith("review-")
        ? reviewId
        : screen === "pass" || screen === "secret"
          ? index
          : ""),
  );
  if ((screen === "secret" || screen === "review-secret") && !overlay) {
    secretControl = new HoldToReveal(app.querySelector(".secret-screen"), {
      doubleTap: settings.doubleTap,
      onRead: () => {
        app.querySelector("#pass-action").hidden = false;
      },
    });
  }
  if (overlay) {
    app.querySelector("main").inert = true;
    app.querySelector("header").inert = true;
    app.querySelector(".modal button")?.focus();
  }
}
function toggleTimer() {
  if (interval) {
    stopTimer();
    render();
    return;
  }
  if (!remaining) remaining = settings.timer;
  interval = setInterval(() => {
    remaining = Math.max(0, remaining - 1);
    const clock = app.querySelector("#clock");
    if (clock) clock.textContent = formatTime(remaining);
    app
      .querySelector(".ring-value")
      ?.setAttribute(
        "stroke-dashoffset",
        100 - (remaining / settings.timer) * 100,
      );
    if (!remaining) {
      stopTimer();
      render();
    }
  }, 1000);
  render();
  return;
}

function go(s) {
  safeClose();
  error = "";
  screen = s;
  render();
}
function start() {
  error = validate(settings);
  if (error) {
    render();
    return;
  }
  save();
  stopTimer();
  game = createGame(settings, used);
  used.push(game.pairId);
  const first = game.order[0];
  game.order = [
    first,
    ...shuffle(game.players.filter((p) => p.id !== first).map((p) => p.id)),
  ];
  index = 0;
  go("pass");
}
function nextRound() {
  const win = winner(game.players);
  if (win) {
    game.winner = win;
    go("end");
  } else {
    game.round++;
    game.order = shuffle(game.players.filter((p) => p.alive).map((p) => p.id));
    speaker = 0;
    remaining = settings.timer;
    go("discussion");
  }
}
function formatTime(v) {
  return `${Math.floor(v / 60)
    .toString()
    .padStart(2, "0")}:${(v % 60).toString().padStart(2, "0")}`;
}
app.addEventListener("input", (e) => {
  if (e.target.dataset.player !== undefined) {
    settings.names[Number(e.target.dataset.player)] = e.target.value;
    save();
  }
});
app.addEventListener("change", (e) => {
  if (e.target.id === "timer-select") settings.timer = Number(e.target.value);
  if (e.target.id === "double-tap") settings.doubleTap = e.target.checked;
  save();
});
app.addEventListener("keydown", (e) => {
  if (e.key === "Tab" && overlay) {
    const items = [...app.querySelectorAll(".modal button,.modal a")];
    if (e.shiftKey && document.activeElement === items[0]) {
      e.preventDefault();
      items.at(-1).focus();
    } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
      e.preventDefault();
      items[0].focus();
    }
  }
  if (e.key === "Enter" && e.target.dataset.player !== undefined) {
    e.preventDefault();
    const n = Number(e.target.dataset.player);
    e.target.closest("label").classList.add("validated");
    if (n < settings.names.length - 1)
      app.querySelector(`[data-player="${n + 1}"]`).focus();
    else start();
  }
});
app.addEventListener("submit", (e) => {
  e.preventDefault();
  if (e.target.id === "names-form") start();
  if (e.target.id === "guess-form") {
    const guess = new FormData(e.target).get("guess");
    if (!guess.trim()) return;
    if (guessCorrect(guess, game.words[0])) {
      game.winner = "white";
      go("end");
    } else go("white-result");
  }
});
app.addEventListener("click", (e) => {
  const el = e.target.closest("button");
  if (!el) return;
  if (el.dataset.theme) {
    const id = el.dataset.theme;
    settings.themeIds = settings.themeIds.includes(id)
      ? settings.themeIds.filter((x) => x !== id)
      : [...settings.themeIds, id];
    save();
    render();
    return;
  }
  if (el.dataset.vote !== undefined) {
    selected = Number(el.dataset.vote);
    render();
    app
      .querySelector(`[data-vote="${selected}"]`)
      ?.focus({ preventScroll: true });
    return;
  }
  const a = el.dataset.action;
  if (!a || a === "guess" || a === "start") return;
  if (a === "rules") {
    safeClose();
    overlay = "rules";
    render();
    return;
  }
  if (a === "close") {
    overlay = null;
    render();
    return;
  }
  if (a === "home") {
    safeClose();
    if (game && screen !== "end") {
      overlay = "quit";
      render();
    } else go("home");
    return;
  }
  if (a === "quit" || a === "settings") {
    game = null;
    overlay = null;
    go(a === "quit" ? "home" : "setup");
    return;
  }
  if (a === "setup") {
    go("setup");
    return;
  }
  if (a === "names") {
    error = validate({
      ...settings,
      names: settings.names.map((_, i) => `Joueur ${i}`),
    });
    if (error) {
      render();
      return;
    }
    go("names");
    return;
  }
  if (a === "rematch") {
    start();
    return;
  }
  if (a.startsWith("players-")) {
    const dir = a.endsWith("plus") ? 1 : -1;
    const count = settings.names.length + dir;
    if (count < 3 || count > 20) return;
    if (dir === 1) {
      let n = count;
      while (settings.names.includes(`Joueur ${n}`)) n++;
      settings.names.push(`Joueur ${n}`);
    } else settings.names.pop();
    const max = Math.ceil(count / 2) - 1;
    settings.impostors = Math.min(settings.impostors, max);
    settings.whites = Math.min(settings.whites, max - settings.impostors);
    save();
    render();
    return;
  }
  if (/^(impostors|whites)-/.test(a)) {
    const [key, dir] = a.split("-");
    const max =
      Math.ceil(settings.names.length / 2) -
      1 -
      settings[key === "impostors" ? "whites" : "impostors"];
    settings[key] = Math.max(
      0,
      Math.min(max, settings[key] + (dir === "plus" ? 1 : -1)),
    );
    save();
    render();
    return;
  }
  if (a === "review" && ["discussion", "vote"].includes(screen)) {
    reviewReturn = screen;
    reviewTimerWasRunning = !!interval;
    reviewId = null;
    go("review-list");
    return;
  }
  if (a === "review-pick" && screen === "review-list") {
    const id = Number(el.dataset.review);
    if (!game.players.some((p) => p.id === id && p.alive)) return;
    reviewId = id;
    go("review-pass");
    return;
  }
  if (a === "review-secret" && screen === "review-pass") {
    go("review-secret");
    return;
  }
  if (a === "review-list" && screen.startsWith("review-")) {
    go("review-list");
    return;
  }
  if (a === "review-back" && screen.startsWith("review-")) {
    const resume = reviewTimerWasRunning && reviewReturn === "discussion";
    reviewId = null;
    go(reviewReturn);
    reviewTimerWasRunning = false;
    if (resume && remaining > 0) toggleTimer();
    return;
  }
  if (a === "secret") {
    go("secret");
    return;
  }
  if (a === "hide") {
    if (!secretControl?.read) return;
    if (index < game.players.length - 1) {
      index++;
      go("pass");
    } else go("table");
    return;
  }
  if (a === "begin") {
    speaker = 0;
    remaining = settings.timer;
    go("discussion");
    return;
  }
  if (a === "next-speaker") {
    speaker++;
    render();
    return;
  }
  if (a === "discussion") {
    go("discussion");
    return;
  }
  if (a === "vote") {
    selected = null;
    go("vote");
    return;
  }
  if (a === "eliminate" && selected !== null) {
    pending = selected;
    game.players[pending].alive = false;
    go("eliminated");
    return;
  }
  if (a === "white-pass" || a === "white-guess") {
    go(a);
    return;
  }
  if (a === "continue") {
    nextRound();
    return;
  }
  if (a === "timer") {
    toggleTimer();
    return;
  }
  if (a === "install" && installPrompt) {
    installPrompt.prompt();
    installPrompt = null;
    render();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) safeClose();
});
window.addEventListener("blur", safeClose);
window.addEventListener("pagehide", safeClose);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    safeClose();
    if (overlay) {
      overlay = null;
      render();
    }
  }
});
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  if (screen === "home") render();
});
render();
if ("serviceWorker" in navigator && import.meta.env.PROD)
  window.addEventListener("load", () =>
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {}),
  );
