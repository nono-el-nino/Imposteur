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
  await page.getByRole("button", { name: "Reporter le vote" }).click();
  await page.locator(`[data-vote="${white}"]`).click();
  await page.getByRole("button", { name: /Éliminer/ }).click();
  await page.getByRole("button", { name: "Lui passer le téléphone" }).click();
  await page.getByRole("button", { name: /Je suis/ }).click();
  await page.locator("#guess").fill("réponse volontairement fausse");
  await page.getByRole("button", { name: "Proposer ce mot" }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
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
