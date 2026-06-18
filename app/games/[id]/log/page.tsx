import Link from "next/link";
import { notFound } from "next/navigation";
import { TopNav } from "@/components/nav";
import { SessionLogger } from "@/components/session-logger";
import { getGame } from "@/lib/seed";
import { hasAiKey } from "@/lib/ai";

export default async function LogSessionPage({
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">
        <Link
          href={`/games/${game.id}`}
          className="text-sm text-subtle transition-colors hover:text-foreground"
        >
          ← {game.name}
        </Link>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Log a session
        </h1>
        <p className="mt-1 text-sm text-muted">
          Turn your notes or a screenshot into a clean progress recap.
        </p>

        <div className="mt-8">
          <SessionLogger
            gameId={game.id}
            gameName={game.name}
            aiEnabled={hasAiKey()}
          />
        </div>
      </main>
    </>
  );
}
