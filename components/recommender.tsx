"use client";

import { useState } from "react";
import Link from "next/link";
import { games, formatPlaytime, type Game } from "@/lib/seed";
import { GameCover } from "@/components/game-bits";

type TimeKey = "short" | "medium" | "long";
type MoodKey = "chill" | "story" | "challenge" | "quick";

const TIME: { key: TimeKey; label: string; hint: string }[] = [
  { key: "short", label: "~30 min", hint: "Just a quick one" },
  { key: "medium", label: "1–2 hours", hint: "A proper session" },
  { key: "long", label: "All evening", hint: "Deep dive" },
];

const MOOD: { key: MoodKey; label: string; emoji: string }[] = [
  { key: "chill", label: "Chill / relax", emoji: "🌙" },
  { key: "story", label: "Into the story", emoji: "📖" },
  { key: "challenge", label: "Want a challenge", emoji: "⚔️" },
  { key: "quick", label: "Quick fun", emoji: "⚡" },
];

// Lightweight heuristic — stands in for the AI recommender in V1.
function scoreGame(g: Game, time: TimeKey, mood: MoodKey) {
  let score = 0;
  const genre = g.genre.toLowerCase();
  if (g.status === "playing") score += 3;
  if (g.status === "paused") score += 1;

  if (mood === "challenge" && /souls|action rpg/.test(genre)) score += 4;
  if (mood === "story" && /crpg|rpg/.test(genre)) score += 4;
  if (mood === "chill" && /metroidvania|open-world/.test(genre)) score += 3;
  if (mood === "quick" && g.status !== "playing") score += 2;

  if (time === "long" && /crpg|open-world|rpg/.test(genre)) score += 3;
  if (time === "short" && /metroidvania/.test(genre)) score += 2;
  if (time === "medium") score += 1;

  return score;
}

function reasonFor(g: Game, time: TimeKey, mood: MoodKey) {
  const last = g.sessions[0];
  const moodLine: Record<MoodKey, string> = {
    chill: "it's an easy headspace to drop into",
    story: "you're right in the middle of its story",
    challenge: "it'll scratch that itch for something demanding",
    quick: "you can make progress without a huge commitment",
  };
  const timeLine: Record<TimeKey, string> = {
    short: "Perfect for a 30-minute window",
    medium: "A 1–2h session fits it well",
    long: "Great for sinking the whole evening in",
  };
  const where = last
    ? ` You left off ${last.recap.whereIStopped.toLowerCase()}`
    : "";
  return `${timeLine[time]}, and ${moodLine[mood]}.${where}`;
}

export function Recommender() {
  const [time, setTime] = useState<TimeKey | null>(null);
  const [mood, setMood] = useState<MoodKey | null>(null);

  const pick =
    time && mood
      ? [...games]
          .map((g) => ({ g, s: scoreGame(g, time, mood) }))
          .sort((a, b) => b.s - a.s)[0].g
      : null;

  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold">What to play this weekend</h2>
      <p className="mt-1 text-sm text-muted">
        Tell me your time and mood — I'll pick from your library.
      </p>

      <div className="mt-5 space-y-4">
        <Field label="How much time?">
          <div className="grid grid-cols-3 gap-2">
            {TIME.map((t) => (
              <Choice
                key={t.key}
                active={time === t.key}
                onClick={() => setTime(t.key)}
                title={t.label}
                sub={t.hint}
              />
            ))}
          </div>
        </Field>

        <Field label="What's the mood?">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {MOOD.map((m) => (
              <Choice
                key={m.key}
                active={mood === m.key}
                onClick={() => setMood(m.key)}
                title={`${m.emoji} ${m.label}`}
              />
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-6 border-t border-border pt-6">
        {pick ? (
          <Link
            href={`/games/${pick.id}`}
            className="glow-border flex gap-4 rounded-xl bg-background p-4 transition-transform hover:-translate-y-0.5"
          >
            <GameCover
              name=""
              from={pick.cover.from}
              to={pick.cover.to}
              className="h-24 w-20 shrink-0 rounded-lg"
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-accent-soft">
                Tonight, play
              </p>
              <h3 className="mt-1 text-lg font-semibold">{pick.name}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted">
                {reasonFor(pick, time!, mood!)}
              </p>
              <p className="mt-2 font-mono text-xs text-subtle">
                {pick.genre} · {formatPlaytime(pick.totalPlaytimeMin)} played
              </p>
            </div>
          </Link>
        ) : (
          <p className="text-center text-sm text-subtle">
            Pick a time and a mood to get your recommendation.
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-subtle">
        {label}
      </p>
      {children}
    </div>
  );
}

function Choice({
  active,
  onClick,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
        active
          ? "border-accent bg-accent-dim"
          : "border-border bg-elevated hover:border-border-strong"
      }`}
    >
      <span className="block text-sm font-medium">{title}</span>
      {sub && <span className="mt-0.5 block text-xs text-subtle">{sub}</span>}
    </button>
  );
}
