import { TopNav } from "@/components/nav";
import { Picker } from "@/components/picker";

export default function PlayPage() {
  return (
    <>
      <TopNav active="play" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8">
        <Picker />
      </main>
    </>
  );
}
