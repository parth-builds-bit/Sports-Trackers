import { ALLOWED, cachedGet } from "@/lib/football";

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  if (!ALLOWED.includes(code)) {
    return Response.json({ error: "Unknown competition" }, { status: 404 });
  }

  try {
    // no matchday given -> ask the API which one is current
    let matchday = parseInt(params.get("matchday") ?? "", 10);
    if (!matchday) {
      const comp = await cachedGet("comp:" + code, `/competitions/${code}`, 21600000);
      matchday = comp.currentSeason?.currentMatchday ?? 1;
    }

    const data = await cachedGet(
      `fixtures:${code}:${matchday}`,
      `/competitions/${code}/matches?matchday=${matchday}`,
      300000
    );

    const name = data.competition?.name ?? code;
    const matches = (data.matches ?? []).map((m) => ({
      id: m.id,
      competition: name,
      home_team: m.homeTeam?.name ?? "TBD",
      away_team: m.awayTeam?.name ?? "TBD",
      home_team_id: m.homeTeam?.id ?? null,
      away_team_id: m.awayTeam?.id ?? null,
      home_crest: m.homeTeam?.crest ?? null,
      away_crest: m.awayTeam?.crest ?? null,
      home_score: m.score?.fullTime?.home ?? null,
      away_score: m.score?.fullTime?.away ?? null,
      status: m.status,
      utc_date: m.utcDate,
      matchday: m.matchday ?? matchday,
      venue: m.venue ?? null,
      referee: m.referees?.[0]?.name ?? null,
    }));

    return Response.json({ matchday, matches });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}