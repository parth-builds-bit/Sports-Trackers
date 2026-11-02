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

  await pool.query(`
    ALTER TABLE matches
      ADD COLUMN IF NOT EXISTS home_crest TEXT,
      ADD COLUMN IF NOT EXISTS away_crest TEXT,
      ADD COLUMN IF NOT EXISTS matchday INTEGER,
      ADD COLUMN IF NOT EXISTS venue TEXT,
      ADD COLUMN IF NOT EXISTS referee TEXT,
      ADD COLUMN IF NOT EXISTS home_team_id INTEGER,
      ADD COLUMN IF NOT EXISTS away_team_id INTEGER
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
          home_score, away_score, status, utc_date, matchday, venue, referee,
          home_team_id, away_team_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET
         home_crest = EXCLUDED.home_crest,
         away_crest = EXCLUDED.away_crest,
         home_score = EXCLUDED.home_score,
         away_score = EXCLUDED.away_score,
         status = EXCLUDED.status,
         matchday = EXCLUDED.matchday,
         venue = EXCLUDED.venue,
         referee = EXCLUDED.referee,
         home_team_id = EXCLUDED.home_team_id,
         away_team_id = EXCLUDED.away_team_id,
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
        m.matchday ?? null,
        m.venue ?? null,
        m.referees?.[0]?.name ?? null,
        m.homeTeam.id,
        m.awayTeam.id,
      ]
    );
  }

  return matches.length;
}