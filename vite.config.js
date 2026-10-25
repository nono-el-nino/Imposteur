import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "voile-offline",
      enforce: "post",
      generateBundle(_, bundle) {
        const html = bundle["index.html"]?.source;
        if (typeof html !== "string")
          throw new Error("Missing built application shell");
        const template = readFileSync(
          new URL("./src/sw-template.js", import.meta.url),
          "utf8",
        );
        const files = [
          "manifest.webmanifest",
          "icon.svg?v=point-bleu",
          "icon-192.png?v=point-bleu",
          "icon-512.png?v=point-bleu",
          "icon-maskable.png?v=point-bleu",
          "apple-touch-icon.png?v=point-bleu",
          ...Object.keys(bundle).filter((name) => name !== "index.html"),
        ];
        const hash = createHash("sha256")
          .update(html + JSON.stringify(files) + template)
          .digest("hex")
          .slice(0, 12);
        const shell = `shell-${hash}.html`;
        files.push(shell);
        this.emitFile({ type: "asset", fileName: shell, source: html });
        this.emitFile({
          type: "asset",
          fileName: "sw.js",
          source: template
            .replace("__CACHE__", `imposteur-voile-${hash}`)
            .replace("__SHELL__", shell)
            .replace("__FILES__", JSON.stringify(files)),
        });
      },
    },
  ],
});
