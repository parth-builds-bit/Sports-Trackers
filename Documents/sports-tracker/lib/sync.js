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

  // adds the new columns to your existing table (does nothing if they already exist)
  await pool.query(`
    ALTER TABLE matches
      ADD COLUMN IF NOT EXISTS home_crest TEXT,
      ADD COLUMN IF NOT EXISTS away_crest TEXT
  `);

  const day = (offset) =>
    new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
  const url = `https://api.football-data.org/v4/matches?dateFrom=${day(-1)}&dateTo=${day(2)}`;

  const res = await fetch(url, {
    headers: { "X-Auth-Token": process.env.FOOTBALL_API_KEY },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Football API error " + res.status);
  const data = await res.json();
  const matches = data.matches ?? [];

  for (const m of matches) {
    await pool.query(
      `INSERT INTO matches
         (id, competition, home_team, away_team, home_crest, away_crest,
          home_score, away_score, status, utc_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         home_crest = EXCLUDED.home_crest,
         away_crest = EXCLUDED.away_crest,
         home_score = EXCLUDED.home_score,
         away_score = EXCLUDED.away_score,
         status = EXCLUDED.status,
         updated_at = now()`,
      [
        m.id,
        m.competition.name,
        m.homeTeam.name,
        m.awayTeam.name,
        m.homeTeam.crest,
        m.awayTeam.crest,
        m.score.fullTime.home,
        m.score.fullTime.away,
        m.status,
        m.utcDate,
      ]
    );
  }

  return matches.length;
}