"use client";

import { useEffect, useState } from "react";

type Match = {
  id: number;
  competition: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
};

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [updated, setUpdated] = useState("");

  useEffect(() => {
    const load = () =>
      fetch("/api/matches")
        .then((res) => res.json())
        .then((data) => {
          setMatches(data.matches ?? []);
          setUpdated(new Date().toLocaleTimeString());
        });

    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main>
      <h1>My Football Scores</h1>
      <p>Last updated: {updated}</p>
      {matches.map((m) => (
        <p key={m.id}>
          {m.competition}: {m.home_team} {m.home_score ?? "-"} :{" "}
          {m.away_score ?? "-"} {m.away_team} ({m.status})
        </p>
      ))}
    </main>
  );
}