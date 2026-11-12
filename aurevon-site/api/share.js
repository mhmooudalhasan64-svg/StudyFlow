const clean = (value, fallback, max) => String(value || fallback).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) || fallback;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[char]));
module.exports = (req, res) => {
  const title = clean(req.query.title, "AUREVON TECH — منتجات رقمية وتجارب ذكية", 90);
  const description = clean(req.query.description, "نحوّل الأفكار إلى منتجات رقمية وتجارب تعليمية ذكية تجمع بين الاستراتيجية والتصميم والهندسة.", 180);
  const host = String(req.headers.host || "aurevon-tech-site.vercel.app").replace(/[^a-zA-Z0-9.:-]/g, "");
  const origin = (req.headers["x-forwarded-proto"] === "http" ? "http" : "https") + "://" + host;
  const image = origin + "/api/og-image?title=" + encodeURIComponent(title) + "&description=" + encodeURIComponent(description);
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="AUREVON TECH"><meta property="og:locale" content="ar_AR">
<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(origin + req.url)}"><meta property="og:image" content="${escapeHtml(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(image)}">
<meta http-equiv="refresh" content="0;url=/"><link rel="canonical" href="${escapeHtml(origin + "/")}"></head><body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><a href="/">زيارة AUREVON TECH</a></main></body></html>`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(200).send(html);
};
