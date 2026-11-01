import { syncMatches } from "@/lib/sync";

export async function GET() {
  const saved = await syncMatches();
  return Response.json({ saved });
}