const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "public");
const types = { ".html":"text/html; charset=utf-8", ".svg":"image/svg+xml; charset=utf-8", ".txt":"text/plain; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".webmanifest":"application/manifest+json; charset=utf-8" };
const port = Number(process.env.PORT) || 3000;
const apiHandlers = { "/api/og-image": require("./api/og-image"), "/api/share": require("./api/share") };
const escapeXml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&apos;" }[char]));
const cleanText = (value, fallback, max) => String(value || fallback).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) || fallback;
function makeOgImage(title, description) {
  const safeTitle = escapeXml(title);
  const safeDescription = escapeXml(description);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#24282d"/><stop offset=".55" stop-color="#0b0d10"/><stop offset="1" stop-color="#17191c"/></linearGradient><radialGradient id="glow"><stop stop-color="#d6dde2" stop-opacity=".22"/><stop offset="1" stop-color="#d6dde2" stop-opacity="0"/></radialGradient></defs>
  <rect width="1200" height="630" fill="url(#bg)"/><circle cx="930" cy="230" r="430" fill="url(#glow)"/>
  <rect x="58" y="58" width="1084" height="514" rx="30" fill="none" stroke="#d7dce0" stroke-opacity=".22"/>
  <g transform="translate(105 140)" fill="none" stroke="#edf0f2" stroke-width="5"><path d="M65 0 125 35v70l-60 35L5 105V35Z"/><path d="m31 102 34-61 34 61M45 82h40" stroke-linecap="round" stroke-linejoin="round"/></g>
  <text x="270" y="183" fill="#d5dbe0" font-family="Arial,sans-serif" font-size="25" font-weight="700" letter-spacing="7">AUREVON TECH</text>
  <text x="105" y="335" fill="#fff" font-family="Arial,sans-serif" font-size="56" font-weight="700">${safeTitle}</text>
  <foreignObject x="108" y="370" width="960" height="110"><div xmlns="http://www.w3.org/1999/xhtml" style="font:26px/1.55 Arial,sans-serif;color:#c2c9ce">${safeDescription}</div></foreignObject>
  <text x="108" y="525" fill="#aab2b8" font-family="Arial,sans-serif" font-size="19" letter-spacing="4">STRATEGY · DESIGN · ENGINEERING</text>
</svg>`;
}
function renderHtml(data, req, parsedUrl) {
  let html = data.toString("utf8");
  const title = cleanText(parsedUrl.searchParams.get("share_title"), "AUREVON TECH — منتجات رقمية وتجارب ذكية", 90);
  const description = cleanText(parsedUrl.searchParams.get("share_description"), "نحوّل الأفكار إلى منتجات رقمية وتجارب تعليمية ذكية تجمع بين الاستراتيجية والتصميم والهندسة.", 180);
  let origin = "https://aurevon-tech-site.vercel.app";
  try { origin = new URL("https://" + String(req.headers.host || "aurevon-tech-site.vercel.app").replace(/[^a-zA-Z0-9.:-]/g, "")).origin; } catch {}
  const imageUrl = origin + "/og-image.svg?title=" + encodeURIComponent(title) + "&description=" + encodeURIComponent(description);
  const replaceMeta = (pattern, tag) => { html = html.replace(pattern, tag); };
  replaceMeta(/<meta property="og:title"[^>]*>/, '<meta property="og:title" content="' + escapeXml(title) + '">');
  replaceMeta(/<meta property="og:description"[^>]*>/, '<meta property="og:description" content="' + escapeXml(description) + '">');
  replaceMeta(/<meta property="og:url"[^>]*>/, '<meta property="og:url" content="' + escapeXml(origin + parsedUrl.pathname) + '">');
  html = html.replace(/<link rel="canonical"[^>]*>/, '<link rel="canonical" href="' + escapeXml(origin + parsedUrl.pathname) + '">');
  replaceMeta(/<meta name="twitter:card"[^>]*>/, '<meta name="twitter:card" content="summary_large_image">');
  html = html.replace("</head>", '<meta property="og:image" content="' + escapeXml(imageUrl) + '"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:image" content="' + escapeXml(imageUrl) + '"></head>');
  return html;
}
const server = http.createServer((req,res) => {
  let parsedUrl;
  try { parsedUrl = new URL(req.url, "http://localhost"); } catch { res.writeHead(400); return res.end("Bad request"); }
  const pathname = decodeURIComponent(parsedUrl.pathname);
  if (apiHandlers[pathname]) {
    const query = Object.fromEntries(parsedUrl.searchParams.entries());
    const apiRes = {
      setHeader: (name, value) => res.setHeader(name, value),
      status: (code) => { res.statusCode = code; return apiRes; },
      send: (body) => { if (!res.headersSent) res.writeHead(res.statusCode || 200); res.end(body); }
    };
    return apiHandlers[pathname]({ ...req, query }, apiRes);
  }
  if (pathname === "/og-image.svg") {
    const title = cleanText(parsedUrl.searchParams.get("title"), "AUREVON TECH", 90);
    const description = cleanText(parsedUrl.searchParams.get("description"), "Digital products, intelligent learning experiences and thoughtful engineering.", 180);
    const image = makeOgImage(title, description);
    res.writeHead(200, { "Content-Type":"image/svg+xml; charset=utf-8", "Cache-Control":"public, max-age=300", "X-Content-Type-Options":"nosniff" });
    return res.end(image);
  }
  // Some mobile clients still request legacy favicon filenames; serve the existing SVG mark.
  const normalizedPath = pathname === "/favicon.ico" || pathname === "/favicon.png" ? "/favicon.svg" : pathname;
  const requested = normalizedPath === "/" ? "index.html" : (normalizedPath.startsWith("/") ? normalizedPath.slice(1) : normalizedPath);
  const file = path.resolve(root, requested);
  if (file !== path.join(root,"index.html") && !file.startsWith(root + path.sep)) { res.writeHead(403); return res.end("Forbidden"); }
  const sendHtml = (html) => {
    const output = renderHtml(html, req, parsedUrl);
    res.writeHead(200, { "Content-Type":types[".html"], "Cache-Control":"public, max-age=60", "X-Content-Type-Options":"nosniff" });
    res.end(output);
  };
  fs.readFile(file, (err,data) => {
    if (err) {
      if (path.extname(pathname) === "" || pathname.endsWith("/")) {
        fs.readFile(path.join(root,"index.html"), (e,html) => { if(e){res.writeHead(404);return res.end("Not found");} sendHtml(html); });
      } else { res.writeHead(404); res.end("Not found"); }
      return;
    }
    if (path.extname(file) === ".html") return sendHtml(data);
    res.writeHead(200,{ "Content-Type":types[path.extname(file)] || "application/octet-stream", "Cache-Control":"public, max-age=3600", "X-Content-Type-Options":"nosniff" });
    res.end(data);
  });
});
server.on("error", (error) => { console.error("[AUREVON] HTTP server error:", error); process.exit(1); });
server.listen(port, "0.0.0.0", () => { console.log(`[AUREVON] HTTP server listening on 0.0.0.0:${port}`); });
