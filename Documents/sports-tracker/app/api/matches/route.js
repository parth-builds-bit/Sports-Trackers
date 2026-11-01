import { pool, syncMatches } from "@/lib/sync";

export async function GET() {
  let stale = true;
  try {
    const r = await pool.query("SELECT max(updated_at) AS last FROM matches");
    const last = r.rows[0].last;
    stale = !last || Date.now() - new Date(last).getTime() > 60000;
  } catch {
    stale = true; // the table may not exist yet
  }

  if (stale) await syncMatches();

  const { rows } = await pool.query("SELECT * FROM matches ORDER BY utc_date");
  return Response.json({ matches: rows });
}