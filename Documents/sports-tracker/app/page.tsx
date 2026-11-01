"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

function Score({ value }: { value: number | null }) {
  // key changes when the score changes, so the span re-mounts and plays the animation
  return (
    <motion.span
      key={String(value)}
      initial={{ scale: 1.8, color: "#facc15" }}
      animate={{ scale: 1, color: "#f4f4f5" }}
      transition={{ type: "spring", stiffness: 300, damping: 12 }}
      className="inline-block font-bold tabular-nums"
    >
      {value ?? "-"}
    </motion.span>
  );
}

function TeamRow(props: {
  name: string;
  score: number | null;
  fav: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center py-1">
      <motion.button
        onClick={props.onToggle}
        aria-label="Toggle favorite"
        whileTap={{ scale: 0.6 }}
        whileHover={{ scale: 1.3 }}
        animate={{ scale: props.fav ? [1, 1.6, 1] : 1 }}
        className={props.fav ? "text-yellow-400" : "text-zinc-600"}
      >
        ★
      </motion.button>
      <span className="flex-1 truncate px-2">{props.name}</span>
      <Score value={props.score} />
    </div>
  );
}

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loaded, setLoaded] = useState(false);
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
          setLoaded(true);
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

  const filters = [
    { key: "ALL", label: "All" },
    { key: "FAV", label: "★ Favorites" },
    ...competitions.map((c) => ({ key: c, label: c })),
  ];

  return (
    <main className="min-h-screen bg-zinc-950 p-4 text-zinc-100">
      <div className="mx-auto max-w-2xl">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold"
        >
          ⚽ My Football Scores
        </motion.h1>
        <p className="mb-4 text-sm text-zinc-500">Last updated: {updated}</p>

        <div className="mb-6 flex flex-wrap gap-2">
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="relative rounded-full bg-zinc-800 px-3 py-1 text-sm hover:bg-zinc-700"
              >
                {active && (
                  <motion.span
                    layoutId="active-pill"
                    className="absolute inset-0 rounded-full bg-white"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className={"relative " + (active ? "text-black" : "text-zinc-300")}>
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>

        {!loaded && <p className="animate-pulse text-zinc-500">Loading matches...</p>}

        {loaded && visible.length === 0 && (
          <p className="text-zinc-500">
            {filter === "FAV"
              ? "No favorite teams yet. Tap a ★ next to a team to add one."
              : "No matches to show."}
          </p>
        )}

        <AnimatePresence>
          {Object.entries(groups).map(([competition, list]) => (
            <motion.section
              key={competition}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-6"
            >
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                {competition}
              </h2>
              <div className="space-y-2">
                <AnimatePresence>
                  {list.map((m, i) => {
                    const badge = statusBadge(m);
                    return (
                      <motion.div
                        key={m.id}
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.05 } }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ y: -2, scale: 1.01 }}
                        className="flex items-center gap-3 rounded-xl bg-zinc-900 p-3"
                      >
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
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.section>
          ))}
        </AnimatePresence>
      </div>
    </main>
  );
}