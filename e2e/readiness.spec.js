import { test, expect } from "@playwright/test";
const start = async (page) => {
  await page
    .getByRole("button", { name: "Nouvelle partie", exact: true })
    .click();
  await page.getByRole("button", { name: "Choisir les prénoms" }).click();
  await page.getByRole("button", { name: "Distribuer les mots" }).click();
};
test("first opening, complete distribution, vote and civil victory", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/Imposteur/");
  await start(page);
  const words = [];
  for (let i = 0; i < 6; i++) {
    await expect(page.locator(".secret-word")).toHaveCount(0);
    await page.getByRole("button", { name: /Je suis/ }).click();
    const button = page.locator("[data-hold]");
    await button.focus();
    await page.keyboard.down("Space");
    await expect(page.locator("#pass-action")).toBeVisible();
    words.push(
      (await page.locator(".white-bar").count())
        ? "Mr White"
        : await page.locator(".secret-word").textContent(),
    );
    await page.keyboard.up("Space");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await page.getByRole("button", { name: "C’est bon, j’ai lu" }).click();
  }
  await page.getByRole("button", { name: "Commencer le tour" }).click();
  const civil = words.find((w) => words.filter((x) => x === w).length === 4);
  const white = words.indexOf("Mr White");
  const impostor = words.findIndex((w) => w !== civil && w !== "Mr White");
  // Re-reading must preserve the running game, timer and active speaker.
  await page.getByRole("button", { name: "Suivant", exact: true }).click();
  const active = await page.locator(".speaker.active strong").textContent();
  await page.getByRole("button", { name: "Démarrer", exact: true }).click();
  await expect(page.locator("#clock")).not.toHaveText("01:00");
  const clock = await page.locator("#clock").textContent();
  await page.getByRole("button", { name: "Revoir ma carte" }).click();
  await expect(page.locator(".review-list button")).toHaveCount(6);
  await expect(page.locator(".secret-word")).toHaveCount(0);
  const reader = words.findIndex((w) => w !== "Mr White");
  await page.locator(`[data-review="${reader}"]`).click();
  await expect(page.locator(".secret-word")).toHaveCount(0);
  await page.getByRole("button", { name: /Je suis/ }).click();
  await expect(page.locator(".secret-word")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await page.locator("[data-hold]").focus();
  await page.keyboard.down("Space");
  await expect(page.locator("#pass-action")).toBeVisible();
  expect(await page.locator(".secret-word").textContent()).toBe(words[reader]);
  await page.keyboard.up("Space");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.locator(".secret-word")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await page
    .getByRole("button", { name: "Cacher et revenir à la partie" })
    .click();
  await expect(page.locator(".secret-word")).toHaveCount(0);
  await expect(page.locator(".speaker.active strong")).toHaveText(active);
  await expect(page.locator("#clock")).toHaveText(clock);
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reporter le vote" }).click();
  await page.locator(`[data-vote="${white}"]`).click();
  const eliminateName = await page
    .getByRole("button", { name: /Éliminer/ })
    .textContent();
  await page.getByRole("button", { name: "Revoir ma carte" }).click();
  await page.locator(`[data-review="${white}"]`).click();
  await page.getByRole("button", { name: /Je suis/ }).click();
  await page.locator("[data-hold]").focus();
  await page.keyboard.down("Space");
  await expect(page.locator("#pass-action")).toBeVisible();
  await expect(page.locator(".white-bar")).toBeVisible();
  expect(
    await page
      .locator(".white-bar")
      .evaluate((e) => getComputedStyle(e).filter),
  ).toBe("blur(14px)");
  await page.keyboard.up("Space");
  await page
    .getByRole("button", { name: "Cacher et revenir à la partie" })
    .click();
  await expect(page.getByRole("button", { name: /Éliminer/ })).toHaveText(
    eliminateName,
  );
  await page.getByRole("button", { name: /Éliminer/ }).click();
  await page.getByRole("button", { name: "Lui passer le téléphone" }).click();
  await page.getByRole("button", { name: /Je suis/ }).click();
  await page.locator("#guess").fill("réponse volontairement fausse");
  await page.getByRole("button", { name: "Proposer ce mot" }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByRole("button", { name: "Revoir ma carte" }).click();
  await expect(page.locator(".review-list button")).toHaveCount(5);
  await expect(page.locator(`[data-review="${white}"]`)).toHaveCount(0);
  await page
    .getByRole("button", { name: "Revenir à la partie", exact: true })
    .click();

  await page.getByRole("button", { name: "Reporter le vote" }).click();
  await page.locator(`[data-vote="${impostor}"]`).click();
  await page.getByRole("button", { name: /Éliminer/ }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Les civils ont vu juste." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("stale CDN index cannot poison offline shell", async ({
  page,
  context,
}) => {
  await page.goto("/Imposteur/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await start(page);
  await expect(page.getByRole("button", { name: /Je suis/ })).toBeVisible();
});
test("update recovers an already blank legacy cache", async ({
  page,
  request,
}) => {
  await request.get("/__legacy");
  await page.goto("/blank.html");
  await page.evaluate(async () => {
    const r = await navigator.serviceWorker.register("/Imposteur/sw.js");
    const w = r.installing || r.waiting || r.active;
    if (w.state !== "activated")
      await new Promise((resolve) =>
        w.addEventListener("statechange", () => {
          if (w.state === "activated") resolve();
        }),
      );
  });
  await page.goto("/Imposteur/");
  await expect(page.locator("#app")).toBeEmpty();
  await request.get("/__current");
  await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    await r.update();
    const w = r.installing || r.waiting || r.active;
    if (w.state !== "activated")
      await new Promise((resolve) =>
        w.addEventListener("statechange", () => {
          if (w.state === "activated") resolve();
        }),
      );
  });
  await page.waitForFunction(
    () => navigator.serviceWorker.controller?.state === "activated",
  );
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const keys = await caches.keys();
        return keys.some((k) => k !== "imposteur-voile-legacy");
      }),
    )
    .toBe(true);
  await page.waitForTimeout(500);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Nouvelle partie", exact: true }),
  ).toBeVisible();
});
test("missing JS shows recovery and can restart without clearing names", async ({
  browser,
}) => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  await page.route("**/assets/*.js", (r) => r.abort());
  await page.goto("/Imposteur/");
  await expect(
    page.getByRole("button", { name: "Réparer l’ouverture" }),
  ).toBeVisible();
  await page.evaluate(() => localStorage.setItem("kept", "yes"));
  await page.unroute("**/assets/*.js");
  await page.getByRole("button", { name: "Réparer l’ouverture" }).click();
  await expect(
    page.getByRole("button", { name: "Nouvelle partie", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("kept"))).toBe("yes");
  await context.close();
});

test("flou branding and independent wandering halos respect reduced motion", async ({
  page,
  request,
}) => {
  await page.goto("/Imposteur/");
  await expect(page).toHaveTitle("flou. — Le jeu des mots secrets");
  await expect(
    page.getByRole("heading", { name: "flou.", exact: true }),
  ).toBeVisible();
  expect(
    (await (await request.get("/Imposteur/manifest.webmanifest")).json())
      .short_name,
  ).toBe("flou.");
  await expect(page.locator(".halo")).toHaveCount(2);
  const sample = () =>
    page.locator(".halo").evaluateAll((items) =>
      items.map((el) => ({
        transform: el.style.transform,
        opacity: parseFloat(getComputedStyle(el).opacity),
      })),
    );
  const before = await sample();
  expect(before.every((h) => h.opacity >= 0.7)).toBeTruthy();
  expect(before[0].transform).not.toBe(before[1].transform);
  await page.waitForTimeout(600);
  const after = await sample();
  expect(after[0].transform).not.toBe(before[0].transform);
  expect(after[1].transform).not.toBe(before[1].transform);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const still = await sample();
  await page.waitForTimeout(300);
  expect(await sample()).toEqual(still);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(100);
  expect(await sample()).not.toEqual(still);
});
