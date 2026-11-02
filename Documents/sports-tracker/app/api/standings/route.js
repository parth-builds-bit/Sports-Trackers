import { ALLOWED, cachedGet } from "@/lib/football";

export async function GET(request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!ALLOWED.includes(code)) {
    return Response.json({ error: "Unknown competition" }, { status: 404 });
  }

  try {
    const data = await cachedGet(
      "standings:" + code,
      `/competitions/${code}/standings`,
      600000
    );

    // a league has one TOTAL table, a cup has one per group
    const groups = (data.standings ?? [])
      .filter((s) => s.type === "TOTAL")
      .map((s) => ({
        name: s.group ?? null,
        table: (s.table ?? []).map((t) => ({
          position: t.position,
          team: t.team.name,
          crest: t.team.crest ?? null,
          played: t.playedGames,
          won: t.won,
          draw: t.draw,
          lost: t.lost,
          gd: t.goalDifference,
          points: t.points,
        })),
      }));

    return Response.json({ groups });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}