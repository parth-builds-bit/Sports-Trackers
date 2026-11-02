import { cachedGet } from "@/lib/football";

export async function GET(request) {
  const id = new URL(request.url).searchParams.get("match");
  if (!id) return Response.json({ error: "Missing match id" }, { status: 400 });

  try {
    const data = await cachedGet("h2h:" + id, `/matches/${id}/head2head?limit=10`, 3600000);
    const a = data.aggregates ?? {};
    return Response.json({
      played: a.numberOfMatches ?? 0,
      goals: a.totalGoals ?? 0,
      homeWins: a.homeTeam?.wins ?? 0,
      draws: a.homeTeam?.draws ?? 0,
      awayWins: a.awayTeam?.wins ?? 0,
      recent: (data.matches ?? []).slice(0, 5).map((m) => ({
        date: m.utcDate,
        home: m.homeTeam?.name,
        away: m.awayTeam?.name,
        homeScore: m.score?.fullTime?.home ?? null,
        awayScore: m.score?.fullTime?.away ?? null,
      })),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}