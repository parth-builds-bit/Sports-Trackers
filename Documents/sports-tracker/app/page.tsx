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
  utc_date: string;
};

function statusBadge(m: Match) {
  if (m.status === "IN_PLAY")
    return { text: "LIVE", cls: "bg-red-600 text-white animate-pulse" };
  if (m.status === "PAUSED") return { text: "HT", cls: "bg-amber-500 text-black" };
  if (m.status === "FINISHED") return { text: "FT", cls: "bg-zinc-700 text-zinc-200" };
  const time = new Date(m.utc_date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { text: time, cls: "bg-zinc-800 text-zinc-300" };
}

function TeamRow(props: {
  name: string;
  score: number | null;
  fav: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center py-1">
      <button
        onClick={props.onToggle}
        aria-label="Toggle favorite"
        className={props.fav ? "text-yellow-400" : "text-zinc-600 hover:text-yellow-300"}
      >
        ★
      </button>
      <span className="flex-1 truncate px-2">{props.name}</span>
      <span className="font-bold tabular-nums">{props.score ?? "-"}</span>
    </div>
  );
}

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [updated, setUpdated] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [favorites, setFavorites] = useState<string[]>([]);

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem("favorites");
      if (saved) setFavorites(JSON.parse(saved));
    } catch {}
  }, []);

  function toggleFavorite(team: string) {
    const next = favorites.includes(team)
      ? favorites.filter((t) => t !== team)
      : [...favorites, team];
    setFavorites(next);
    try {
      localStorage.setItem("favorites", JSON.stringify(next));
    } catch {}
  }

  const competitions = Array.from(new Set(matches.map((m) => m.competition)));

  const visible = matches.filter((m) => {
    if (filter === "ALL") return true;
    if (filter === "FAV")
      return favorites.includes(m.home_team) || favorites.includes(m.away_team);
    return m.competition === filter;
  });

  const groups: Record<string, Match[]> = {};
  for (const m of visible) {
    (groups[m.competition] ??= []).push(m);
  }

  const pill = (active: boolean) =>
    "rounded-full px-3 py-1 text-sm " +
    (active ? "bg-white text-black" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700");

  return (
    <main className="min-h-screen bg-zinc-950 p-4 text-zinc-100">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">⚽ My Football Scores</h1>
        <p className="mb-4 text-sm text-zinc-500">Last updated: {updated}</p>

        <div className="mb-6 flex flex-wrap gap-2">
          <button className={pill(filter === "ALL")} onClick={() => setFilter("ALL")}>
            All
          </button>
          <button className={pill(filter === "FAV")} onClick={() => setFilter("FAV")}>
            ★ Favorites
          </button>
          {competitions.map((c) => (
            <button key={c} className={pill(filter === c)} onClick={() => setFilter(c)}>
              {c}
            </button>
          ))}
        </div>

        {visible.length === 0 && (
          <p className="text-zinc-500">
            {filter === "FAV"
              ? "No favorite teams yet. Tap a ★ next to a team to add one."
              : "No matches to show."}
          </p>
        )}

        {Object.entries(groups).map(([competition, list]) => (
          <section key={competition} className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
              {competition}
            </h2>
            <div className="space-y-2">
              {list.map((m) => {
                const badge = statusBadge(m);
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl bg-zinc-900 p-3">
                    <div className="flex-1">
                      <TeamRow
                        name={m.home_team}
                        score={m.home_score}
                        fav={favorites.includes(m.home_team)}
                        onToggle={() => toggleFavorite(m.home_team)}
                      />
                      <TeamRow
                        name={m.away_team}
                        score={m.away_score}
                        fav={favorites.includes(m.away_team)}
                        onToggle={() => toggleFavorite(m.away_team)}
                      />
                    </div>
                    <span className={"rounded px-2 py-1 text-xs font-semibold " + badge.cls}>
                      {badge.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}