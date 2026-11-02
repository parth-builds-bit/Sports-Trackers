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
  matchday: number | null;
  venue: string | null;
  referee: string | null;
};

type Row = {
  position: number;
  team: string;
  crest: string | null;
  played: number;
  won: number;
  draw: number;
  lost: number;
  gd: number;
  points: number;
};

const DAYS = [
  { key: "yesterday", label: "Yesterday", offset: -1 },
  { key: "today", label: "Today", offset: 0 },
  { key: "tomorrow", label: "Tomorrow", offset: 1 },
];

function dayKeyOf(iso: string) {
  const d = new Date(iso).toDateString();
  for (const day of DAYS) {
    const t = new Date();
    t.setDate(t.getDate() + day.offset);
    if (t.toDateString() === d) return day.key;
  }
  return "other";
}

const isLive = (m: Match) => m.status === "IN_PLAY" || m.status === "PAUSED";

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

function Pill(props: {
  active: boolean;
  label: string;
  layoutId: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={props.onClick}
      className="relative rounded-full bg-[var(--chip)] px-3 py-1 text-sm"
    >
      {props.active && (
        <motion.span
          layoutId={props.layoutId}
          className="absolute inset-0 rounded-full bg-[var(--accent)]"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <span
        className={
          "relative " + (props.active ? "text-[var(--on-accent)]" : "text-[var(--text)]")
        }
      >
        {props.label}
      </span>
    </button>
  );
}

function Crest({ url, size = "h-6 w-6" }: { url: string | null; size?: string }) {
  if (!url) return <span className={"inline-block " + size} />;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className={size + " object-contain"} />
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
        onClick={(e) => {
          e.stopPropagation(); // don't open the details when only starring
          props.onToggle();
        }}
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
  onOpen: (id: number) => void;
}) {
  const { m, i, favorites, onToggle, onOpen } = props;
  const badge = statusBadge(m);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.05 } }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2, scale: 1.01 }}
      onClick={() => onOpen(m.id)}
      className="flex cursor-pointer items-center gap-3 rounded-xl bg-[var(--card)] p-3 shadow-sm"
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

function MatchModal({ m, onClose }: { m: Match; onClose: () => void }) {
  const kickoff = new Date(m.utc_date).toLocaleString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const statusText: Record<string, string> = {
    TIMED: "Scheduled",
    SCHEDULED: "Scheduled",
    IN_PLAY: "Live",
    PAUSED: "Half-time",
    FINISHED: "Full time",
    POSTPONED: "Postponed",
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md rounded-2xl bg-[var(--card)] p-5"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">{m.competition}</p>
            {m.matchday && (
              <p className="text-xs text-[var(--muted)]">Matchday {m.matchday}</p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-xl text-[var(--muted)]">
            ✕
          </button>
        </div>

        <div className="mb-5 flex items-center justify-between text-center">
          <div className="flex w-1/3 flex-col items-center gap-2">
            <Crest url={m.home_crest} size="h-12 w-12" />
            <span className="text-sm">{m.home_team}</span>
          </div>
          <div>
            <p className="text-3xl font-bold tabular-nums">
              {m.home_score ?? "-"} : {m.away_score ?? "-"}
            </p>
            <p className="text-xs text-[var(--muted)]">{statusText[m.status] ?? m.status}</p>
          </div>
          <div className="flex w-1/3 flex-col items-center gap-2">
            <Crest url={m.away_crest} size="h-12 w-12" />
            <span className="text-sm">{m.away_team}</span>
          </div>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Kick-off</dt>
            <dd>{kickoff}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Venue</dt>
            <dd>{m.venue ?? "Not available"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Referee</dt>
            <dd>{m.referee ?? "Not announced"}</dd>
          </div>
        </dl>

        <p className="mt-4 text-xs text-[var(--muted)]">
          Goal scorers and line-ups are not included in the free data plan.
        </p>
      </motion.div>
    </motion.div>
  );
}

function StandingsTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-[var(--card)] p-2">
      <table className="w-full text-sm">
        <thead className="text-xs text-[var(--muted)]">
          <tr>
            <th className="px-2 py-2 text-left">#</th>
            <th className="px-2 py-2 text-left">Team</th>
            <th className="px-2 py-2">P</th>
            <th className="px-2 py-2">W</th>
            <th className="px-2 py-2">D</th>
            <th className="px-2 py-2">L</th>
            <th className="px-2 py-2">GD</th>
            <th className="px-2 py-2">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.team} className="border-t border-[var(--chip)] text-center">
              <td className="px-2 py-2 text-left">{r.position}</td>
              <td className="px-2 py-2 text-left">
                <div className="flex items-center gap-2">
                  <Crest url={r.crest} size="h-5 w-5" />
                  <span className="truncate">{r.team}</span>
                </div>
              </td>
              <td className="px-2 py-2">{r.played}</td>
              <td className="px-2 py-2">{r.won}</td>
              <td className="px-2 py-2">{r.draw}</td>
              <td className="px-2 py-2">{r.lost}</td>
              <td className="px-2 py-2">{r.gd}</td>
              <td className="px-2 py-2 font-bold">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [updated, setUpdated] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [theme, setTheme] = useState("dark");
  const [view, setView] = useState("matches");
  const [day, setDay] = useState("today");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tableLeague, setTableLeague] = useState("");
  const [table, setTable] = useState<Row[] | null>(null);
  const [tableError, setTableError] = useState("");

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const competitions = Array.from(new Set(matches.map((m) => m.competition)));
  const league = tableLeague || competitions[0] || "";

  useEffect(() => {
    if (view !== "standings" || !league) return;
    setTable(null);
    setTableError("");
    fetch("/api/standings?competition=" + encodeURIComponent(league))
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load the table");
        setTable(data.table);
      })
      .catch((err) => setTableError(err.message));
  }, [view, league]);

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

  const passesFilter = (m: Match) => {
    if (filter === "ALL") return true;
    if (filter === "FAV")
      return favorites.includes(m.home_team) || favorites.includes(m.away_team);
    return m.competition === filter;
  };

  const liveMatches = matches.filter((m) => isLive(m) && passesFilter(m));
  const showLive = day === "today" && filter === "ALL" && liveMatches.length > 0;

  const visible = matches.filter(
    (m) =>
      passesFilter(m) &&
      dayKeyOf(m.utc_date) === day &&
      !(showLive && isLive(m))
  );

  const groups: Record<string, Match[]> = {};
  for (const m of visible) {
    (groups[m.competition] ??= []).push(m);
  }

  const selected = matches.find((m) => m.id === selectedId) ?? null;

  const leagueFilters = [
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

        <div className="mb-4 flex gap-2">
          <Pill
            active={view === "matches"}
            label="Matches"
            layoutId="view-pill"
            onClick={() => setView("matches")}
          />
          <Pill
            active={view === "standings"}
            label="Standings"
            layoutId="view-pill"
            onClick={() => setView("standings")}
          />
        </div>

        {view === "matches" && (
          <>
            <div className="mb-3 flex gap-2">
              {DAYS.map((d) => (
                <Pill
                  key={d.key}
                  active={day === d.key}
                  label={d.label}
                  layoutId="day-pill"
                  onClick={() => setDay(d.key)}
                />
              ))}
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              {leagueFilters.map((f) => (
                <Pill
                  key={f.key}
                  active={filter === f.key}
                  label={f.label}
                  layoutId="league-pill"
                  onClick={() => setFilter(f.key)}
                />
              ))}
            </div>

            {!loaded && (
              <p className="animate-pulse text-[var(--muted)]">Loading matches...</p>
            )}

            {loaded && visible.length === 0 && !showLive && (
              <p className="text-[var(--muted)]">
                {filter === "FAV"
                  ? "No matches for your favorite teams on this day. Tap a ★ next to a team to add one."
                  : "No matches on this day."}
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
                        onOpen={setSelectedId}
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
                          onOpen={setSelectedId}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.section>
              ))}
            </AnimatePresence>
          </>
        )}

        {view === "standings" && (
          <>
            <div className="mb-6 flex flex-wrap gap-2">
              {competitions.map((c) => (
                <Pill
                  key={c}
                  active={league === c}
                  label={c}
                  layoutId="table-pill"
                  onClick={() => setTableLeague(c)}
                />
              ))}
            </div>

            {tableError && <p className="text-[var(--muted)]">{tableError}</p>}
            {!table && !tableError && (
              <p className="animate-pulse text-[var(--muted)]">Loading table...</p>
            )}
            {table && table.length === 0 && (
              <p className="text-[var(--muted)]">No table data for this league yet.</p>
            )}
            {table && table.length > 0 && <StandingsTable rows={table} />}
          </>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <MatchModal key={selected.id} m={selected} onClose={() => setSelectedId(null)} />
        )}
      </AnimatePresence>
    </main>
  );
}