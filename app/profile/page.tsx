import Link from "next/link";
import { TopNav } from "@/components/nav";
import { Recommender } from "@/components/recommender";
import { games } from "@/lib/seed";

export default function ProfilePage() {
  const totalHours = Math.round(
    games.reduce((s, g) => s + g.totalPlaytimeMin, 0) / 60
  );
  const sessions = games.reduce((s, g) => s + g.sessions.length, 0);

  // Top genres by playtime
  const byGenre = new Map<string, number>();
  for (const g of games) {
    const key = g.genre.split("/")[0].trim();
    byGenre.set(key, (byGenre.get(key) ?? 0) + g.totalPlaytimeMin);
  }
  const topGenres = [...byGenre.entries()].sort((a, b) => b[1] - a[1]);
  const maxGenre = topGenres[0]?.[1] ?? 1;

  return (
    <>
      <TopNav active="profile" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-[#38bdf8] text-xl font-bold text-white">
            K
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Karim&apos;s profile
            </h1>
            <p className="text-sm text-muted">
              Demo player ·{" "}
              <Link href="/connect" className="text-accent-soft hover:underline">
                link your Steam
              </Link>
            </p>
          </div>
        </div>

        <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Games tracked" value={String(games.length)} />
          <Stat label="Hours played" value={`${totalHours}h`} />
          <Stat label="Sessions logged" value={String(sessions)} />
          <Stat
            label="In progress"
            value={String(games.filter((g) => g.status === "playing").length)}
          />
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <section className="card p-6">
            <h2 className="text-base font-semibold">Top genres</h2>
            <p className="mt-1 text-sm text-muted">By time played</p>
            <div className="mt-5 space-y-4">
              {topGenres.map(([genre, min]) => (
                <div key={genre}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span>{genre}</span>
                    <span className="font-mono text-xs text-subtle">
                      {Math.round(min / 60)}h
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-accent-soft"
                      style={{ width: `${(min / maxGenre) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Recommender />
        </div>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <p className="font-mono text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-subtle">{label}</p>
    </div>
  );
}
