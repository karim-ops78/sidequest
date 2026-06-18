import Link from "next/link";
import { TopNav } from "@/components/nav";
import { SteamConnect } from "@/components/steam-connect";

export default function ConnectPage() {
  const hasKey = Boolean(process.env.STEAM_API_KEY?.trim());
  return (
    <>
      <TopNav active="library" />
      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8">
        <Link
          href="/dashboard"
          className="text-sm text-subtle transition-colors hover:text-foreground"
        >
          ← Library
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-elevated text-lg">
            🎮
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Connect Steam
            </h1>
            <p className="text-sm text-muted">
              Import your real library and playtime — no password, no OAuth.
            </p>
          </div>
        </div>

        {!hasKey && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber/30 bg-amber/5 p-4 text-sm text-amber">
            <span className="mt-0.5">⚠️</span>
            <p>
              <strong>Demo mode.</strong> No{" "}
              <code className="font-mono">STEAM_API_KEY</code> is configured, so
              this will show a <strong>sample library — not your real Steam
              account</strong>. Add a key (see{" "}
              <code className="font-mono">.env.example</code>) to import your
              actual games.
            </p>
          </div>
        )}

        <div className="mt-6">
          <SteamConnect demoMode={!hasKey} />
        </div>
      </main>
    </>
  );
}
