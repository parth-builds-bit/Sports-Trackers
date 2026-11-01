import { Pool } from "pg";

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function syncMatches() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY,
      competition TEXT,
      home_team TEXT,
      away_team TEXT,
      home_score INTEGER,
      away_score INTEGER,
      status TEXT,
      utc_date TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  const res = await fetch("https://api.football-data.org/v4/matches", {
    headers: { "X-Auth-Token": process.env.FOOTBALL_API_KEY },
    cache: "no-store",
  });
  const data = await res.json();
  const matches = data.matches ?? [];

  for (const m of matches) {
    await pool.query(
      `INSERT INTO matches
         (id, competition, home_team, away_team, home_score, away_score, status, utc_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         home_score = EXCLUDED.home_score,
         away_score = EXCLUDED.away_score,
         status = EXCLUDED.status,
         updated_at = now()`,
      [
        m.id,
        m.competition.name,
        m.homeTeam.name,
        m.awayTeam.name,
        m.score.fullTime.home,
        m.score.fullTime.away,
        m.status,
        m.utcDate,
      ]
    );
  }

  return matches.length;
}