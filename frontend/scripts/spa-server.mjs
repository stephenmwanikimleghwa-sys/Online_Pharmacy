/**
 * Tiny production static file server with SPA fallback.
 * Hard-refresh on /inventory/management etc. must serve index.html —
 * Render's static CDN rewrite rules are not always applied from blueprint.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "../dist");
const PORT = Number(process.env.PORT) || 4173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0].split("#")[0] || "/");
  const cleaned = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const full = path.join(root, cleaned);
  if (!full.startsWith(root)) return null;
  return full;
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const cache =
    ext === ".html"
      ? "no-cache"
      : filePath.includes(`${path.sep}assets${path.sep}`)
        ? "public, max-age=31536000, immutable"
        : "public, max-age=3600";
  const stream = fs.createReadStream(filePath);
  res.writeHead(200, { "Content-Type": type, "Cache-Control": cache });
  stream.pipe(res);
  stream.on("error", () => {
    if (!res.headersSent) send(res, 500, "Read error");
  });
}

const indexHtml = path.join(DIST, "index.html");
if (!fs.existsSync(indexHtml)) {
  console.error(`[spa-server] Missing ${indexHtml}. Run npm run build first.`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const urlPath = req.url || "/";
  if (urlPath === "/healthz" || urlPath === "/health") {
    return send(res, 200, "ok", { "Content-Type": "text/plain" });
  }

  let filePath = safeJoin(DIST, urlPath === "/" ? "/index.html" : urlPath);
  if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return serveFile(res, filePath);
  }

  // Directory index
  if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const nested = path.join(filePath, "index.html");
    if (fs.existsSync(nested)) return serveFile(res, nested);
  }

  // SPA fallback — keep the browser URL; React Router handles the path
  return serveFile(res, indexHtml);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[spa-server] serving ${DIST} on :${PORT}`);
});
