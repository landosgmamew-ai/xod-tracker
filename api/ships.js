export default async function handler(req, res) {
  const token = process.env.AISFRIENDS_TOKEN;

  if (!token) {
    return res.status(503).json({
      error: "Ship tracking is not configured yet.",
      setup: "Add AISFRIENDS_TOKEN in Vercel Environment Variables."
    });
  }

  try {
    const lat = Number(req.query.lat ?? -2);
    const lon = Number(req.query.lon ?? 113);
    const span = Number(req.query.span ?? 10);

    const url =
      `https://www.aisfriends.com/api/public/v1/vessels/bounding-box` +
      `?lat_min=${lat-span}&lat_max=${lat+span}` +
      `&lon_min=${lon-span}&lon_max=${lon+span}&from=10&format=json`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Ship data provider unavailable"
      });
    }

    const data = await response.json();
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    return res.status(200).json(data);
  } catch {
    return res.status(500).json({ error: "Failed to fetch ship data" });
  }
}
