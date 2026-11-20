import { test } from "node:test";
import assert from "node:assert/strict";
import {
  themes,
  createGame,
  validate,
  winner,
  guessCorrect,
  normalize,
} from "../src/game.js";
const settings = {
  names: ["Ana", "Jo", "Lou", "Max", "Sam", "Léa"],
  impostors: 1,
  whites: 1,
  themeIds: ["internet"],
};
test("Distribution complète et mots cohérents, Mr White ne commence pas", () => {
  for (let i = 0; i < 100; i++) {
    const g = createGame(settings);
    assert.equal(g.players.filter((p) => p.role === "civil").length, 4);
    assert.equal(g.players.filter((p) => p.role === "impostor").length, 1);
    assert.equal(g.players.filter((p) => p.role === "white").length, 1);
    for (const p of g.players)
      assert.equal(
        p.word,
        p.role === "white" ? null : g.words[p.role === "civil" ? 0 : 1],
      );
    assert.notEqual(g.players[g.order[0]].role, "white");
  }
});
test("Refuse les parties impossibles et noms ambigus", () => {
  assert.ok(validate({ ...settings, impostors: 2 }));
  assert.ok(validate({ ...settings, impostors: 0, whites: 0 }));
  assert.ok(validate({ ...settings, themeIds: [] }));
  assert.ok(validate({ ...settings, names: ["Ana", "ana", "Max"] }));
  assert.ok(validate({ ...settings, names: ["", "Jo", "Max"] }));
  assert.equal(validate(settings), "");
});
test("Victoire des civils et des infiltrés, sinon poursuite", () => {
  const p = (role, alive = true) => ({ role, alive });
  assert.equal(winner([p("civil"), p("civil"), p("impostor")]), null);
  assert.equal(winner([p("civil"), p("impostor")]), "impostor");
  assert.equal(winner([p("civil"), p("white")]), "impostor");
  assert.equal(winner([p("civil"), p("impostor", false)]), "civil");
});
test("Mr White : correspondance exacte hors accents, casse et ponctuation", () => {
  assert.ok(guessCorrect("  MÉTRO! ", "Métro"));
  assert.ok(!guessCorrect("train", "Métro"));
  assert.ok(!guessCorrect("", "Métro"));
  assert.ok(!guessCorrect("Mét", "Métro"));
});
test("Catalogue : un seul mot par carte, paires distinctes et sans doublons inversés", () => {
  const pairs = new Set(),
    ids = new Set();
  for (const theme of themes) {
    assert.ok(/^[a-z]+$/.test(theme.id));
    assert.ok(!ids.has(theme.id));
    ids.add(theme.id);
    assert.ok(theme.name.trim());
    assert.ok(theme.description.trim());
    assert.ok(theme.pairs.length >= 32);
    for (const pair of theme.pairs) {
      assert.equal(pair.length, 2);
      for (const word of pair)
        assert.match(
          word,
          /^\p{L}+$/u,
          `${theme.id}: « ${word} » doit être un seul mot`,
        );
      const words = pair.map(normalize);
      assert.notEqual(words[0], words[1]);
      const key = words.sort().join("|");
      assert.ok(!pairs.has(key), `Paire répétée : ${pair.join(" / ")}`);
      pairs.add(key);
    }
  }
  for (const id of ["internet", "pop", "france", "classiques"])
    assert.ok(ids.has(id), "Les réglages existants restent compatibles");
  assert.ok(themes.length >= 12);
});
for (const theme of themes) {
  test(`Pas de répétition avant épuisement du thème ${theme.name}`, () => {
    const ids = [];
    const canonical = (pair) => pair.slice().sort().join("|");
    const expected = new Set(theme.pairs.map(canonical));
    for (let i = 0; i < theme.pairs.length; i++) {
      const g = createGame({ ...settings, themeIds: [theme.id] }, ids);
      assert.equal(g.theme, theme.name);
      assert.ok(expected.has(canonical(g.words)));
      assert.ok(!ids.includes(g.pairId));
      ids.push(g.pairId);
    }
    assert.equal(new Set(ids).size, theme.pairs.length);
    assert.ok(
      ids.includes(
        createGame({ ...settings, themeIds: [theme.id] }, ids).pairId,
      ),
      "Le thème est rejouable une fois épuisé",
    );
  });
}
test("Mélange complet : chaque paire sort une fois puis le jeu peut recommencer", () => {
  const ids = [];
  const s = { ...settings, themeIds: themes.map((t) => t.id) };
  for (let i = 0; i < themes.reduce((n, t) => n + t.pairs.length, 0); i++) {
    const g = createGame(s, ids);
    assert.ok(!ids.includes(g.pairId));
    ids.push(g.pairId);
  }
  assert.ok(ids.includes(createGame(s, ids).pairId));
});
