import Link from "next/link";

import { InstallAppButton } from "@/components/install-app-button";
import type { WorkspaceNavKey } from "@/components/workspace-sidebar";

interface ContentTopbarProps {
  activeNav: WorkspaceNavKey;
}

const NAV_ITEMS: Array<{
  key: WorkspaceNavKey;
  href: string;
  label: string;
}> = [
  { key: "analyse", href: "/", label: "Analyse" },
  { key: "investeerders", href: "/investeerders", label: "Investeerders" },
  { key: "strategieen", href: "/strategieen", label: "Strategieen" },
  { key: "optimalisatie", href: "/optimalisatie", label: "Optimalisatie" },
];

export function ContentTopbar({ activeNav }: ContentTopbarProps) {
  return (
    <header className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 shadow-[0_8px_24px_rgba(27,58,92,0.06)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[var(--color-primary)] text-sm font-semibold text-white">
            PI
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-foreground)]">
              Project Invest AI
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              Belgische vastgoedanalyse
            </p>
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <nav className="flex flex-wrap items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.key === activeNav;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`rounded-full px-3 py-2 text-sm transition ${
                    isActive
                      ? "font-semibold text-[var(--color-primary)] underline decoration-[var(--color-primary)] underline-offset-[0.45rem]"
                      : "text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <InstallAppButton compact />
        </div>
      </div>
    </header>
  );
}
