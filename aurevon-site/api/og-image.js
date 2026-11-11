const escapeXml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&apos;" }[char]));
const clean = (value, fallback, max) => String(value || fallback).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) || fallback;
module.exports = (req, res) => {
  const title = clean(req.query.title, "AUREVON TECH", 90);
  const description = clean(req.query.description, "Digital products, intelligent learning experiences and thoughtful engineering.", 180);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#24282d"/><stop offset=".55" stop-color="#0b0d10"/><stop offset="1" stop-color="#17191c"/></linearGradient><radialGradient id="glow"><stop stop-color="#d6dde2" stop-opacity=".22"/><stop offset="1" stop-color="#d6dde2" stop-opacity="0"/></radialGradient></defs>
  <rect width="1200" height="630" fill="url(#bg)"/><circle cx="930" cy="230" r="430" fill="url(#glow)"/>
  <rect x="58" y="58" width="1084" height="514" rx="30" fill="none" stroke="#d7dce0" stroke-opacity=".22"/>
  <g transform="translate(105 140)" fill="none" stroke="#edf0f2" stroke-width="5"><path d="M65 0 125 35v70l-60 35L5 105V35Z"/><path d="m31 102 34-61 34 61M45 82h40" stroke-linecap="round" stroke-linejoin="round"/></g>
  <text x="270" y="183" fill="#d5dbe0" font-family="Arial,sans-serif" font-size="25" font-weight="700" letter-spacing="7">AUREVON TECH</text>
  <text x="105" y="335" fill="#fff" font-family="Arial,sans-serif" font-size="56" font-weight="700">${escapeXml(title)}</text>
  <foreignObject x="108" y="370" width="960" height="110"><div xmlns="http://www.w3.org/1999/xhtml" style="font:26px/1.55 Arial,sans-serif;color:#c2c9ce">${escapeXml(description)}</div></foreignObject>
  <text x="108" y="525" fill="#aab2b8" font-family="Arial,sans-serif" font-size="19" letter-spacing="4">STRATEGY · DESIGN · ENGINEERING</text>
</svg>`;
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(200).send(svg);
};
