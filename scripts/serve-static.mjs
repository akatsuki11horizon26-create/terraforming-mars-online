// Serves static-dist/ for the E2E run. The Pages build is a plain directory of
// files, so a real server is the only way the browser sees what Pages serves --
// including the minified bundle, where attribute quoting differs from source.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = new URL("../static-dist/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const port = Number(process.env.E2E_PORT ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2"
};

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  // Strip the leading slash so a crafted "../" cannot climb out of static-dist.
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/, "");
  const candidates = rel === "" ? ["index.html"] : [rel, join(rel, "index.html")];
  for (const candidate of candidates) {
    try {
      const body = await readFile(join(root, candidate));
      res.writeHead(200, { "content-type": TYPES[extname(candidate)] ?? "application/octet-stream" });
      res.end(body);
      return;
    } catch {
      // try the next shape
    }
  }
  // The app is a single page; unknown paths get it so client routing still works.
  try {
    const body = await readFile(join(root, "index.html"));
    res.writeHead(200, { "content-type": TYPES[".html"] });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(port, () => console.log(`static-dist on http://localhost:${port}`));
