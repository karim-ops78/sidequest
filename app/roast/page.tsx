import { TopNav } from "@/components/nav";
import { BacklogRoast } from "@/components/roast";

export default function RoastPage() {
  return (
    <>
      <TopNav active="roast" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8">
        <BacklogRoast />
      </main>
    </>
  );
}
