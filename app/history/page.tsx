import { TopNav } from "@/components/nav";
import { HistoryList } from "@/components/history-list";

export default function HistoryPage() {
  return (
    <>
      <TopNav active="history" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8">
        <h1 className="text-xl font-semibold tracking-tight">Your history</h1>
        <p className="mt-1 text-sm text-muted">
          Every pick SideQuest has suggested — and which ones you actually played.
        </p>
        <div className="mt-6">
          <HistoryList />
        </div>
      </main>
    </>
  );
}
