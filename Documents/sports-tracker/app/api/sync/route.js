import { syncMatches } from "@/lib/sync";

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  // reject everyone who doesn't send the secret
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const saved = await syncMatches();
    return Response.json({ saved });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}