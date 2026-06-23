"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  GENRE_OPTIONS,
  loadLibrary,
  loadProfile,
  saveProfile,
  loadBlacklist,
  removeFromBlacklist,
  type StoredGame,
} from "@/lib/library";
import { detectGenresFromLibrary } from "@/app/profile/actions";

export function ProfileEditor() {
  const [genres, setGenres] = useState<string[]>([]);
  const [library, setLibrary] = useState<StoredGame[]>([]);
  const [blacklist, setBlacklist] = useState<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [detectNote, setDetectNote] = useState<string | null>(null);
  const [detecting, startDetect] = useTransition();

  useEffect(() => {
    setGenres(loadProfile().favoriteGenres);
    setLibrary(loadLibrary() ?? []);
    setBlacklist(loadBlacklist());
    setLoaded(true);
  }, []);

  function unhide(appid: number) {
    setBlacklist(removeFromBlacklist(appid));
  }

  function persist(next: string[]) {
    setGenres(next);
    saveProfile({ favoriteGenres: next });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
  }

  function toggle(genre: string) {
    persist(
      genres.includes(genre)
        ? genres.filter((g) => g !== genre)
        : [...genres, genre]
    );
  }

  function detect() {
    setDetectNote(null);
    startDetect(async () => {
      const res = await detectGenresFromLibrary({
        games: library.map((g) => ({ name: g.name, playtimeMin: g.playtimeMin })),
        allowedGenres: [...GENRE_OPTIONS],
      });
      if (!res.ok) {
        setDetectNote(res.error);
        return;
      }
      if (res.genres.length) {
        // Merge with what's already selected — never wipe the player's choices.
        persist([...new Set([...genres, ...res.genres])]);
      }
      setDetectNote(
        res.note ??
          (res.genres.length
            ? `Added ${res.genres.length} genre${res.genres.length > 1 ? "s" : ""} from your library.`
            : "Couldn't read a clear taste from your library — pick a few by hand.")
      );
    });
  }

  if (!loaded) return null;

  const totalHours = Math.round(
    library.reduce((s, g) => s + g.playtimeMin, 0) / 60
  );
  const addedCount = library.filter((g) => g.added).length;
  const blacklistSet = new Set(blacklist);
  const hiddenGames = library.filter((g) => blacklistSet.has(g.appid));

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Games in library" value={String(library.length)} />
        <Stat label="Hours played" value={`${totalHours}h`} />
        <Stat label="Added by you" value={String(addedCount)} />
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Your taste</h2>
            <p className="mt-1 text-sm text-muted">
              Pick the genres you enjoy — SideQuest weighs them when choosing what
              to play.
            </p>
          </div>
          <span
            className={`text-xs text-green transition-opacity ${
              savedFlash ? "opacity-100" : "opacity-0"
            }`}
          >
            Saved ✓
          </span>
        </div>

        {library.length > 0 && (
          <button
            onClick={detect}
            disabled={detecting}
            className={`mt-5 flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              genres.length === 0
                ? "border-accent bg-accent-dim text-accent-soft hover:bg-accent/20"
                : "border-border bg-elevated text-muted hover:border-border-strong"
            }`}
          >
            {detecting ? "Reading your library…" : "✨ Detect from my library"}
          </button>
        )}

        {detectNote && (
          <p className="mt-3 text-xs text-subtle">{detectNote}</p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {GENRE_OPTIONS.map((g) => {
            const active = genres.includes(g);
            return (
              <button
                key={g}
                onClick={() => toggle(g)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-accent bg-accent-dim text-accent-soft"
                    : "border-border bg-elevated text-muted hover:border-border-strong"
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>

        {library.length === 0 && (
          <p className="mt-5 text-sm text-subtle">
            No library yet —{" "}
            <Link href="/connect" className="text-accent-soft hover:underline">
              connect your Steam
            </Link>{" "}
            to get personalised picks.
          </p>
        )}
      </section>

      {hiddenGames.length > 0 && (
        <section className="card p-6">
          <h2 className="text-base font-semibold">Hidden games</h2>
          <p className="mt-1 text-sm text-muted">
            These never show up in the picker. Un-hide one to let it back in.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {hiddenGames.map((g) => (
              <button
                key={g.appid}
                onClick={() => unhide(g.appid)}
                className="group flex items-center gap-2 rounded-full border border-border bg-elevated py-1 pl-1 pr-3 text-sm text-muted transition-colors hover:border-border-strong hover:text-foreground"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.coverUrl}
                  alt=""
                  className="h-6 w-11 rounded object-cover"
                />
                <span className="max-w-[12rem] truncate">{g.name}</span>
                <span className="text-xs text-subtle group-hover:text-accent-soft">
                  Un-hide
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
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
