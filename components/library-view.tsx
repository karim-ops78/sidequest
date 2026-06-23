"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadLibrary, SAMPLE_LIBRARY, type StoredGame } from "@/lib/library";

type Sort = "playtime" | "name";

export function LibraryView() {
  const [library, setLibrary] = useState<StoredGame[] | null>(null);
  const [isSample, setIsSample] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("playtime");

  useEffect(() => {
    const lib = loadLibrary();
    setLibrary(lib ?? SAMPLE_LIBRARY);
    setIsSample(!lib);
  }, []);

  const filtered = useMemo(() => {
    if (!library) return [];
    const q = query.trim().toLowerCase();
    const list = q
      ? library.filter((g) => g.name.toLowerCase().includes(q))
      : [...library];
    list.sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : b.playtimeMin - a.playtimeMin
    );
    return list;
  }, [library, query, sort]);

  if (!library) return null;

  const totalHours = Math.round(
    library.reduce((s, g) => s + g.playtimeMin, 0) / 60
  );
  const neverPlayed = library.filter((g) => g.playtimeMin === 0).length;

  if (library.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm text-muted">Your library is empty.</p>
        <Link
          href="/connect"
          className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.4)] transition-transform hover:-translate-y-0.5"
        >
          Connect your Steam →
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
          <p className="mt-1 text-sm text-muted">
            {library.length} games · {totalHours}h played · {neverPlayed} never
            launched
          </p>
          {isSample && (
            <p className="mt-1 font-mono text-xs text-subtle">
              Sample library ·{" "}
              <Link href="/connect" className="text-accent-soft hover:underline">
                import yours
              </Link>
            </p>
          )}
        </div>
        <Link
          href="/play"
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.4)] transition-transform hover:-translate-y-0.5"
        >
          What should I play? →
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your games…"
          className="flex-1 rounded-lg border border-border bg-elevated px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-subtle focus:border-accent"
        />
        <div className="flex gap-1 rounded-lg border border-border bg-elevated p-1">
          {(["playtime", "name"] as Sort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                sort === s
                  ? "bg-accent-dim text-accent-soft"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {s === "playtime" ? "Most played" : "A–Z"}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-subtle">
          No games match “{query}”.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((g) => (
            <a
              key={g.appid}
              href={`https://store.steampowered.com/app/${g.appid}`}
              target="_blank"
              rel="noreferrer"
              className="card card-hover group overflow-hidden"
            >
              <div className="aspect-[460/215] w-full bg-elevated">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.coverUrl}
                  alt={g.name}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="p-3.5">
                <p className="line-clamp-1 text-sm font-medium">{g.name}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="font-mono text-xs text-subtle">
                    {g.playtimeMin > 0
                      ? `${Math.round(g.playtimeMin / 60)}h played`
                      : "never played"}
                  </span>
                  {g.added && (
                    <span className="rounded-full border border-border-strong bg-elevated px-2 py-0.5 text-[10px] text-subtle">
                      added
                    </span>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
