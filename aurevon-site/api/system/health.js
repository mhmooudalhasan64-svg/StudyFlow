module.exports = (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed", allowed: ["GET"] });
  }
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(200).json({
    status: "healthy",
    service: "AUREVON TECH",
    timestamp: new Date().toISOString(),
    runtime: "Vercel Serverless Functions"
  });
};
