import { pool } from "@/lib/sync";

// the API identifies leagues by short codes, our database stores names
export const CODES = {
  "Premier League": "PL",
  "Primera Division": "PD",
  "Serie A": "SA",
  "Bundesliga": "BL1",
  "Ligue 1": "FL1",
  "Eredivisie": "DED",
  "Primeira Liga": "PPL",
  "Campeonato Brasileiro Série A": "BSA",
  "Championship": "ELC",
};

// fetch from the football API, but reuse a saved copy if it is newer than maxAgeMs
export async function cachedGet(key, path, maxAgeMs) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_cache (
      key TEXT PRIMARY KEY,
      data JSONB,
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  const cached = await pool.query(
    "SELECT data, updated_at FROM api_cache WHERE key = $1",
    [key]
  );
  const row = cached.rows[0];
  if (row && Date.now() - new Date(row.updated_at).getTime() < maxAgeMs) {
    return row.data;
  }

  const res = await fetch("https://api.football-data.org/v4" + path, {
    headers: { "X-Auth-Token": process.env.FOOTBALL_API_KEY },
    cache: "no-store",
  });

  if (!res.ok) {
    if (row) return row.data; // fall back to the old copy
    throw new Error("Football API error " + res.status);
  }

  const data = await res.json();
  await pool.query(
    `INSERT INTO api_cache (key, data, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [key, JSON.stringify(data)]
  );
  return data;
}