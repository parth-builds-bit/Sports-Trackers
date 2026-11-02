import { pool } from "@/lib/sync";

// the API identifies leagues by short codes, our database stores names
const CODES = {
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

export async function GET(request) {
  const name = new URL(request.url).searchParams.get("competition");
  const code = CODES[name];
  if (!code) {
    return Response.json({ error: "No table available for this league" }, { status: 404 });
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS standings_cache (
      code TEXT PRIMARY KEY,
      data JSONB,
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  const cached = await pool.query(
    "SELECT data, updated_at FROM standings_cache WHERE code = $1",
    [code]
  );
  const row = cached.rows[0];
  const fresh = row && Date.now() - new Date(row.updated_at).getTime() < 600000;
  if (fresh) return Response.json({ table: row.data });

  const res = await fetch(`https://api.football-data.org/v4/competitions/${code}/standings`, {
    headers: { "X-Auth-Token": process.env.FOOTBALL_API_KEY },
    cache: "no-store",
  });

  if (!res.ok) {
    if (row) return Response.json({ table: row.data }); // fall back to the old copy
    return Response.json({ error: "Football API error " + res.status }, { status: 502 });
  }

  const json = await res.json();
  const total = (json.standings ?? []).find((s) => s.type === "TOTAL");
  const table = (total?.table ?? []).map((t) => ({
    position: t.position,
    team: t.team.name,
    crest: t.team.crest,
    played: t.playedGames,
    won: t.won,
    draw: t.draw,
    lost: t.lost,
    gd: t.goalDifference,
    points: t.points,
  }));

  await pool.query(
    `INSERT INTO standings_cache (code, data, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (code) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [code, JSON.stringify(table)]
  );

  return Response.json({ table });
}