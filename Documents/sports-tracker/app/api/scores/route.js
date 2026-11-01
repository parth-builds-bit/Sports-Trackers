export async function GET() {
  const res = await fetch("https://api.football-data.org/v4/matches", {
    headers: { "X-Auth-Token": process.env.FOOTBALL_API_KEY },
    cache: "no-store",
  });

  const data = await res.json();
  return Response.json(data);
}