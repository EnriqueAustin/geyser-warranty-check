// Local server: node serve.js  ->  http://localhost:5178
const http = require("http"), fs = require("fs"), path = require("path");
const PORT = process.env.PORT || 5178, ROOT = __dirname;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".css": "text/css" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = path.join(ROOT, path.normalize(p));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end("Not found"); }
  res.writeHead(200, { "Content-Type": (TYPES[path.extname(file)] || "application/octet-stream") + "; charset=utf-8" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Geyser Warranty Check on http://localhost:${PORT}`));
