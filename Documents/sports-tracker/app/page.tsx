"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Match = {
  id: number;
  competition: string;
  home_team: string;
  away_team: string;
  home_crest: string | null;
  away_crest: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  utc_date: string;
};

function statusBadge(m: Match) {
  if (m.status === "IN_PLAY")
    return { text: "LIVE", cls: "bg-red-600 text-white animate-pulse" };
  if (m.status === "PAUSED") return { text: "HT", cls: "bg-amber-500 text-black" };
  if (m.status === "FINISHED")
    return { text: "FT", cls: "bg-[var(--chip)] text-[var(--muted)]" };
  const time = new Date(m.utc_date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { text: time, cls: "bg-[var(--chip)] text-[var(--muted)]" };
}

function Crest({ url }: { url: string | null }) {
  if (!url) return <span className="inline-block h-6 w-6" />;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-6 w-6 object-contain" />
    </>
  );
}

function Score({ value }: { value: number | null }) {
  return (
    <motion.span
      key={String(value)}
      initial={{ scale: 1.8 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 12 }}
      className="inline-block font-bold tabular-nums"
    >
      {value ?? "-"}
    </motion.span>
  );
}

function TeamRow(props: {
  name: string;
  crest: string | null;
  score: number | null;
  fav: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      <motion.button
        onClick={props.onToggle}
        aria-label="Toggle favorite"
        whileTap={{ scale: 0.6 }}
        whileHover={{ scale: 1.3 }}
        animate={{ scale: props.fav ? [1, 1.6, 1] : 1 }}
        className={props.fav ? "text-yellow-400" : "text-[var(--muted)]"}
      >
        ★
      </motion.button>
      <Crest url={props.crest} />
      <span className="flex-1 truncate">{props.name}</span>
      <Score value={props.score} />
    </div>
  );
}

function MatchCard(props: {
  m: Match;
  i: number;
  favorites: string[];
  onToggle: (team: string) => void;
}) {
  const { m, i, favorites, onToggle } = props;
  const badge = statusBadge(m);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.05 } }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2, scale: 1.01 }}
      className="flex items-center gap-3 rounded-xl bg-[var(--card)] p-3 shadow-sm"
    >
      <div className="flex-1">
        <TeamRow
          name={m.home_team}
          crest={m.home_crest}
          score={m.home_score}
          fav={favorites.includes(m.home_team)}
          onToggle={() => onToggle(m.home_team)}
        />
        <TeamRow
          name={m.away_team}
          crest={m.away_crest}
          score={m.away_score}
          fav={favorites.includes(m.away_team)}
          onToggle={() => onToggle(m.away_team)}
        />
      </div>
      <span className={"rounded px-2 py-1 text-xs font-semibold " + badge.cls}>
        {badge.text}
      </span>
    </motion.div>
  );
}

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [updated, setUpdated] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [theme, setTheme] = useState("dark");

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
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) setTheme(savedTheme);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

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

  const liveMatches = visible.filter(
    (m) => m.status === "IN_PLAY" || m.status === "PAUSED"
  );
  const showLive = filter === "ALL" && liveMatches.length > 0;
  const rest = showLive
    ? visible.filter((m) => !liveMatches.some((l) => l.id === m.id))
    : visible;

  const groups: Record<string, Match[]> = {};
  for (const m of rest) {
    (groups[m.competition] ??= []).push(m);
  }

  const filters = [
    { key: "ALL", label: "All" },
    { key: "FAV", label: "★ Favorites" },
    ...competitions.map((c) => ({ key: c, label: c })),
  ];

  return (
    <main className="min-h-screen p-4">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold"
            >
              ⚽ Live Football <span className="text-[var(--accent)]">Scores</span>
            </motion.h1>
            <p className="mb-4 text-sm text-[var(--muted)]">Last updated: {updated}</p>
          </div>
          <motion.button
            onClick={toggleTheme}
            whileTap={{ scale: 0.85, rotate: 20 }}
            aria-label="Switch theme"
            className="rounded-full bg-[var(--chip)] px-3 py-2 text-lg"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </motion.button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="relative rounded-full bg-[var(--chip)] px-3 py-1 text-sm"
              >
                {active && (
                  <motion.span
                    layoutId="active-pill"
                    className="absolute inset-0 rounded-full bg-[var(--accent)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span
                  className={
                    "relative " +
                    (active ? "text-[var(--on-accent)]" : "text-[var(--text)]")
                  }
                >
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>

        {!loaded && (
          <p className="animate-pulse text-[var(--muted)]">Loading matches...</p>
        )}

        {loaded && visible.length === 0 && (
          <p className="text-[var(--muted)]">
            {filter === "FAV"
              ? "No favorite teams yet. Tap a ★ next to a team to add one."
              : "No matches to show."}
          </p>
        )}

        {showLive && (
          <section className="mb-6">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-red-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              Live now
            </h2>
            <div className="space-y-2">
              <AnimatePresence>
                {liveMatches.map((m, i) => (
                  <MatchCard
                    key={m.id}
                    m={m}
                    i={i}
                    favorites={favorites}
                    onToggle={toggleFavorite}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
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
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                {competition}
              </h2>
              <div className="space-y-2">
                <AnimatePresence>
                  {list.map((m, i) => (
                    <MatchCard
                      key={m.id}
                      m={m}
                      i={i}
                      favorites={favorites}
                      onToggle={toggleFavorite}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          ))}
        </AnimatePresence>
      </div>
    </main>
  );
}