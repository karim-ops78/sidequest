"use client";

import { useActionState, useState } from "react";
import { recapAction, screenshotAction } from "@/app/games/[id]/log/actions";

type Mode = "notes" | "screenshot";

export function SessionLogger({
  gameId,
  gameName,
  aiEnabled,
}: {
  gameId: string;
  gameName: string;
  aiEnabled: boolean;
}) {
  const [mode, setMode] = useState<Mode>("notes");

  return (
    <div className="space-y-6">
      {!aiEnabled && (
        <div className="flex items-start gap-3 rounded-xl border border-amber/30 bg-amber/5 p-4 text-sm text-amber">
          <span className="mt-0.5">⚠️</span>
          <p>
            <strong>AI not configured.</strong> Add{" "}
            <code className="font-mono">ANTHROPIC_API_KEY</code> to{" "}
            <code className="font-mono">.env.local</code> and restart the dev
            server to generate real recaps.
          </p>
        </div>
      )}

      <div className="inline-flex rounded-xl border border-border bg-elevated p-1">
        <TabButton active={mode === "notes"} onClick={() => setMode("notes")}>
          ✶ From notes
        </TabButton>
        <TabButton
          active={mode === "screenshot"}
          onClick={() => setMode("screenshot")}
        >
          ◳ From screenshot
        </TabButton>
      </div>

      {mode === "notes" ? (
        <NotesForm gameId={gameId} gameName={gameName} />
      ) : (
        <ScreenshotForm gameId={gameId} gameName={gameName} />
      )}
    </div>
  );
}

function NotesForm({ gameId, gameName }: { gameId: string; gameName: string }) {
  const [state, action, pending] = useActionState(recapAction, null);

  return (
    <div className="space-y-5">
      <form action={action} className="card p-6">
        <input type="hidden" name="gameId" value={gameId} />
        <label htmlFor="notes" className="text-sm font-medium">
          What happened this session?
        </label>
        <p className="mt-1 text-sm text-muted">
          A few rough lines is enough — the AI structures it for you.
        </p>
        <textarea
          id="notes"
          name="notes"
          rows={5}
          placeholder={`e.g. beat the boss at the foggy bridge in ${gameName}, found a new sword, opened a shortcut. Stopped at the campfire before the big gate.`}
          className="mt-4 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-subtle focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.4)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {pending ? "Generating recap…" : "Generate recap"}
        </button>
      </form>

      {state && state.ok === false && <ErrorCard message={state.error} />}
      {state && state.ok && (
        <RecapCard
          whatIDid={state.whatIDid}
          whereIStopped={state.whereIStopped}
          nextObjective={state.nextObjective}
        />
      )}
    </div>
  );
}

function ScreenshotForm({
  gameId,
  gameName,
}: {
  gameId: string;
  gameName: string;
}) {
  const [state, action, pending] = useActionState(screenshotAction, null);
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <form action={action} className="card p-6">
        <input type="hidden" name="gameId" value={gameId} />
        <label className="text-sm font-medium">
          Upload a screenshot from {gameName}
        </label>
        <p className="mt-1 text-sm text-muted">
          Menu, quest log, map, inventory or scoreboard. The image is analyzed,
          then discarded — only the summary is kept.
        </p>

        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-background px-4 py-8 text-center transition-colors hover:border-accent">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="preview"
              className="max-h-48 rounded-lg object-contain"
            />
          ) : (
            <>
              <span className="text-2xl">◳</span>
              <span className="text-sm text-muted">
                Click to choose an image (PNG, JPEG, WebP, GIF · max 8 MB)
              </span>
            </>
          )}
          <input
            type="file"
            name="screenshot"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_rgba(124,92,255,0.4)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {pending ? "Analyzing…" : "Analyze screenshot"}
        </button>
      </form>

      {state && state.ok === false && <ErrorCard message={state.error} />}
      {state && state.ok && (
        <div className="card glow-border p-6">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-accent-dim px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-accent-soft">
              {state.detectedType}
            </span>
            <h3 className="text-sm font-semibold">Detected screen</h3>
          </div>
          {state.extracted.length > 0 && (
            <ul className="mt-4 space-y-2">
              {state.extracted.map((x, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <span className="text-muted">{x}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-5 rounded-lg border border-border bg-background p-3 text-sm text-accent-soft">
            {state.note}
          </p>
        </div>
      )}
    </div>
  );
}

function RecapCard({
  whatIDid,
  whereIStopped,
  nextObjective,
}: {
  whatIDid: string;
  whereIStopped: string;
  nextObjective: string;
}) {
  return (
    <div className="card glow-border p-6">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-accent-soft">
        Generated recap
      </h3>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="What I did" value={whatIDid} />
        <Field label="Where I stopped" value={whereIStopped} />
        <Field label="Next objective" value={nextObjective} accent />
      </dl>
      <button className="mt-5 rounded-lg border border-border bg-elevated px-4 py-2 text-sm font-medium transition-colors hover:border-border-strong">
        Save to timeline
      </button>
    </div>
  );
}

function Field({
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
      <dd className={`text-sm leading-6 ${accent ? "text-accent-soft" : "text-muted"}`}>
        {value}
      </dd>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="card border-amber/30 bg-amber/5 p-4 text-sm text-amber">
      {message}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-accent text-white" : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
