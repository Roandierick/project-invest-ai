import { ContentTopbar } from "@/components/content-topbar";
import { WorkspaceFrame } from "@/components/workspace-frame";
import type { WorkspaceNavKey } from "@/components/workspace-sidebar";
import type { WorkspacePageBootstrap } from "@/lib/workspace/page-bootstrap";

interface WorkspaceContentShellProps extends WorkspacePageBootstrap {
  activeNav: WorkspaceNavKey;
  children: React.ReactNode;
}

function SupabaseSetupNotice() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-8 md:px-6">
      <section className="app-shell-card rounded-[1.75rem] p-8 text-[var(--color-foreground)]">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
          Setup vereist
        </p>
        <h1 className="mt-4 font-[family:var(--font-display)] text-4xl leading-tight">
          Supabase env vars ontbreken nog
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
          Vul eerst `NEXT_PUBLIC_SUPABASE_URL` en
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` in je `.env.local` in. Daarna laadt
          de workspace met chatgeschiedenis en kennispagina&apos;s automatisch.
        </p>
      </section>
    </main>
  );
}

export function WorkspaceContentShell({
  isSupabaseConfigured,
  currentUser,
  initialBootstrap,
  activeNav,
  children,
}: WorkspaceContentShellProps) {
  if (!isSupabaseConfigured) {
    return <SupabaseSetupNotice />;
  }

  if (!currentUser) {
    return null;
  }

  return (
    <WorkspaceFrame
      currentUserEmail={currentUser.email}
      currentUserId={currentUser.id}
      conversations={initialBootstrap.conversations}
      activeConversationId={initialBootstrap.activeConversationId ?? undefined}
      activeNav={activeNav}
      topbar={<ContentTopbar activeNav={activeNav} />}
    >
      <div className="space-y-6">{children}</div>
    </WorkspaceFrame>
  );
}
