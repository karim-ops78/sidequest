import { TopNav } from "@/components/nav";
import { LibraryView } from "@/components/library-view";

export default function DashboardPage() {
  return (
    <>
      <TopNav active="library" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <LibraryView />
      </main>
    </>
  );
}
