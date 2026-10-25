import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "voile-offline",
      generateBundle(_, bundle) {
        const files = [
          "index.html",
          "manifest.webmanifest",
          "icon.svg",
          "icon-192.png",
          "icon-512.png",
          "icon-maskable.png",
          "apple-touch-icon.png",
          ...Object.keys(bundle).filter((name) => name !== "index.html"),
        ];
        const hash = createHash("sha256")
          .update(JSON.stringify(files))
          .digest("hex")
          .slice(0, 12);
        const source = readFileSync(
          new URL("./src/sw-template.js", import.meta.url),
          "utf8",
        )
          .replace("__CACHE__", `imposteur-voile-${hash}`)
          .replace("__FILES__", JSON.stringify(files));
        this.emitFile({ type: "asset", fileName: "sw.js", source });
      },
    },
  ],
});
