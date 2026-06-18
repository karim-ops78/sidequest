import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-sm font-bold text-white shadow-[0_0_20px_rgba(124,92,255,0.5)]">
        S
      </span>
      <span className="text-[15px] font-semibold tracking-tight">
        SideQuest <span className="text-accent-soft">AI</span>
      </span>
    </Link>
  );
}

export function TopNav({ active }: { active?: "library" | "profile" }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 sm:flex">
            <NavLink href="/dashboard" current={active === "library"}>
              Library
            </NavLink>
            <NavLink href="/profile" current={active === "profile"}>
              Profile
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/connect"
            className="hidden rounded-lg border border-border bg-elevated px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border-strong hover:text-foreground sm:block"
          >
            Connect Steam
          </Link>
          <span className="hidden rounded-full border border-border bg-elevated px-2.5 py-1 text-xs text-subtle sm:block">
            Demo mode
          </span>
          <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-accent to-[#38bdf8] text-xs font-semibold text-white">
            K
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  current,
  children,
}: {
  href: string;
  current?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
        current
          ? "bg-elevated text-foreground"
          : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}
