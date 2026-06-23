"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  suggestGamesToAdd,
  searchGamesToAdd,
  type SuggestedGame,
} from "@/app/connect/actions";
import type { StoreHit } from "@/lib/steam";
import {
  addGameToLibrary,
  loadLibrary,
  loadProfile,
  type StoredGame,
} from "@/lib/library";

export function AddGames({ seed }: { seed: StoredGame[] }) {
  const [library, setLibrary] = useState<StoredGame[]>(seed);
  const [suggestions, setSuggestions] = useState<SuggestedGame[] | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [loadingSuggest, startSuggest] = useTransition();

  const [term, setTerm] = useState("");
  const [results, setResults] = useState<StoreHit[]>([]);
  const [searching, startSearch] = useTransition();

  const ownedIds = useMemo(
    () => new Set(library.map((g) => g.appid)),
    [library]
  );

  // Fetch AI suggestions once, based on the imported library + profile genres.
  useEffect(() => {
    const lib = loadLibrary() ?? seed;
    startSuggest(async () => {
      const res = await suggestGamesToAdd({
        ownedNames: lib.map((g) => g.name),
        ownedAppids: lib.map((g) => g.appid),
        favoriteGenres: loadProfile().favoriteGenres,
      });
      if (res.ok) setSuggestions(res.games);
      else setSuggestError(res.error ?? "Couldn't load suggestions.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function add(game: { appid: number; name: string; coverUrl: string }) {
    setLibrary(addGameToLibrary(game));
  }

  function runSearch(q: string) {
    setTerm(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    startSearch(async () => {
      const res = await searchGamesToAdd(q);
      setResults(res.games);
    });
  }

  const addedCount = library.filter((g) => g.added).length;

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-base font-semibold">Round out your library</h2>
        <p className="mt-1 text-sm text-muted">
          Steam isn&apos;t your whole gaming life — add games you also play on
          Epic, console, or just love. SideQuest factors them into what to play.
        </p>

        {/* AI suggestions */}
        <div className="mt-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-subtle">
            Suggested for you
          </p>

          {loadingSuggest && !suggestions && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[104px] animate-pulse rounded-xl bg-elevated"
                />
              ))}
            </div>
          )}

          {suggestError && (
            <p className="text-sm text-amber">{suggestError}</p>
          )}

          {suggestions && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {suggestions.map((g) => (
                <GameRow
                  key={g.appid}
                  game={g}
                  reason={g.reason}
                  added={ownedIds.has(g.appid)}
                  onAdd={() => add(g)}
                />
              ))}
              {suggestions.length === 0 && (
                <p className="text-sm text-subtle">
                  No fresh suggestions — try the search below.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Manual search */}
        <div className="mt-6 border-t border-border pt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-subtle">
            Add any game by name
          </p>
          <input
            value={term}
            onChange={(e) => runSearch(e.target.value)}
            placeholder="Search a game — e.g. “God of War”, “Forza”…"
            className="w-full rounded-lg border border-border bg-elevated px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-subtle focus:border-accent"
          />
          {searching && (
            <p className="mt-2 text-xs text-subtle">Searching…</p>
          )}
          {results.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {results.map((g) => (
                <GameRow
                  key={g.appid}
                  game={g}
                  added={ownedIds.has(g.appid)}
                  onAdd={() => add(g)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-elevated p-4">
        <p className="text-sm text-muted">
          {library.length} games
          {addedCount > 0 && (
            <span className="text-subtle"> · {addedCount} added by you</span>
          )}
        </p>
        <Link
          href="/play"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.4)] transition-transform hover:-translate-y-0.5"
        >
          Get a recommendation →
        </Link>
      </div>
    </div>
  );
}

function GameRow({
  game,
  reason,
  added,
  onAdd,
}: {
  game: StoreHit;
  reason?: string;
  added: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="card flex items-center gap-3 p-3">
      <div className="h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-elevated">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={game.coverUrl}
          alt={game.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{game.name}</p>
        {reason && (
          <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted">
            {reason}
          </p>
        )}
      </div>
      <button
        onClick={onAdd}
        disabled={added}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
          added
            ? "cursor-default border border-green/30 bg-green/10 text-green"
            : "border border-border bg-elevated text-foreground hover:border-accent hover:text-accent-soft"
        }`}
      >
        {added ? "Added ✓" : "+ Add"}
      </button>
    </div>
  );
}
