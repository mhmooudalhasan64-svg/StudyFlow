const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "public");
const types = { ".html":"text/html; charset=utf-8", ".svg":"image/svg+xml", ".txt":"text/plain; charset=utf-8" };
http.createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  // Some mobile clients still request legacy favicon filenames; serve the existing SVG mark.
  const normalizedPath = pathname === "/favicon.ico" || pathname === "/favicon.png" ? "/favicon.svg" : pathname;
  const requested = normalizedPath === "/" ? "index.html" : (normalizedPath.startsWith("/") ? normalizedPath.slice(1) : normalizedPath);
  const file = path.resolve(root, requested);
  if (file !== path.join(root,"index.html") && !file.startsWith(root + path.sep)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(file, (err,data) => {
    if (err) {
      if (path.extname(pathname) === "" || pathname.endsWith("/")) {
        fs.readFile(path.join(root,"index.html"), (e,html) => { if(e){res.writeHead(404);return res.end("Not found");} res.writeHead(200,{"Content-Type":types[".html"],"Cache-Control":"public, max-age=60"});res.end(html); });
      } else { res.writeHead(404); res.end("Not found"); }
      return;
    }
    res.writeHead(200,{"Content-Type":types[path.extname(file)] || "application/octet-stream","Cache-Control":"public, max-age=3600"});
    res.end(data);
  });
}).listen(process.env.PORT || 3000, "0.0.0.0");
