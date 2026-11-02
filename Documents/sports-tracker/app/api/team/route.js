import { cachedGet } from "@/lib/football";

export async function GET(request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing team id" }, { status: 400 });

  try {
    const t = await cachedGet("team:" + id, `/teams/${id}`, 86400000);
    return Response.json({
      team: {
        name: t.name,
        crest: t.crest ?? null,
        founded: t.founded ?? null,
        venue: t.venue ?? null,
        colors: t.clubColors ?? null,
        website: t.website ?? null,
        coach: t.coach?.name ?? null,
        competitions: (t.runningCompetitions ?? []).map((c) => c.name),
        squad: (t.squad ?? []).map((p) => ({
          name: p.name,
          position: p.position ?? null,
          nationality: p.nationality ?? null,
        })),
      },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 502 });
  }
}