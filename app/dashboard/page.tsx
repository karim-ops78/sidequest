import Link from "next/link";
import { TopNav } from "@/components/nav";
import { GameCover, StatusBadge } from "@/components/game-bits";
import { games, formatPlaytime, timeAgo } from "@/lib/seed";

export default function DashboardPage() {
  const active = games.filter((g) => g.status === "playing");
  const totalHours = Math.round(
    games.reduce((s, g) => s + g.totalPlaytimeMin, 0) / 60
  );

  return (
    <>
      <TopNav active="library" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
            <p className="mt-1 text-sm text-muted">
              {games.length} games tracked · {totalHours}h played ·{" "}
              {active.length} in progress
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/connect"
              className="rounded-xl border border-border bg-elevated px-4 py-2 text-sm font-medium transition-colors hover:border-border-strong"
            >
              Import from Steam
            </Link>
            <Link
              href="/profile"
              className="rounded-xl border border-border bg-elevated px-4 py-2 text-sm font-medium transition-colors hover:border-border-strong"
            >
              What to play this weekend →
            </Link>
          </div>
        </div>

        {/* Resume strip */}
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-subtle">
            Jump back in
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {active.map((g) => {
              const last = g.sessions[0];
              return (
                <Link
                  key={g.id}
                  href={`/games/${g.id}`}
                  className="card card-hover flex gap-4 p-4"
                >
                  <GameCover
                    name=""
                    from={g.cover.from}
                    to={g.cover.to}
                    className="h-24 w-20 shrink-0 rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate font-semibold">{g.name}</h3>
                      <StatusBadge status={g.status} />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted">
                      {last
                        ? last.recap.whereIStopped
                        : g.memory.longTermSummary}
                    </p>
                    <p className="mt-2 font-mono text-xs text-subtle">
                      {formatPlaytime(g.totalPlaytimeMin)} · last played{" "}
                      {timeAgo(g.lastPlayed)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Full grid */}
        <section className="mt-10">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-subtle">
            All games
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {games.map((g) => (
              <Link
                key={g.id}
                href={`/games/${g.id}`}
                className="card card-hover group overflow-hidden"
              >
                <GameCover
                  name={g.name}
                  from={g.cover.from}
                  to={g.cover.to}
                  className="aspect-[3/2] w-full"
                />
                <div className="p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={g.status} />
                    <span className="font-mono text-xs text-subtle">
                      {formatPlaytime(g.totalPlaytimeMin)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-1 text-xs text-muted">
                    {g.genre}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
