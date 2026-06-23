import Link from "next/link";
import { TopNav } from "@/components/nav";
import { ProfileEditor } from "@/components/profile-editor";

export default function ProfilePage() {
  return (
    <>
      <TopNav active="profile" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-[#38bdf8] text-xl font-bold text-white">
            K
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Your profile
            </h1>
            <p className="text-sm text-muted">
              <Link href="/connect" className="text-accent-soft hover:underline">
                Manage your Steam library
              </Link>{" "}
              ·{" "}
              <Link href="/history" className="text-accent-soft hover:underline">
                view history
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8">
          <ProfileEditor />
        </div>
      </main>
    </>
  );
}
