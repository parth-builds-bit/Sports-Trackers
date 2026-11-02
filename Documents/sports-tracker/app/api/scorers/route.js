import { ALLOWED, cachedGet } from "@/lib/football";

export async function GET(request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!ALLOWED.includes(code)) {
    return Response.json({ error: "Unknown competition" }, { status: 404 });
  }

  try {
    const data = await cachedGet(
      "scorers:" + code,
      `/competitions/${code}/scorers?limit=20`,
      600000
    );
    const scorers = (data.scorers ?? []).map((s) => ({
      name: s.player?.name,
      nationality: s.player?.nationality ?? null,
      team: s.team?.name,
      crest: s.team?.crest ?? null,
      played: s.playedMatches ?? null,
      goals: s.goals ?? 0,
      assists: s.assists ?? null,
      penalties: s.penalties ?? null,
    }));
    return Response.json({ scorers });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}