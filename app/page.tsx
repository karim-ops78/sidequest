import Link from "next/link";
import { Logo } from "@/components/nav";

const FEATURES = [
  {
    title: "Tell it your vibe",
    body: "Pick how much time you have and your mood — or just type it: “cozy but a little tense”. SideQuest gets the nuance.",
    icon: "◐",
  },
  {
    title: "It knows your library",
    body: "Connect Steam and the AI reasons across your whole backlog — playtime, genre fit, the games you keep meaning to start.",
    icon: "✶",
  },
  {
    title: "One game, with the why",
    body: "No more scrolling. You get the single best game to launch right now, two backups, and a clear reason for each.",
    icon: "▶",
  },
];

export default function Home() {
  return (
    <div className="ambient flex flex-1 flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <Logo />
        <div className="flex items-center gap-3 text-sm">
          <Link href="/play" className="text-muted hover:text-foreground">
            Try it
          </Link>
          <Link
            href="/connect"
            className="rounded-lg bg-foreground px-3.5 py-1.5 font-medium text-background transition-opacity hover:opacity-90"
          >
            Connect Steam
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-5">
        <section className="flex flex-col items-center pt-24 text-center sm:pt-32">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-3 py-1 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Your AI gaming concierge
          </span>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
            Can&apos;t decide
            <br />
            what to{" "}
            <span className="bg-gradient-to-r from-accent-soft to-[#38bdf8] bg-clip-text text-transparent">
              play
            </span>
            ?
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
            You own 150 games and a free hour, so you scroll, you stall, you
            launch nothing. SideQuest reads your library and your mood, then
            picks the one game to play right now.
          </p>
          <div className="mt-9 flex items-center gap-3">
            <Link
              href="/connect"
              className="rounded-xl bg-accent px-5 py-2.5 font-medium text-white shadow-[0_0_30px_rgba(124,92,255,0.45)] transition-transform hover:-translate-y-0.5"
            >
              Connect your Steam →
            </Link>
            <Link
              href="/play"
              className="rounded-xl border border-border bg-elevated px-5 py-2.5 font-medium text-foreground transition-colors hover:border-border-strong"
            >
              Try it with a sample library
            </Link>
          </div>
        </section>

        <section className="mt-28 grid w-full gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card card-hover p-6">
              <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-accent-dim text-lg text-accent-soft">
                {f.icon}
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-20 mb-24 w-full">
          <div className="card glow-border overflow-hidden p-8 sm:p-12">
            <p className="font-mono text-xs uppercase tracking-widest text-subtle">
              How it works
            </p>
            <div className="mt-6 grid gap-6 sm:grid-cols-4">
              {[
                "Connect your Steam",
                "Set your time & mood",
                "AI picks one game",
                "Launch and play",
              ].map((step, i) => (
                <div key={step} className="flex flex-col gap-2">
                  <span className="font-mono text-sm text-accent-soft">
                    0{i + 1}
                  </span>
                  <span className="text-sm text-foreground">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 text-xs text-subtle">
          <span>SideQuest AI — portfolio project</span>
          <span className="font-mono">v0.1 · demo</span>
        </div>
      </footer>
    </div>
  );
}
