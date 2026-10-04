export default async function handler(req, res) {
  try {
    const lat = Number(req.query.lat ?? -2);
    const lon = Number(req.query.lon ?? 113);
    const dist = Math.min(Number(req.query.dist ?? 250), 250);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    const url = `https://api.adsb.lol/v2/point/${lat}/${lon}/${dist}`;
    const response = await fetch(url, {
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Aircraft provider unavailable" });
    }

    const data = await response.json();

    const aircraft = (data.ac || []).filter(a =>
      Number.isFinite(a.lat) && Number.isFinite(a.lon)
    ).map(a => ({
      id: a.hex,
      type: "aircraft",
      callsign: (a.flight || "").trim() || a.hex,
      registration: a.r || null,
      lat: a.lat,
      lng: a.lon,
      altitude: typeof a.alt_baro === "number" ? a.alt_baro : null,
      speed: typeof a.gs === "number" ? a.gs : null,
      heading: typeof a.track === "number" ? a.track : null,
      squawk: a.squawk || null,
      category: a.category || null,
      seenSeconds: typeof a.seen_pos === "number" ? a.seen_pos : null,
      source: "ADSB.lol",
      fetchedAt: new Date().toISOString()
    }));

    res.setHeader("Cache-Control", "s-maxage=2, stale-while-revalidate=5");
    return res.status(200).json({
      source: "ADSB.lol",
      fetchedAt: new Date().toISOString(),
      count: aircraft.length,
      aircraft
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch aircraft data" });
  }
}
