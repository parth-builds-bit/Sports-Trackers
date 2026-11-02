"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Match = {
  id: number;
  competition: string;
  home_team: string;
  away_team: string;
  home_team_id: number | null;
  away_team_id: number | null;
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

type Group = { name: string | null; table: Row[] };

type Scorer = {
  name: string;
  nationality: string | null;
  team: string;
  crest: string | null;
  played: number | null;
  goals: number;
  assists: number | null;
  penalties: number | null;
};

type H2H = {
  played: number;
  goals: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  recent: {
    date: string;
    home: string;
    away: string;
    homeScore: number | null;
    awayScore: number | null;
  }[];
};

type TeamInfo = {
  name: string;
  crest: string | null;
  founded: number | null;
  venue: string | null;
  colors: string | null;
  website: string | null;
  coach: string | null;
  competitions: string[];
  squad: { name: string; position: string | null; nationality: string | null }[];
};

// the 12 competitions on the free plan
const COMPETITIONS = [
  { code: "PL", name: "Premier League" },
  { code: "ELC", name: "Championship" },
  { code: "PD", name: "La Liga" },
  { code: "SA", name: "Serie A" },
  { code: "BL1", name: "Bundesliga" },
  { code: "FL1", name: "Ligue 1" },
  { code: "DED", name: "Eredivisie" },
  { code: "PPL", name: "Primeira Liga" },
  { code: "BSA", name: "Brasileirão" },
  { code: "CL", name: "Champions League" },
  { code: "EC", name: "Euros" },
  { code: "WC", name: "World Cup" },
];

// the colours here are only for the little picker dots;
// the real values live in globals.css
const ACCENTS = [
  { key: "green", label: "Green", color: "#22c55e" },
  { key: "blue", label: "Blue", color: "#3b82f6" },
  { key: "purple", label: "Purple", color: "#8b5cf6" },
  { key: "orange", label: "Orange", color: "#f97316" },
  { key: "pink", label: "Pink", color: "#ec4899" },
];

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

const prettyGroup = (g: string) =>
  g.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

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
      className="filter-pill relative shrink-0 whitespace-nowrap rounded-full bg-[var(--chip)] px-3 py-1.5 text-sm"
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

// a row of pills that scrolls sideways on phones and wraps on bigger screens
function PillRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="filter-row no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
      {children}
    </div>
  );
}

function Crest({ url, size = "h-6 w-6" }: { url: string | null; size?: string }) {
  if (!url) return <span className={"inline-block shrink-0 " + size} />;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className={"shrink-0 object-contain " + size} />
    </>
  );
}

// grey placeholder cards shown while matches load
function CardSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 rounded-xl bg-[var(--card)] p-3"
        >
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-[var(--chip)]" />
              <div className="h-3 w-40 rounded bg-[var(--chip)]" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-[var(--chip)]" />
              <div className="h-3 w-32 rounded bg-[var(--chip)]" />
            </div>
          </div>
          <div className="h-6 w-12 rounded bg-[var(--chip)]" />
        </div>
      ))}
    </div>
  );
}

// grey placeholder rows shown while a table loads
function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2 rounded-xl bg-[var(--card)] p-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-5 rounded bg-[var(--chip)]" />
      ))}
    </div>
  );
}

function Score({ value }: { value: number | null }) {
  return (
    <motion.span
      key={String(value)}
      initial={{ scale: 1.8 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 12 }}
      className="font-display inline-block text-lg font-bold tabular-nums"
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
    <div className="team-row flex items-center gap-2 py-1">
      <motion.button
        onClick={(e) => {
          e.stopPropagation(); // don't open the details when only starring
          props.onToggle();
        }}
        aria-label="Toggle favorite"
        whileTap={{ scale: 0.6 }}
        whileHover={{ scale: 1.3 }}
        animate={{ scale: props.fav ? [1, 1.6, 1] : 1 }}
        className={"px-1 " + (props.fav ? "text-yellow-400" : "text-[var(--muted)]")}
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
      className="match-card flex cursor-pointer items-center gap-3 rounded-xl bg-[var(--card)] p-3 shadow-sm"
    >
      <div className="min-w-0 flex-1">
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

// pop-ups: a bottom sheet on phones, a centred card on bigger screens
function Overlay(props: { onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={props.onClose}
    >
      <motion.div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-[var(--card)] p-5 sm:max-w-md sm:rounded-2xl"
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        onClick={(e) => e.stopPropagation()}
      >
        {props.children}
      </motion.div>
    </motion.div>
  );
}

function MatchModal(props: {
  m: Match;
  onClose: () => void;
  onTeam: (id: number) => void;
}) {
  const { m, onClose, onTeam } = props;
  const [h2h, setH2h] = useState<H2H | null>(null);
  const [h2hError, setH2hError] = useState(false);

  useEffect(() => {
    setH2h(null);
    setH2hError(false);
    fetch("/api/h2h?match=" + m.id)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error("h2h failed");
        setH2h(data);
      })
      .catch(() => setH2hError(true));
  }, [m.id]);

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
    <Overlay onClose={onClose}>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">{m.competition}</p>
          {m.matchday && (
            <p className="text-xs text-[var(--muted)]">Matchday {m.matchday}</p>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="px-2 text-xl text-[var(--muted)]"
        >
          ✕
        </button>
      </div>

      <div className="mb-5 flex items-center justify-between text-center">
        <button
          onClick={() => m.home_team_id && onTeam(m.home_team_id)}
          className="flex w-1/3 flex-col items-center gap-2"
        >
          <Crest url={m.home_crest} size="h-12 w-12" />
          <span className="text-sm underline decoration-dotted">{m.home_team}</span>
        </button>
        <div>
          <p className="font-display text-4xl font-bold tabular-nums">
            {m.home_score ?? "-"} : {m.away_score ?? "-"}
          </p>
          <p className="text-xs text-[var(--muted)]">{statusText[m.status] ?? m.status}</p>
        </div>
        <button
          onClick={() => m.away_team_id && onTeam(m.away_team_id)}
          className="flex w-1/3 flex-col items-center gap-2"
        >
          <Crest url={m.away_crest} size="h-12 w-12" />
          <span className="text-sm underline decoration-dotted">{m.away_team}</span>
        </button>
      </div>

      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Kick-off</dt>
          <dd className="text-right">{kickoff}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Venue</dt>
          <dd className="text-right">{m.venue ?? "Not available"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--muted)]">Referee</dt>
          <dd className="text-right">{m.referee ?? "Not announced"}</dd>
        </div>
      </dl>

      <h3 className="font-display mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
        Head to head
      </h3>
      {!h2h && !h2hError && (
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-3/4 rounded bg-[var(--chip)]" />
          <div className="h-3 w-full rounded bg-[var(--chip)]" />
          <div className="h-3 w-full rounded bg-[var(--chip)]" />
        </div>
      )}
      {h2hError && (
        <p className="text-sm text-[var(--muted)]">Head to head is not available.</p>
      )}
      {h2h && h2h.played === 0 && (
        <p className="text-sm text-[var(--muted)]">No earlier meetings in the data.</p>
      )}
      {h2h && h2h.played > 0 && (
        <>
          <p className="mb-2 text-sm">
            Last {h2h.played} meetings: <b>{m.home_team}</b> {h2h.homeWins} wins ·{" "}
            {h2h.draws} draws · <b>{m.away_team}</b> {h2h.awayWins} wins
          </p>
          <ul className="space-y-1 text-xs text-[var(--muted)]">
            {h2h.recent.map((r, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="shrink-0">{new Date(r.date).toLocaleDateString()}</span>
                <span className="truncate text-right">
                  {r.home} {r.homeScore ?? "-"} : {r.awayScore ?? "-"} {r.away}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-4 text-xs text-[var(--muted)]">
        Goal scorers and line-ups are not included in the free data plan.
      </p>
    </Overlay>
  );
}

function TeamModal({ id, onClose }: { id: number; onClose: () => void }) {
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setTeam(null);
    setError("");
    fetch("/api/team?id=" + id)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load this team");
        setTeam(data.team);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  return (
    <Overlay onClose={onClose}>
      <div className="mb-3 flex justify-end">
        <button
          onClick={onClose}
          aria-label="Close"
          className="px-2 text-xl text-[var(--muted)]"
        >
          ✕
        </button>
      </div>
      {error && <p className="text-[var(--muted)]">{error}</p>}
      {!team && !error && (
        <div className="animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-[var(--chip)]" />
            <div className="h-5 w-40 rounded bg-[var(--chip)]" />
          </div>
          <div className="h-4 w-full rounded bg-[var(--chip)]" />
          <div className="h-4 w-full rounded bg-[var(--chip)]" />
          <div className="h-4 w-2/3 rounded bg-[var(--chip)]" />
        </div>
      )}
      {team && (
        <>
          <div className="mb-4 flex items-center gap-3">
            <Crest url={team.crest} size="h-14 w-14" />
            <div>
              <h2 className="font-display text-xl font-bold">{team.name}</h2>
              {team.coach && <p className="text-sm text-[var(--muted)]">Coach: {team.coach}</p>}
            </div>
          </div>

          <dl className="space-y-2 text-sm">
            {team.founded && (
              <div className="flex justify-between">
                <dt className="text-[var(--muted)]">Founded</dt>
                <dd>{team.founded}</dd>
              </div>
            )}
            {team.venue && (
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Stadium</dt>
                <dd className="text-right">{team.venue}</dd>
              </div>
            )}
            {team.colors && (
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Club colours</dt>
                <dd className="text-right">{team.colors}</dd>
              </div>
            )}
            {team.competitions.length > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--muted)]">Playing in</dt>
                <dd className="text-right">{team.competitions.join(", ")}</dd>
              </div>
            )}
          </dl>

          <h3 className="font-display mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Squad
          </h3>
          {team.squad.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              The squad list is not included in the free data plan.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {team.squad.map((p, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">{p.name}</span>
                  <span className="text-xs text-[var(--muted)]">{p.position ?? ""}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Overlay>
  );
}

function StandingsTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-[var(--card)] p-2">
      <table className="w-full text-xs sm:text-sm">
        <thead className="text-xs text-[var(--muted)]">
          <tr>
            <th className="px-1 py-2 text-left sm:px-2">#</th>
            <th className="px-1 py-2 text-left sm:px-2">Team</th>
            <th className="px-1 py-2 sm:px-2">P</th>
            <th className="px-1 py-2 sm:px-2">W</th>
            <th className="px-1 py-2 sm:px-2">D</th>
            <th className="px-1 py-2 sm:px-2">L</th>
            <th className="px-1 py-2 sm:px-2">GD</th>
            <th className="px-1 py-2 sm:px-2">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.team} className="border-t border-[var(--chip)] text-center">
              <td className="px-1 py-2 text-left sm:px-2">{r.position}</td>
              <td className="px-1 py-2 text-left sm:px-2">
                <div className="flex items-center gap-2">
                  <Crest url={r.crest} size="h-5 w-5" />
                  <span className="truncate">{r.team}</span>
                </div>
              </td>
              <td className="px-1 py-2 sm:px-2">{r.played}</td>
              <td className="px-1 py-2 sm:px-2">{r.won}</td>
              <td className="px-1 py-2 sm:px-2">{r.draw}</td>
              <td className="px-1 py-2 sm:px-2">{r.lost}</td>
              <td className="px-1 py-2 sm:px-2">{r.gd}</td>
              <td className="font-display px-1 py-2 font-bold sm:px-2">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScorersTable({ rows }: { rows: Scorer[] }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-[var(--card)] p-2">
      <table className="w-full text-xs sm:text-sm">
        <thead className="text-xs text-[var(--muted)]">
          <tr>
            <th className="px-1 py-2 text-left sm:px-2">#</th>
            <th className="px-1 py-2 text-left sm:px-2">Player</th>
            <th className="px-1 py-2 sm:px-2">P</th>
            <th className="px-1 py-2 sm:px-2">Goals</th>
            <th className="px-1 py-2 sm:px-2">Ast</th>
            <th className="px-1 py-2 sm:px-2">Pen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name + i} className="border-t border-[var(--chip)] text-center">
              <td className="px-1 py-2 text-left sm:px-2">{i + 1}</td>
              <td className="px-1 py-2 text-left sm:px-2">
                <div className="flex items-center gap-2">
                  <Crest url={r.crest} size="h-5 w-5" />
                  <div className="min-w-0">
                    <p className="truncate">{r.name}</p>
                    <p className="truncate text-xs text-[var(--muted)]">{r.team}</p>
                  </div>
                </div>
              </td>
              <td className="px-1 py-2 sm:px-2">{r.played ?? "-"}</td>
              <td className="font-display px-1 py-2 font-bold sm:px-2">{r.goals}</td>
              <td className="px-1 py-2 sm:px-2">{r.assists ?? "-"}</td>
              <td className="px-1 py-2 sm:px-2">{r.penalties ?? "-"}</td>
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
  const [accent, setAccent] = useState("green");
  const [view, setView] = useState("matches");
  const [day, setDay] = useState("today");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [extraMatch, setExtraMatch] = useState<Match | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);

  const [leagueCode, setLeagueCode] = useState("PL");
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [tableError, setTableError] = useState("");
  const [scorers, setScorers] = useState<Scorer[] | null>(null);
  const [scorersError, setScorersError] = useState("");
  const [fixtures, setFixtures] = useState<Match[] | null>(null);
  const [fixturesError, setFixturesError] = useState("");
  const [matchday, setMatchday] = useState<number | null>(null);
  const [requestedMatchday, setRequestedMatchday] = useState<number | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/matches")
        .then((res) => res.json())
        .then((data) => {
          setMatches(data.matches ?? []);
          setUpdated(new Date().toLocaleTimeString());
          setLoaded(true);
        })
        .catch(() => setLoaded(true));

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
      const savedAccent = localStorage.getItem("accent");
      if (savedAccent) setAccent(savedAccent);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setTeamId(null);
        setSelectedId(null);
        setExtraMatch(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (view !== "standings") return;
    setGroups(null);
    setTableError("");
    fetch("/api/standings?code=" + leagueCode)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load the table");
        setGroups(data.groups);
      })
      .catch((err) => setTableError(err.message));
  }, [view, leagueCode]);

  useEffect(() => {
    if (view !== "scorers") return;
    setScorers(null);
    setScorersError("");
    fetch("/api/scorers?code=" + leagueCode)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load top scorers");
        setScorers(data.scorers);
      })
      .catch((err) => setScorersError(err.message));
  }, [view, leagueCode]);

  useEffect(() => {
    if (view !== "fixtures") return;
    setFixtures(null);
    setFixturesError("");
    const query =
      "/api/fixtures?code=" + leagueCode + (requestedMatchday ? "&matchday=" + requestedMatchday : "");
    fetch(query)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load fixtures");
        setFixtures(data.matches);
        setMatchday(data.matchday);
      })
      .catch((err) => setFixturesError(err.message));
  }, [view, leagueCode, requestedMatchday]);

  function selectLeague(code: string) {
    setLeagueCode(code);
    setRequestedMatchday(null); // back to the current matchday
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  function chooseAccent(key: string) {
    setAccent(key);
    try {
      localStorage.setItem("accent", key);
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

  function openTeam(id: number) {
    setSelectedId(null); // close the match pop-up, open the team one
    setExtraMatch(null);
    setTeamId(id);
  }

  const competitions = Array.from(new Set(matches.map((m) => m.competition)));

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

  const groupsByLeague: Record<string, Match[]> = {};
  for (const m of visible) {
    (groupsByLeague[m.competition] ??= []).push(m);
  }

  // fixtures grouped by date
  const fixturesByDate: Record<string, Match[]> = {};
  for (const m of fixtures ?? []) {
    const label = new Date(m.utc_date).toLocaleDateString([], {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    (fixturesByDate[label] ??= []).push(m);
  }

  const modalMatch = matches.find((m) => m.id === selectedId) ?? extraMatch;

  const leagueFilters = [
    { key: "ALL", label: "All" },
    { key: "FAV", label: "★ Favorites" },
    ...competitions.map((c) => ({ key: c, label: c })),
  ];

  const views = [
    { key: "matches", label: "Matches" },
    { key: "fixtures", label: "Fixtures" },
    { key: "standings", label: "Standings" },
    { key: "scorers", label: "Top scorers" },
  ];

  const sectionTitle =
    "section-title font-display mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]";

  return (
    <main className="tracker-shell min-h-screen overflow-x-hidden p-3 sm:p-4">
      <div className="tracker-container mx-auto max-w-2xl">
        <div className="tracker-header flex items-start justify-between gap-3">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-2xl font-bold sm:text-3xl"
            >
              ⚽ Live Football <span className="text-[var(--accent)]">Scores</span>
            </motion.h1>
            <p className="mb-3 text-sm text-[var(--muted)]">Last updated: {updated}</p>
          </div>
          <motion.button
            onClick={toggleTheme}
            whileTap={{ scale: 0.85, rotate: 20 }}
            aria-label="Switch theme"
            className="shrink-0 rounded-full bg-[var(--chip)] px-3 py-2 text-lg"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </motion.button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <span className="text-xs text-[var(--muted)]">Accent</span>
          {ACCENTS.map((a) => (
            <motion.button
              key={a.key}
              onClick={() => chooseAccent(a.key)}
              whileTap={{ scale: 0.8 }}
              whileHover={{ scale: 1.15 }}
              aria-label={a.label + " accent"}
              style={{ backgroundColor: a.color }}
              className={
                "h-6 w-6 rounded-full " +
                (accent === a.key
                  ? "ring-2 ring-[var(--text)] ring-offset-2 ring-offset-[var(--bg)]"
                  : "")
              }
            />
          ))}
        </div>

        <PillRow>
          {views.map((v) => (
            <Pill
              key={v.key}
              active={view === v.key}
              label={v.label}
              layoutId="view-pill"
              onClick={() => setView(v.key)}
            />
          ))}
        </PillRow>

        {view === "matches" && (
          <>
            <PillRow>
              {DAYS.map((d) => (
                <Pill
                  key={d.key}
                  active={day === d.key}
                  label={d.label}
                  layoutId="day-pill"
                  onClick={() => setDay(d.key)}
                />
              ))}
            </PillRow>

            <PillRow>
              {leagueFilters.map((f) => (
                <Pill
                  key={f.key}
                  active={filter === f.key}
                  label={f.label}
                  layoutId="league-pill"
                  onClick={() => setFilter(f.key)}
                />
              ))}
            </PillRow>

            {!loaded && <CardSkeletons count={5} />}

            {loaded && visible.length === 0 && !showLive && (
              <p className="text-[var(--muted)]">
                {filter === "FAV"
                  ? "No matches for your favorite teams on this day. Tap a ★ next to a team to add one."
                  : "No matches on this day."}
              </p>
            )}

            {showLive && (
              <section className="mb-6">
                <h2 className="font-display mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-red-500">
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
              {Object.entries(groupsByLeague).map(([competition, list]) => (
                <motion.section
                  key={competition}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-6"
                >
                  <h2 className={sectionTitle}>{competition}</h2>
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

        {view !== "matches" && (
          <PillRow>
            {COMPETITIONS.map((c) => (
              <Pill
                key={c.code}
                active={leagueCode === c.code}
                label={c.name}
                layoutId="table-pill"
                onClick={() => selectLeague(c.code)}
              />
            ))}
          </PillRow>
        )}

        {view === "fixtures" && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => setRequestedMatchday(Math.max(1, (matchday ?? 1) - 1))}
                disabled={!matchday || matchday <= 1}
                className="rounded-full bg-[var(--chip)] px-5 py-2 disabled:opacity-40"
              >
                ‹
              </button>
              <span className="font-display text-lg font-semibold">
                Matchday {matchday ?? "..."}
              </span>
              <button
                onClick={() => setRequestedMatchday((matchday ?? 0) + 1)}
                disabled={!matchday}
                className="rounded-full bg-[var(--chip)] px-5 py-2 disabled:opacity-40"
              >
                ›
              </button>
            </div>

            {fixturesError && <p className="text-[var(--muted)]">{fixturesError}</p>}
            {!fixtures && !fixturesError && <CardSkeletons count={5} />}
            {fixtures && fixtures.length === 0 && (
              <p className="text-[var(--muted)]">No matches for this matchday.</p>
            )}

            {Object.entries(fixturesByDate).map(([date, list]) => (
              <section key={date} className="mb-6">
                <h2 className={sectionTitle}>{date}</h2>
                <div className="space-y-2">
                  {list.map((m, i) => (
                    <MatchCard
                      key={m.id}
                      m={m}
                      i={i}
                      favorites={favorites}
                      onToggle={toggleFavorite}
                      onOpen={() => setExtraMatch(m)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}

        {view === "standings" && (
          <>
            {tableError && <p className="text-[var(--muted)]">{tableError}</p>}
            {!groups && !tableError && <TableSkeleton />}
            {groups && groups.length === 0 && (
              <p className="text-[var(--muted)]">No table data for this competition yet.</p>
            )}
            {groups &&
              groups.map((g, i) => (
                <section key={(g.name ?? "table") + i} className="mb-6">
                  {g.name && <h2 className={sectionTitle}>{prettyGroup(g.name)}</h2>}
                  <StandingsTable rows={g.table} />
                </section>
              ))}
          </>
        )}

        {view === "scorers" && (
          <>
            {scorersError && <p className="text-[var(--muted)]">{scorersError}</p>}
            {!scorers && !scorersError && <TableSkeleton />}
            {scorers && scorers.length === 0 && (
              <p className="text-[var(--muted)]">No scorer data for this competition yet.</p>
            )}
            {scorers && scorers.length > 0 && <ScorersTable rows={scorers} />}
          </>
        )}
      </div>

      <AnimatePresence>
        {modalMatch && (
          <MatchModal
            key={"match" + modalMatch.id}
            m={modalMatch}
            onClose={() => {
              setSelectedId(null);
              setExtraMatch(null);
            }}
            onTeam={openTeam}
          />
        )}
        {teamId !== null && (
          <TeamModal key={"team" + teamId} id={teamId} onClose={() => setTeamId(null)} />
        )}
      </AnimatePresence>
    </main>
  );
}
