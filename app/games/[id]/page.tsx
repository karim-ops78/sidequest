import Link from "next/link";
import { notFound } from "next/navigation";
import { TopNav } from "@/components/nav";
import { GameCover, StatusBadge } from "@/components/game-bits";
import { getGame, formatPlaytime, timeAgo } from "@/lib/seed";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  return (
    <>
      <TopNav active="library" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
        <Link
          href="/dashboard"
          className="text-sm text-subtle transition-colors hover:text-foreground"
        >
          ← Library
        </Link>

        {/* Header */}
        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end">
          <GameCover
            name=""
            from={game.cover.from}
            to={game.cover.to}
            className="h-40 w-full rounded-xl sm:h-32 sm:w-52"
          />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                {game.name}
              </h1>
              <StatusBadge status={game.status} />
            </div>
            <p className="mt-1 text-sm text-muted">{game.genre}</p>
            <div className="mt-3 flex flex-wrap gap-5 font-mono text-xs text-subtle">
              <span>{formatPlaytime(game.totalPlaytimeMin)} played</span>
              <span>last played {timeAgo(game.lastPlayed)}</span>
              <span>{game.sessions.length} logged sessions</span>
            </div>
          </div>
        </div>

        {/* Resume My Game — the wow card */}
        <section className="mt-8">
          <div className="card glow-border p-6">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-accent-dim text-accent-soft">
                ↺
              </span>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-accent-soft">
                Resume my game
              </h2>
            </div>
            <p className="mt-4 text-[15px] leading-7 text-foreground">
              {game.memory.longTermSummary}
            </p>
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-subtle">
                Open objectives
              </p>
              <ul className="space-y-2">
                {game.memory.currentObjectives.map((o) => (
                  <li key={o} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span className="text-muted">{o}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Sessions timeline */}
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-widest text-subtle">
              Session history
            </h2>
            <button className="rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm font-medium transition-colors hover:border-border-strong">
              + Log a session
            </button>
          </div>

          {game.sessions.length === 0 ? (
            <div className="card grid place-items-center p-10 text-center">
              <p className="text-sm text-muted">
                No sessions logged yet. Add notes or a screenshot to generate
                your first recap.
              </p>
            </div>
          ) : (
            <ol className="relative space-y-4 border-l border-border pl-6">
              {game.sessions.map((s) => (
                <li key={s.id} className="relative">
                  <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-accent" />
                  <div className="card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs text-subtle">
                        {timeAgo(s.date)} · {s.durationMin} min
                      </span>
                      <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-subtle">
                        {s.source}
                      </span>
                    </div>
                    <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                      <RecapField label="What I did" value={s.recap.whatIDid} />
                      <RecapField
                        label="Where I stopped"
                        value={s.recap.whereIStopped}
                      />
                      <RecapField
                        label="Next objective"
                        value={s.recap.nextObjective}
                        accent
                      />
                    </dl>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </>
  );
}

function RecapField({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <dt className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-subtle">
        {label}
      </dt>
      <dd
        className={`text-sm leading-6 ${
          accent ? "text-accent-soft" : "text-muted"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
