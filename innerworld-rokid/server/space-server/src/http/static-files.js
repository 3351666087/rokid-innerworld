import { createReadStream, existsSync } from "node:fs";
import path from "node:path";

const mime = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml; charset=utf-8"]
]);

function safeStaticPath(webDir, urlPath) {
  const decoded = decodeURIComponent(urlPath === "/" ? "/index.html" : urlPath);
  const target = path.normalize(path.join(webDir, decoded));
  if (!target.startsWith(webDir)) return null;
  return target;
}

export function createStaticFileServer({ webDir }) {
  return async function serveStatic(req, res, url) {
    const target = safeStaticPath(webDir, url.pathname);
    if (!target || !existsSync(target)) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }

    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, {
      "content-type": mime.get(ext) || "application/octet-stream",
      "cache-control": "no-store"
    });
    createReadStream(target).pipe(res);
  };
}
