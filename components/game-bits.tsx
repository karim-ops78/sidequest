import type { GameStatus } from "@/lib/seed";

export function GameCover({
  name,
  from,
  to,
  className = "",
  big = false,
}: {
  name: string;
  from: string;
  to: string;
  className?: string;
  big?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(255,255,255,0.18),transparent_45%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.55),transparent_55%)]" />
      <span
        className={`absolute bottom-2 left-3 right-3 font-semibold tracking-tight text-white drop-shadow ${
          big ? "text-2xl" : "text-sm"
        }`}
      >
        {name}
      </span>
    </div>
  );
}

const STATUS: Record<
  GameStatus,
  { label: string; className: string }
> = {
  playing: {
    label: "Playing",
    className: "border-green/30 bg-green/10 text-green",
  },
  paused: {
    label: "Paused",
    className: "border-amber/30 bg-amber/10 text-amber",
  },
  done: {
    label: "Completed",
    className: "border-accent/30 bg-accent/10 text-accent-soft",
  },
  backlog: {
    label: "Backlog",
    className: "border-border-strong bg-elevated text-subtle",
  },
};

export function StatusBadge({ status }: { status: GameStatus }) {
  const s = STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}
