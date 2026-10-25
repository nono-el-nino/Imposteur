import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? {
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
        args: ["--no-sandbox"],
      }
    : {},
);
try {
  const page = await browser.newPage();
  const logo = (
    await readFile(new URL("../public/logo.png", import.meta.url))
  ).toString("base64");
  for (const [size, name] of [
    [192, "icon-192"],
    [512, "icon-512"],
    [180, "apple-touch-icon"],
    [512, "icon-maskable"],
  ]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<style>body{margin:0;background:#E9ECF0}img{display:block;width:100vw;height:100vh}${name === "icon-maskable" ? "img{width:80vw;height:80vh;margin:10vh 10vw}" : ""}</style><img src="data:image/png;base64,${logo}" alt="">`,
    );
    await page.screenshot({
      path: new URL(`../public/${name}.png`, import.meta.url).pathname,
    });
  }
} finally {
  await browser.close();
}
