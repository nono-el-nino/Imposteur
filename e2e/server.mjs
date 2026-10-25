import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
let legacy = false;
const broken =
  '<!doctype html><html lang="fr"><body><div id="app"></div><script type="module" src="./assets/deleted-version.js"></script></body></html>';
const legacyWorker = `const C='imposteur-voile-legacy';self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.put('./index.html',new Response(${JSON.stringify(broken)},{headers:{'Content-Type':'text/html'}}))).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(e.request.mode==='navigate')e.respondWith(caches.open(C).then(c=>c.match('./index.html')));});`;
http
  .createServer(async (req, res) => {
    const path = new URL(req.url, "http://localhost").pathname;
    if (path === "/__legacy") {
      legacy = true;
      res.end("ok");
      return;
    }
    if (path === "/__current") {
      legacy = false;
      res.end("ok");
      return;
    }
    if (path === "/blank.html") {
      res.setHeader("Content-Type", "text/html");
      res.end("<html><body>fixture</body></html>");
      return;
    }
    if (path === "/Imposteur/sw.js" && legacy) {
      res.setHeader("Content-Type", "text/javascript");
      res.setHeader("Cache-Control", "no-store");
      res.end(legacyWorker);
      return;
    }
    // Simulate a stale CDN index that references a removed bundle.
    if (path === "/Imposteur/index.html") {
      res.setHeader("Content-Type", "text/html");
      res.end(broken);
      return;
    }
    let relative = path.replace(/^\/Imposteur\//, "");
    if (!relative) relative = "index.html";
    const file = resolve("dist", relative);
    if (!file.startsWith(resolve("dist") + "/")) {
      res.writeHead(404);
      res.end();
      return;
    }
    try {
      const data = await readFile(file);
      res.setHeader(
        "Content-Type",
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".webmanifest": "application/manifest+json",
          ".woff2": "font/woff2",
          ".woff": "font/woff",
          ".svg": "image/svg+xml",
          ".png": "image/png",
        }[extname(file)] || "application/octet-stream",
      );
      res.setHeader("Cache-Control", "no-store");
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  })
  .listen(4177, "127.0.0.1");
